-- =====================================================================
-- Mascarenhas Hub — functions_rpc.sql
-- Funções SECURITY DEFINER: lógica atômica, autorização e anti-cheat.
-- Execute DEPOIS de schema.sql.
-- =====================================================================

-- Relógio do servidor (cálculo do server_time_offset no cliente e keep-alive)
CREATE OR REPLACE FUNCTION public.server_now()
RETURNS TIMESTAMPTZ LANGUAGE sql STABLE AS $$ SELECT now(); $$;

-- Id do jogador (room_players.id) do usuário autenticado na sala
CREATE OR REPLACE FUNCTION public._my_player_id(p_room_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.room_players
  WHERE room_id = p_room_id AND auth_user_id = auth.uid() AND NOT is_kicked
  LIMIT 1;
$$;

-- Coleta de lixo: salas sem atualização há mais de 6 horas (CASCADE limpa o resto)
CREATE OR REPLACE FUNCTION public.cleanup_expired_rooms()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  DELETE FROM public.rooms WHERE updated_at < now() - interval '6 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Código de 6 caracteres sem ambiguidade (sem 0, O, 1, I, L)
CREATE OR REPLACE FUNCTION public._generate_room_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code TEXT;
  i INT;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.rooms WHERE code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public._clean_nickname(p_nickname TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT left(btrim(regexp_replace(regexp_replace(coalesce(p_nickname, ''), '<[^>]*>', '', 'g'), '\s+', ' ', 'g')), 16);
$$;

-- Cria sala + jogador anfitrião (dispara a limpeza leve de salas antigas)
CREATE OR REPLACE FUNCTION public.create_room(p_nickname TEXT, p_avatar TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_room_id UUID;
  v_player_id UUID := gen_random_uuid();
  v_code TEXT;
  v_nick TEXT := public._clean_nickname(p_nickname);
  v_joined TIMESTAMPTZ := now();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF char_length(v_nick) < 2 THEN RAISE EXCEPTION 'INVALID_NICKNAME'; END IF;

  PERFORM public.cleanup_expired_rooms();

  v_code := public._generate_room_code();
  INSERT INTO public.rooms (code, host_player_id) VALUES (v_code, v_player_id) RETURNING id INTO v_room_id;
  INSERT INTO public.room_players (id, room_id, auth_user_id, nickname, avatar_id, joined_at)
  VALUES (v_player_id, v_room_id, v_uid, v_nick, left(coalesce(p_avatar, 'neon-fox'), 20), v_joined);

  RETURN jsonb_build_object('room_id', v_room_id, 'code', v_code, 'player_id', v_player_id, 'joined_at', v_joined, 'public_state', NULL);
END;
$$;

-- Entra (ou reconecta) na sala preservando o player_id original
CREATE OR REPLACE FUNCTION public.join_room(p_code TEXT, p_nickname TEXT, p_avatar TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_room public.rooms%ROWTYPE;
  v_player public.room_players%ROWTYPE;
  v_nick TEXT := public._clean_nickname(p_nickname);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF char_length(v_nick) < 2 THEN RAISE EXCEPTION 'INVALID_NICKNAME'; END IF;

  SELECT * INTO v_room FROM public.rooms WHERE code = upper(p_code);
  IF NOT FOUND THEN RAISE EXCEPTION 'ROOM_NOT_FOUND'; END IF;

  SELECT * INTO v_player FROM public.room_players WHERE room_id = v_room.id AND auth_user_id = v_uid;
  IF FOUND THEN
    IF v_player.is_kicked THEN RAISE EXCEPTION 'KICKED'; END IF;
    UPDATE public.room_players
      SET nickname = v_nick, avatar_id = left(coalesce(p_avatar, avatar_id), 20), is_connected = true, last_seen_at = now()
      WHERE id = v_player.id
      RETURNING * INTO v_player;
  ELSE
    IF (SELECT count(*) FROM public.room_players WHERE room_id = v_room.id AND NOT is_kicked) >= 24 THEN
      RAISE EXCEPTION 'ROOM_FULL';
    END IF;
    INSERT INTO public.room_players (room_id, auth_user_id, nickname, avatar_id)
    VALUES (v_room.id, v_uid, v_nick, left(coalesce(p_avatar, 'neon-fox'), 20))
    RETURNING * INTO v_player;
  END IF;

  UPDATE public.rooms SET updated_at = now() WHERE id = v_room.id;

  RETURN jsonb_build_object(
    'room_id', v_room.id,
    'code', v_room.code,
    'player_id', v_player.id,
    'joined_at', v_player.joined_at,
    'public_state', v_room.public_game_state
  );
END;
$$;

-- Estado público persistido (usado na reconexão; nunca contém segredos)
CREATE OR REPLACE FUNCTION public.get_room_state(p_room_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public._my_player_id(p_room_id) IS NULL THEN RAISE EXCEPTION 'NOT_A_MEMBER'; END IF;
  RETURN (SELECT public_game_state FROM public.rooms WHERE id = p_room_id);
END;
$$;

-- Anfitrião persiste estado público + segredos da rodada (apenas o host pode)
CREATE OR REPLACE FUNCTION public.host_save_state(
  p_room_id UUID,
  p_public_state JSONB,
  p_secret_payload JSONB,
  p_status TEXT,
  p_current_game TEXT,
  p_round_number INT,
  p_round_ends_at TIMESTAMPTZ
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me UUID := public._my_player_id(p_room_id);
BEGIN
  IF v_me IS NULL OR NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = p_room_id AND host_player_id = v_me) THEN
    RAISE EXCEPTION 'NOT_HOST';
  END IF;
  IF octet_length(p_public_state::text) > 400000 THEN RAISE EXCEPTION 'STATE_TOO_LARGE'; END IF;

  UPDATE public.rooms SET
    public_game_state = p_public_state,
    status = CASE WHEN p_status IN ('LOBBY', 'PLAYING', 'PODIUM') THEN p_status ELSE status END,
    current_game = p_current_game,
    game_config = coalesce(p_public_state->'configs', game_config),
    round_number = coalesce(p_round_number, 0),
    round_ends_at = p_round_ends_at
  WHERE id = p_room_id;

  -- Espelha placares para consultas/auditoria
  UPDATE public.room_players rp SET
    match_score = coalesce((pl->>'matchScore')::int, rp.match_score),
    session_score = coalesce((pl->>'sessionScore')::int, rp.session_score),
    crowns = coalesce((pl->>'crowns')::int, rp.crowns)
  FROM jsonb_array_elements(coalesce(p_public_state->'players', '[]'::jsonb)) pl
  WHERE rp.room_id = p_room_id AND rp.id::text = pl->>'id';

  IF p_secret_payload IS NOT NULL THEN
    INSERT INTO public.round_secrets (room_id, round_number, secret_payload)
    VALUES (p_room_id, coalesce(p_round_number, 0), p_secret_payload)
    ON CONFLICT (room_id) DO UPDATE SET round_number = EXCLUDED.round_number, secret_payload = EXCLUDED.secret_payload;
  END IF;
END;
$$;

-- Somente o anfitrião lê o estado secreto completo do motor (para retomar após F5/migração)
CREATE OR REPLACE FUNCTION public.get_host_secret(p_room_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me UUID := public._my_player_id(p_room_id);
BEGIN
  IF v_me IS NULL OR NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = p_room_id AND host_player_id = v_me) THEN
    RAISE EXCEPTION 'NOT_HOST';
  END IF;
  RETURN (SELECT secret_payload FROM public.round_secrets WHERE room_id = p_room_id);
END;
$$;

-- Visão privada do jogador na rodada (ANTI-CHEAT):
--   Impostor  => {"role":"IMPOSTOR","category":"...","secret_word":null}
--   Cidadão   => {"role":"CITIZEN","category":"...","secret_word":"..."}
--   Mega Senha=> secret_word apenas para o Passador; Adivinhador recebe só tamanho/categoria
--   Música    => a resposta nunca é enviada antes do fim da rodada
-- Cada jogador recebe EXCLUSIVAMENTE a entrada com seu próprio player_id.
CREATE OR REPLACE FUNCTION public.get_player_round_view(p_room_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me UUID := public._my_player_id(p_room_id);
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'NOT_A_MEMBER'; END IF;
  RETURN (SELECT secret_payload->'views'->(v_me::text) FROM public.round_secrets WHERE room_id = p_room_id);
END;
$$;

-- Alias com o nome usado na especificação
CREATE OR REPLACE FUNCTION public.get_my_round_secret(p_room_id UUID)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.get_player_round_view(p_room_id);
$$;

-- Heartbeat leve (anfitrião a cada 5s): last_seen_at do jogador + mantém a sala viva
CREATE OR REPLACE FUNCTION public.touch_player(p_room_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me UUID := public._my_player_id(p_room_id);
BEGIN
  IF v_me IS NULL THEN RETURN; END IF;
  UPDATE public.room_players SET last_seen_at = now(), is_connected = true WHERE id = v_me;
  UPDATE public.rooms SET updated_at = now() WHERE id = p_room_id AND host_player_id = v_me;
END;
$$;

-- Migração automática: assume o host se o atual sumiu há mais de 15s
CREATE OR REPLACE FUNCTION public.claim_host_if_abandoned(p_room_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me UUID := public._my_player_id(p_room_id);
  v_host public.room_players%ROWTYPE;
  v_room public.rooms%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN RETURN false; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_room.host_player_id = v_me THEN RETURN true; END IF;

  SELECT * INTO v_host FROM public.room_players WHERE id = v_room.host_player_id;
  IF FOUND AND NOT v_host.is_kicked AND v_host.last_seen_at > now() - interval '15 seconds' THEN
    RETURN false;
  END IF;

  UPDATE public.room_players SET is_connected = false WHERE id = v_room.host_player_id;
  UPDATE public.rooms SET host_player_id = v_me WHERE id = p_room_id;
  UPDATE public.room_players SET last_seen_at = now() WHERE id = v_me;
  RETURN true;
END;
$$;

-- Transferência manual de anfitrião
CREATE OR REPLACE FUNCTION public.transfer_host(p_room_id UUID, p_new_host UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me UUID := public._my_player_id(p_room_id);
BEGIN
  IF v_me IS NULL OR NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = p_room_id AND host_player_id = v_me) THEN
    RAISE EXCEPTION 'NOT_HOST';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.room_players WHERE id = p_new_host AND room_id = p_room_id AND NOT is_kicked) THEN
    RAISE EXCEPTION 'INVALID_PLAYER';
  END IF;
  UPDATE public.room_players SET last_seen_at = now() WHERE id = p_new_host;
  UPDATE public.rooms SET host_player_id = p_new_host WHERE id = p_room_id;
END;
$$;

-- Remoção (kick) — o jogador perde acesso às RPCs e não consegue reentrar
CREATE OR REPLACE FUNCTION public.kick_player(p_room_id UUID, p_player_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me UUID := public._my_player_id(p_room_id);
BEGIN
  IF v_me IS NULL OR NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = p_room_id AND host_player_id = v_me) THEN
    RAISE EXCEPTION 'NOT_HOST';
  END IF;
  IF p_player_id = v_me THEN RAISE EXCEPTION 'CANNOT_KICK_SELF'; END IF;
  UPDATE public.room_players SET is_kicked = true, is_connected = false WHERE id = p_player_id AND room_id = p_room_id;
END;
$$;

-- Registro auditável/idempotente de submissões (UNIQUE para VOTE/VALIDATION)
CREATE OR REPLACE FUNCTION public.record_submission(p_room_id UUID, p_round_number INT, p_type TEXT, p_payload JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me UUID := public._my_player_id(p_room_id);
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'NOT_A_MEMBER'; END IF;
  INSERT INTO public.round_submissions (room_id, round_number, player_id, submission_type, payload)
  VALUES (p_room_id, p_round_number, v_me, upper(left(p_type, 30)), p_payload)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Permissões: apenas usuários autenticados (inclui anônimos) executam as RPCs
REVOKE ALL ON FUNCTION public.create_room(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_room(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_room_state(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.host_save_state(UUID, JSONB, JSONB, TEXT, TEXT, INT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_host_secret(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_player_round_view(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_round_secret(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_player(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_host_if_abandoned(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transfer_host(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kick_player(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_submission(UUID, INT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_rooms() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._my_player_id(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.server_now() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_room(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_state(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.host_save_state(UUID, JSONB, JSONB, TEXT, TEXT, INT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_host_secret(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_round_view(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_round_secret(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_player(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_host_if_abandoned(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_host(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kick_player(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_submission(UUID, INT, TEXT, JSONB) TO authenticated;

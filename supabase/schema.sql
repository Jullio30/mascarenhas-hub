-- =====================================================================
-- Mascarenhas Hub — schema.sql
-- Tabelas, índices, RLS e triggers. Execute ANTES de functions_rpc.sql
-- e seed_catalog.sql no SQL Editor do Supabase.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Salas -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  host_player_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'LOBBY', -- 'LOBBY' | 'PLAYING' | 'PODIUM'
  current_game VARCHAR(40),
  game_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  public_game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  round_number INT NOT NULL DEFAULT 0,
  round_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rooms_code_format CHECK (code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'),
  CONSTRAINT rooms_status_check CHECK (status IN ('LOBBY', 'PLAYING', 'PODIUM'))
);

-- 2. Jogadores na Sala --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL, -- ID do Supabase Anonymous Auth
  nickname VARCHAR(16) NOT NULL,
  avatar_id VARCHAR(20) NOT NULL DEFAULT 'neon-fox',
  is_ready BOOLEAN NOT NULL DEFAULT false,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  is_kicked BOOLEAN NOT NULL DEFAULT false,
  match_score INT NOT NULL DEFAULT 0,
  session_score INT NOT NULL DEFAULT 0,
  crowns INT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, auth_user_id),
  CONSTRAINT room_players_nick_len CHECK (char_length(nickname) BETWEEN 2 AND 16)
);

-- 3. Segredos da Rodada (isolados: NENHUMA policy de SELECT) -------------
CREATE TABLE IF NOT EXISTS public.round_secrets (
  room_id UUID PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  -- {"engine": {...estado secreto do motor...}, "views": {"<player_id>": {...visão privada...}}}
  secret_payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Submissões e Votos da Rodada (auditoria opcional) ------------------
CREATE TABLE IF NOT EXISTS public.round_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  player_id UUID NOT NULL REFERENCES public.room_players(id) ON DELETE CASCADE,
  submission_type VARCHAR(30) NOT NULL, -- 'VOTE' | 'CLUE' | 'GUESS' | 'VALIDATION' | 'CHALLENGE'
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Catálogo de conteúdo (espelho de src/data/defaultPacks.ts) ---------
CREATE TABLE IF NOT EXISTS public.catalog_items (
  id TEXT PRIMARY KEY,
  game VARCHAR(40) NOT NULL,
  category TEXT,
  payload JSONB NOT NULL
);

-- Índices ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_updated ON public.rooms(updated_at);
CREATE INDEX IF NOT EXISTS idx_room_players_room ON public.room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_auth ON public.room_players(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_room_round ON public.round_submissions(room_id, round_number);
CREATE INDEX IF NOT EXISTS idx_catalog_game ON public.catalog_items(game);

-- Idempotência: um voto/validação por jogador por rodada
CREATE UNIQUE INDEX IF NOT EXISTS uq_submission_single
  ON public.round_submissions(room_id, round_number, player_id, submission_type)
  WHERE submission_type IN ('VOTE', 'VALIDATION');

-- Trigger de updated_at ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rooms_updated ON public.rooms;
CREATE TRIGGER trg_rooms_updated BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_secrets_updated ON public.round_secrets;
CREATE TRIGGER trg_secrets_updated BEFORE UPDATE ON public.round_secrets
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- =====================================================================
-- Row Level Security
-- Toda escrita acontece via RPCs SECURITY DEFINER (functions_rpc.sql).
-- =====================================================================
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

-- Membro da sala = possui linha em room_players com o auth.uid() atual
CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_id = p_room_id AND auth_user_id = auth.uid() AND NOT is_kicked
  );
$$;

DROP POLICY IF EXISTS rooms_select_members ON public.rooms;
CREATE POLICY rooms_select_members ON public.rooms
  FOR SELECT TO authenticated USING (public.is_room_member(id));

DROP POLICY IF EXISTS players_select_members ON public.room_players;
CREATE POLICY players_select_members ON public.room_players
  FOR SELECT TO authenticated USING (public.is_room_member(room_id));

-- round_secrets: SEM policies => nenhum SELECT/INSERT/UPDATE direto é possível.

DROP POLICY IF EXISTS submissions_select_own ON public.round_submissions;
CREATE POLICY submissions_select_own ON public.round_submissions
  FOR SELECT TO authenticated USING (
    player_id IN (SELECT id FROM public.room_players WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS catalog_public_read ON public.catalog_items;
CREATE POLICY catalog_public_read ON public.catalog_items
  FOR SELECT TO anon, authenticated USING (true);

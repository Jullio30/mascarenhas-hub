-- =============================================================================
-- Mascarenhas Hub — Migração v2 (expansão para 10 jogos)
-- Retrocompatível: pode ser executada várias vezes e não apaga dados.
-- Os 5 jogos originais continuam funcionando sem nenhuma alteração.
--
-- O que muda:
--   1. round_submissions ganha `cycle_number` (Infiltrado tem vários ciclos de votação por partida).
--   2. A unicidade de submissões passa a ser (room_id, round_number, cycle_number, player_id, submission_type)
--      e cobre os novos tipos: BLUFF (Blefe), ORDER (Ordem Caótica), ANSWER (Sabe ou Perde).
--   3. record_submission ganha um parâmetro opcional p_cycle_number (assinatura antiga preservada).
--
-- Observação: os slugs dos jogos não têm CHECK no banco, então os novos jogos
-- ('blefe', 'infiltrado', 'sabe-ou-perde', 'quem-e-mais-provavel', 'ordem-caotica')
-- já são aceitos por host_save_state sem migração.
-- =============================================================================

ALTER TABLE public.round_submissions ADD COLUMN IF NOT EXISTS cycle_number INT NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS public.uq_submission_single;
CREATE UNIQUE INDEX IF NOT EXISTS uq_submission_single_v2
  ON public.round_submissions(room_id, round_number, cycle_number, player_id, submission_type)
  WHERE submission_type IN ('VOTE', 'VALIDATION', 'BLUFF', 'ORDER', 'ANSWER');

CREATE OR REPLACE FUNCTION public.record_submission(p_room_id UUID, p_round_number INT, p_type TEXT, p_payload JSONB, p_cycle_number INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me UUID := public._my_player_id(p_room_id);
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'NOT_A_MEMBER'; END IF;
  INSERT INTO public.round_submissions (room_id, round_number, cycle_number, player_id, submission_type, payload)
  VALUES (p_room_id, p_round_number, COALESCE(p_cycle_number, 0), v_me, upper(left(p_type, 30)), p_payload)
  ON CONFLICT DO NOTHING; -- clique duplo / reenvio: ignorado (idempotente)
END;
$$;

REVOKE ALL ON FUNCTION public.record_submission(UUID, INT, TEXT, JSONB, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_submission(UUID, INT, TEXT, JSONB, INT) TO authenticated;

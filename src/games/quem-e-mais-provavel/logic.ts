import type { BasePublicState, EngineCtx, GameDraft, GameEngine, Player } from '../../types/game.types';
import { cfgNum, cfgStr, customContent, mergePools, pickUnused } from '../../core/engine/helpers';
import { MOST_LIKELY_CATALOG, MOST_LIKELY_VIBE_GROUPS, type MostLikelyPrompt } from './mostLikelyCatalog';

/**
 * Fluxo da rodada (4 etapas):
 *  1–2. DISCUSSION: pergunta para todos, votação FECHADA; cada um marca "Pronto para votar" (pode desmarcar).
 *  3.   SECRET_VOTING: abre sozinha quando todos os conectados estão prontos OU o tempo de discussão acaba.
 *       Votar encerra a participação do jogador na etapa (prontidão efetiva = pronto || votou).
 *  4.   SIMULTANEOUS_REVEAL: todos votaram (conectados) ou o tempo de votação acabou → revelação + pontos.
 */
export type QmpPhase = 'DISCUSSION' | 'SECRET_VOTING' | 'SIMULTANEOUS_REVEAL' | 'FINISHED';

export interface QmpState extends BasePublicState {
  phase: QmpPhase;
  participants: string[];
  promptId: string;
  prompt: string;
  votedIds: string[];
  /** Quem marcou "Pronto para votar" na discussão (público: é só prontidão, não revela voto). */
  readyIds: string[];
  /** Revelados só em SIMULTANEOUS_REVEAL. */
  votes: Record<string, string> | null;
  received: Record<string, number> | null;
  winners: string[] | null;
  pointsDelta: Record<string, number>;
}

export interface QmpSecret {
  votes: Record<string, string>;
  /** chaves de idempotência `scored_round_${n}` */
  scored: string[];
  /** Perguntas da partida (oficiais filtradas por intensidade + pacotes personalizados do anfitrião). */
  pool?: { id: string; text: string }[];
}

export interface QmpView {
  myVote: string | null;
}

type Draft = GameDraft<QmpState, QmpSecret>;

export const REVEAL_MS = 12_000;
export const DEFAULT_DISCUSS_SECONDS = 60;
export const DEFAULT_VOTE_SECONDS = 20;

/** Elegíveis = participantes conectados. Quem cai não segura a fase (quórum dinâmico). */
const eligible = (pub: QmpState, ctx: EngineCtx) => pub.participants.filter((id) => ctx.isOnline(id));

/** Prontidão efetiva: votar sempre conta como pronto (nunca exige outro clique depois do voto). */
export const isEffectivelyReady = (pub: QmpState, sec: QmpSecret, id: string) => pub.readyIds.includes(id) || Boolean(sec.votes[id]);

function openVoting(d: Draft, ctx: EngineCtx) {
  d.pub.phase = 'SECRET_VOTING';
  d.pub.endsAt = ctx.now + cfgNum(ctx, 'voteTimeSeconds', DEFAULT_VOTE_SECONDS) * 1000;
}

/** Avança a fase se o quórum dos conectados foi atingido. Retorna true quando houve mudança. */
function checkQuorum(d: Draft, ctx: EngineCtx): boolean {
  const { pub, sec } = d;
  const online = eligible(pub, ctx);
  if (!online.length) return false;
  if (pub.phase === 'DISCUSSION' && online.every((id) => isEffectivelyReady(pub, sec, id))) {
    openVoting(d, ctx);
    return true;
  }
  if (pub.phase === 'SECRET_VOTING' && online.every((id) => Boolean(sec.votes[id]))) {
    reveal(d, ctx);
    return true;
  }
  return false;
}

/**
 * Pontuação exata (imutável):
 *  - +1 por voto recebido
 *  - +2 para quem votou (no tempo) em alguém do conjunto W dos mais votados (empates no topo contam todos, sem duplicar)
 */
export function scoreRound(participants: string[], votes: Record<string, string>) {
  const received: Record<string, number> = {};
  participants.forEach((id) => (received[id] = 0));
  Object.entries(votes).forEach(([voter, target]) => {
    if (voter === target || !(target in received)) return;
    received[target] += 1;
  });
  const M = Math.max(0, ...Object.values(received));
  const W = M > 0 ? participants.filter((id) => received[id] === M) : [];
  const delta: Record<string, number> = {};
  participants.forEach((id) => {
    const bonus = votes[id] && votes[id] !== id && W.includes(votes[id]) ? 2 : 0;
    delta[id] = received[id] * 1 + bonus;
  });
  return { received, W, delta };
}

function startRound(d: Draft, ctx: EngineCtx) {
  const pool = d.sec.pool?.length ? d.sec.pool : MOST_LIKELY_CATALOG;
  const prompt = pickUnused(pool, (p) => p.id, ctx);
  d.sec.votes = {};
  Object.assign(d.pub, {
    phase: 'DISCUSSION',
    promptId: prompt.id,
    prompt: prompt.text,
    votedIds: [],
    readyIds: [],
    votes: null,
    received: null,
    winners: null,
    pointsDelta: {},
    endsAt: ctx.now + cfgNum(ctx, 'discussTimeSeconds', DEFAULT_DISCUSS_SECONDS) * 1000,
  } satisfies Partial<QmpState>);
}

function reveal(d: Draft, ctx: EngineCtx) {
  const { pub, sec } = d;
  const key = `scored_round_${pub.round}`;
  const { received, W, delta } = scoreRound(pub.participants, sec.votes);
  pub.votes = { ...sec.votes };
  pub.received = received;
  pub.winners = W;
  pub.phase = 'SIMULTANEOUS_REVEAL';
  pub.endsAt = ctx.now + REVEAL_MS;
  if (sec.scored.includes(key)) return; // idempotência
  sec.scored = [...sec.scored, key];
  pub.pointsDelta = delta;
  Object.entries(delta).forEach(([id, pts]) => ctx.award(id, pts));
  pub.participants.forEach((id) => {
    if (!sec.votes[id]) return;
    ctx.stat(id, W.includes(sec.votes[id]) ? 'perfect' : 'miss');
  });
  if (W.length) ctx.log(`Mais provável: ${W.map((id) => ctx.players.find((p) => p.id === id)?.nickname ?? '?').join(' e ')}`);
}

export function createQmp(players: Player[], _config: unknown, ctx: EngineCtx): Draft {
  const pub: QmpState = {
    phase: 'DISCUSSION',
    round: 1,
    totalRounds: cfgNum(ctx, 'rounds', 8),
    endsAt: null,
    participants: players.map((p) => p.id),
    promptId: '',
    prompt: '',
    votedIds: [],
    readyIds: [],
    votes: null,
    received: null,
    winners: null,
    pointsDelta: {},
  };
  const vibes = MOST_LIKELY_VIBE_GROUPS[cfgStr(ctx, 'vibe', 'todas')] ?? MOST_LIKELY_VIBE_GROUPS.todas;
  const official: MostLikelyPrompt[] = MOST_LIKELY_CATALOG.filter((p) => vibes.includes(p.vibe));
  const { mode, items } = customContent(ctx);
  const pool = mergePools<{ id: string; text: string }>(official.length ? official : MOST_LIKELY_CATALOG, items.map((it) => ({ id: it.id, text: it.text })), mode);
  // "Apenas meus pacotes" com poucos itens: não repete pergunta só para completar as rodadas.
  pub.totalRounds = Math.max(1, Math.min(pub.totalRounds, pool.length));
  const d: Draft = { pub, sec: { votes: {}, scored: [], pool: pool.map((p) => ({ id: p.id, text: p.text })) } };
  startRound(d, ctx);
  return d;
}

export const qmpEngine: GameEngine<QmpState, QmpSecret> = {
  action(d, from, a, ctx) {
    const { pub, sec } = d;
    if (!pub.participants.includes(from)) return false;
    if (a.type === 'READY') {
      // só na discussão; `ready: false` desmarca (continuar argumentando) enquanto o quórum não fechou
      if (pub.phase !== 'DISCUSSION') return false;
      const want = a.ready !== false;
      const has = pub.readyIds.includes(from);
      if (want === has) return false; // idempotente
      pub.readyIds = want ? [...pub.readyIds, from] : pub.readyIds.filter((id) => id !== from);
      checkQuorum(d, ctx);
      return true;
    }
    // voto prematuro (na discussão) ou fora de fase é rejeitado
    if (a.type !== 'VOTE' || pub.phase !== 'SECRET_VOTING') return false;
    const target = String(a.target ?? '');
    // validador: participante, alvo válido, PROIBIDO votar em si mesmo, 1 voto por jogador (sem troca: idempotente)
    if (!pub.participants.includes(target) || target === from) return false;
    if (sec.votes[from]) return false;
    sec.votes[from] = target;
    pub.votedIds = [...pub.votedIds, from];
    checkQuorum(d, ctx);
    return true;
  },
  tick(d, ctx) {
    const { pub } = d;
    // estados antigos (antes da etapa de discussão) não têm readyIds
    if (!Array.isArray(pub.readyIds)) pub.readyIds = [];
    if ((pub.phase === 'DISCUSSION' || pub.phase === 'SECRET_VOTING') && checkQuorum(d, ctx)) return true;
    if (!pub.endsAt || ctx.now < pub.endsAt) return false;
    if (pub.phase === 'DISCUSSION') {
      openVoting(d, ctx); // tempo de discussão acabou: votação abre para todos
      return true;
    }
    if (pub.phase === 'SECRET_VOTING') {
      reveal(d, ctx); // tempo de votação acabou: revela com os votos recebidos
      return true;
    }
    if (pub.phase === 'SIMULTANEOUS_REVEAL') {
      if (pub.round >= pub.totalRounds) {
        pub.phase = 'FINISHED';
        pub.endsAt = null;
      } else {
        pub.round += 1;
        startRound(d, ctx);
      }
      return true;
    }
    return false;
  },
  views(d, players) {
    const out: Record<string, QmpView> = {};
    players.forEach((p) => (out[p.id] = { myVote: d.sec.votes[p.id] ?? null }));
    return out;
  },
};

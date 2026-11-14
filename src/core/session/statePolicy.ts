/**
 * Regras puras de confiança para mensagens já AUTENTICADAS (assinatura verificada em secureEnvelope.ts).
 * A assinatura prova QUEM enviou; estas regras decidem se aquele remetente PODE fazer aquilo.
 */
import type { PresenceStatus, RoomSnapshot } from '../../types/game.types';
import type { WireMsg } from '../realtime/roomChannel';

export interface StateTrustContext {
  /** Snapshot que este dispositivo considera atual (null logo após entrar). */
  current: RoomSnapshot | null;
  presence: Record<string, PresenceStatus>;
  /** Snapshot da autoridade local, quando ESTE dispositivo é o anfitrião. */
  authoritySnap: RoomSnapshot | null;
}

/**
 * Quem pode publicar o estado oficial da sala:
 *  - o anfitrião atual (inclusive quando ele mesmo transfere o posto), ignorando replays de versões antigas;
 *  - na migração, um MEMBRO da sala que se declara anfitrião enquanto o anfitrião atual está ausente;
 *  - se este dispositivo é anfitrião (conflito após queda de rede), um membro que se declara anfitrião com estado mais recente.
 */
export function stateSenderAllowed(from: string, snap: RoomSnapshot, ctx: StateTrustContext): boolean {
  if (!snap || typeof snap !== 'object' || !Array.isArray(snap.players) || typeof snap.hostId !== 'string') return false;
  const cur = ctx.current;
  if (!cur) return snap.hostId === from;
  if (from === cur.hostId && !ctx.authoritySnap) {
    return !(snap.hostId === cur.hostId && typeof snap.version === 'number' && snap.version < cur.version);
  }
  const member = cur.players.some((p) => p.id === from);
  if (!member || snap.hostId !== from) return false;
  if (ctx.authoritySnap) return snap.updatedAt > ctx.authoritySnap.updatedAt;
  return !ctx.presence[cur.hostId];
}

/** Remetente ainda sem chave fixada só é aceito na entrada (hello/request_state) ou em sala antiga sem registro de chaves. */
export function firstContactAllowed(msg: WireMsg, current: RoomSnapshot | null): boolean {
  if (msg.t === 'hello' || msg.t === 'request_state') return true;
  if (msg.t === 'state') return !current?.keys || Object.keys(current.keys).length === 0;
  return false;
}

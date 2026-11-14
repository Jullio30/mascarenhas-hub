/**
 * Mascarenhas Hub — autenticidade das mensagens da sala (anti-spoofing / anti-replay).
 *
 * O transporte (Supabase Realtime Broadcast ou BroadcastChannel) entrega qualquer payload a todos do canal,
 * e o campo `from` seria texto livre. Aqui cada jogador possui um par de chaves ECDSA P-256 (Web Crypto),
 * guardado junto com a sessão (localStorage no online, sessionStorage por aba no Modo Local) para sobreviver ao F5.
 *
 * Toda mensagem vira um envelope assinado sobre (sala, remetente, seq, dados):
 *   { v: 1, room, from, seq, data: JSON da WireMsg, pk: chave pública, sig }
 * O receptor:
 *   - confere que `data.from === from` e que a sala é a mesma;
 *   - verifica a assinatura com a chave FIXADA para aquele `from` (registro da sala em `snapshot.keys`);
 *     remetente desconhecido só é aceito (TOFU) quando a política do chamador permite (ex.: `hello` de entrada);
 *   - descarta seq repetido ou menor que o último aceito daquele remetente (anti-replay).
 */
import type { WireMsg } from './roomChannel';

export interface SignedEnvelope {
  v: 1;
  room: string;
  from: string;
  seq: number;
  data: string;
  pk: JsonWebKey;
  sig: string;
}

const IDENTITY_KEY = 'mascarenhas_hub_identity_v1';
const MAX_DATA = 900_000;
const ALGO = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;

const enc = new TextEncoder();

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('Conexão segura (HTTPS) necessária para entrar na sala.');
  return s;
}

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function signingInput(room: string, from: string, seq: number, data: string): Uint8Array<ArrayBuffer> {
  return enc.encode(`mascarenhas-hub/v1\n${room}\n${from}\n${seq}\n${data}`);
}

/** Forma canônica e comparável de uma chave pública EC (só x/y/crv). */
export function publicKeyId(jwk: JsonWebKey | null | undefined): string {
  if (!jwk || typeof jwk !== 'object') return '';
  return `${jwk.crv ?? ''}:${jwk.x ?? ''}:${jwk.y ?? ''}`;
}

export function samePublicKey(a: JsonWebKey | null | undefined, b: JsonWebKey | null | undefined): boolean {
  const ia = publicKeyId(a);
  return Boolean(ia) && ia === publicKeyId(b);
}

function cleanPublicJwk(jwk: JsonWebKey): JsonWebKey {
  return { kty: 'EC', crv: jwk.crv, x: jwk.x, y: jwk.y };
}

function isPublicJwk(v: unknown): v is JsonWebKey {
  const j = v as JsonWebKey;
  return Boolean(j) && typeof j === 'object' && j.kty === 'EC' && j.crv === 'P-256' && typeof j.x === 'string' && typeof j.y === 'string' && !('d' in j);
}

const importCache = new Map<string, Promise<CryptoKey>>();
function importPublic(jwk: JsonWebKey): Promise<CryptoKey> {
  const id = publicKeyId(jwk);
  let p = importCache.get(id);
  if (!p) {
    p = subtle().importKey('jwk', cleanPublicJwk(jwk), ALGO, false, ['verify']);
    importCache.set(id, p);
    p.catch(() => importCache.delete(id));
  }
  return p;
}

export async function verifySignature(jwk: JsonWebKey, input: Uint8Array<ArrayBuffer>, sigB64: string): Promise<boolean> {
  try {
    const key = await importPublic(jwk);
    return await subtle().verify(SIGN, key, fromB64(sigB64), input);
  } catch {
    return false;
  }
}

/** Credencial criptográfica do jogador nesta sessão. */
export class PlayerIdentity {
  private constructor(
    private readonly privateKey: CryptoKey,
    readonly publicJwk: JsonWebKey,
  ) {}

  private lastSeq = 0;

  /** Carrega a credencial salva (F5) ou cria uma nova e salva no storage informado. */
  static async load(storage: Storage | null): Promise<PlayerIdentity> {
    try {
      const raw = storage?.getItem(IDENTITY_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { priv: JsonWebKey; pub: JsonWebKey };
        if (saved?.priv && isPublicJwk(saved.pub)) {
          const priv = await subtle().importKey('jwk', saved.priv, ALGO, false, ['sign']);
          return new PlayerIdentity(priv, cleanPublicJwk(saved.pub));
        }
      }
    } catch {
      /* credencial corrompida: gera outra */
    }
    const pair = (await subtle().generateKey(ALGO, true, ['sign', 'verify'])) as CryptoKeyPair;
    const priv = await subtle().exportKey('jwk', pair.privateKey);
    const pub = cleanPublicJwk(await subtle().exportKey('jwk', pair.publicKey));
    try {
      storage?.setItem(IDENTITY_KEY, JSON.stringify({ priv, pub }));
    } catch {
      /* storage cheio/bloqueado: a credencial vale só para esta página */
    }
    const signKey = await subtle().importKey('jwk', priv, ALGO, false, ['sign']);
    return new PlayerIdentity(signKey, pub);
  }

  /** Sequência estritamente crescente, inclusive entre recarregamentos (baseada no relógio). */
  nextSeq(): number {
    this.lastSeq = Math.max(this.lastSeq + 1, Date.now() * 1000);
    return this.lastSeq;
  }

  async seal(room: string, msg: WireMsg): Promise<SignedEnvelope> {
    const data = JSON.stringify(msg);
    const seq = this.nextSeq();
    const sig = await subtle().sign(SIGN, this.privateKey, signingInput(room, msg.from, seq, data));
    return { v: 1, room, from: msg.from, seq, data, pk: this.publicJwk, sig: toB64(sig) };
  }
}

const WIRE_TYPES = new Set(['state', 'views', 'views_changed', 'action', 'hello', 'request_state', 'reaction']);

export interface OpenedMessage {
  msg: WireMsg;
  /** Chave pública com que a mensagem foi verificada. */
  pk: JsonWebKey;
  /** true quando o remetente ainda não tinha chave fixada (primeiro contato). */
  firstContact: boolean;
}

/**
 * Verificador do lado receptor: chaves fixadas por jogador + último seq aceito.
 * `allowFirstContact` decide se um remetente sem chave fixada pode ser aceito (e fixado) por esta mensagem.
 */
export class MessageVerifier {
  private keys = new Map<string, JsonWebKey>();
  private lastSeq = new Map<string, number>();

  constructor(private room: string) {}

  /** Fixa (ou atualiza, quando a fonte é confiável) a chave de um jogador. */
  pin(playerId: string, jwk: JsonWebKey | null | undefined) {
    if (typeof playerId === 'string' && playerId && isPublicJwk(jwk)) this.keys.set(playerId, cleanPublicJwk(jwk));
  }

  /** Fixa todas as chaves de um registro confiável (snapshot vindo do servidor/anfitrião verificado). */
  pinAll(keys: Record<string, JsonWebKey> | null | undefined) {
    if (!keys || typeof keys !== 'object') return;
    for (const [id, jwk] of Object.entries(keys)) this.pin(id, jwk);
  }

  keyOf(playerId: string): JsonWebKey | undefined {
    return this.keys.get(playerId);
  }

  async open(raw: unknown, allowFirstContact: (msg: WireMsg) => boolean): Promise<OpenedMessage | null> {
    const env = raw as SignedEnvelope;
    if (!env || typeof env !== 'object' || env.v !== 1) return null;
    if (env.room !== this.room || typeof env.from !== 'string' || !env.from) return null;
    if (typeof env.seq !== 'number' || !Number.isSafeInteger(env.seq) || env.seq <= 0) return null;
    if (typeof env.data !== 'string' || env.data.length > MAX_DATA || typeof env.sig !== 'string') return null;
    let msg: WireMsg;
    try {
      msg = JSON.parse(env.data) as WireMsg;
    } catch {
      return null;
    }
    if (!msg || typeof msg !== 'object' || !WIRE_TYPES.has((msg as { t?: string }).t ?? '') || msg.from !== env.from) return null;
    // anti-replay: seq precisa crescer por remetente
    if (env.seq <= (this.lastSeq.get(env.from) ?? 0)) return null;
    const pinned = this.keys.get(env.from);
    let key: JsonWebKey;
    let firstContact = false;
    if (pinned) {
      key = pinned; // a chave fixada SEMPRE prevalece sobre a que veio no envelope
    } else {
      if (!isPublicJwk(env.pk) || !allowFirstContact(msg)) return null;
      key = env.pk;
      firstContact = true;
    }
    const ok = await verifySignature(key, signingInput(env.room, env.from, env.seq, env.data), env.sig);
    if (!ok) return null;
    // re-checa após o await: outra mensagem do mesmo remetente pode ter sido aceita no meio
    if (env.seq <= (this.lastSeq.get(env.from) ?? 0)) return null;
    this.lastSeq.set(env.from, env.seq);
    if (firstContact) this.pin(env.from, key);
    return { msg, pk: key, firstContact };
  }
}

import { describe, expect, it } from 'vitest';
import { MessageVerifier, PlayerIdentity, samePublicKey, type SignedEnvelope } from '../src/core/realtime/secureEnvelope';
import { firstContactAllowed, stateSenderAllowed } from '../src/core/session/statePolicy';
import { RoomAuthority, makeInitialSnapshot, makePlayer } from '../src/core/engine/roomAuthority';
import type { WireMsg } from '../src/core/realtime/roomChannel';
import type { RoomSnapshot } from '../src/types/game.types';

/** Storage em memória (o mesmo contrato do localStorage/sessionStorage). */
class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

const ROOM = 'ABC234';
const action = (from: string, type = 'VOTE'): WireMsg => ({ t: 'action', from, a: { type, target: 'x' } });
const allowHello = (m: WireMsg) => m.t === 'hello';

describe('Credenciais e envelopes assinados (ECDSA P-256)', () => {
  it('mensagem assinada pelo dono da chave registrada é aceita', async () => {
    const alice = await PlayerIdentity.load(new MemStorage());
    const v = new MessageVerifier(ROOM);
    v.pin('alice', alice.publicJwk);
    const env = await alice.seal(ROOM, action('alice'));
    const opened = await v.open(env, () => false);
    expect(opened?.msg).toEqual(action('alice'));
  });

  it('falsificação de remetente: Mallory assina como "alice" → descartado', async () => {
    const alice = await PlayerIdentity.load(new MemStorage());
    const mallory = await PlayerIdentity.load(new MemStorage());
    const v = new MessageVerifier(ROOM);
    v.pin('alice', alice.publicJwk);
    const forged = await mallory.seal(ROOM, action('alice'));
    expect(await v.open(forged, () => true)).toBeNull(); // mesmo trazendo a própria chave no envelope
  });

  it('adulteração do conteúdo, do remetente, da sala ou do seq invalida a assinatura', async () => {
    const alice = await PlayerIdentity.load(new MemStorage());
    const v = new MessageVerifier(ROOM);
    v.pin('alice', alice.publicJwk);
    v.pin('bob', alice.publicJwk);
    const env = await alice.seal(ROOM, action('alice'));
    const tampered: SignedEnvelope[] = [
      { ...env, data: JSON.stringify(action('alice', 'ROOM/KICK')) },
      { ...env, from: 'bob', data: JSON.stringify(action('bob')) },
      { ...env, seq: env.seq + 1 },
    ];
    for (const t of tampered) expect(await v.open(t, () => false)).toBeNull();
    expect(await new MessageVerifier('OUTRA1').open(env, () => false)).toBeNull();
  });

  it('`from` interno diferente do envelope é rejeitado', async () => {
    const alice = await PlayerIdentity.load(new MemStorage());
    const v = new MessageVerifier(ROOM);
    v.pin('alice', alice.publicJwk);
    const env = await alice.seal(ROOM, action('alice'));
    const inner = JSON.parse(env.data);
    inner.from = 'host';
    expect(await v.open({ ...env, data: JSON.stringify(inner) }, () => false)).toBeNull();
  });

  it('anti-replay: a mesma mensagem (ou um seq antigo) não é aceita duas vezes', async () => {
    const alice = await PlayerIdentity.load(new MemStorage());
    const v = new MessageVerifier(ROOM);
    v.pin('alice', alice.publicJwk);
    const first = await alice.seal(ROOM, action('alice'));
    const second = await alice.seal(ROOM, action('alice'));
    expect(await v.open(second, () => false)).not.toBeNull();
    expect(await v.open(second, () => false)).toBeNull();
    expect(await v.open(first, () => false)).toBeNull();
  });

  it('remetente desconhecido só entra pelo hello (primeiro contato) e a chave fica fixada', async () => {
    const bob = await PlayerIdentity.load(new MemStorage());
    const mallory = await PlayerIdentity.load(new MemStorage());
    const v = new MessageVerifier(ROOM);
    expect(await v.open(await bob.seal(ROOM, action('bob')), allowHello)).toBeNull();
    const hello: WireMsg = { t: 'hello', from: 'bob', profile: { nickname: 'Bob', avatar: 'neon-fox' }, joinedAt: 1 };
    const opened = await v.open(await bob.seal(ROOM, hello), allowHello);
    expect(opened?.firstContact).toBe(true);
    expect(samePublicKey(v.keyOf('bob'), bob.publicJwk)).toBe(true);
    // depois de fixada, outra chave para "bob" não passa nem com hello
    expect(await v.open(await mallory.seal(ROOM, { ...hello }), allowHello)).toBeNull();
  });

  it('F5: a credencial é recarregada do storage (mesma chave) e o seq continua crescente', async () => {
    const st = new MemStorage();
    const a = await PlayerIdentity.load(st);
    const s1 = (await a.seal(ROOM, action('alice'))).seq;
    const b = await PlayerIdentity.load(st);
    expect(samePublicKey(a.publicJwk, b.publicJwk)).toBe(true);
    expect((await b.seal(ROOM, action('alice'))).seq).toBeGreaterThan(s1);
    expect(JSON.stringify(b.publicJwk)).not.toContain('"d"'); // a chave pública nunca carrega a parte privada
  });

  it('envelopes malformados não derrubam o verificador', async () => {
    const v = new MessageVerifier(ROOM);
    for (const junk of [null, 1, 'x', {}, { v: 1, room: ROOM }, { v: 1, room: ROOM, from: 'a', seq: 1, data: '{', sig: '', pk: {} }]) {
      expect(await v.open(junk, () => true)).toBeNull();
    }
  });
});

describe('Política de confiança do estado oficial (STATE_SYNC)', () => {
  const base = (): RoomSnapshot => {
    const s = makeInitialSnapshot(ROOM, null, makePlayer('host', { nickname: 'Host', avatar: 'neon-fox' }, 1));
    s.players.push(makePlayer('p1', { nickname: 'Um', avatar: 'neon-fox' }, 2), makePlayer('p2', { nickname: 'Dois', avatar: 'neon-fox' }, 3));
    s.version = 10;
    return s;
  };

  it('só o anfitrião atual publica estado; jogador comum injetando estado é ignorado', () => {
    const cur = base();
    const fake = { ...base(), hostId: 'p1', version: 99 };
    expect(stateSenderAllowed('host', { ...base(), version: 11 }, { current: cur, presence: { host: 'online' }, authoritySnap: null })).toBe(true);
    expect(stateSenderAllowed('p1', fake, { current: cur, presence: { host: 'online', p1: 'online' }, authoritySnap: null })).toBe(false);
  });

  it('replay de versão antiga do mesmo anfitrião é ignorado', () => {
    expect(stateSenderAllowed('host', { ...base(), version: 3 }, { current: base(), presence: {}, authoritySnap: null })).toBe(false);
  });

  it('migração: membro assume quando o anfitrião sumiu; estranho nunca assume', () => {
    const cur = base();
    expect(stateSenderAllowed('p1', { ...base(), hostId: 'p1' }, { current: cur, presence: { p1: 'online' }, authoritySnap: null })).toBe(true);
    expect(stateSenderAllowed('intruso', { ...base(), hostId: 'intruso' }, { current: cur, presence: {}, authoritySnap: null })).toBe(false);
  });

  it('transferência manual: o anfitrião atual publica o estado com o novo hostId', () => {
    expect(stateSenderAllowed('host', { ...base(), hostId: 'p2', version: 11 }, { current: base(), presence: { host: 'online' }, authoritySnap: null })).toBe(true);
  });

  it('primeiro contato: só hello/request_state; estado de desconhecido só em sala antiga sem chaves', () => {
    const withKeys = { ...base(), keys: { host: { kty: 'EC', crv: 'P-256', x: 'a', y: 'b' } } };
    const st: WireMsg = { t: 'state', from: 'x', snap: base() };
    expect(firstContactAllowed({ t: 'request_state', from: 'x' }, withKeys)).toBe(true);
    expect(firstContactAllowed(action('x'), withKeys)).toBe(false);
    expect(firstContactAllowed(st, withKeys)).toBe(false);
    expect(firstContactAllowed(st, base())).toBe(true);
  });
});

describe('Autoridade da sala: registro de chaves e comandos administrativos', () => {
  function authority() {
    const snap = makeInitialSnapshot(ROOM, null, makePlayer('host', { nickname: 'Host', avatar: 'neon-fox' }, 1));
    let now = 1_700_000_000_000;
    const a = new RoomAuthority(snap, null, {}, () => {}, () => (now += 10));
    a.setPresence({ host: 'online', p1: 'online', p2: 'online' });
    return a;
  }

  it('a primeira chave de um jogador é definitiva; outra chave para o mesmo id é recusada', async () => {
    const a = authority();
    const k1 = (await PlayerIdentity.load(new MemStorage())).publicJwk;
    const k2 = (await PlayerIdentity.load(new MemStorage())).publicJwk;
    a.addPlayer('p1', { nickname: 'Um', avatar: 'neon-fox' }, 2, k1);
    expect(samePublicKey(a.snap.keys!.p1, k1)).toBe(true);
    a.addPlayer('p1', { nickname: 'Impostor', avatar: 'neon-fox' }, 2, k2);
    expect(a.snap.players.find((p) => p.id === 'p1')!.nickname).toBe('Um');
    expect(samePublicKey(a.snap.keys!.p1, k1)).toBe(true);
    expect(JSON.stringify(a.snap.keys)).not.toContain('"d"');
  });

  it('comandos administrativos de quem não é o anfitrião são ignorados', () => {
    const a = authority();
    a.addPlayer('p1', { nickname: 'Um', avatar: 'neon-fox' }, 2);
    a.addPlayer('p2', { nickname: 'Dois', avatar: 'neon-fox' }, 3);
    const before = JSON.stringify({ ...a.snap, version: 0, updatedAt: 0, log: [] });
    for (const cmd of [
      { type: 'ROOM/SELECT_GAME', slug: 'impostor' },
      { type: 'ROOM/SET_CONFIG', key: 'rounds', value: 99 },
      { type: 'ROOM/KICK', playerId: 'p2' },
      { type: 'ROOM/TRANSFER_HOST', playerId: 'p1' },
      { type: 'ROOM/START' },
      { type: 'ROOM/END_MATCH' },
      { type: 'ROOM/PAUSE' },
      { type: 'ROOM/SKIP' },
    ]) {
      a.handle('p1', cmd);
    }
    expect(JSON.stringify({ ...a.snap, version: 0, updatedAt: 0, log: [] })).toBe(before);
    a.handle('host', { type: 'ROOM/SELECT_GAME', slug: 'impostor' });
    expect(a.snap.gameSlug).toBe('impostor');
  });

  it('SET_CONFIG rejeita objetos, chaves perigosas e valores não primitivos', () => {
    const a = authority();
    const slug = a.snap.gameSlug;
    a.handle('host', { type: 'ROOM/SET_CONFIG', key: '__proto__', value: 1 });
    a.handle('host', { type: 'ROOM/SET_CONFIG', key: 'rounds', value: { evil: true } });
    a.handle('host', { type: 'ROOM/SET_CONFIG', key: 'rounds', value: Number.NaN });
    expect(a.snap.configs[slug]!.rounds).not.toEqual({ evil: true });
    expect(Object.prototype.hasOwnProperty.call(a.snap.configs[slug], '__proto__')).toBe(false);
    a.handle('host', { type: 'ROOM/SET_CONFIG', key: 'rounds', value: 3 });
    expect(a.snap.configs[slug]!.rounds).toBe(3);
  });

  it('ação de jogo de quem não está na sala é ignorada; ação malformada não derruba a sala', () => {
    const a = authority();
    a.handle('estranho', { type: 'VOTE', target: 'host' });
    a.handle('host', null as never);
    a.handle(42 as never, { type: 'ROOM/START' });
    expect(a.snap.status).toBe('LOBBY');
  });
});

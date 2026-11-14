import { describe, expect, it } from 'vitest';
import { RoomAuthority, makeInitialSnapshot, makePlayer, uniqueNickname } from '../src/core/engine/roomAuthority';

const prof = (nickname: string) => ({ nickname, avatar: 'neon-fox' });

function room() {
  const snap = makeInitialSnapshot('ABC234', null, makePlayer('host', prof('João'), 1));
  const a = new RoomAuthority(snap, null, {}, () => {}, () => 1_700_000_000_000);
  a.setPresence({ host: 'online' });
  return a;
}
const nicks = (a: RoomAuthority) => a.snap.players.map((p) => p.nickname);

describe('Apelidos únicos na sala', () => {
  it('nome repetido ganha sufixo numérico, ignorando maiúsculas e acentos', () => {
    const a = room();
    a.addPlayer('p1', prof('joao'), 2);
    a.addPlayer('p2', prof('JOÃO'), 3);
    a.addPlayer('p3', prof('Maria'), 4);
    expect(nicks(a)).toEqual(['João', 'joao 2', 'JOÃO 3', 'Maria']);
  });

  it('reconexão (mesmo id) mantém o apelido e não gera mudança de estado', () => {
    const a = room();
    a.addPlayer('p1', prof('João'), 2);
    const v = a.snap.version;
    a.addPlayer('p1', prof('João'), 2);
    expect(nicks(a)).toEqual(['João', 'João 2']);
    expect(a.snap.version).toBe(v);
  });

  it('o próprio jogador não colide consigo mesmo', () => {
    expect(uniqueNickname('Ana', 'a', [{ id: 'a', nickname: 'Ana' }])).toBe('Ana');
  });

  it('respeita o limite de 16 caracteres', () => {
    const long = 'Bartolomeu Silva';
    const r = uniqueNickname(long, 'x', [{ id: 'y', nickname: long }]);
    expect(r.length).toBeLessThanOrEqual(16);
    expect(r.endsWith(' 2')).toBe(true);
  });

  it('apelidos só com emoji diferentes não são tratados como iguais', () => {
    expect(uniqueNickname('😎', 'x', [{ id: 'y', nickname: '🔥' }])).toBe('😎');
    expect(uniqueNickname('🔥', 'x', [{ id: 'y', nickname: '🔥' }])).toBe('🔥 2');
  });
});

import { describe, expect, it } from 'vitest';
import { ESCAPE_REASON, maxCyclesFor, type InfSecret, type InfState } from '../src/games/infiltrado/logic';
import { infiltradoPlugin } from '../src/games/infiltrado';
import { Table, mkPlayers } from './helpers';

type T = Table<InfState, InfSecret>;

/** Leva a partida até HOST_TIEBREAK no ciclo informado (empate persistente após ciclo sem eliminação). */
function toTiebreak(n: number, cycle = 4): T {
  const t = new Table<InfState, InfSecret>('infiltrado', mkPlayers(n), { clueMode: 'spoken' }).start();
  t.expire(); // distribuição → ciclo 1
  t.pub.cycle = cycle;
  t.pub.noElimStreak = 1;
  // dicas faladas
  while (t.pub.phase === 'CLUE_ROUND') t.act(t.pub.order[t.pub.clueIndex], { type: 'CLUE' });
  expect(t.pub.phase).toBe('DISCUSSION');
  t.expire();
  expect(t.pub.phase).toBe('SECRET_VOTING');
  // empate 2×2 entre p0 e p1
  const alive = t.pub.participants;
  alive.forEach((id: string, i: number) => {
    if (alive.length % 2 === 1 && i === alive.length - 1) return; // ímpar: o último se abstém → 2×2
    const target = id === 'p0' ? 'p1' : id === 'p1' ? 'p0' : i % 2 ? 'p0' : 'p1';
    t.act(id, { type: 'VOTE', target });
  });
  if (t.pub.phase === 'SECRET_VOTING') t.expire();
  expect(t.pub.phase).toBe('TIE_DEFENSE_AND_REVOTE');
  t.expire(); // ninguém desempata
  expect(t.pub.phase).toBe('HOST_TIEBREAK');
  return t;
}

describe('Infiltrado — desempate justo e determinístico', () => {
  it('anfitrião ainda pode desempatar manualmente dentro do tempo', () => {
    const t = toTiebreak(5);
    const target = t.pub.tied![0];
    expect(t.act('p1', { type: 'TIEBREAK', target })).toBe(false); // só o anfitrião
    expect(t.act('p0', { type: 'TIEBREAK', target: 'p4' })).toBe(false); // só entre os empatados
    expect(t.act('p0', { type: 'TIEBREAK', target })).toBe(true);
    expect(t.pub.phase).toBe('ELIMINATION_REVEAL');
  });

  it('timeout do desempate: NINGUÉM é eliminado por sorteio e o jogo segue (impasse)', () => {
    for (let i = 0; i < 25; i++) {
      const t = toTiebreak(5);
      const aliveBefore = Object.values(t.pub.alive).filter(Boolean).length;
      t.expire();
      expect(t.pub.phase).toBe('NO_ELIMINATION');
      expect(t.pub.noElimReason).toBe('impasse');
      expect(t.pub.eliminatedId).toBeNull();
      expect(Object.values(t.pub.alive).filter(Boolean).length).toBe(aliveBefore);
      const cycle = t.pub.cycle;
      t.expire();
      expect(t.pub.cycle).toBe(cycle + 1);
    }
  });

  it('anfitrião offline: impasse imediato, sem esperar e sem sorteio', () => {
    const t = toTiebreak(5);
    t.offline.add('p0');
    t.tick(); // antes do fim do tempo
    expect(t.pub.phase).toBe('NO_ELIMINATION');
    expect(t.pub.noElimReason).toBe('impasse');
  });

  it('empate na votação final: a falta de consenso favorece o Infiltrado (fuga)', () => {
    const n = 5;
    const t = toTiebreak(n, maxCyclesFor(n));
    const uc = [...t.sec.undercoverIds];
    t.expire();
    expect(t.pub.phase).toBe('MATCH_RESULT');
    expect(t.pub.winner).toBe('INFILTRADOS');
    expect(t.pub.winReason).toBe(ESCAPE_REASON);
    uc.forEach((id) => expect(t.pub.pointsDelta[id]).toBe(1500));
  });

  it('o rótulo indica a votação final', () => {
    const n = 4;
    const t = toTiebreak(n, maxCyclesFor(n) - 1);
    t.expire(); // impasse
    t.expire(); // próximo ciclo = último
    expect(t.pub.cycle).toBe(maxCyclesFor(n));
    expect(t.pub.roundLabel).toMatch(/votação final/);
  });

  it('teto de ciclos nunca corta uma partida que está progredindo (n+1 ciclos)', () => {
    expect(maxCyclesFor(12)).toBe(13);
  });

  it('"Como jogar?" explica a regra de impasse e a fuga na votação final', () => {
    const rules = infiltradoPlugin.rulesSummary.join(' ');
    expect(rules).toMatch(/ninguém é eliminado por sorteio/);
    expect(rules).toMatch(/votação final/);
  });

  it('segredos: palavras e papéis não aparecem no estado público antes do resultado', () => {
    const t = new Table<InfState, InfSecret>('infiltrado', mkPlayers(5)).start();
    const pubJson = JSON.stringify(t.pub);
    expect(pubJson).not.toContain(t.sec.majorityWord);
    expect(pubJson).not.toContain(t.sec.undercoverWord);
    expect(t.pub.undercoverIds).toBeNull();
    const views = t.views();
    // cada um vê só a própria palavra, nunca o papel
    Object.values(views).forEach((v) => expect(Object.keys(v)).not.toContain('role'));
  });
});

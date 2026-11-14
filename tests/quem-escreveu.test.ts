import { describe, expect, it } from 'vitest';
import { sanitizeGuesses, scoreGuessesWw, type WwSecret, type WwState } from '../src/games/quem-escreveu/logic';
import { Table, mkPlayers } from './helpers';

function toGuessing(n = 4) {
  const t = new Table<WwState, WwSecret>('quem-escreveu', mkPlayers(n)).start();
  t.players.forEach((p) => t.act(p.id, { type: 'ANSWER', text: `resposta de ${p.id}` }));
  expect(t.pub.phase).toBe('GUESSING_AUTHORS');
  return t;
}
const anonOf = (t: Table<WwState, WwSecret>, pid: string) => Object.keys(t.sec.anonMap).find((a) => t.sec.anonMap[a] === pid)!;

describe('Quem Escreveu? — GUESSES com "passar a vez"', () => {
  it('submissão totalmente vazia é aceita como abstenção e não pontua ninguém', () => {
    const t = toGuessing(3);
    expect(t.act('p0', { type: 'GUESSES', guesses: {} })).toBe(true);
    expect(t.sec.guesses.p0).toEqual({});
    expect(t.pub.guessedIds).toContain('p0');
  });

  it.each([null, undefined, 'lixo', 42, ['resp_1'], { resp_1: 123 }])('payload malformado (%s) vira abstenção, sem travar', (bad) => {
    const t = toGuessing(3);
    expect(t.act('p1', { type: 'GUESSES', guesses: bad as unknown })).toBe(true);
    expect(t.sec.guesses.p1).toEqual({});
  });

  it('parcial: preserva os palpites válidos e ignora vazios/inválidos', () => {
    const t = toGuessing(4);
    const a1 = anonOf(t, 'p1');
    const a2 = anonOf(t, 'p2');
    const a3 = anonOf(t, 'p3');
    const own = anonOf(t, 'p0');
    t.act('p0', { type: 'GUESSES', guesses: { [a1]: 'p1', [a2]: '', [a3]: 'fantasma', [own]: 'p2', __proto__: 'p1', constructor: 'p2', resp_99: 'p1' } });
    expect(t.sec.guesses.p0).toEqual({ [a1]: 'p1' });
    // ninguém além de p0 ganhou ponto e nenhuma exceção (prototype pollution) aconteceu
    ['p1', 'p2', 'p3'].forEach((id) => t.act(id, { type: 'GUESSES', guesses: {} }));
    expect(t.pub.phase).toBe('REVEAL_AUTHORS');
    expect(t.pub.reveal.delta).toEqual({ p0: 100 });
    expect(({} as Record<string, unknown>).p1).toBeUndefined();
  });

  it('palpite no próprio palpiteiro ou em quem não escreveu é descartado', () => {
    const sec = { anonMap: { resp_1: 'a', resp_2: 'b' } };
    expect(sanitizeGuesses({ resp_1: 'c', resp_2: 'z' }, sec, 'c')).toEqual({});
    expect(sanitizeGuesses({ resp_2: 'a' }, sec, 'c')).toEqual({ resp_2: 'a' });
  });

  it('não aceita segunda submissão (idempotente)', () => {
    const t = toGuessing(3);
    t.act('p0', { type: 'GUESSES', guesses: {} });
    expect(t.act('p0', { type: 'GUESSES', guesses: { [anonOf(t, 'p1')]: 'p1' } })).toBe(false);
    expect(t.sec.guesses.p0).toEqual({});
  });

  it('abstenções não dão pontos de disfarce ao autor nem prejudicam acertos legítimos', () => {
    const t = toGuessing(3);
    const a1 = anonOf(t, 'p1');
    t.act('p0', { type: 'GUESSES', guesses: { [a1]: 'p1' } }); // acerto
    t.act('p1', { type: 'GUESSES', guesses: {} }); // passou
    t.act('p2', { type: 'GUESSES', guesses: {} }); // passou
    expect(t.pub.reveal.delta).toEqual({ p0: 100 });
  });

  it('timeout sem ninguém enviar avança limpo para a revelação, sem pontos', () => {
    const t = toGuessing(3);
    t.expire();
    expect(t.pub.phase).toBe('REVEAL_AUTHORS');
    expect(t.pub.reveal.delta).toEqual({});
    expect(t.players.every((p) => p.matchScore === 0)).toBe(true);
  });

  it('todos enviando (mesmo vazio) avança imediatamente', () => {
    const t = toGuessing(3);
    t.players.forEach((p) => t.act(p.id, { type: 'GUESSES', guesses: {} }));
    expect(t.pub.phase).toBe('REVEAL_AUTHORS');
  });

  it('quórum dinâmico: quem caiu na investigação não segura a revelação', () => {
    const t = toGuessing(4);
    ['p0', 'p1', 'p2'].forEach((id) => t.act(id, { type: 'GUESSES', guesses: {} }));
    expect(t.pub.phase).toBe('GUESSING_AUTHORS');
    t.offline.add('p3');
    t.tick();
    expect(t.pub.phase).toBe('REVEAL_AUTHORS');
  });

  it('autoria só aparece na revelação (estado público só tem {anonymousId, text})', () => {
    const t = toGuessing(4);
    expect(t.pub.answers!.every((a: object) => Object.keys(a).sort().join() === 'anonymousId,text')).toBe(true);
    expect(JSON.stringify(t.pub)).not.toContain('authorId');
  });

  it('pontuação original preservada', () => {
    const r = scoreGuessesWw({ resp_1: 'a', resp_2: 'b' }, { c: { resp_1: 'a', resp_2: 'a' }, a: { resp_2: 'c' } });
    expect(r.delta).toEqual({ c: 100, b: 100 });
  });
});

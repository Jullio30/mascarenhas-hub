import { describe, expect, it } from 'vitest';
import { MODALITY_OPTIONS, buildQuiz, type MusicSecret, type MusicState } from '../src/games/adivinhe-a-musica/logic';
import { MUSIC_FILTERS, MUSIC_QUIZ, type QuizKind } from '../src/data/musicExpansion';
import { DEFAULT_CATALOG } from '../src/data/defaultPacks';
import { Table, mkPlayers } from './helpers';

const QUIZ_KINDS: QuizKind[] = ['artista', 'info', 'contexto', 'decadas', 'generos'];

/** Joga N rodadas só por timeout e devolve o tipo de cada rodada. */
function playRounds(modality: string, genre: string, rounds: number) {
  const t = new Table<MusicState, MusicSecret>('adivinhe-a-musica', mkPlayers(3), { modality, genre, rounds }).start();
  const kinds: string[] = [];
  let guard = 0;
  while (t.pub.phase !== 'FINISHED' && guard++ < rounds * 4) {
    if (t.pub.phase === 'ROUND_ACTIVE') {
      expect(t.pub.unavailable ?? null).toBeNull();
      kinds.push(t.pub.mode === 'song' ? 'dicas' : t.pub.quiz!.kind);
    }
    t.expire();
  }
  expect(t.pub.phase).toBe('FINISHED');
  return kinds;
}

describe('Adivinhe a Música — isolamento estrito de modalidade', () => {
  it('as 7 modalidades estão disponíveis', () => {
    expect(MODALITY_OPTIONS.map((m) => m.value).sort()).toEqual(['artista', 'contexto', 'decadas', 'dicas', 'generos', 'info', 'mix'].sort());
  });

  // 40 rodadas esgotam o banco de "Complete a Informação" (31 itens): antes, o excedente virava pergunta de artista
  it.each(['dicas', ...QUIZ_KINDS])('modalidade "%s" nunca vira outra, mesmo após esgotar o catálogo (todos os gêneros)', (modality) => {
    const kinds = playRounds(modality, 'all', 40);
    expect(kinds.length).toBe(40);
    expect(new Set(kinds)).toEqual(new Set([modality]));
  });

  it.each(MUSIC_FILTERS.map((f) => f.value).filter((v) => v !== 'all'))('"Complete a Informação" com filtro %s continua sendo "info"', (genre) => {
    const kinds = playRounds('info', genre, 12);
    expect(new Set(kinds)).toEqual(new Set(['info']));
  });

  it.each(QUIZ_KINDS)('buildQuiz("%s") devolve sempre o mesmo tipo com 4 alternativas distintas e resposta válida', (kind) => {
    const t = new Table<MusicState, MusicSecret>('adivinhe-a-musica', mkPlayers(2), { modality: kind });
    for (let i = 0; i < 60; i++) {
      const q = buildQuiz(kind, t.ctx())!;
      expect(q.kind).toBe(kind);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });

  it('nível 2: reutiliza itens da MESMA modalidade quando os inéditos acabam', () => {
    const t = new Table<MusicState, MusicSecret>('adivinhe-a-musica', mkPlayers(2), { modality: 'info' });
    MUSIC_QUIZ.filter((q) => q.kind === 'info').forEach((q) => t.used.add(q.id));
    const q = buildQuiz('info', t.ctx())!;
    expect(q.kind).toBe('info');
  });

  it('nível 3: sem nenhum desafio possível, mostra aviso claro e NÃO troca de modalidade nem trava a sala', () => {
    const t = new Table<MusicState, MusicSecret>('adivinhe-a-musica', mkPlayers(3), { modality: 'contexto' });
    const empty = { ...DEFAULT_CATALOG, songs: [] };
    t.start({ catalog: empty });
    expect(t.pub.unavailable).toMatch(/Identificar pelo contexto/);
    expect(t.pub.quiz).toBeNull();
    expect(t.pub.endsAt).toBeNull();
    // não gira rodadas vazias nem aceita ações
    expect(t.tick(60_000)).toBe(false);
    expect(t.act('p1', { type: 'QUIZ_ANSWER', index: 0 })).toBe(false);
  });

  it('mix continua alternando modalidades (comportamento original preservado)', () => {
    const kinds = playRounds('mix', 'all', 16);
    expect(kinds[0]).toBe('dicas');
    expect(new Set(kinds).size).toBeGreaterThan(2);
  });

  it('quiz: resposta e acertos ficam secretos até a revelação; 1 resposta por jogador', () => {
    const t = new Table<MusicState, MusicSecret>('adivinhe-a-musica', mkPlayers(3), { modality: 'info' }).start();
    expect(JSON.stringify(t.pub)).not.toContain('quizCorrect');
    expect(t.pub.quizResult).toBeNull();
    expect(t.act('p0', { type: 'QUIZ_ANSWER', index: t.sec.quizCorrect })).toBe(true);
    expect(t.act('p0', { type: 'QUIZ_ANSWER', index: 0 })).toBe(false);
    expect(t.pub.correct).toEqual({});
    expect(t.players[0].matchScore).toBe(0);
    t.expire();
    expect(t.pub.quizResult!.correctIndex).toBe(t.sec.quizCorrect);
    expect(t.players[0].matchScore).toBeGreaterThan(0);
  });
});

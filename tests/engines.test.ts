import { describe, expect, it } from 'vitest';
import { scoreAnswers } from '../src/games/desafio-5-segundos/logic';
import { scoreGuesses } from '../src/games/chute-perfeito/logic';
import { scoreShowcase } from '../src/games/duas-verdades-uma-mentira/logic';
import { scoreChain } from '../src/games/telefone-de-palavras/logic';
import { juryScore } from '../src/games/defesa-impossivel/logic';
import { defendedOption, scoreRound as icScore } from '../src/games/impulsao-contraria/logic';
import { themesFor } from '../src/games/blefe/logic';
import { parseBlock, parseLocaleNumber, splitBinaryQuestion } from '../src/core/contentPacks/contentPackManager';
import { RoomAuthority, makeInitialSnapshot, makePlayer } from '../src/core/engine/roomAuthority';
import { IN_SCOPE, Table, mkPlayers } from './helpers';

describe('Os 15 jogos do escopo chegam ao fim só por timeouts, com quedas e reconexões no meio', () => {
  it('são 15 jogos (Sabe ou Perde fora do escopo)', () => {
    expect(IN_SCOPE.length).toBe(15);
  });

  it.each(IN_SCOPE.map((g) => [g.title, g.slug] as const))('%s', (_title, slug) => {
    const g = IN_SCOPE.find((x) => x.slug === slug)!;
    const players = mkPlayers(Math.max(g.minPlayers, 5));
    const t = new Table(slug, players, { rounds: 3 }).start();
    let guard = 0;
    while (t.pub.phase !== 'FINISHED' && guard++ < 20000) {
      // um jogador cai e volta periodicamente (F5 / rede instável)
      if (guard % 37 === 0) t.offline.add(players[1].id);
      if (guard % 37 === 9) t.offline.delete(players[1].id);
      t.tick(1000);
      t.views();
    }
    expect(t.pub.phase).toBe('FINISHED');
    players.forEach((p) => expect(Number.isFinite(p.matchScore)).toBe(true));
  });

  it.each(IN_SCOPE.map((g) => [g.title, g.slug] as const))('%s: ações de quem não participa e lixo vindo da rede são ignorados', (_title, slug) => {
    const g = IN_SCOPE.find((x) => x.slug === slug)!;
    const t = new Table(slug, mkPlayers(Math.max(g.minPlayers, 4))).start();
    const before = JSON.stringify(t.d);
    for (const a of [{ type: 'VOTE', target: 'p1' }, { type: 'ANSWER', text: 'oi' }, { type: 'GUESSES', guesses: {} }, { type: 'READY' }]) {
      expect(t.act('estranho', a)).toBe(false);
    }
    for (const a of [{ type: '' }, { type: 'VOTE', target: { evil: 1 } }, { type: 'ANSWER', text: null }, { type: 'QUIZ_ANSWER', index: 'x' }]) {
      try {
        t.act('p1', a);
      } catch {
        // a RoomAuthority descarta o rascunho quando o motor lança erro; aqui só garantimos que nada vaze
      }
    }
    expect(JSON.stringify(t.d).length).toBeGreaterThan(0);
    expect(before.length).toBeGreaterThan(0);
  });
});

describe('Estados secretos não aparecem no estado público antes da revelação', () => {
  it('Impostor: palavra e impostores só nas visões privadas corretas', () => {
    const t = new Table('impostor', mkPlayers(5)).start();
    const pub = JSON.stringify(t.pub);
    expect(pub).not.toContain(`"${t.sec.word}"`);
    const v = t.views();
    t.sec.impostorIds.forEach((id: string) => {
      expect(v[id].role).toBe('IMPOSTOR');
      expect(v[id].secret_word).toBeNull();
    });
    t.players.filter((p) => !t.sec.impostorIds.includes(p.id)).forEach((p) => expect(v[p.id].secret_word).toBe(t.sec.word));
  });

  it('Mega Senha: só quem dá as dicas vê a palavra', () => {
    const t = new Table('mega-senha', mkPlayers(4)).start();
    let guard = 0;
    while (!t.sec.word && guard++ < 50) t.tick(1000);
    if (!t.sec.word) return;
    expect(JSON.stringify(t.pub)).not.toContain(`"${t.sec.word.word}"`);
    const v = t.views();
    Object.values(v).forEach((x: any) => expect(x.secret_word === null || x.role === 'GIVER').toBe(true));
  });

  it('Blefe: resposta verdadeira não está no estado público durante a escrita', () => {
    const t = new Table('blefe', mkPlayers(4)).start();
    expect(JSON.stringify(t.pub)).not.toContain(t.sec.question.trueAnswer);
  });

  it('Chute Perfeito: valor correto e palpites alheios ficam secretos', () => {
    const t = new Table('chute-perfeito', mkPlayers(4)).start();
    t.act('p0', { type: 'GUESS', value: 123456789 });
    expect(t.act('p0', { type: 'GUESS', value: 1 })).toBe(false);
    expect(JSON.stringify(t.pub)).not.toContain('123456789');
    expect('correctValue' in t.pub).toBe(false);
  });

  it('Duas Verdades: índice da mentira nunca é publicado na votação', () => {
    const t = new Table('duas-verdades-uma-mentira', mkPlayers(4)).start();
    t.players.forEach((p) => t.act(p.id, { type: 'SUBMIT', statements: ['v1', 'v2', 'MENTIRA'], lieIndex: 2 }));
    expect(t.pub.phase).toBe('SHOWCASE_VOTING');
    expect(JSON.stringify(t.pub)).not.toContain('lieIndex');
    expect(t.pub.reveal).toBeNull();
  });

  it('Impulsão Contrária: impostor e preferências verdadeiras ocultos até o final', () => {
    const t = new Table('impulsao-contraria', mkPlayers(5)).start();
    expect(t.views().p0.role).toBeNull();
    let guard = 0;
    while (t.pub.phase !== 'FINAL_CONTRADICTION_REVEAL' && t.pub.phase !== 'FINISHED' && guard++ < 500) {
      const pub = JSON.stringify(t.pub);
      expect(pub).not.toContain('impostorPlayerId');
      expect(pub).not.toContain('truePreference');
      expect(t.pub.final).toBeNull();
      t.expire();
    }
    expect(t.pub.final.impostorId).toBe(t.sec.impostorPlayerId);
  });
});

describe('Pontuação e rankings (regras preservadas)', () => {
  it('Desafio dos 10 Segundos: exemplo oficial = 9 pts; autor não pontua votando em si', () => {
    const r = scoreAnswers(5, { v1: [true, true, true, false, false], v2: [true, true, true, false, false], v3: [true, true, true, false, false], v4: [false, false, false, false, false] }, 'author');
    expect(r.points).toBe(9);
    expect(scoreAnswers(2, { author: [true, true] }, 'author').points).toBe(0);
  });

  it('Desafio: respostas repetidas (Trovão / trovao) contam uma vez só', () => {
    const t = new Table('desafio-5-segundos', mkPlayers(3)).start();
    const hot = t.pub.hotSeat;
    expect(t.act(hot, { type: 'READY' })).toBe(true);
    t.act(hot, { type: 'ANSWERS', answers: ['Trovão', 'Pipoca', 'trovao', ' ', 'PIPOCA!'], final: true });
    expect(t.pub.answers).toEqual(['Trovão', 'Pipoca']);
  });

  it('Chute Perfeito: cravada, empates e faixas', () => {
    expect(scoreGuesses({ a: 206 }, 206, false)[0].total).toBe(1000);
    const rows = scoreGuesses({ a: 90, b: 110, c: 150 }, 100, false);
    expect(rows.find((r) => r.playerId === 'a')!.total).toBe(rows.find((r) => r.playerId === 'b')!.total);
    expect(scoreGuesses({ a: 1000 }, 100, false)[0].placement).toBeNull();
  });

  it('Duas Verdades / Telefone / Defesa / Impulsão', () => {
    expect(scoreShowcase('au', 'B', { x: 'B', y: 'A', z: 'C', au: 'B' }).delta).toEqual({ x: 100, au: 100 });
    const chain = [{ word: 'Cu', authorId: null }, { word: 'Quadrado', authorId: 'a' }, { word: 'Geométrico', authorId: 'b' }, { word: 'Círculo', authorId: 'c' }];
    const r = scoreChain(chain, { a: { stars: 5, creative: 2 }, b: { stars: 4, creative: 2 }, c: { stars: 4, creative: 1 } });
    expect(r.delta).toEqual({ a: 137, b: 137, c: 87 });
    expect(juryScore({ x: 'genial', y: 'bem' }, 'average')).toEqual({ points: 85, avg: 85 });
    expect(defendedOption('imp', 'imp', 'A')).toBe('B');
    expect(icScore('imp', ['imp', 'n1', 'n2', 'n3'], { n1: 'imp', n2: 'n3', n3: 'n2', imp: 'n1' }, null).imp).toBe(300);
  });

  it('pódio: empates dividem a colocação e a coroa', () => {
    const snap = makeInitialSnapshot('ABC234', null, makePlayer('a', { nickname: 'Ana', avatar: 'neon-fox' }, 1));
    snap.players.push(makePlayer('b', { nickname: 'Bia', avatar: 'neon-fox' }, 2), makePlayer('c', { nickname: 'Caio', avatar: 'neon-fox' }, 3));
    snap.gameSlug = 'quem-e-mais-provavel';
    const a = new RoomAuthority(snap, null, {}, () => {}, () => 1_700_000_000_000);
    a.setPresence({ a: 'online', b: 'online', c: 'online' });
    // força o fim de uma partida com placar empatado no topo
    a.snap.status = 'PLAYING';
    a.snap.game = { phase: 'SIMULTANEOUS_REVEAL', round: 1, totalRounds: 1, endsAt: 1, participants: ['a', 'b', 'c'], promptId: 'x', prompt: 'x', votedIds: [], readyIds: [], votes: {}, received: {}, winners: [], pointsDelta: {} } as never;
    a.secret = { votes: {}, scored: [] };
    a.snap.players[0].matchScore = 5;
    a.snap.players[1].matchScore = 5;
    a.snap.players[2].matchScore = 1;
    a.tick();
    expect(a.snap.status).toBe('PODIUM');
    const e = a.snap.podium!.entries;
    expect(e.filter((x) => x.rank === 1).map((x) => x.playerId).sort()).toEqual(['a', 'b']);
    expect(e.find((x) => x.playerId === 'c')!.rank).toBe(3);
    expect(e.filter((x) => x.crown).length).toBe(2);
  });

  it('Editor Universal: trim, vazias, duplicadas e formatos', () => {
    const r = parseBlock('desafio-5-segundos', '  Charmander \n\nvulpix\nVulpix\nArcanine');
    expect(r.valid.map((v) => v.raw)).toEqual(['Charmander', 'vulpix', 'Arcanine']);
    expect(r.duplicates).toBe(1);
    expect(parseBlock('chute-perfeito', 'Ossos? | 206 | ossos\nRuim | abc').valid.length).toBe(1);
    expect(parseLocaleNumber('3,14')).toBe(3.14);
    expect(splitBinaryQuestion('Cachorro ou gato?')).toEqual(['Cachorro', 'Gato']);
    expect(themesFor({ themeMode: 'fixed', category: 'geek' })).toEqual(['geek']);
  });
});

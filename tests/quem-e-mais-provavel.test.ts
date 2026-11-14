import { describe, expect, it } from 'vitest';
import { scoreRound, type QmpSecret, type QmpState } from '../src/games/quem-e-mais-provavel/logic';
import { quemEMaisProvavelPlugin } from '../src/games/quem-e-mais-provavel';
import { Table, mkPlayers } from './helpers';

const table = (n = 4, config = {}) => new Table<QmpState, QmpSecret>('quem-e-mais-provavel', mkPlayers(n), config).start();

describe('Quem é Mais Provável? — fluxo DISCUSSION → SECRET_VOTING → SIMULTANEOUS_REVEAL', () => {
  it('a rodada começa na discussão, com votação fechada', () => {
    const t = table();
    expect(t.pub.phase).toBe('DISCUSSION');
    expect(t.pub.readyIds).toEqual([]);
    expect(t.pub.endsAt).toBe(t.now + 60_000); // tempo de discussão padrão
  });

  it('rejeita voto prematuro durante a discussão', () => {
    const t = table();
    expect(t.act('p0', { type: 'VOTE', target: 'p1' })).toBe(false);
    expect(t.sec.votes).toEqual({});
    expect(t.pub.votedIds).toEqual([]);
  });

  it('votação abre sozinha quando TODOS os conectados ficam prontos', () => {
    const t = table(3);
    expect(t.act('p0', { type: 'READY', ready: true })).toBe(true);
    expect(t.act('p1', { type: 'READY', ready: true })).toBe(true);
    expect(t.pub.phase).toBe('DISCUSSION');
    expect(t.act('p2', { type: 'READY', ready: true })).toBe(true);
    expect(t.pub.phase).toBe('SECRET_VOTING');
    expect(t.pub.endsAt).toBe(t.now + 20_000);
  });

  it('jogador pode desmarcar "pronto" e continuar discutindo; READY repetido é idempotente', () => {
    const t = table(3);
    t.act('p0', { type: 'READY', ready: true });
    expect(t.act('p0', { type: 'READY', ready: true })).toBe(false);
    expect(t.act('p0', { type: 'READY', ready: false })).toBe(true);
    expect(t.pub.readyIds).toEqual([]);
    t.act('p1', { type: 'READY' });
    t.act('p2', { type: 'READY' });
    expect(t.pub.phase).toBe('DISCUSSION'); // p0 ainda discutindo
  });

  it('timeout da discussão abre a votação para todos (independente do timeout da votação)', () => {
    const t = table(4);
    t.act('p0', { type: 'READY' });
    t.expire();
    expect(t.pub.phase).toBe('SECRET_VOTING');
    // ninguém precisa clicar "pronto" de novo para votar
    expect(t.act('p3', { type: 'VOTE', target: 'p0' })).toBe(true);
  });

  it('READY fora da discussão é rejeitado', () => {
    const t = table(3);
    t.expire();
    expect(t.act('p0', { type: 'READY' })).toBe(false);
  });

  it('voto é único: sem duplicata, sem troca, sem votar em si mesmo, sem alvo inválido', () => {
    const t = table(3);
    t.expire();
    expect(t.act('p0', { type: 'VOTE', target: 'p0' })).toBe(false);
    expect(t.act('p0', { type: 'VOTE', target: 'intruso' })).toBe(false);
    expect(t.act('p0', { type: 'VOTE', target: 'p1' })).toBe(true);
    expect(t.act('p0', { type: 'VOTE', target: 'p2' })).toBe(false);
    expect(t.sec.votes.p0).toBe('p1');
    expect(t.pub.votedIds).toEqual(['p0']);
  });

  it('votar conta como pronto/finalizado: quando todos votam, revela sem exigir outro clique', () => {
    const t = table(3);
    t.expire();
    t.act('p0', { type: 'VOTE', target: 'p1' });
    t.act('p1', { type: 'VOTE', target: 'p2' });
    t.act('p2', { type: 'VOTE', target: 'p1' });
    expect(t.pub.phase).toBe('SIMULTANEOUS_REVEAL');
    expect(t.pub.winners).toEqual(['p1']);
  });

  it('timeout da votação revela com os votos recebidos (sem travar)', () => {
    const t = table(4);
    t.expire();
    t.act('p0', { type: 'VOTE', target: 'p1' });
    t.expire();
    expect(t.pub.phase).toBe('SIMULTANEOUS_REVEAL');
    expect(t.pub.received.p1).toBe(1);
    expect(t.pub.pointsDelta.p0).toBe(2); // votou no mais votado
  });

  it('quórum dinâmico: quem desconecta na discussão não segura a abertura da votação', () => {
    const t = table(4);
    t.act('p0', { type: 'READY' });
    t.act('p1', { type: 'READY' });
    t.act('p2', { type: 'READY' });
    expect(t.pub.phase).toBe('DISCUSSION');
    t.offline.add('p3');
    expect(t.tick()).toBe(true);
    expect(t.pub.phase).toBe('SECRET_VOTING');
  });

  it('quórum dinâmico: quem desconecta na votação não segura a revelação', () => {
    const t = table(4);
    t.expire();
    ['p0', 'p1', 'p2'].forEach((id) => t.act(id, { type: 'VOTE', target: id === 'p0' ? 'p1' : 'p0' }));
    expect(t.pub.phase).toBe('SECRET_VOTING');
    t.offline.add('p3');
    t.tick();
    expect(t.pub.phase).toBe('SIMULTANEOUS_REVEAL');
  });

  it('reconexão: prontidão e voto ficam no estado (público/visão privada) e são restaurados', () => {
    const t = table(3);
    t.act('p0', { type: 'READY' });
    t.offline.add('p0');
    t.tick();
    t.offline.delete('p0');
    expect(t.pub.readyIds).toContain('p0');
    t.expire();
    t.act('p0', { type: 'VOTE', target: 'p2' });
    expect(t.views().p0.myVote).toBe('p2');
    expect(t.views().p1.myVote).toBeNull();
    // o voto não aparece no estado público antes da revelação
    expect(t.pub.votes).toBeNull();
    expect(JSON.stringify(t.pub)).not.toContain('"p0":"p2"');
  });

  it('empate no topo: todos os empatados vencem e quem votou neles ganha +2', () => {
    const t = table(4);
    t.expire();
    t.act('p0', { type: 'VOTE', target: 'p1' });
    t.act('p1', { type: 'VOTE', target: 'p0' });
    t.act('p2', { type: 'VOTE', target: 'p1' });
    t.act('p3', { type: 'VOTE', target: 'p0' });
    expect(new Set(t.pub.winners)).toEqual(new Set(['p0', 'p1']));
    expect(t.pub.pointsDelta).toEqual({ p0: 4, p1: 4, p2: 2, p3: 2 });
  });

  it('pontuação aplicada uma única vez por rodada e progressão até FINISHED', () => {
    const t = table(3, { rounds: 5 });
    let guard = 0;
    while (t.pub.phase !== 'FINISHED' && guard++ < 100) t.expire();
    expect(t.pub.phase).toBe('FINISHED');
    expect(t.pub.round).toBe(5);
  });

  it('fórmula de pontuação inalterada', () => {
    const r = scoreRound(['a', 'b', 'c'], { a: 'b', b: 'a', c: 'b' });
    expect(r.W).toEqual(['b']);
    expect(r.delta).toEqual({ a: 3, b: 2, c: 2 });
  });

  it('"Como jogar?" descreve discussão, votação e resultado', () => {
    const rules = quemEMaisProvavelPlugin.rulesSummary.join(' ');
    expect(rules).toMatch(/Discussão/);
    expect(rules).toMatch(/pronto para votar/);
    expect(rules).toMatch(/Votação/);
    expect(rules).toMatch(/Resultado/);
  });
});

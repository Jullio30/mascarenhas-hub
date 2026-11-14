import { describe, expect, it } from 'vitest';
import { MOST_LIKELY_CATALOG, MOST_LIKELY_VIBE_GROUPS, type MostLikelyVibe } from '../src/games/quem-e-mais-provavel/mostLikelyCatalog';
import { quemEMaisProvavelPlugin } from '../src/games/quem-e-mais-provavel';
import { Table, mkPlayers } from './helpers';

const VIBES: MostLikelyVibe[] = ['cotidiano', 'sobrevivencia', 'futuro', 'zoeira', 'relacionamentos', 'caos', 'semfiltro'];
const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

describe('Catálogo de Quem é Mais Provável?', () => {
  it('foi expandido (≥ 193 originais + 150 novas)', () => {
    expect(MOST_LIKELY_CATALOG.length).toBeGreaterThanOrEqual(343);
  });

  it('IDs únicos, no padrão do arquivo e com prefixo coerente com a categoria', () => {
    const prefix: Record<MostLikelyVibe, string> = { cotidiano: 'qmp:c', sobrevivencia: 'qmp:s', futuro: 'qmp:f', zoeira: 'qmp:z', relacionamentos: 'qmp:r', caos: 'qmp:x', semfiltro: 'qmp:18-' };
    expect(new Set(MOST_LIKELY_CATALOG.map((p) => p.id)).size).toBe(MOST_LIKELY_CATALOG.length);
    MOST_LIKELY_CATALOG.forEach((p) => {
      expect(p.id.startsWith(prefix[p.vibe])).toBe(true);
      expect(Number(p.id.slice(prefix[p.vibe].length))).toBeGreaterThanOrEqual(0);
    });
  });

  it('IDs antigos preservados (as novas perguntas foram anexadas ao fim de cada lista)', () => {
    const byId = new Map(MOST_LIKELY_CATALOG.map((p) => [p.id, p.text]));
    expect(byId.get('qmp:c0')).toBe('Quem é mais provável de chegar atrasado no próprio aniversário?');
    expect(byId.get('qmp:18-0')).toBe('Quem é mais provável de ter o histórico de navegação mais comprometedor?');
    expect(byId.get('qmp:x0')).toBe('Quem seria preso primeiro?');
  });

  it('campos preenchidos, perguntas bem formadas e sem duplicatas (mesmo ignorando acentos/pontuação)', () => {
    const seen = new Set<string>();
    MOST_LIKELY_CATALOG.forEach((p) => {
      expect(VIBES).toContain(p.vibe);
      expect(p.text.trim()).toBe(p.text);
      expect(p.text.length).toBeGreaterThan(15);
      expect(p.text.length).toBeLessThan(140);
      expect(p.text.startsWith('Quem')).toBe(true);
      expect(p.text.endsWith('?')).toBe(true);
      const k = norm(p.text);
      expect(seen.has(k), p.text).toBe(false);
      seen.add(k);
    });
  });

  it('todas as categorias têm conteúdo e os filtros do lobby continuam válidos', () => {
    VIBES.forEach((v) => expect(MOST_LIKELY_CATALOG.filter((p) => p.vibe === v).length).toBeGreaterThan(20));
    const opt = quemEMaisProvavelPlugin.configSchema.find((o) => o.key === 'vibe')!;
    opt.options!.forEach((o) => expect(MOST_LIKELY_VIBE_GROUPS[String(o.value)]).toBeDefined());
    expect(MOST_LIKELY_VIBE_GROUPS.todas).not.toContain('semfiltro');
  });

  it('filtro de categoria + pacotes personalizados funcionam na partida', () => {
    const t = new Table('quem-e-mais-provavel', mkPlayers(3), { vibe: 'semfiltro', rounds: 5 }).start();
    expect(t.sec.pool.every((p: { id: string }) => p.id.startsWith('qmp:18-'))).toBe(true);
    const c = new Table('quem-e-mais-provavel', mkPlayers(3), { packMode: 'custom', rounds: 8 }).start({
      customItems: [
        { id: 'cp:1', text: 'Quem é mais provável de testar?', parts: [] },
        { id: 'cp:2', text: 'Quem é mais provável de rir?', parts: [] },
      ],
    });
    expect(c.pub.totalRounds).toBe(2);
    expect(['cp:1', 'cp:2']).toContain(c.pub.promptId);
  });
});

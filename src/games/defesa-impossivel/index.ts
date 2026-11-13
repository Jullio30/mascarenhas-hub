import type { MascarenhasGamePlugin } from '../../types/game.types';
import { PACK_MODE_OPTION } from '../../core/engine/helpers';
import DefesaImpossivel from './DefesaImpossivel';
import { createDi, diEngine, type DiSecret, type DiState, type DiView } from './logic';

export const defesaImpossivelPlugin: MascarenhasGamePlugin<DiState, DiSecret, DiView> = {
  slug: 'defesa-impossivel',
  title: 'Defesa Impossível',
  shortDescription: 'Defenda uma tese completamente absurda como se fosse a verdade absoluta. O júri decide!',
  rulesSummary: [
    'O Defensor da vez recebe uma tese absurda (ex.: “Dormir é uma perda de tempo”) e pode trocá-la uma vez.',
    'Durante o tempo da defesa, ele argumenta por voz e/ou escreve argumentos no quadro ao vivo — funciona presencialmente e à distância.',
    'O júri (todos os outros) avalia: 🏆 Genial (100), 👏 Mandou Bem (70), 🤨 Forçou a Barra (40) ou 🍅 Passou Vergonha (10).',
    'O Defensor ganha a média dos votos do júri (ou a soma, se o anfitrião preferir). Todos defendem o mesmo número de teses.',
  ],
  minPlayers: 3,
  maxPlayers: 16,
  recommendedPlayers: '3 a 10',
  accentColor: 'orange',
  iconName: 'Scale',
  edition: 'new',
  groups: ['social'],
  configSchema: [
    { key: 'thesesPerPlayer', label: 'Teses por jogador', type: 'select', defaultValue: 1, options: [1, 2, 3].map((n) => ({ label: `${n} tese(s)`, value: n })) },
    { key: 'defenseSeconds', label: 'Tempo de defesa', type: 'select', defaultValue: 45, options: [30, 45, 60, 90].map((n) => ({ label: `${n}s`, value: n })) },
    {
      key: 'scoring',
      label: 'Pontuação do Defensor',
      type: 'select',
      defaultValue: 'average',
      options: [
        { label: 'Média dos votos do júri', value: 'average' },
        { label: 'Soma direta dos votos', value: 'sum' },
      ],
    },
    PACK_MODE_OPTION,
  ],
  createInitialState: createDi,
  engine: diEngine,
  Component: DefesaImpossivel,
};

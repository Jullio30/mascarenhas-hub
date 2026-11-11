import type { MascarenhasGamePlugin } from '../../types/game.types';
import Infiltrado from './Infiltrado';
import { INFILTRADO_CATEGORIES } from './infiltradoCatalog';
import { createInfiltrado, infiltradoEngine, prepareInfiltrado, type InfSecret, type InfState, type InfView } from './logic';

export const infiltradoPlugin: MascarenhasGamePlugin<InfState, InfSecret, InfView> = {
  slug: 'infiltrado',
  title: 'Infiltrado',
  shortDescription: 'Todos têm uma palavra… mas a do Infiltrado é quase igual. Ninguém sabe o próprio papel!',
  rulesSummary: [
    'Cada um recebe uma palavra secreta. O(s) Infiltrado(s) recebe(m) uma palavra parecida (ex.: Pikachu × Raichu) — e ninguém sabe se é Maioria ou Infiltrado.',
    '1 Infiltrado com até 6 jogadores; 2 Infiltrados com 7 a 12. Ciclos: dicas (1–3 palavras) → discussão → votação secreta.',
    'Empate: defesa e desempate só entre os empatados; se persistir, ninguém sai no ciclo. O Infiltrado eliminado pode chutar a palavra da Maioria e roubar a vitória.',
    'Comuns vencem eliminando todos os Infiltrados (+1.000, +200 se sobreviveu, +150 por voto certo). Infiltrados vencem empatando em número (+1.500).',
  ],
  minPlayers: 3,
  maxPlayers: 12,
  recommendedPlayers: '4 a 12',
  accentColor: 'green',
  iconName: 'Fingerprint',
  edition: 'new',
  groups: ['deducao'],
  configSchema: [
    { key: 'matches', label: 'Partidas', type: 'select', defaultValue: 1, options: [1, 2, 3].map((n) => ({ label: `${n} partida${n > 1 ? 's' : ''}`, value: n })) },
    {
      key: 'clueMode',
      label: 'Modo das dicas',
      type: 'select',
      defaultValue: 'typed',
      options: [
        { label: 'Digitadas na tela', value: 'typed' },
        { label: 'Faladas em voz alta', value: 'spoken' },
      ],
    },
    {
      key: 'category',
      label: 'Tema',
      type: 'select',
      defaultValue: 'all',
      options: [{ label: 'Todos (sorteado)', value: 'all' }, ...INFILTRADO_CATEGORIES.map((c) => ({ label: c, value: c }))],
    },
  ],
  prepare: (config) => prepareInfiltrado(config),
  createInitialState: createInfiltrado,
  engine: infiltradoEngine,
  Component: Infiltrado,
};

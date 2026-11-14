import type { MascarenhasGamePlugin } from '../../types/game.types';
import SabeOuPerde from './SabeOuPerde';
import { TRIVIA_CATEGORIES } from './triviaCatalog';
import { createSop, prepareSop, sopEngine, type SopSecret, type SopState } from './logic';

export const sabeOuPerdePlugin: MascarenhasGamePlugin<SopState, SopSecret, unknown> = {
  slug: 'sabe-ou-perde',
  title: 'Sabe ou Perde',
  shortDescription: 'Tabuleiro de 18, 24 ou 30 casas: role o dado, acerte a pergunta e avance. Cuidado com as casas especiais!',
  rulesSummary: [
    'Todos começam na Casa 1. Na sua vez, lance o dado e responda uma pergunta de 4 alternativas (20s).',
    'Acertou: avança o valor do dado e ganha +100 pts +20 por casa. Errou: fica parado.',
    'Casas especiais: Avançar 2, Voltar 2, Jogar novamente, Perder um turno, Roubar 200 pontos e Escudo (protege da próxima penalidade ou roubo).',
    'Quem alcançar ou passar da última casa (18, 24 ou 30, conforme o tabuleiro escolhido) vence na hora (+500 de bônus).',
  ],
  minPlayers: 2,
  maxPlayers: 8,
  recommendedPlayers: '2 a 6',
  accentColor: 'blue',
  iconName: 'Dices',
  edition: 'new',
  groups: ['trivia'],
  configSchema: [
    {
      key: 'boardSize',
      label: 'Tabuleiro',
      type: 'select',
      defaultValue: 30,
      options: [
        { label: 'Rápido — 18 casas', value: 18 },
        { label: 'Médio — 24 casas', value: 24 },
        { label: 'Clássico — 30 casas', value: 30 },
      ],
    },
    {
      key: 'category',
      label: 'Perguntas',
      type: 'select',
      defaultValue: 'all',
      options: [{ label: 'Todas + APIs (PokéAPI, IBGE)', value: 'all' }, ...TRIVIA_CATEGORIES.map((c) => ({ label: c, value: c }))],
    },
  ],
  prepare: (config) => prepareSop(config),
  createInitialState: createSop,
  engine: sopEngine,
  Component: SabeOuPerde,
};

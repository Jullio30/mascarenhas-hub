import type { MascarenhasGamePlugin } from '../../types/game.types';
import OrdemCaotica from './OrdemCaotica';
import { createOc, ocEngine, prepareOc, type OcSecret, type OcState, type OcView } from './logic';

export const ordemCaoticaPlugin: MascarenhasGamePlugin<OcState, OcSecret, OcView> = {
  slug: 'ordem-caotica',
  title: 'Ordem Caótica',
  shortDescription: 'Coloque 4 a 6 itens na ordem certa: Pokémon por altura, planetas, animes, países, história…',
  rulesSummary: [
    'Todos recebem os mesmos 4–6 elementos embaralhados e um critério (ex.: do menor para o maior).',
    'Reordene arrastando, com os botões ▲▼ ou tocando em dois itens para trocá-los. Depois, Confirmar Ordem.',
    'Se o tempo acabar antes de confirmar, vale a ordem que estiver na sua tela.',
    'Por elemento: posição exata +100, deslocado 1 posição +50, mais longe 0. A revelação mostra valores reais e a fonte.',
  ],
  minPlayers: 2,
  maxPlayers: 16,
  recommendedPlayers: '2 a 12',
  accentColor: 'orange',
  iconName: 'ListOrdered',
  edition: 'new',
  groups: ['trivia'],
  configSchema: [
    { key: 'rounds', label: 'Rodadas', type: 'select', defaultValue: 5, options: [3, 5, 7, 10].map((n) => ({ label: `${n} desafios`, value: n })) },
    { key: 'timeSeconds', label: 'Tempo por desafio', type: 'select', defaultValue: 40, options: [30, 40, 45, 60].map((n) => ({ label: `${n}s`, value: n })) },
    {
      key: 'theme',
      label: 'Tema',
      type: 'select',
      defaultValue: 'misto',
      options: [
        { label: 'Misto (APIs + catálogo)', value: 'misto' },
        { label: 'Pokémon (PokéAPI)', value: 'pokemon' },
        { label: 'Animes, Jogos & Cultura Pop', value: 'animes' },
        { label: 'Ciência, Astronomia & Animais', value: 'ciencia' },
        { label: 'História', value: 'historia' },
        { label: 'Países & Geografia', value: 'paises' },
      ],
    },
  ],
  prepare: (config) => prepareOc(config),
  createInitialState: createOc,
  engine: ocEngine,
  Component: OrdemCaotica,
};

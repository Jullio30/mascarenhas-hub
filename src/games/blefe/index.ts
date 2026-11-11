import type { MascarenhasGamePlugin } from '../../types/game.types';
import Blefe from './Blefe';
import { blefeEngine, createBlefe, prepareBlefe, type BlefeSecret, type BlefeState, type BlefeView } from './logic';

export const blefePlugin: MascarenhasGamePlugin<BlefeState, BlefeSecret, BlefeView> = {
  slug: 'blefe',
  title: 'Blefe',
  shortDescription: 'Invente mentiras plausíveis para fatos incríveis e descubra qual resposta é a verdade.',
  rulesSummary: [
    'Aparece um fato curioso com a resposta escondida. Cada um escreve uma MENTIRA convincente (se escrever a verdade, o envio é recusado).',
    'Sem ideias? "Me Salva!" sugere uma mentira — ninguém fica sabendo.',
    'Todas as mentiras + a verdade são misturadas. Vote na que você acha verdadeira (não dá para votar na própria).',
    'Pontos: achar a verdade +1.000; cada amigo que cair na sua mentira +500.',
  ],
  minPlayers: 2,
  maxPlayers: 12,
  recommendedPlayers: '3 a 8',
  accentColor: 'violet',
  iconName: 'VenetianMask',
  edition: 'new',
  groups: ['deducao', 'trivia'],
  configSchema: [
    { key: 'rounds', label: 'Rodadas', type: 'select', defaultValue: 5, options: [3, 5, 7].map((n) => ({ label: `${n} rodadas`, value: n })) },
    { key: 'writeTimeSeconds', label: 'Tempo para escrever', type: 'select', defaultValue: 45, options: [30, 45, 60].map((n) => ({ label: `${n}s`, value: n })) },
    { key: 'voteTimeSeconds', label: 'Tempo para votar', type: 'select', defaultValue: 30, options: [20, 30].map((n) => ({ label: `${n}s`, value: n })) },
    {
      key: 'category',
      label: 'Tema das perguntas',
      type: 'select',
      defaultValue: 'misto',
      options: [
        { label: 'Misto', value: 'misto' },
        { label: 'Curiosidades Gerais', value: 'curiosidades' },
        { label: 'Mundo Pokémon & Geek', value: 'geek' },
        { label: 'História & Ciência', value: 'historia' },
        { label: 'Brasil & Mundo', value: 'brasil' },
      ],
    },
  ],
  prepare: (config) => prepareBlefe(config),
  createInitialState: createBlefe,
  engine: blefeEngine,
  Component: Blefe,
};

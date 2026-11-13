import type { MascarenhasGamePlugin } from '../../types/game.types';
import { PACK_MODE_OPTION } from '../../core/engine/helpers';
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
    'Temas: aleatório a cada rodada, temas selecionados pelo anfitrião (sem repetir) ou um tema fixo.',
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
      key: 'themeMode',
      label: 'Seleção de temas',
      type: 'select',
      defaultValue: 'random',
      options: [
        { label: 'Tema aleatório a cada rodada', value: 'random' },
        { label: 'Temas selecionados (sem repetir)', value: 'selected' },
        { label: 'Tema fixo na partida', value: 'fixed' },
      ],
    },
    {
      key: 'themes',
      label: 'Temas da partida',
      type: 'multiselect',
      defaultValue: 'curiosidades,geek,historia,brasil',
      help: 'Marque 2 ou mais: os temas se alternam sem repetir até todos serem usados.',
      visibleWhenConfig: (c) => c.themeMode === 'selected',
      options: [
        { label: 'Curiosidades Gerais', value: 'curiosidades' },
        { label: 'Mundo Pokémon & Geek', value: 'geek' },
        { label: 'História & Ciência', value: 'historia' },
        { label: 'Brasil & Mundo', value: 'brasil' },
      ],
    },
    {
      key: 'category',
      label: 'Tema fixo',
      type: 'select',
      defaultValue: 'misto',
      visibleWhenConfig: (c) => c.themeMode === 'fixed',
      options: [
        { label: 'Misto', value: 'misto' },
        { label: 'Curiosidades Gerais', value: 'curiosidades' },
        { label: 'Mundo Pokémon & Geek', value: 'geek' },
        { label: 'História & Ciência', value: 'historia' },
        { label: 'Brasil & Mundo', value: 'brasil' },
      ],
    },
    PACK_MODE_OPTION,
  ],
  prepare: (config) => prepareBlefe(config),
  createInitialState: createBlefe,
  engine: blefeEngine,
  Component: Blefe,
};

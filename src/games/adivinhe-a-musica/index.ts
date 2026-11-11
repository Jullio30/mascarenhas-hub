import type { MascarenhasGamePlugin } from '../../types/game.types';
import { MUSIC_GENRES } from '../../data/defaultPacks';
import AdivinheAMusica from './AdivinheAMusica';
import { createMusic, musicEngine, type MusicSecret, type MusicState } from './logic';

export const adivinheAMusicaPlugin: MascarenhasGamePlugin<MusicState, MusicSecret> = {
  slug: 'adivinhe-a-musica',
  title: 'Adivinhe a Música',
  shortDescription: '4 dicas progressivas. Quanto antes acertar, mais pontos!',
  rulesSummary: [
    'Cada rodada dura 48s com 4 estágios de dicas (15, 10, 7 e 4 pontos).',
    'Todos jogam ao mesmo tempo; quem acerta não revela a resposta aos outros.',
    'O primeiro a acertar ganha +3 de First Blood.',
    'Máximo de 2 palpites por estágio. Erros de digitação leves são aceitos.',
  ],
  minPlayers: 2,
  maxPlayers: 20,
  recommendedPlayers: '2 a 12',
  accentColor: 'pink',
  iconName: 'Music',
  edition: 'classic',
  groups: ['trivia'],
  configSchema: [
    { key: 'rounds', label: 'Músicas na partida', type: 'number', defaultValue: 8, min: 3, max: 20 },
    {
      key: 'genre',
      label: 'Gênero musical',
      type: 'select',
      defaultValue: 'all',
      options: [{ label: 'Todos os gêneros', value: 'all' }, ...MUSIC_GENRES.map((g) => ({ label: g, value: g }))],
    },
  ],
  createInitialState: createMusic,
  engine: musicEngine,
  Component: AdivinheAMusica,
};

import type { MascarenhasGamePlugin } from '../../types/game.types';
import { MUSIC_FILTERS } from '../../data/musicExpansion';
import AdivinheAMusica from './AdivinheAMusica';
import { MODALITY_OPTIONS, createMusic, musicEngine, type MusicSecret, type MusicState, type MusicView } from './logic';

export const adivinheAMusicaPlugin: MascarenhasGamePlugin<MusicState, MusicSecret, MusicView> = {
  slug: 'adivinhe-a-musica',
  title: 'Adivinhe a Música',
  shortDescription: 'Dicas progressivas, artistas, décadas, gêneros e curiosidades musicais — sem letras, só conhecimento!',
  rulesSummary: [
    'Rodada de DICAS: 48s com 4 estágios (15, 10, 7 e 4 pontos); máximo de 2 palpites por estágio, erros leves de digitação são aceitos.',
    'Rodadas de QUIZ (artista, complete a informação, contexto, décadas, gêneros): 4 alternativas, 1 resposta por jogador; acerto vale 10 + até 5 de bônus de velocidade.',
    'O primeiro a acertar ganha +3 de First Blood. Ninguém vê a resposta dos outros antes da revelação.',
    'O anfitrião escolhe a modalidade e o gênero (Funk, Sertanejo, Pop, Rock, Rap/Trap, Internacional, Anime, Games, Clássicos/MPB/Pagode). Sem letras nem áudio: só dicas e curiosidades.',
  ],
  minPlayers: 2,
  maxPlayers: 20,
  recommendedPlayers: '2 a 12',
  accentColor: 'pink',
  iconName: 'Music',
  edition: 'classic',
  groups: ['trivia'],
  configSchema: [
    { key: 'rounds', label: 'Rodadas na partida', type: 'number', defaultValue: 8, min: 3, max: 20 },
    { key: 'modality', label: 'Modalidade', type: 'select', defaultValue: 'mix', options: MODALITY_OPTIONS },
    {
      key: 'genre',
      label: 'Gênero / rodada temática',
      type: 'select',
      defaultValue: 'all',
      options: MUSIC_FILTERS.map((f) => ({ label: f.label, value: f.value })),
    },
  ],
  createInitialState: createMusic,
  engine: musicEngine,
  Component: AdivinheAMusica,
};

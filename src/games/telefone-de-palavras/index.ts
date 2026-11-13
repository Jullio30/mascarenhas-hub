import type { MascarenhasGamePlugin } from '../../types/game.types';
import { PACK_MODE_OPTION } from '../../core/engine/helpers';
import TelefoneDePalavras from './TelefoneDePalavras';
import { createTp, tpEngine, type TpSecret, type TpState, type TpView } from './logic';

export const telefoneDePalavrasPlugin: MascarenhasGamePlugin<TpState, TpSecret, TpView> = {
  slug: 'telefone-de-palavras',
  title: 'Telefone de Palavras',
  shortDescription: 'Uma corrente de associações: cada um adiciona uma palavra ligada à anterior. Faz sentido no fim?',
  rulesSummary: [
    'A rodada começa com uma Palavra Inicial (sorteada, escolhida pelo 1º jogador ou os dois).',
    'Na sua vez você vê só a palavra anterior e digita uma associada em até 15s (ex.: Cu → Quadrado → Geométrico → Círculo → Curvo). Repetir palavras vale!',
    'Quem não jogar a tempo (ou cair) é pulado e a corrente continua da última palavra válida.',
    'No fim, todos dão de 1 a 5 estrelas para a conexão Inicial ⟷ Final e podem votar no elo mais criativo de um colega.',
    'Pontos: cada membro da corrente ganha média × 20 (20 a 100). Cada voto de “Elo Mais Criativo” vale +50.',
  ],
  minPlayers: 2,
  maxPlayers: 16,
  recommendedPlayers: '3 a 10',
  accentColor: 'blue',
  iconName: 'Phone',
  edition: 'new',
  groups: ['social'],
  configSchema: [
    { key: 'rounds', label: 'Rodadas (correntes)', type: 'select', defaultValue: 3, options: [1, 2, 3, 5].map((n) => ({ label: `${n} rodada(s)`, value: n })) },
    {
      key: 'initialMode',
      label: 'Palavra inicial',
      type: 'select',
      defaultValue: 'catalog',
      options: [
        { label: 'Sorteada do catálogo/pacote', value: 'catalog' },
        { label: 'Livre (escolhida pelo 1º jogador)', value: 'free' },
        { label: 'Híbrido (1º jogador sorteia ou digita)', value: 'hybrid' },
      ],
    },
    {
      key: 'laps',
      label: 'Comprimento da corrente',
      type: 'select',
      defaultValue: 'auto',
      options: [
        { label: 'Automático (2 voltas com até 4 jogadores)', value: 'auto' },
        { label: '1 volta pela sala', value: '1' },
        { label: '2 voltas pela sala', value: '2' },
      ],
    },
    { key: 'turnSeconds', label: 'Tempo por elo', type: 'select', defaultValue: 15, options: [10, 15, 20].map((n) => ({ label: `${n}s`, value: n })) },
    PACK_MODE_OPTION,
  ],
  createInitialState: createTp,
  engine: tpEngine,
  Component: TelefoneDePalavras,
};

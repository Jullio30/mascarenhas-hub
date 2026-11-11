import type { MascarenhasGamePlugin } from '../../types/game.types';
import QuemEMaisProvavel from './QuemEMaisProvavel';
import { createQmp, qmpEngine, type QmpSecret, type QmpState, type QmpView } from './logic';

export const quemEMaisProvavelPlugin: MascarenhasGamePlugin<QmpState, QmpSecret, QmpView> = {
  slug: 'quem-e-mais-provavel',
  title: 'Quem é Mais Provável?',
  shortDescription: 'O grupo decide em segredo qual amigo tem mais cara de protagonizar cada situação.',
  rulesSummary: [
    'Uma situação aparece na tela: vote secretamente no amigo mais provável de protagonizá-la.',
    'Não é permitido votar em si mesmo. Os votos ficam em segredo até todos votarem.',
    'Revelação simultânea: o(s) mais votado(s) sobe(m) ao palco — empates dividem o holofote.',
    'Pontos: +1 por voto recebido e +2 para quem votou em alguém do grupo mais votado.',
  ],
  minPlayers: 3,
  maxPlayers: 16,
  recommendedPlayers: '4 a 12',
  accentColor: 'pink',
  iconName: 'Users',
  edition: 'new',
  groups: ['social'],
  configSchema: [
    { key: 'rounds', label: 'Rodadas', type: 'select', defaultValue: 8, options: [5, 8, 12].map((n) => ({ label: `${n} perguntas`, value: n })) },
    { key: 'voteTimeSeconds', label: 'Tempo de votação', type: 'select', defaultValue: 20, options: [15, 20, 30].map((n) => ({ label: `${n}s`, value: n })) },
    {
      key: 'vibe',
      label: 'Estilo das perguntas',
      type: 'select',
      defaultValue: 'todas',
      options: [
        { label: 'Todas', value: 'todas' },
        { label: 'Cotidiano & Viagens', value: 'cotidiano' },
        { label: 'Sobrevivência & Caos', value: 'sobrevivencia' },
        { label: 'Futuro & Fama', value: 'futuro' },
      ],
    },
  ],
  createInitialState: createQmp,
  engine: qmpEngine,
  Component: QuemEMaisProvavel,
};

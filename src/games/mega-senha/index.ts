import type { MascarenhasGamePlugin } from '../../types/game.types';
import MegaSenha from './MegaSenha';
import { createMegaSenha, megaSenhaEngine, type MSSecret, type MSState, type MSView } from './logic';

export const megaSenhaPlugin: MascarenhasGamePlugin<MSState, MSSecret, MSView> = {
  slug: 'mega-senha',
  title: 'Mega Senha',
  shortDescription: 'Faça seu parceiro adivinhar a senha com dicas de UMA palavra só.',
  rulesSummary: [
    'O Passador vê a senha e envia dicas de uma única palavra.',
    'O Adivinhador tem 3 tentativas: 10, 7 e 5 pontos.',
    'Passador e Adivinhador ganham os pontos juntos — funciona com número ímpar de jogadores!',
    'Dicas com partes da senha são bloqueadas automaticamente. 1 pulo por turno.',
  ],
  minPlayers: 2,
  maxPlayers: 16,
  recommendedPlayers: '2 a 8',
  accentColor: 'cyan',
  iconName: 'KeyRound',
  edition: 'classic',
  groups: ['social', 'trivia'],
  configSchema: [
    {
      key: 'mode',
      label: 'Formação',
      type: 'select',
      defaultValue: 'rotating',
      options: [
        { label: 'Dupla rotativa (qualquer número)', value: 'rotating' },
        { label: 'Equipes fixas (nº par ≥ 4)', value: 'teams' },
      ],
    },
    { key: 'laps', label: 'Voltas completas', type: 'number', defaultValue: 1, min: 1, max: 4 },
    { key: 'turnSeconds', label: 'Segundos por turno', type: 'number', defaultValue: 60, min: 30, max: 180 },
    { key: 'wordsPerTurn', label: 'Palavras por turno', type: 'number', defaultValue: 3, min: 1, max: 6 },
  ],
  createInitialState: createMegaSenha,
  engine: megaSenhaEngine,
  Component: MegaSenha,
};

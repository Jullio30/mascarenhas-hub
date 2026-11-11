import type { MascarenhasGamePlugin } from '../../types/game.types';
import Desafio5Segundos from './Desafio5Segundos';
import { createD5, d5Engine, type D5Secret, type D5State } from './logic';

export const desafio5SegundosPlugin: MascarenhasGamePlugin<D5State, D5Secret> = {
  slug: 'desafio-5-segundos',
  title: 'Desafio dos 5 Segundos',
  shortDescription: 'Cite 3 itens do tema em apenas 5 segundos. A pressão é real!',
  rulesSummary: [
    'Na sua vez, clique em “Estou Pronto!” para revelar o tema.',
    'Você tem 5 segundos para dizer 3 respostas (ou 8s digitando).',
    'Os outros jogadores julgam: Validar, Parcial ou Falhou.',
    'Validado: +10 pts (+2 se terminar com mais de 1,5s sobrando). Parcial: +5.',
  ],
  minPlayers: 2,
  maxPlayers: 16,
  recommendedPlayers: '3 a 10',
  accentColor: 'cyan',
  iconName: 'Timer',
  configSchema: [
    { key: 'turnsPerPlayer', label: 'Turnos por jogador', type: 'number', defaultValue: 2, min: 1, max: 6 },
    {
      key: 'answerMode',
      label: 'Modo de resposta',
      type: 'select',
      defaultValue: 'voice',
      options: [
        { label: 'Voz / Presencial', value: 'voice' },
        { label: 'Digitação rápida (8s)', value: 'typing' },
      ],
    },
    { key: 'allowPartial', label: 'Permitir voto “Parcial” (+5)', type: 'boolean', defaultValue: true },
    {
      key: 'category',
      label: 'Categoria das cartas',
      type: 'select',
      defaultValue: 'all',
      options: [
        { label: 'Todas', value: 'all' },
        { label: 'Cotidiano', value: 'Cotidiano' },
        { label: 'Cultura Pop', value: 'Cultura Pop' },
        { label: 'Esportes', value: 'Esportes' },
        { label: 'Geek', value: 'Geek' },
        { label: 'Caos', value: 'Caos' },
      ],
    },
  ],
  createInitialState: createD5,
  engine: d5Engine,
  Component: Desafio5Segundos,
};

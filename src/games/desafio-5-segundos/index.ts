import type { MascarenhasGamePlugin } from '../../types/game.types';
import { PACK_MODE_OPTION } from '../../core/engine/helpers';
import Desafio5Segundos from './Desafio5Segundos';
import { createD5, d5Engine, type D5Secret, type D5State, type D5View } from './logic';

/** Desafio dos 10 Segundos — o slug `desafio-5-segundos` é mantido por compatibilidade (salas e configs salvas). */
export const desafio5SegundosPlugin: MascarenhasGamePlugin<D5State, D5Secret, D5View> = {
  slug: 'desafio-5-segundos',
  title: 'Desafio dos 10 Segundos',
  shortDescription: 'Escreva até 5 respostas do tema em 10 segundos. Depois o grupo avalia cada uma!',
  rulesSummary: [
    'Na sua vez, clique em “Estou Pronto!” para revelar o tema (ex.: “Cite 5 Pokémon do tipo Fogo”).',
    'Você tem 10 segundos para digitar até 5 respostas — Enter confirma e pula para o próximo campo. O que estiver digitado quando o tempo zerar é enviado automaticamente.',
    'Só depois do tempo (ou quando você terminar) os outros jogadores avaliam CADA resposta: 👍 Favorável ou 👎 Contrário. Você não vota nas suas.',
    'Pontos: +1 por voto favorável em cada resposta (👎 vale 0). Ex.: 3 respostas com 3 👍 cada = 9 pontos.',
  ],
  minPlayers: 2,
  maxPlayers: 16,
  recommendedPlayers: '3 a 10',
  accentColor: 'amber',
  iconName: 'Timer',
  edition: 'classic',
  groups: ['social'],
  configSchema: [
    { key: 'turnsPerPlayer', label: 'Turnos por jogador', type: 'number', defaultValue: 1, min: 1, max: 6 },
    { key: 'answersPerTurn', label: 'Respostas por turno', type: 'select', defaultValue: 5, options: [3, 5, 7].map((n) => ({ label: `${n} respostas`, value: n })) },
    { key: 'timerSeconds', label: 'Tempo para escrever', type: 'select', defaultValue: 10, options: [10, 15, 20].map((n) => ({ label: `${n} segundos`, value: n })) },
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
    PACK_MODE_OPTION,
  ],
  createInitialState: createD5,
  engine: d5Engine,
  Component: Desafio5Segundos,
};

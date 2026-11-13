import type { MascarenhasGamePlugin } from '../../types/game.types';
import { PACK_MODE_OPTION } from '../../core/engine/helpers';
import QuemEscreveu from './QuemEscreveu';
import { createWw, wwEngine, type WwSecret, type WwState, type WwView } from './logic';

export const quemEscreveuPlugin: MascarenhasGamePlugin<WwState, WwSecret, WwView> = {
  slug: 'quem-escreveu',
  title: 'Quem Escreveu?',
  shortDescription: 'Todos respondem a mesma pergunta em segredo. Depois, descubra quem escreveu cada resposta!',
  rulesSummary: [
    'Todos recebem a mesma pergunta aberta e escrevem uma resposta em segredo.',
    'As respostas aparecem embaralhadas e anônimas (nem o anfitrião vê o autor na tela). A sua aparece marcada como “Sua resposta”.',
    'Para cada resposta dos outros, escolha quem você acha que escreveu.',
    'Pontos: +100 por autoria certa. O autor ganha +50 por cada pessoa que ERROU quem escreveu a resposta dele — disfarce seu estilo!',
  ],
  minPlayers: 3,
  maxPlayers: 12,
  recommendedPlayers: '4 a 8',
  accentColor: 'orange',
  iconName: 'PenLine',
  edition: 'new',
  groups: ['deducao', 'social'],
  configSchema: [
    { key: 'rounds', label: 'Perguntas', type: 'select', defaultValue: 5, options: [3, 5, 8].map((n) => ({ label: `${n} perguntas`, value: n })) },
    { key: 'writeTimeSeconds', label: 'Tempo para escrever', type: 'select', defaultValue: 40, options: [30, 40, 60].map((n) => ({ label: `${n}s`, value: n })) },
    { key: 'guessTimeSeconds', label: 'Tempo para investigar', type: 'select', defaultValue: 45, options: [30, 45, 60].map((n) => ({ label: `${n}s`, value: n })) },
    PACK_MODE_OPTION,
  ],
  createInitialState: createWw,
  engine: wwEngine,
  Component: QuemEscreveu,
};

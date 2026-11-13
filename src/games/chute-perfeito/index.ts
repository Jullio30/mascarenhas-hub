import type { MascarenhasGamePlugin } from '../../types/game.types';
import { PACK_MODE_OPTION } from '../../core/engine/helpers';
import ChutePerfeito from './ChutePerfeito';
import { chuteEngine, createChute, type ChuteSecret, type ChuteState, type ChuteView } from './logic';

export const chutePerfeitoPlugin: MascarenhasGamePlugin<ChuteState, ChuteSecret, ChuteView> = {
  slug: 'chute-perfeito',
  title: 'Chute Perfeito',
  shortDescription: 'Perguntas com resposta numérica: quem chutar mais perto do valor real leva mais pontos.',
  rulesSummary: [
    'Aparece uma pergunta com resposta em número (população, distância, ano, quantidade…). Todos chutam em segredo.',
    'Precisão: até 500 pts conforme a proximidade (erro relativo à escala da pergunta; anos usam escala de 500 anos). Cravou o valor exato? +200 de bônus.',
    'Colocação na sala: 1º mais próximo +300, 2º +200, 3º +100 (palpites absurdamente distantes não entram no ranking).',
    'Empate na distância (mesmo para cima e para baixo) = mesma colocação e mesmos pontos.',
  ],
  minPlayers: 2,
  maxPlayers: 20,
  recommendedPlayers: '2 a 12',
  accentColor: 'green',
  iconName: 'Target',
  edition: 'new',
  groups: ['trivia'],
  configSchema: [
    { key: 'rounds', label: 'Perguntas', type: 'select', defaultValue: 8, options: [5, 8, 10, 15].map((n) => ({ label: `${n} perguntas`, value: n })) },
    { key: 'guessTimeSeconds', label: 'Tempo para chutar', type: 'select', defaultValue: 25, options: [15, 25, 40].map((n) => ({ label: `${n}s`, value: n })) },
    {
      key: 'category',
      label: 'Tema',
      type: 'select',
      defaultValue: 'all',
      options: [
        { label: 'Todos os temas', value: 'all' },
        { label: 'Geografia & Mundo', value: 'geografia' },
        { label: 'História (anos)', value: 'historia' },
        { label: 'Ciência & Corpo', value: 'ciencia' },
        { label: 'Cultura & Esportes', value: 'cultura' },
      ],
    },
    PACK_MODE_OPTION,
  ],
  createInitialState: createChute,
  engine: chuteEngine,
  Component: ChutePerfeito,
};

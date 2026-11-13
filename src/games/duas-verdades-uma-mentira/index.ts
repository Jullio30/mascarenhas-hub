import type { MascarenhasGamePlugin } from '../../types/game.types';
import { PACK_MODE_OPTION } from '../../core/engine/helpers';
import DuasVerdades from './DuasVerdades';
import { createDv, dvEngine, type DvSecret, type DvState, type DvView } from './logic';

export const duasVerdadesPlugin: MascarenhasGamePlugin<DvState, DvSecret, DvView> = {
  slug: 'duas-verdades-uma-mentira',
  title: 'Duas Verdades e Uma Mentira',
  shortDescription: 'Cada um escreve 3 afirmações — 2 verdades e 1 mentira. Descubra a mentira dos amigos!',
  rulesSummary: [
    'Todos escrevem ao mesmo tempo 3 afirmações sobre qualquer assunto (vida pessoal, curiosidades, história, cultura pop…) e marcam em segredo qual é a mentira.',
    'Sem ideias? “Sugerir trio de curiosidades” preenche 2 fatos verdadeiros e 1 mentira — dá para editar antes de enviar.',
    'Um autor por vez: as 3 afirmações aparecem embaralhadas como A, B e C e os outros votam em segredo na mentira.',
    'Pontos: acertou a mentira +100. O autor ganha +50 por cada amigo que caiu na conversa.',
  ],
  minPlayers: 2,
  maxPlayers: 12,
  recommendedPlayers: '3 a 8',
  accentColor: 'cyan',
  iconName: 'HelpCircle',
  edition: 'new',
  groups: ['deducao', 'social'],
  configSchema: [
    { key: 'cycles', label: 'Ciclos (cada um apresenta 1 trio por ciclo)', type: 'select', defaultValue: 1, options: [1, 2].map((n) => ({ label: n === 1 ? '1 ciclo completo' : '2 ciclos', value: n })) },
    { key: 'writeTimeSeconds', label: 'Tempo de escrita', type: 'select', defaultValue: 60, options: [45, 60, 90].map((n) => ({ label: `${n}s`, value: n })) },
    { key: 'voteTimeSeconds', label: 'Tempo de votação por apresentação', type: 'select', defaultValue: 25, options: [15, 25, 40].map((n) => ({ label: `${n}s`, value: n })) },
    PACK_MODE_OPTION,
  ],
  createInitialState: createDv,
  engine: dvEngine,
  Component: DuasVerdades,
};

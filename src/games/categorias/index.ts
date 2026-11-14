import type { MascarenhasGamePlugin } from '../../types/game.types';
import Categorias from './Categorias';
import { categoriasEngine, createCategorias, type CatSecret, type CatState } from './logic';
import { PACK_MODE_OPTION } from '../../core/engine/helpers';

export const categoriasPlugin: MascarenhasGamePlugin<CatState, CatSecret> = {
  slug: 'categorias',
  title: 'Categorias',
  shortDescription: 'Batata quente lexical: diga uma palavra da categoria antes que a bomba exploda!',
  rulesSummary: [
    'Na sua vez, envie uma palavra da categoria que ainda não foi dita (10s por padrão; a partir da 2ª volta, no máximo 7s).',
    'Palavra repetida é recusada na hora, mas o relógio continua correndo!',
    'Os outros podem Contestar palavras inválidas por 6s: com metade dos demais contestando, a palavra é anulada, o autor perde os 2 pontos dela e 1 coração.',
    'Cada palavra válida: +2. Sobreviver: +5 (1 coração) ou +10 (ileso / último de pé).',
  ],
  minPlayers: 2,
  maxPlayers: 16,
  recommendedPlayers: '3 a 10',
  accentColor: 'purple',
  iconName: 'Flame',
  edition: 'classic',
  groups: ['social'],
  configSchema: [
    { key: 'rounds', label: 'Rodadas (categorias)', type: 'number', defaultValue: 3, min: 1, max: 10 },
    { key: 'turnSeconds', label: 'Segundos por turno', type: 'number', defaultValue: 10, min: 5, max: 20 },
    { key: 'letterRestriction', label: 'Nível avançado: restringir letras iniciais', type: 'boolean', defaultValue: false },
    PACK_MODE_OPTION,
  ],
  createInitialState: createCategorias,
  engine: categoriasEngine,
  Component: Categorias,
};

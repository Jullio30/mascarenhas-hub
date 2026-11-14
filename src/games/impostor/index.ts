import type { MascarenhasGamePlugin } from '../../types/game.types';
import { IMPOSTOR_CATEGORIES } from '../../data/defaultPacks';
import Impostor from './Impostor';
import { createImpostor, impostorEngine, type ImpSecret, type ImpState, type ImpView } from './logic';

export const impostorPlugin: MascarenhasGamePlugin<ImpState, ImpSecret, ImpView> = {
  slug: 'impostor',
  title: 'Impostor',
  shortDescription: 'Todos sabem a palavra secreta… menos o impostor. Blefe ou desmascare!',
  rulesSummary: [
    'Cada um segura o cartão para ver seu papel: cidadão vê a palavra, impostor só a categoria.',
    'Na sua vez, dê UMA dica curta sem entregar a palavra.',
    'Votem secretamente em quem parece ser o impostor.',
    'O impostor só é pego se for o mais votado sozinho (empate = ele escapa).',
    'Impostor escapa: +15 para ele e +3 para quem votou nele. Descoberto: ele tem um chute final entre 8 palavras — se acertar, rouba +10 (quem votou certo ainda leva +5); se errar, cada cidadão ganha +10 (+3 extra para quem votou nele).',
  ],
  minPlayers: 3,
  maxPlayers: 16,
  recommendedPlayers: '4 a 10',
  accentColor: 'red',
  iconName: 'EyeOff',
  edition: 'classic',
  groups: ['deducao'],
  configSchema: [
    { key: 'rounds', label: 'Rodadas', type: 'number', defaultValue: 5, min: 1, max: 15 },
    {
      key: 'impostorCount',
      label: 'Número de impostores',
      type: 'select',
      defaultValue: 1,
      options: [
        { label: '1 impostor', value: 1 },
        { label: '2 impostores (7+ jogadores)', value: 2 },
      ],
      visibleWhen: (n) => n >= 7,
    },
    {
      key: 'clueMode',
      label: 'Modo das dicas',
      type: 'select',
      defaultValue: 'typed',
      options: [
        { label: 'Digitadas na tela', value: 'typed' },
        { label: 'Faladas em voz alta', value: 'spoken' },
      ],
    },
    {
      key: 'category',
      label: 'Categoria',
      type: 'select',
      defaultValue: 'all',
      options: [{ label: 'Todas (sorteada)', value: 'all' }, ...IMPOSTOR_CATEGORIES.map((c) => ({ label: c.name, value: c.name }))],
    },
  ],
  createInitialState: createImpostor,
  engine: impostorEngine,
  Component: Impostor,
};

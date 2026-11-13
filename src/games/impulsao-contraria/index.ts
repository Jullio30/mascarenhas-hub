import type { MascarenhasGamePlugin } from '../../types/game.types';
import { PACK_MODE_OPTION } from '../../core/engine/helpers';
import ImpulsaoContraria from './ImpulsaoContraria';
import { createIc, icEngine, type IcSecret, type IcState, type IcView } from './logic';

export const impulsaoContrariaPlugin: MascarenhasGamePlugin<IcState, IcSecret, IcView> = {
  slug: 'impulsao-contraria',
  title: 'Impulsão Contrária',
  shortDescription: 'Todos defendem o que realmente preferem… menos o Impostor, obrigado a defender o contrário.',
  rulesSummary: [
    'Há exatamente 1 Impostor secreto. A cada rodada aparece um dilema (ex.: “Dinheiro ou amor?”) e todos gravam em segredo sua preferência VERDADEIRA — na 1ª rodada, antes de saber os papéis.',
    'Jogadores normais defendem a própria preferência. O Impostor é obrigado a defender a opção CONTRÁRIA à dele. Todos veem o que cada um defende e debatem.',
    'Votação secreta para achar o Impostor (não vale votar em si). O mais votado, sem empate, fica sem direito a voto nas próximas votações — mas continua jogando. O Impostor joga até o fim.',
    'Pontos (revelados só no final, para não entregar o Impostor): normal que votou no Impostor +200 por rodada; Impostor +150 por normal que não votou nele (mínimo de +300 se não foi o mais votado).',
    'No final, o Painel da Contradição mostra quem era o Impostor e, rodada a rodada, sua preferência real ao lado do que ele defendeu.',
  ],
  minPlayers: 4,
  maxPlayers: 16,
  recommendedPlayers: '5 a 10',
  accentColor: 'red',
  iconName: 'ArrowLeftRight',
  edition: 'new',
  groups: ['deducao'],
  configSchema: [
    { key: 'rounds', label: 'Rodadas (dilemas)', type: 'select', defaultValue: 3, options: [3, 4, 5].map((n) => ({ label: `${n} rodadas`, value: n })) },
    { key: 'debateSeconds', label: 'Tempo de debate', type: 'select', defaultValue: 45, options: [30, 45, 60, 90].map((n) => ({ label: `${n}s`, value: n })) },
    PACK_MODE_OPTION,
  ],
  createInitialState: createIc,
  engine: icEngine,
  Component: ImpulsaoContraria,
};

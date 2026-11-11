/**
 * Mascarenhas Hub — registro de jogos plug-and-play.
 * Para adicionar um novo jogo: crie `src/games/novo-jogo/` implementando
 * `MascarenhasGamePlugin` e adicione-o a REGISTERED_GAMES.
 */
import type { BasePublicState, GameConfig, GameSlug, MascarenhasGamePlugin } from '../../types/game.types';
import { desafio5SegundosPlugin } from '../../games/desafio-5-segundos';
import { impostorPlugin } from '../../games/impostor';
import { megaSenhaPlugin } from '../../games/mega-senha';
import { adivinheAMusicaPlugin } from '../../games/adivinhe-a-musica';
import { categoriasPlugin } from '../../games/categorias';
import { blefePlugin } from '../../games/blefe';
import { infiltradoPlugin } from '../../games/infiltrado';
import { sabeOuPerdePlugin } from '../../games/sabe-ou-perde';
import { quemEMaisProvavelPlugin } from '../../games/quem-e-mais-provavel';
import { ordemCaoticaPlugin } from '../../games/ordem-caotica';

// O registro guarda os plugins com tipos apagados; cada plugin é fortemente tipado internamente.
type AnyPlugin = MascarenhasGamePlugin<BasePublicState, unknown, unknown>;

export const REGISTERED_GAMES: AnyPlugin[] = [
  desafio5SegundosPlugin as unknown as AnyPlugin,
  impostorPlugin as unknown as AnyPlugin,
  megaSenhaPlugin as unknown as AnyPlugin,
  adivinheAMusicaPlugin as unknown as AnyPlugin,
  categoriasPlugin as unknown as AnyPlugin,
  blefePlugin as unknown as AnyPlugin,
  infiltradoPlugin as unknown as AnyPlugin,
  sabeOuPerdePlugin as unknown as AnyPlugin,
  quemEMaisProvavelPlugin as unknown as AnyPlugin,
  ordemCaoticaPlugin as unknown as AnyPlugin,
];

export function getGame(slug: GameSlug): AnyPlugin {
  return REGISTERED_GAMES.find((g) => g.slug === slug) ?? REGISTERED_GAMES[0];
}

export function defaultConfigFor(slug: GameSlug): GameConfig {
  const cfg: GameConfig = {};
  getGame(slug).configSchema.forEach((o) => (cfg[o.key] = o.defaultValue));
  return cfg;
}

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

// O registro guarda os plugins com tipos apagados; cada plugin é fortemente tipado internamente.
type AnyPlugin = MascarenhasGamePlugin<BasePublicState, unknown, unknown>;

export const REGISTERED_GAMES: AnyPlugin[] = [
  desafio5SegundosPlugin as unknown as AnyPlugin,
  impostorPlugin as unknown as AnyPlugin,
  megaSenhaPlugin as unknown as AnyPlugin,
  adivinheAMusicaPlugin as unknown as AnyPlugin,
  categoriasPlugin as unknown as AnyPlugin,
];

export function getGame(slug: GameSlug): AnyPlugin {
  return REGISTERED_GAMES.find((g) => g.slug === slug) ?? REGISTERED_GAMES[0];
}

export function defaultConfigFor(slug: GameSlug): GameConfig {
  const cfg: GameConfig = {};
  getGame(slug).configSchema.forEach((o) => (cfg[o.key] = o.defaultValue));
  return cfg;
}

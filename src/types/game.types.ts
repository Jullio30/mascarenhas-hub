import type React from 'react';
import type { Catalog } from '../data/defaultPacks';

export type GameSlug =
  | 'desafio-5-segundos'
  | 'impostor'
  | 'mega-senha'
  | 'adivinhe-a-musica'
  | 'categorias'
  | 'blefe'
  | 'infiltrado'
  | 'sabe-ou-perde'
  | 'quem-e-mais-provavel'
  | 'ordem-caotica'
  | 'duas-verdades-uma-mentira'
  | 'telefone-de-palavras'
  | 'chute-perfeito'
  | 'quem-escreveu'
  | 'defesa-impossivel'
  | 'impulsao-contraria';

export type GameAccent = 'purple' | 'pink' | 'cyan' | 'red' | 'amber' | 'violet' | 'green' | 'blue' | 'orange';
export type GameGroup = 'deducao' | 'trivia' | 'social';

export type ConfigValue = number | string | boolean;
export type GameConfig = Record<string, ConfigValue>;

export interface GameConfigOption {
  key: string;
  label: string;
  /** 'multiselect' guarda os valores marcados como string separada por vírgulas. */
  type: 'number' | 'select' | 'boolean' | 'multiselect';
  defaultValue: number | string | boolean;
  options?: { label: string; value: string | number }[];
  min?: number;
  max?: number;
  help?: string;
  /** Exibe a opção apenas quando a condição for verdadeira (ex.: 2 impostores só com 7+ jogadores). */
  visibleWhen?: (playerCount: number) => boolean;
  /** Exibe a opção apenas quando a configuração atual satisfaz a condição (ex.: lista de temas só no modo "Selecionados"). */
  visibleWhenConfig?: (config: GameConfig) => boolean;
}

export type PresenceStatus = 'online' | 'away' | 'disconnected';

export interface PlayerStats {
  perfect: number;
  respTotal: number;
  respCount: number;
  streak: number;
  bestStreak: number;
  bluffs: number;
}

export interface Player {
  id: string;
  nickname: string;
  avatar: string;
  joinedAt: number;
  matchScore: number;
  sessionScore: number;
  crowns: number;
  stats: PlayerStats;
}

export interface PodiumEntry {
  playerId: string;
  rank: number;
  score: number;
  crown: boolean;
}

export interface PodiumHighlight {
  title: string;
  playerId: string;
  detail: string;
}

export interface PodiumData {
  game: GameSlug;
  entries: PodiumEntry[];
  highlights: PodiumHighlight[];
}

export interface RoomLogEntry {
  id: string;
  ts: number;
  text: string;
}

export interface RoomPause {
  since: number;
  until: number | null;
  reason: 'manual' | 'min_players';
}

/** Estado público e sincronizado da sala (nunca contém segredos). */
export interface RoomSnapshot {
  code: string;
  roomId: string | null;
  hostId: string;
  status: 'LOBBY' | 'PLAYING' | 'PODIUM';
  gameSlug: GameSlug;
  configs: Partial<Record<GameSlug, GameConfig>>;
  players: Player[];
  kicked: string[];
  game: BasePublicState | null;
  pause: RoomPause | null;
  podium: PodiumData | null;
  usedPromptIds: string[];
  log: RoomLogEntry[];
  version: number;
  updatedAt: number;
  /** Anfitrião está preparando o conteúdo da partida (APIs externas). */
  preparing?: boolean;
  /**
   * Registro de credenciais da sala: chave pública ECDSA P-256 de cada jogador (só a parte pública).
   * Mensagens de um jogador só são aceitas se assinadas pela chave registrada aqui. Opcional: salas antigas não têm.
   */
  keys?: Record<string, JsonWebKey>;
}

/** Campos mínimos que todo estado público de jogo expõe para o cabeçalho da partida. */
export interface BasePublicState {
  phase: string;
  round: number;
  totalRounds: number;
  endsAt: number | null;
  /** Rótulo opcional do cabeçalho (ex.: "Ciclo 2", "Turno 7"); substitui "Rodada X de Y". */
  roundLabel?: string;
  /** Vencedores definidos pela regra do jogo (ex.: chegou à Casa 30): ficam em 1º no pódio, à frente do placar. */
  forcedWinnerIds?: string[];
}

export interface GameAction {
  type: string;
  [key: string]: unknown;
}

export interface GameDraft<TState, TSecret> {
  pub: TState;
  sec: TSecret;
}

/** Contexto injetado pelo motor da sala (autoridade) em cada chamada do jogo. */
export interface EngineCtx {
  now: number;
  rng: () => number;
  config: GameConfig;
  players: Player[];
  hostId: string;
  catalog: Catalog;
  isOnline: (playerId: string) => boolean;
  onlineIds: () => string[];
  award: (playerId: string, points: number) => void;
  stat: (playerId: string, kind: 'perfect' | 'miss' | 'bluff', responseMs?: number) => void;
  log: (text: string) => void;
  isUsed: (promptId: string) => boolean;
  markUsed: (promptId: string) => void;
  /** Conteúdo pré-carregado pelo anfitrião (APIs externas) via plugin.prepare, só em createInitialState. */
  external?: unknown;
  /** Itens dos pacotes personalizados do anfitrião (Editor Universal), só em createInitialState. */
  customItems?: CustomItem[];
}

/** Item de pacote personalizado já sanitizado: `parts` = colunas separadas por "|" (parts[0] = texto principal). */
export interface CustomItem {
  id: string;
  text: string;
  parts: string[];
}

/** Motor puro do jogo. Recebe rascunhos mutáveis e retorna `true` quando houve mudança. */
export interface GameEngine<TState extends BasePublicState, TSecret> {
  action: (draft: GameDraft<TState, TSecret>, from: string, action: GameAction, ctx: EngineCtx) => boolean;
  tick: (draft: GameDraft<TState, TSecret>, ctx: EngineCtx) => boolean;
  /** Visões privadas por jogador (o que cada um pode saber). */
  views: (draft: GameDraft<TState, TSecret>, players: Player[]) => Record<string, unknown>;
  /** Avanço forçado pelo anfitrião (rodada travada). */
  skip?: (draft: GameDraft<TState, TSecret>, ctx: EngineCtx) => boolean;
}

export interface GameMatchProps<TState, TView = unknown> {
  state: TState;
  view: TView | null;
  meId: string;
  hostId: string;
  isHost: boolean;
  players: Player[];
  presence: Record<string, PresenceStatus>;
  config: GameConfig;
  send: (action: GameAction) => void;
}

export interface MascarenhasGamePlugin<TState extends BasePublicState = BasePublicState, TSecret = unknown, TView = unknown> {
  slug: GameSlug;
  title: string;
  shortDescription: string;
  rulesSummary: string[];
  minPlayers: number;
  maxPlayers: number;
  recommendedPlayers: string;
  accentColor: GameAccent;
  iconName: string;
  /** 'classic' = 5 jogos originais; 'new' = expansão. */
  edition?: 'classic' | 'new';
  groups?: GameGroup[];
  configSchema: GameConfigOption[];
  createInitialState: (players: Player[], config: GameConfig, ctx: EngineCtx) => GameDraft<TState, TSecret>;
  engine: GameEngine<TState, TSecret>;
  /**
   * Executado UMA vez no dispositivo do anfitrião antes da partida (ex.: buscar APIs públicas).
   * Nunca deve rejeitar: em falha retorna conteúdo do catálogo local. O resultado chega em ctx.external.
   */
  prepare?: (config: GameConfig, players: Player[]) => Promise<unknown>;
  Component: React.FC<GameMatchProps<TState, TView>>;
}

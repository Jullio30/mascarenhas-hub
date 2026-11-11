import { create } from 'zustand';
import type { PresenceStatus, RoomSnapshot } from '../types/game.types';
import type { TransportMode } from '../core/realtime/roomChannel';
import { sfx } from '../core/audio/sfx';

export const PREFS_KEY = 'mascarenhas_hub_prefs';

export interface HubPrefs {
  nickname: string;
  avatar: string;
  sound: boolean;
  streamerMode: boolean;
}

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'inactive';

export interface Toast {
  id: string;
  text: string;
  kind: 'info' | 'success' | 'error';
}

export interface Reaction {
  id: string;
  from: string;
  emoji: string;
  x: number;
}

function loadPrefs(): HubPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { nickname: '', avatar: 'neon-fox', sound: true, streamerMode: false, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { nickname: '', avatar: 'neon-fox', sound: true, streamerMode: false };
}

interface HubState {
  prefs: HubPrefs;
  mode: TransportMode | null;
  meId: string | null;
  connection: ConnectionState;
  snapshot: RoomSnapshot | null;
  myView: unknown;
  presence: Record<string, PresenceStatus>;
  presenceJoined: Record<string, number>;
  offset: number;
  reactions: Reaction[];
  toasts: Toast[];
  kicked: boolean;
  setPrefs: (patch: Partial<HubPrefs>) => void;
  toast: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: string) => void;
  addReaction: (from: string, emoji: string) => void;
}

export const useHubStore = create<HubState>((set, get) => ({
  prefs: loadPrefs(),
  mode: null,
  meId: null,
  connection: 'idle',
  snapshot: null,
  myView: null,
  presence: {},
  presenceJoined: {},
  offset: 0,
  reactions: [],
  toasts: [],
  kicked: false,
  setPrefs: (patch) => {
    const prefs = { ...get().prefs, ...patch };
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
    if ('sound' in patch) sfx.setEnabled(prefs.sound);
    set({ prefs });
  },
  toast: (text, kind = 'info') => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, kind }] }));
    window.setTimeout(() => get().dismissToast(id), 3800);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  addReaction: (from, emoji) => {
    const id = crypto.randomUUID();
    set((s) => ({ reactions: [...s.reactions.slice(-12), { id, from, emoji, x: 8 + Math.random() * 84 }] }));
    window.setTimeout(() => set((s) => ({ reactions: s.reactions.filter((r) => r.id !== id) })), 1700);
  },
}));

sfx.setEnabled(useHubStore.getState().prefs.sound);

/** Relógio sincronizado com o servidor (Date.now() + offset). */
export function serverNow(): number {
  return Date.now() + useHubStore.getState().offset;
}

export function useIsHost(): boolean {
  return useHubStore((s) => Boolean(s.snapshot && s.meId && s.snapshot.hostId === s.meId));
}

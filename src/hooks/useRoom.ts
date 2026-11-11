import { useCallback } from 'react';
import { useHubStore } from '../store/useHubStore';
import { session } from '../core/session/sessionManager';
import type { GameAction, Player } from '../types/game.types';

/** Atalhos de leitura da sala atual. */
export function useRoom() {
  const snapshot = useHubStore((s) => s.snapshot);
  const meId = useHubStore((s) => s.meId);
  const presence = useHubStore((s) => s.presence);
  const isHost = Boolean(snapshot && meId && snapshot.hostId === meId);
  const send = useCallback((action: GameAction) => session.dispatch(action), []);
  const playerById = useCallback((id: string): Player | undefined => snapshot?.players.find((p) => p.id === id), [snapshot]);
  return { snapshot, meId: meId ?? '', presence, isHost, send, playerById };
}

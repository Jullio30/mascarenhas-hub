import { useEffect, useRef } from 'react';
import { useHubStore } from '../../store/useHubStore';
import { sfx } from '../../core/audio/sfx';

/** Aviso privado enviado pelo motor a UM jogador (via visão privada), ex.: "blefe recusado". */
export interface PrivateNotice {
  id: number;
  text: string;
  kind: 'error' | 'success' | 'info';
  sentAt: number;
}

/** Grava um aviso privado no segredo da rodada (só chega ao dono via `views`). */
export function pushNotice(store: Record<string, PrivateNotice>, playerId: string, now: number, text: string, kind: PrivateNotice['kind'] = 'error') {
  const prev = store[playerId]?.id ?? 0;
  store[playerId] = { id: prev + 1, text, kind, sentAt: now };
}

/** Mostra como toast cada aviso novo; avisos antigos (ex.: após F5) são ignorados. */
export function usePrivateNotice(notice: PrivateNotice | null | undefined) {
  const toast = useHubStore((s) => s.toast);
  const seen = useRef(0);
  useEffect(() => {
    if (!notice || notice.id === seen.current) return;
    seen.current = notice.id;
    if (Math.abs(Date.now() - notice.sentAt) > 20_000) return;
    toast(notice.text, notice.kind);
    if (notice.kind === 'error') sfx.error();
  }, [notice, toast]);
}

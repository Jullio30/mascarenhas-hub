import { useEffect } from 'react';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

/** Screen Wake Lock: impede que a tela do celular apague durante a partida. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };
    if (!active || !nav.wakeLock) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const s = await nav.wakeLock!.request('screen');
        if (cancelled) void s.release();
        else sentinel = s;
      } catch {
        /* sem permissão / bateria baixa */
      }
    };
    void acquire();
    const onVis = () => document.visibilityState === 'visible' && void acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      void sentinel?.release();
    };
  }, [active]);
}

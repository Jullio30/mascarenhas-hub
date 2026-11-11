import { useEffect, useRef, useState } from 'react';
import { serverNow } from '../store/useHubStore';
import { sfx } from '../core/audio/sfx';

/**
 * Cronômetro sem drift: o tempo restante é sempre `endsAt - (Date.now() + offset)`,
 * recalculado a cada frame — abas em segundo plano se corrigem ao voltar.
 */
export function useSyncTimer(endsAt: number | null | undefined, opts: { tickSound?: boolean; urgentBelowMs?: number; resolutionMs?: number } = {}) {
  const { tickSound = false, urgentBelowMs = 3000, resolutionMs = 50 } = opts;
  const calc = () => (endsAt ? Math.max(0, endsAt - serverNow()) : 0);
  const [remaining, setRemaining] = useState(calc);
  const lastSecond = useRef<number | null>(null);

  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last >= resolutionMs) {
        last = t;
        const rem = Math.max(0, endsAt - serverNow());
        setRemaining(rem);
        const sec = Math.ceil(rem / 1000);
        if (tickSound && rem > 0 && lastSecond.current !== null && sec !== lastSecond.current) {
          if (rem <= urgentBelowMs) sfx.tickUrgent();
          else sfx.tick();
        }
        lastSecond.current = sec;
      }
      if (endsAt - serverNow() > -200) raf = requestAnimationFrame(loop);
    };
    lastSecond.current = null;
    raf = requestAnimationFrame(loop);
    // Fallback para abas em segundo plano (rAF pausa): recalcula ao voltar.
    const onVis = () => setRemaining(Math.max(0, endsAt - serverNow()));
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, tickSound, urgentBelowMs, resolutionMs]);

  return remaining;
}

/** Força re-render periódico (para janelas de contestação etc.). */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = window.setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

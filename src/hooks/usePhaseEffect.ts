import { useEffect, useRef } from 'react';

/** Executa um efeito (ex.: som) apenas quando a fase/rodada muda — não no primeiro render após F5. */
export function usePhaseEffect(key: string, effect: (key: string) => void) {
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (prev.current !== null && prev.current !== key) effect(key);
    prev.current = key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

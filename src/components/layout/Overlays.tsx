import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { APP_VERSION, fetchPublishedVersion, isOutdated } from '../../lib/appVersion';
import { useHubStore } from '../../store/useHubStore';
import type { Player } from '../../types/game.types';
import { getAvatar } from '../../data/avatars';
import { cn } from '../ui';

// Referência estável: evita loop infinito no useSyncExternalStore do Zustand
const NO_PLAYERS: Player[] = [];

export function Toasts() {
  const toasts = useHubStore((s) => s.toasts);
  const dismiss = useHubStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            'pointer-events-auto max-w-md rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur animate-rise',
            t.kind === 'error' ? 'border-arcade-red/50 bg-arcade-red/20' : t.kind === 'success' ? 'border-arcade-green/50 bg-arcade-green/20' : 'border-line bg-surface2/95',
          )}
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}

/** Reações flutuantes (emojis) enviadas pelos jogadores. */
export function ReactionLayer() {
  const reactions = useHubStore((s) => s.reactions);
  const players = useHubStore((s) => s.snapshot?.players ?? NO_PLAYERS);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 h-0">
      {reactions.map((r) => {
        const p = players.find((x) => x.id === r.from);
        return (
          <div key={r.id} className="absolute flex flex-col items-center animate-floatUp" style={{ left: `${r.x}%` }}>
            <span className="text-4xl drop-shadow">{r.emoji}</span>
            {p && (
              <span className="rounded-full bg-black/60 px-2 text-[10px] font-bold">
                {getAvatar(p.avatar).emoji} {p.nickname}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const VERSION_CHECK_MS = 5 * 60 * 1000;

/**
 * Faixa "Nova versão disponível" (abaixo do cabeçalho): verifica version.json ao abrir, a cada 5 minutos e sempre que a aba
 * volta a ficar visível. Não recarrega sozinho (o jogador decide); o F5 mantém a sala e a pontuação.
 */
export function UpdateBanner() {
  const [outdated, setOutdated] = useState(false);
  const inRoom = useHubStore((s) => Boolean(s.snapshot));

  useEffect(() => {
    if (APP_VERSION === 'dev') return;
    let alive = true;
    const check = async () => {
      if (document.visibilityState === 'hidden') return;
      const published = await fetchPublishedVersion();
      if (alive && isOutdated(published)) setOutdated(true);
    };
    void check();
    const timer = window.setInterval(() => void check(), VERSION_CHECK_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('online', check);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('online', check);
    };
  }, []);

  if (!outdated) return null;
  return (
    // Fica no fluxo, logo abaixo do cabeçalho (sticky): não cobre os botões do anfitrião no rodapé nem o conteúdo.
    <div role="status" className="sticky top-16 z-20 flex justify-center px-4 pt-3">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-arcade-cyan/50 bg-surface2/95 px-4 py-3 shadow-xl backdrop-blur animate-rise">
        <RefreshCw size={20} className="shrink-0 text-arcade-cyan" aria-hidden />
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-bold">Nova versão disponível</div>
          <div className="text-white/75">{inRoom ? 'Atualize para continuar jogando com todos — você volta para a mesma sala.' : 'Atualize para usar a versão mais recente.'}</div>
        </div>
        <button onClick={() => window.location.reload()} className="shrink-0 rounded-xl bg-arcade-cyan px-3 py-2 text-sm font-bold text-black">
          Atualizar
        </button>
      </div>
    </div>
  );
}

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

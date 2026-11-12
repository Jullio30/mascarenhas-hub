import type { ReactNode } from 'react';
import { getAvatar } from '../../data/avatars';
import type { Player, PresenceStatus } from '../../types/game.types';
import { cn } from '../ui';

export function Avatar({ id, size = 40, ring, dim }: { id: string; size?: number; ring?: string; dim?: boolean }) {
  const a = getAvatar(id);
  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center rounded-2xl', dim && 'opacity-40 grayscale')}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 25%, ${a.color}55, ${a.color}18 70%)`,
        boxShadow: ring ? `0 0 0 2px ${ring}, 0 0 18px ${ring}66` : `inset 0 0 0 1px ${a.color}55`,
        fontSize: size * 0.55,
      }}
      aria-label={a.label}
    >
      {a.emoji}
    </span>
  );
}

export function PresenceDot({ status }: { status: PresenceStatus | undefined }) {
  const s = status ?? 'disconnected';
  const map = {
    online: 'bg-arcade-green shadow-[0_0_8px_#10B981]',
    away: 'bg-arcade-amber',
    disconnected: 'bg-white/25',
  } as const;
  const label = { online: 'Online', away: 'Ausente', disconnected: 'Desconectado' }[s];
  return <span title={label} aria-label={label} className={cn('inline-block h-2.5 w-2.5 rounded-full', map[s])} />;
}

export function PlayerChip({
  player,
  status,
  right,
  highlight,
  sub,
  compact,
}: {
  player: Player | undefined;
  status?: PresenceStatus;
  right?: ReactNode;
  highlight?: 'cyan' | 'red' | 'green' | 'purple' | 'amber';
  sub?: ReactNode;
  compact?: boolean;
}) {
  if (!player) return null;
  const ring = { cyan: 'border-arcade-cyan/70 bg-arcade-cyan/10', red: 'border-arcade-red/70 bg-arcade-red/10', green: 'border-arcade-green/70 bg-arcade-green/10', purple: 'border-brand-purple/70 bg-brand-purple/10', amber: 'border-arcade-amber/70 bg-arcade-amber/10' };
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl border px-3 py-2 transition', highlight ? ring[highlight] : 'border-line bg-surface/70', compact && 'py-1.5')}>
      <Avatar id={player.avatar} size={compact ? 30 : 38} dim={status === 'disconnected'} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{player.nickname}</span>
          {status && <PresenceDot status={status} />}
        </div>
        {sub && <div className="truncate text-xs text-white/70">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function nameOf(players: Player[], id: string | null | undefined): string {
  return players.find((p) => p.id === id)?.nickname ?? '—';
}

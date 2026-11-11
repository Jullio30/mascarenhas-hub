import { useState, type ReactNode } from 'react';
import { Eye } from 'lucide-react';
import { useSyncTimer } from '../../hooks/useSyncTimer';
import { cn } from '../ui';

/** Cronômetro compacto (cabeçalho) com tabular-nums. */
export function SyncTimer({ endsAt, tenths, tickSound, className }: { endsAt: number | null | undefined; tenths?: boolean; tickSound?: boolean; className?: string }) {
  const rem = useSyncTimer(endsAt, { tickSound });
  if (!endsAt) return <span className={cn('font-display tabular-nums text-white/30', className)}>--</span>;
  const urgent = rem <= 3000;
  const text = tenths ? (rem / 1000).toFixed(1) : String(Math.ceil(rem / 1000));
  return <span className={cn('font-display font-bold tabular-nums transition-colors', urgent ? 'text-arcade-red' : 'text-arcade-cyan', className)}>{text}s</span>;
}

/** Barra de progresso do tempo restante. */
export function TimerBar({ endsAt, totalMs, color = 'cyan' }: { endsAt: number | null | undefined; totalMs: number; color?: 'cyan' | 'purple' | 'red' }) {
  const rem = useSyncTimer(endsAt);
  const pct = endsAt ? Math.max(0, Math.min(100, (rem / totalMs) * 100)) : 0;
  const urgent = rem <= 3000;
  const bg = urgent ? 'bg-arcade-red' : color === 'purple' ? 'bg-gradient-to-r from-brand-purple to-brand-pink' : color === 'red' ? 'bg-arcade-red' : 'bg-arcade-cyan';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className={cn('h-full rounded-full transition-[width] duration-100 ease-linear', bg)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Cronômetro gigante para o palco (ex.: 5 segundos). */
export function BigCountdown({ endsAt, totalMs, tenths = true }: { endsAt: number | null | undefined; totalMs: number; tenths?: boolean }) {
  const rem = useSyncTimer(endsAt, { tickSound: true, resolutionMs: 33 });
  const urgent = rem <= 3000;
  const pct = endsAt ? rem / totalMs : 0;
  const R = 70;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative mx-auto grid h-48 w-48 place-items-center">
      <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90">
        <circle cx="80" cy="80" r={R} stroke="rgba(255,255,255,.08)" strokeWidth="10" fill="none" />
        <circle cx="80" cy="80" r={R} stroke={urgent ? '#EF4444' : '#06B6D4'} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ filter: `drop-shadow(0 0 8px ${urgent ? '#EF4444' : '#06B6D4'})` }} />
      </svg>
      <span className={cn('font-display text-6xl font-bold tabular-nums', urgent ? 'text-arcade-red' : 'text-white')}>{tenths ? (rem / 1000).toFixed(1) : Math.ceil(rem / 1000)}</span>
    </div>
  );
}

/** "Segure para ver" — protege o segredo de olhares curiosos no modo presencial. */
export function HoldToReveal({ children, label = 'Segure para ver seu papel' }: { children: ReactNode; label?: string }) {
  const [held, setHeld] = useState(false);
  return (
    <button
      type="button"
      className={cn('relative min-h-40 w-full select-none overflow-hidden rounded-3xl border-2 border-dashed p-5 transition', held ? 'border-brand-purple bg-brand-purple/10' : 'border-white/15 bg-white/[.03]')}
      onPointerDown={() => setHeld(true)}
      onPointerUp={() => setHeld(false)}
      onPointerLeave={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setHeld(true)}
      onKeyUp={() => setHeld(false)}
      onContextMenu={(e) => e.preventDefault()}
      style={{ WebkitTouchCallout: 'none', touchAction: 'none' }}
    >
      {held ? (
        <div className="animate-flip">{children}</div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-white/60">
          <Eye size={32} />
          <span className="font-bold">{label}</span>
          <span className="text-xs text-white/40">Solte para esconder</span>
        </div>
      )}
    </button>
  );
}

export function PhaseTitle({ kicker, title, sub }: { kicker?: ReactNode; title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="text-center">
      {kicker && <div className="mb-1 text-xs font-bold uppercase tracking-[.2em] text-arcade-cyan">{kicker}</div>}
      <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{title}</h2>
      {sub && <p className="mt-1 text-sm text-white/60">{sub}</p>}
    </div>
  );
}

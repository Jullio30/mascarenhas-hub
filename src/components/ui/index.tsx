import { forwardRef, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'cyan';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-[0_5px_0_#9d174d,0_10px_30px_-6px_rgba(236,72,153,.7)] hover:brightness-110 active:translate-y-[3px] active:shadow-[0_2px_0_#9d174d]',
  secondary: 'bg-surface2 text-white border border-line shadow-[0_4px_0_#130b2b] hover:border-fuchsia-400/60 hover:bg-[#382878] active:translate-y-[2px] active:shadow-[0_2px_0_#130b2b]',
  ghost: 'bg-transparent text-white/80 hover:bg-white/[.06] hover:text-white',
  danger: 'bg-arcade-red text-white hover:brightness-110 shadow-[0_5px_0_#991b1b,0_10px_30px_-8px_rgba(239,68,68,.7)] active:translate-y-[3px] active:shadow-[0_2px_0_#991b1b]',
  success: 'bg-arcade-green text-obsidian hover:brightness-110 shadow-[0_5px_0_#047857,0_10px_30px_-8px_rgba(16,185,129,.7)] active:translate-y-[3px] active:shadow-[0_2px_0_#047857]',
  cyan: 'bg-cyan-400 text-obsidian hover:brightness-110 shadow-[0_5px_0_#0e7490,0_10px_30px_-8px_rgba(34,211,238,.7)] active:translate-y-[3px] active:shadow-[0_2px_0_#0e7490]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'lg' | 'xl' | 'sm';
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  const sizes = {
    sm: 'min-h-10 px-3 text-sm rounded-xl',
    md: 'min-h-12 px-5 text-base rounded-2xl',
    lg: 'min-h-14 px-6 text-lg rounded-2xl',
    xl: 'min-h-20 px-8 text-2xl rounded-3xl',
  };
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple',
        sizes[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : icon}
      {children}
    </button>
  );
});

export function Card({ className, children, glow }: { className?: string; children: ReactNode; glow?: 'purple' | 'cyan' | 'red' | 'green' }) {
  const glowCls = { purple: 'shadow-neon', cyan: 'shadow-neon-cyan', red: 'shadow-neon-red', green: 'shadow-neon-green' };
  return <div className={cn('rounded-3xl border border-line bg-surface/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_12px_40px_-12px_rgba(0,0,0,.6)] backdrop-blur', glow && glowCls[glow], className)}>{children}</div>;
}

export function Badge({ children, color = 'purple', className }: { children: ReactNode; color?: 'purple' | 'cyan' | 'red' | 'green' | 'amber' | 'gray' | 'pink'; className?: string }) {
  const colors = {
    purple: 'bg-brand-purple/15 text-violet-300 border-brand-purple/30',
    pink: 'bg-brand-pink/15 text-pink-300 border-brand-pink/30',
    cyan: 'bg-arcade-cyan/15 text-cyan-300 border-arcade-cyan/30',
    red: 'bg-arcade-red/15 text-red-300 border-arcade-red/30',
    green: 'bg-arcade-green/15 text-emerald-300 border-arcade-green/30',
    amber: 'bg-arcade-amber/15 text-amber-300 border-arcade-amber/30',
    gray: 'bg-white/10 text-white/80 border-white/20',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold', colors[color], className)}>{children}</span>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'min-h-12 w-full rounded-2xl border bg-obsidian/70 px-4 text-base text-white placeholder:text-white/55 outline-none transition focus:border-brand-purple focus:shadow-neon',
        invalid ? 'border-arcade-red animate-shake' : 'border-line',
        className,
      )}
      {...rest}
    />
  );
});

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  dismissable = true,
}: {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  dismissable?: boolean;
}) {
  useEffect(() => {
    if (!open || !dismissable) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, dismissable]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => dismissable && onClose?.()}>
      <div
        className={cn('max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 animate-rise sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || (dismissable && onClose)) && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">{title}</h2>
            {dismissable && onClose && (
              <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl text-white/75 hover:bg-white/10 hover:text-white" aria-label="Fechar">
                <X size={20} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="neon-text-cyan text-xs font-bold uppercase tracking-[.18em] text-cyan-300">{children}</h3>
      {right}
    </div>
  );
}

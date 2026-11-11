import { LogOut, Volume2, VolumeX, Wifi, WifiOff, Laptop } from 'lucide-react';
import { useHubStore } from '../../store/useHubStore';
import { sfx } from '../../core/audio/sfx';
import { cn } from '../ui';

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <div className="flex items-center gap-2">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className={size === 'lg' ? 'h-14 w-14' : 'h-9 w-9'} />
      <span className={cn('font-display font-bold tracking-tight', size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-xl')}>
        <span className="brand-text">Mascarenhas</span> Hub
      </span>
    </div>
  );
}

export function SoundToggle() {
  const sound = useHubStore((s) => s.prefs.sound);
  const setPrefs = useHubStore((s) => s.setPrefs);
  return (
    <button
      className="grid h-11 w-11 place-items-center rounded-xl border border-line text-white/70 hover:bg-white/10 hover:text-white"
      onClick={() => {
        setPrefs({ sound: !sound });
        if (!sound) {
          sfx.setEnabled(true);
          sfx.click();
        }
      }}
      aria-label={sound ? 'Desativar som' : 'Ativar som'}
      title={sound ? 'Som ligado' : 'Som desligado'}
    >
      {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  );
}

export function ConnectionBadge() {
  const connection = useHubStore((s) => s.connection);
  const mode = useHubStore((s) => s.mode);
  if (!mode) return null;
  const map = {
    connected: { text: mode === 'local' ? 'Modo Local' : 'Online', cls: 'text-emerald-300 border-arcade-green/40 bg-arcade-green/10' },
    connecting: { text: 'Conectando…', cls: 'text-amber-200 border-arcade-amber/40 bg-arcade-amber/10' },
    reconnecting: { text: 'Reconectando…', cls: 'text-amber-200 border-arcade-amber/40 bg-arcade-amber/10' },
    error: { text: 'Sem conexão', cls: 'text-red-300 border-arcade-red/40 bg-arcade-red/10' },
    inactive: { text: 'Pausado', cls: 'text-white/60 border-line' },
    idle: { text: '—', cls: 'text-white/60 border-line' },
  } as const;
  const m = map[connection];
  const Icon = mode === 'local' ? Laptop : connection === 'connected' ? Wifi : WifiOff;
  return (
    <span className={cn('hidden items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold sm:inline-flex', m.cls)}>
      <Icon size={14} /> {m.text}
    </span>
  );
}

export function Header({ onLeave }: { onLeave?: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-obsidian/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <Logo />
        <div className="flex items-center gap-2">
          <ConnectionBadge />
          <SoundToggle />
          {onLeave && (
            <button onClick={onLeave} className="grid h-11 w-11 place-items-center rounded-xl border border-line text-white/70 hover:bg-arcade-red/20 hover:text-white" aria-label="Sair da sala" title="Sair da sala">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return <footer className="py-6 text-center text-xs text-white/30">Mascarenhas Hub • party games para jogar junto</footer>;
}

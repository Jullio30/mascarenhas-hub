import { LogOut, Volume2, VolumeX, Wifi, WifiOff, Laptop, Tv, TvMinimal } from 'lucide-react';
import { useHubStore } from '../../store/useHubStore';
import { sfx } from '../../core/audio/sfx';
import { cn } from '../ui';

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <div className="flex items-center gap-2">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className={size === 'lg' ? 'h-12 w-12 shrink-0 sm:h-14 sm:w-14' : 'h-9 w-9 shrink-0'} />
      <span className={cn('flex items-center gap-x-2 gap-y-2 font-arcade leading-none', size === 'lg' ? 'flex-wrap text-3xl sm:text-5xl' : 'whitespace-nowrap text-[15px] sm:text-xl')}>
        <span className="arcade-title">Mascarenhas</span>
        <span className={cn('inline-block -rotate-3 rounded-lg bg-arcade-amber text-obsidian shadow-[0_4px_0_#b45309]', size === 'lg' ? 'px-2.5 py-1.5' : 'px-1.5 py-1 text-[11px] sm:text-base')}>HUB</span>
      </span>
    </div>
  );
}

export function SoundToggle() {
  const sound = useHubStore((s) => s.prefs.sound);
  const setPrefs = useHubStore((s) => s.setPrefs);
  return (
    <button
      className="grid h-11 w-11 place-items-center rounded-xl border border-line text-white/80 hover:bg-white/10 hover:text-white"
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

export function CrtToggle() {
  const crt = useHubStore((s) => s.prefs.crt);
  const setPrefs = useHubStore((s) => s.setPrefs);
  return (
    <button
      className={cn('grid h-11 w-11 place-items-center rounded-xl border hover:bg-white/10 hover:text-white', crt ? 'border-cyan-400/60 text-cyan-300' : 'border-line text-white/80')}
      onClick={() => {
        setPrefs({ crt: !crt });
        sfx.click();
      }}
      aria-label={crt ? 'Desativar efeito TV antiga' : 'Ativar efeito TV antiga'}
      title={crt ? 'Efeito TV antiga ligado' : 'Efeito TV antiga desligado'}
    >
      {crt ? <Tv size={20} /> : <TvMinimal size={20} />}
    </button>
  );
}

/** Camada da TV de tubo: não captura cliques e fica por cima de tudo. */
export function CrtOverlay() {
  const crt = useHubStore((s) => s.prefs.crt);
  if (!crt) return null;
  return <div className="crt-overlay" aria-hidden="true" />;
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
    inactive: { text: 'Pausado', cls: 'text-white/75 border-line' },
    idle: { text: '—', cls: 'text-white/75 border-line' },
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
    <header className="sticky top-0 z-30 border-b-2 border-fuchsia-500/40 bg-obsidian/80 shadow-[0_0_14px_rgba(217,70,239,.15)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <Logo />
        <div className="flex items-center gap-2">
          <ConnectionBadge />
          <CrtToggle />
          <SoundToggle />
          {onLeave && (
            <button onClick={onLeave} className="grid h-11 w-11 place-items-center rounded-xl border border-line text-white/80 hover:bg-arcade-red/20 hover:text-white" aria-label="Sair da sala" title="Sair da sala">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return <footer className="py-6 text-center text-xs text-white/65">Mascarenhas Hub • party games para jogar junto</footer>;
}

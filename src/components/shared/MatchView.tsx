import { Component, useState, type ReactNode } from 'react';
import type { RoomLogEntry } from '../../types/game.types';
import { BarChart3, FastForward, History, Pause, Play, Square } from 'lucide-react';
import { useRoom } from '../../hooks/useRoom';
import { useHubStore } from '../../store/useHubStore';
import { getGame, defaultConfigFor } from '../../core/registry/gameRegistry';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useSyncTimer } from '../../hooks/useSyncTimer';
import { Badge, Button, Card, Modal, SectionTitle, cn } from '../ui';
import { Avatar, PresenceDot } from './PlayerBits';
import { SyncTimer } from './SyncTimer';
import { ConfirmButton } from './ConfirmButton';
import { ReactionBar } from '../lobby/Lobby';
import { ACCENT, GameIcon } from '../lobby/gameVisuals';

// Referência estável: evita loop infinito no useSyncExternalStore do Zustand
const NO_LOG: RoomLogEntry[] = [];

class GameErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <Card className="text-center">
          <div className="font-bold text-arcade-red">Ops! Algo falhou ao desenhar o jogo.</div>
          <p className="mt-1 text-sm text-white/60">{this.state.error.message}</p>
          <Button className="mt-4" variant="secondary" onClick={() => this.setState({ error: null })}>
            Tentar novamente
          </Button>
        </Card>
      );
    }
    return this.props.children;
  }
}

export function MatchScoreboard() {
  const { snapshot, presence, meId } = useRoom();
  if (!snapshot) return null;
  const sorted = [...snapshot.players].sort((a, b) => b.matchScore - a.matchScore);
  return (
    <div className="grid gap-1.5">
      {sorted.map((p, i) => (
        <div key={p.id} className={cn('flex items-center gap-2 rounded-xl px-2 py-1.5', p.id === meId ? 'bg-brand-purple/15' : 'bg-white/[.03]')}>
          <span className="w-6 text-center text-sm font-bold text-white/40">{i + 1}º</span>
          <Avatar id={p.avatar} size={28} dim={!presence[p.id]} />
          <span className="flex-1 truncate text-sm font-semibold">{p.nickname}</span>
          <PresenceDot status={presence[p.id] ?? 'disconnected'} />
          <span className="w-12 text-right font-display font-bold tabular-nums">{p.matchScore}</span>
        </div>
      ))}
    </div>
  );
}

function RoundLog() {
  const log = useHubStore((s) => s.snapshot?.log ?? NO_LOG);
  return (
    <div className="grid max-h-56 gap-1 overflow-y-auto text-sm">
      {[...log].reverse().slice(0, 15).map((l) => (
        <div key={l.id} className="rounded-lg bg-white/[.02] px-2 py-1 text-white/60">
          {l.text}
        </div>
      ))}
      {log.length === 0 && <div className="text-white/30">Nada por aqui ainda.</div>}
    </div>
  );
}

export function HostControls() {
  const { snapshot, send } = useRoom();
  if (!snapshot) return null;
  const paused = Boolean(snapshot.pause);
  return (
    <div className="grid grid-cols-3 gap-2">
      <Button size="sm" variant="secondary" onClick={() => send({ type: paused ? 'ROOM/RESUME' : 'ROOM/PAUSE' })} icon={paused ? <Play size={16} /> : <Pause size={16} />}>
        {paused ? 'Retomar' : 'Pausar'}
      </Button>
      <Button size="sm" variant="secondary" disabled={paused} onClick={() => send({ type: 'ROOM/SKIP' })} icon={<FastForward size={16} />}>
        Avançar
      </Button>
      <ConfirmButton size="sm" variant="secondary" confirmLabel="Encerrar?" onConfirm={() => send({ type: 'ROOM/END_MATCH' })}>
        <Square size={16} /> Encerrar
      </ConfirmButton>
    </div>
  );
}

function PauseOverlay() {
  const { snapshot, isHost, send } = useRoom();
  const pause = snapshot?.pause;
  const rem = useSyncTimer(pause?.until ?? null);
  if (!pause) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-sm text-center animate-pop" glow="purple">
        <Pause className="mx-auto mb-2 text-brand-purple" size={40} />
        <div className="font-display text-2xl font-bold">Partida pausada</div>
        <p className="mt-1 text-white/60">
          {pause.reason === 'min_players' ? `Jogadores insuficientes. Aguardando reconexão… ${Math.ceil(rem / 1000)}s` : 'O anfitrião pausou a partida.'}
        </p>
        {isHost && (
          <div className="mt-4 grid gap-2">
            {pause.reason === 'manual' && (
              <Button onClick={() => send({ type: 'ROOM/RESUME' })} icon={<Play />}>
                Retomar
              </Button>
            )}
            <ConfirmButton variant="secondary" confirmLabel="Confirmar volta ao lobby" onConfirm={() => send({ type: 'ROOM/END_MATCH' })}>
              Voltar ao lobby
            </ConfirmButton>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function MatchView() {
  const { snapshot, meId, isHost, presence, send } = useRoom();
  const myView = useHubStore((s) => s.myView);
  const [drawer, setDrawer] = useState(false);
  useWakeLock(snapshot?.status === 'PLAYING');
  if (!snapshot?.game) return null;
  const plugin = getGame(snapshot.gameSlug);
  const GameComponent = plugin.Component;
  const g = snapshot.game;
  const config = { ...defaultConfigFor(plugin.slug), ...(snapshot.configs[plugin.slug] ?? {}) };
  const a = ACCENT[plugin.accentColor];
  const hideTimer = g.phase === 'FINISHED';

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-4 lg:grid-cols-[1fr_340px]">
      <div className="grid content-start gap-5">
        <div className="flex items-center gap-3 rounded-3xl border border-line bg-surface/80 p-3 backdrop-blur">
          <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', a.bg)}>
            <GameIcon name={plugin.iconName} className={a.text} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display font-bold">{plugin.title}</div>
            <div className="text-xs text-white/50">
              Rodada {Math.min(g.round, g.totalRounds)} de {g.totalRounds}
            </div>
          </div>
          {!hideTimer && <SyncTimer endsAt={snapshot.pause ? null : g.endsAt} className="text-2xl" />}
          <button className="grid h-11 w-11 place-items-center rounded-xl border border-line text-white/70 hover:bg-white/10 lg:hidden" onClick={() => setDrawer(true)} aria-label="Abrir placar">
            <BarChart3 size={20} />
          </button>
        </div>

        <GameErrorBoundary>
          <GameComponent state={g} view={myView} meId={meId} hostId={snapshot.hostId} isHost={isHost} players={snapshot.players} presence={presence} config={config} send={send} />
        </GameErrorBoundary>

        {isHost && (
          <div className="lg:hidden">
            <HostControls />
          </div>
        )}
      </div>

      <aside className="hidden content-start gap-5 lg:grid">
        <Card>
          <SectionTitle right={<Badge color="purple">ao vivo</Badge>}>Placar da partida</SectionTitle>
          <MatchScoreboard />
        </Card>
        {isHost && (
          <Card>
            <SectionTitle>Controles do anfitrião</SectionTitle>
            <HostControls />
          </Card>
        )}
        <Card>
          <SectionTitle>
            <span className="inline-flex items-center gap-1">
              <History size={14} /> Histórico
            </span>
          </SectionTitle>
          <RoundLog />
        </Card>
        <Card>
          <SectionTitle>Reações</SectionTitle>
          <ReactionBar />
        </Card>
      </aside>

      <Modal open={drawer} onClose={() => setDrawer(false)} title="Placar da partida">
        <MatchScoreboard />
        <div className="mt-5">
          <SectionTitle>Reações</SectionTitle>
          <ReactionBar />
        </div>
        <div className="mt-5">
          <SectionTitle>Histórico</SectionTitle>
          <RoundLog />
        </div>
      </Modal>
      <PauseOverlay />
    </div>
  );
}

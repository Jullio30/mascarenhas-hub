import { Component, useEffect, useState, type ReactNode } from 'react';
import { PlugZap, UserX } from 'lucide-react';
import { useHubStore } from './store/useHubStore';
import { session } from './core/session/sessionManager';
import { isSupabaseConfigured } from './lib/supabase';
import { normalizeRoomCode } from './core/realtime/roomChannel';
import { sfx } from './core/audio/sfx';
import { Footer, Header, Logo, CrtOverlay } from './components/layout/Header';
import { ReactionLayer, Toasts } from './components/layout/Overlays';
import HomeScreen from './components/lobby/HomeScreen';
import Lobby from './components/lobby/Lobby';
import MatchView from './components/shared/MatchView';
import PodiumModal from './components/shared/PodiumModal';
import { Button, Modal } from './components/ui';
import { ConfirmButton } from './components/shared/ConfirmButton';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-screen place-items-center p-6 text-center">
          <div>
            <Logo size="lg" />
            <p className="mt-6 text-white/80">Algo deu errado: {this.state.error.message}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Recarregar
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Splash({ text }: { text: string }) {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <div className="flex flex-col items-center gap-5">
        <Logo size="lg" />
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-brand-pink" />
        <div className="text-white/75">{text}</div>
      </div>
    </div>
  );
}

export default function App() {
  const snapshot = useHubStore((s) => s.snapshot);
  const connection = useHubStore((s) => s.connection);
  const kicked = useHubStore((s) => s.kicked);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const unlock = () => sfx.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    let cancelled = false;
    (async () => {
      const resumed = await session.resume();
      if (!resumed && !cancelled) {
        // Link de convite com apelido já salvo => entra direto no lobby
        const room = normalizeRoomCode(new URL(window.location.href).searchParams.get('room') ?? '');
        const prefs = useHubStore.getState().prefs;
        if (room.length === 6 && prefs.nickname.length >= 2) {
          try {
            const local = !isSupabaseConfigured || new URL(window.location.href).searchParams.get('local') === '1';
            await session.joinRoom(local ? 'local' : 'supabase', room, { nickname: prefs.nickname, avatar: prefs.avatar });
          } catch (err) {
            useHubStore.getState().toast((err as Error).message, 'error');
          }
        }
      }
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', unlock);
    };
  }, []);

  // Troca de tela (início → lobby → partida → pódio) sempre começa do topo:
  // sem isso o lobby abria rolado até onde estava o botão "Criar sala", escondendo o código da sala.
  const screen = booting ? 'boot' : !snapshot ? 'home' : snapshot.status;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  let content: ReactNode;
  if (booting) content = <Splash text="Carregando o Mascarenhas Hub…" />;
  else if (!snapshot) content = connection === 'connecting' ? <Splash text="Entrando na sala…" /> : <HomeScreen />;
  else if (snapshot.status === 'PLAYING') content = <MatchView />;
  else if (snapshot.status === 'PODIUM') content = <PodiumModal />;
  else content = <Lobby />;

  return (
    <AppErrorBoundary>
      <div className="flex min-h-screen flex-col">
        <Header onLeave={snapshot ? () => session.leave() : undefined} />
        <main className="flex-1">{content}</main>
        <Footer />
      </div>
      <Toasts />
      <ReactionLayer />
      <CrtOverlay />

      <Modal open={connection === 'inactive'} dismissable={false} title="Sessão pausada por inatividade">
        <p className="text-white/80">A sala ficou 30 minutos sem interação no lobby, então desconectamos para economizar conexões.</p>
        <div className="mt-5 grid gap-2">
          <Button size="lg" onClick={() => void session.reconnect()} icon={<PlugZap />}>
            Clique para reconectar
          </Button>
          <ConfirmButton variant="ghost" confirmLabel="Confirmar saída" onConfirm={() => session.leave()}>
            Sair da sala
          </ConfirmButton>
        </div>
      </Modal>

      <Modal open={kicked} onClose={() => useHubStore.setState({ kicked: false })} title="Você saiu da sala">
        <div className="flex items-center gap-3 text-white/80">
          <UserX className="text-arcade-red" /> O anfitrião removeu você desta sala.
        </div>
        <Button className="mt-5 w-full" onClick={() => useHubStore.setState({ kicked: false })}>
          Voltar ao início
        </Button>
      </Modal>
    </AppErrorBoundary>
  );
}

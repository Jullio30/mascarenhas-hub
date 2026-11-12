import { useEffect, useState } from 'react';
import { AlertTriangle, DoorOpen, Laptop, Plus, Sparkles, Users } from 'lucide-react';
import { AVATARS } from '../../data/avatars';
import { useHubStore } from '../../store/useHubStore';
import { session } from '../../core/session/sessionManager';
import { normalizeRoomCode, type TransportMode } from '../../core/realtime/roomChannel';
import { isSupabaseConfigured } from '../../lib/supabase';
import { sanitizeNickname } from '../../lib/textUtils';
import { REGISTERED_GAMES } from '../../core/registry/gameRegistry';
import { sfx } from '../../core/audio/sfx';
import { Badge, Button, Card, Input, Modal, SectionTitle, cn } from '../ui';
import { Logo } from '../layout/Header';
import { GameIcon, ACCENT } from './gameVisuals';

export function ProfileEditor({ nickname, setNickname, avatar, setAvatar, error }: { nickname: string; setNickname: (v: string) => void; avatar: string; setAvatar: (v: string) => void; error?: string | null }) {
  return (
    <div className="grid gap-4">
      <div>
        <label className="mb-2 block text-sm font-semibold text-white/80" htmlFor="nick">
          Seu apelido
        </label>
        <Input id="nick" value={nickname} onChange={(e) => setNickname(e.target.value.slice(0, 16))} placeholder="Ex: Mascarenhas" maxLength={16} autoComplete="nickname" invalid={Boolean(error)} />
        {error && <p className="mt-1 text-sm text-arcade-red">{error}</p>}
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold text-white/80">Escolha seu avatar</div>
        <div className="grid grid-cols-8 gap-2">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => (setAvatar(a.id), sfx.click())}
              className={cn('grid aspect-square place-items-center rounded-xl border text-2xl transition', avatar === a.id ? 'scale-105 border-brand-purple bg-brand-purple/20 shadow-neon' : 'border-line hover:bg-white/5')}
              title={a.label}
              aria-label={a.label}
            >
              {a.emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function validateNick(raw: string): { value: string; error: string | null } {
  const value = sanitizeNickname(raw);
  if (value.length < 2) return { value, error: 'O apelido precisa ter de 2 a 16 caracteres.' };
  return { value, error: null };
}

export default function HomeScreen() {
  const prefs = useHubStore((s) => s.prefs);
  const setPrefs = useHubStore((s) => s.setPrefs);
  const toast = useHubStore((s) => s.toast);
  const [nickname, setNickname] = useState(prefs.nickname);
  const [avatar, setAvatar] = useState(prefs.avatar);
  const [nickErr, setNickErr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [mode, setMode] = useState<TransportMode | null>(isSupabaseConfigured ? 'supabase' : null);
  const [inviteModal, setInviteModal] = useState(false);

  useEffect(() => {
    const room = new URL(window.location.href).searchParams.get('room');
    if (room) {
      setCode(normalizeRoomCode(room));
      if (!isSupabaseConfigured) setMode('local');
      setInviteModal(true);
    }
  }, []);

  const profileOk = () => {
    const { value, error } = validateNick(nickname);
    setNickErr(error);
    if (error) return null;
    setPrefs({ nickname: value, avatar });
    return { nickname: value, avatar };
  };

  const run = async (kind: 'create' | 'join') => {
    sfx.unlock();
    const profile = profileOk();
    if (!profile) return;
    const m = mode ?? 'local';
    if (kind === 'join' && normalizeRoomCode(code).length !== 6) {
      toast('O código da sala tem 6 caracteres.', 'error');
      return;
    }
    setBusy(kind);
    sfx.coin(); // "insert coin"
    try {
      if (kind === 'create') await session.createRoom(m, profile);
      else await session.joinRoom(m, normalizeRoomCode(code), profile);
    } catch (err) {
      toast((err as Error).message || 'Algo deu errado.', 'error');
      sfx.error();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1.1fr_1fr] lg:py-14">
      <section className="flex flex-col justify-center gap-6">
        <Logo size="lg" />
        <p className="max-w-lg text-lg text-white/80">
          Party games multiplayer para reunir os amigos — no mesmo sofá com celulares + TV, ou à distância numa chamada de voz.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {REGISTERED_GAMES.map((g) => (
            <div key={g.slug} className={cn('flex items-center gap-3 rounded-2xl border-2 bg-surface/70 p-3 transition hover:-translate-y-0.5', ACCENT[g.accentColor].edge)}>
              <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', ACCENT[g.accentColor].bg)}>
                <GameIcon name={g.iconName} className={ACCENT[g.accentColor].text} />
              </span>
              <div className="min-w-0">
                <div className="font-bold">{g.title}</div>
                <div className="truncate text-xs text-white/80">{g.recommendedPlayers} jogadores</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        {!isSupabaseConfigured && (
          <Card className="border-arcade-amber/40 bg-arcade-amber/[.06]">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-arcade-amber" />
              <div className="text-sm text-white/80">
                <div className="mb-1 font-bold text-amber-200">Supabase não configurado</div>
                Defina <code className="text-amber-200">VITE_SUPABASE_URL</code> e <code className="text-amber-200">VITE_SUPABASE_ANON_KEY</code> no <code>.env.local</code> para jogar online entre dispositivos. Enquanto isso, use o
                <b> Modo Passa-o-Celular / Local</b>: abra várias abas deste navegador — cada aba é um jogador.
              </div>
            </div>
          </Card>
        )}

        <Card glow="purple">
          <SectionTitle right={mode === 'local' ? <Badge color="amber"><Laptop size={12} /> Modo Local</Badge> : <Badge color="green">Online</Badge>}>Seu perfil</SectionTitle>
          <ProfileEditor nickname={nickname} setNickname={(v) => (setNickname(v), setNickErr(null))} avatar={avatar} setAvatar={setAvatar} error={nickErr} />
          <div className="mt-5 grid gap-3">
            <Button size="lg" onClick={() => run('create')} loading={busy === 'create'} disabled={Boolean(busy)} icon={<Plus />}>
              Criar sala
            </Button>
            <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-white/65">
              <span className="h-px flex-1 bg-line" /> ou entre com um código <span className="h-px flex-1 bg-line" />
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run('join');
              }}
            >
              <Input
                value={code}
                onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
                placeholder="K7M9P2"
                className="text-center font-display text-xl font-bold uppercase tracking-[.35em]"
                inputMode="text"
                autoCapitalize="characters"
                maxLength={6}
                aria-label="Código da sala"
              />
              <Button type="submit" variant="cyan" loading={busy === 'join'} disabled={Boolean(busy) || code.length !== 6} icon={<DoorOpen />}>
                Entrar
              </Button>
            </form>
          </div>
          {isSupabaseConfigured && (
            <button className="mt-4 w-full text-center text-xs text-white/70 underline-offset-4 hover:text-white/80 hover:underline" onClick={() => setMode(mode === 'local' ? 'supabase' : 'local')}>
              {mode === 'local' ? 'Voltar ao modo online (Supabase)' : 'Testar no Modo Local (abas do mesmo navegador)'}
            </button>
          )}
        </Card>
        <p className="flex items-center justify-center gap-2 text-center text-xs text-white/70">
          <Users size={14} /> Sem cadastro: seu apelido e avatar ficam salvos neste dispositivo.
        </p>
      </section>

      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title={<span className="flex items-center gap-2"><Sparkles className="text-brand-pink" /> Convite para a sala {code}</span>}>
        <ProfileEditor nickname={nickname} setNickname={(v) => (setNickname(v), setNickErr(null))} avatar={avatar} setAvatar={setAvatar} error={nickErr} />
        <Button size="lg" className="mt-5 w-full" loading={busy === 'join'} onClick={() => void run('join')} icon={<DoorOpen />}>
          Entrar na sala {code}
        </Button>
      </Modal>
    </div>
  );
}

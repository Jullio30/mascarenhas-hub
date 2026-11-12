import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { BookOpen, Copy, Crown, Eye, EyeOff, Play, QrCode, Trophy, UserMinus, UserCog } from 'lucide-react';
import { useHubStore } from '../../store/useHubStore';
import { useRoom } from '../../hooks/useRoom';
import { session } from '../../core/session/sessionManager';
import { REGISTERED_GAMES, getGame, defaultConfigFor } from '../../core/registry/gameRegistry';
import type { GameConfigOption, GameSlug } from '../../types/game.types';
import { sfx } from '../../core/audio/sfx';
import { Badge, Button, Card, Modal, SectionTitle, cn } from '../ui';
import { PlayerChip } from '../shared/PlayerBits';
import { ConfirmButton } from '../shared/ConfirmButton';
import { ACCENT, GameIcon } from './gameVisuals';

const REACTIONS = ['🔥', '😂', '👏', '😱', '🎉', '💀'];

type GameFilter = 'all' | 'classic' | 'new' | 'deducao' | 'trivia' | 'social';
const FILTERS: { key: GameFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'classic', label: 'Clássicos' },
  { key: 'new', label: 'Novos' },
  { key: 'deducao', label: 'Dedução & Blefe' },
  { key: 'trivia', label: 'Trivia & Lógica' },
  { key: 'social', label: 'Social & Rápido' },
];
const matchesFilter = (g: (typeof REGISTERED_GAMES)[number], f: GameFilter) =>
  f === 'all' || (f === 'classic' || f === 'new' ? (g.edition ?? 'classic') === f : (g.groups ?? []).includes(f));

export function inviteLink(code: string) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('room', code);
  return url.toString();
}

function QRCodeModal({ open, onClose, code }: { open: boolean; onClose: () => void; code: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    if (!open) return;
    void QRCode.toString(inviteLink(code), { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#090A0F', light: '#FFFFFF' } }).then(setSvg);
  }, [open, code]);
  return (
    <Modal open={open} onClose={onClose} title="Aponte a câmera para entrar">
      <div className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="mt-4 text-center font-display text-3xl font-bold tracking-[.3em]">{code}</div>
      <p className="mt-1 text-center text-sm text-white/70">Mascarenhas Hub • sala {code}</p>
    </Modal>
  );
}

export function RoomCodePanel() {
  const { snapshot } = useRoom();
  const streamer = useHubStore((s) => s.prefs.streamerMode);
  const setPrefs = useHubStore((s) => s.setPrefs);
  const toast = useHubStore((s) => s.toast);
  const mode = useHubStore((s) => s.mode);
  const [qr, setQr] = useState(false);
  if (!snapshot) return null;
  const code = snapshot.code;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink(code));
      toast('Link de convite copiado!', 'success');
    } catch {
      toast(inviteLink(code), 'info');
    }
  };
  return (
    <Card className="flex flex-col items-center gap-4 text-center" glow="purple">
      <div className="text-xs font-bold uppercase tracking-[.25em] text-white/70">Código da sala</div>
      <div className="font-display text-5xl font-bold tracking-[.3em] sm:text-6xl">{streamer ? '••••••' : <span className="brand-text">{code}</span>}</div>
      {mode === 'local' && <Badge color="amber">Modo Local: convide abrindo novas abas neste navegador</Badge>}
      <div className="grid w-full grid-cols-3 gap-2">
        <Button variant="secondary" size="sm" onClick={copy} icon={<Copy size={16} />}>
          Copiar link
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setQr(true)} icon={<QrCode size={16} />}>
          QR Code
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setPrefs({ streamerMode: !streamer })} icon={streamer ? <Eye size={16} /> : <EyeOff size={16} />}>
          {streamer ? 'Mostrar' : 'Ocultar'}
        </Button>
      </div>
      <QRCodeModal open={qr} onClose={() => setQr(false)} code={code} />
    </Card>
  );
}

export function PlayerList({ showHostActions }: { showHostActions: boolean }) {
  const { snapshot, presence, meId, isHost } = useRoom();
  if (!snapshot) return null;
  const sorted = [...snapshot.players].sort((a, b) => a.joinedAt - b.joinedAt);
  return (
    <div className="grid gap-2">
      {sorted.map((p) => {
        const status = presence[p.id] ?? 'disconnected';
        const host = p.id === snapshot.hostId;
        return (
          <div key={p.id} className="group">
            <PlayerChip
              player={p}
              status={status}
              highlight={p.id === meId ? 'purple' : undefined}
              sub={
                <span className="flex items-center gap-2">
                  {host && (
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <Crown size={12} /> Anfitrião
                    </span>
                  )}
                  <span>{p.sessionScore} pts na sessão</span>
                  {p.crowns > 0 && <span className="text-amber-300">👑×{p.crowns}</span>}
                </span>
              }
              right={
                showHostActions && isHost && !host ? (
                  <div className="flex gap-1">
                    <ConfirmButton size="sm" variant="ghost" title="Transferir anfitrião" confirmLabel={<UserCog size={16} />} onConfirm={() => session.dispatch({ type: 'ROOM/TRANSFER_HOST', playerId: p.id })}>
                      <Crown size={16} />
                    </ConfirmButton>
                    <ConfirmButton size="sm" variant="ghost" title="Remover jogador" confirmLabel="Remover?" onConfirm={() => void session.kick(p.id)}>
                      <UserMinus size={16} />
                    </ConfirmButton>
                  </div>
                ) : null
              }
            />
          </div>
        );
      })}
    </div>
  );
}

export function ReactionBar() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {REACTIONS.map((e) => (
        <button key={e} className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-white/[.03] text-2xl transition hover:scale-110 hover:bg-white/10 active:scale-95" onClick={() => session.react(e) && sfx.pop()} aria-label={`Reagir ${e}`}>
          {e}
        </button>
      ))}
    </div>
  );
}

function ConfigField({ opt, value, editable, onChange }: { opt: GameConfigOption; value: unknown; editable: boolean; onChange: (v: string | number | boolean) => void }) {
  const base = 'min-h-12 w-full rounded-2xl border border-line bg-obsidian/70 px-3 text-base text-white outline-none focus:border-brand-purple disabled:opacity-60';
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-white/70">{opt.label}</span>
      {opt.type === 'boolean' ? (
        <button
          type="button"
          disabled={!editable}
          onClick={() => onChange(!value)}
          className={cn('flex min-h-12 items-center justify-between rounded-2xl border px-4 font-semibold transition disabled:opacity-60', Boolean(value) ? 'border-arcade-green/50 bg-arcade-green/10 text-emerald-200' : 'border-line text-white/75')}
        >
          {value ? 'Ativado' : 'Desativado'}
          <span className={cn('h-6 w-11 rounded-full p-0.5 transition', Boolean(value) ? 'bg-arcade-green' : 'bg-white/15')}>
            <span className={cn('block h-5 w-5 rounded-full bg-white transition', Boolean(value) && 'translate-x-5')} />
          </span>
        </button>
      ) : opt.type === 'select' ? (
        <select className={base} disabled={!editable} value={String(value)} onChange={(e) => onChange(typeof opt.defaultValue === 'number' ? Number(e.target.value) : e.target.value)}>
          {opt.options?.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="number"
          className={base}
          disabled={!editable}
          min={opt.min}
          max={opt.max}
          value={Number(value)}
          onChange={(e) => {
            const n = Math.round(Number(e.target.value));
            if (!Number.isFinite(n)) return;
            onChange(Math.max(opt.min ?? 1, Math.min(opt.max ?? 99, n)));
          }}
        />
      )}
    </label>
  );
}

export default function Lobby() {
  const { snapshot, presence, isHost, send } = useRoom();
  const [filter, setFilter] = useState<GameFilter>('all');
  const [rulesFor, setRulesFor] = useState<GameSlug | null>(null);
  if (!snapshot) return null;
  const rulesGame = rulesFor ? getGame(rulesFor) : null;
  const game = getGame(snapshot.gameSlug);
  const config = { ...defaultConfigFor(game.slug), ...(snapshot.configs[game.slug] ?? {}) };
  const onlineCount = snapshot.players.filter((p) => presence[p.id] === 'online' || presence[p.id] === 'away').length;
  const canStart = onlineCount >= game.minPlayers && onlineCount <= game.maxPlayers;
  const host = snapshot.players.find((p) => p.id === snapshot.hostId);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[1fr_380px]">
      <div className="grid content-start gap-5">
        <Card>
          <SectionTitle right={!isHost && <span className="text-xs text-white/60">Somente {host?.nickname ?? 'o anfitrião'} escolhe o jogo</span>}>Escolha o jogo</SectionTitle>
          <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {FILTERS.map((f) => {
              const n = REGISTERED_GAMES.filter((g) => matchesFilter(g, f.key)).length;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn('shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition', filter === f.key ? 'border-brand-purple bg-brand-purple/20 text-white' : 'border-line text-white/75 hover:text-white')}
                >
                  {f.label} ({n})
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {REGISTERED_GAMES.filter((g) => matchesFilter(g, filter)).map((g) => {
              const sel = g.slug === snapshot.gameSlug;
              const a = ACCENT[g.accentColor];
              const choose = () => {
                if (!isHost) return;
                send({ type: 'ROOM/SELECT_GAME', slug: g.slug as GameSlug });
                sfx.click();
              };
              return (
                <div
                  key={g.slug}
                  role="button"
                  tabIndex={isHost ? 0 : -1}
                  aria-disabled={!isHost}
                  aria-pressed={sel}
                  onClick={choose}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      choose();
                    }
                  }}
                  className={cn('flex min-h-28 flex-col gap-2 rounded-3xl border p-4 text-left transition', isHost ? 'cursor-pointer' : 'cursor-default', sel ? `${a.border} ${a.bg} ${a.glow}` : cn('border-line bg-surface/70', isHost && 'hover:bg-white/[.05]'))}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', a.bg)}>
                      <GameIcon name={g.iconName} className={a.text} size={22} />
                    </span>
                    <span className="min-w-0 flex-1 font-display text-lg font-bold leading-tight">{g.title}</span>
                    {g.edition === 'new' && <Badge color="green">Novo</Badge>}
                  </div>
                  <span className="text-sm text-white/75">{g.shortDescription}</span>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="text-xs text-white/60">
                      {g.minPlayers}–{g.maxPlayers} jogadores • ideal {g.recommendedPlayers}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRulesFor(g.slug as GameSlug);
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-bold text-white/70 hover:bg-white/10"
                    >
                      <BookOpen size={12} /> Ver Regras
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <SectionTitle>Como jogar: {game.title}</SectionTitle>
            <ul className="grid gap-2 text-sm text-white/75">
              {game.rulesSummary.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-bold">{i + 1}</span>
                  {r}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <SectionTitle>Configurações da partida</SectionTitle>
            <div className="grid gap-3">
              {game.configSchema
                .filter((o) => !o.visibleWhen || o.visibleWhen(onlineCount))
                .map((o) => (
                  <ConfigField key={o.key} opt={o} value={config[o.key]} editable={isHost} onChange={(v) => send({ type: 'ROOM/SET_CONFIG', key: o.key, value: v })} />
                ))}
            </div>
          </Card>
        </div>

        <div className="sticky bottom-3 z-20">
          {isHost ? (
            <Button size="xl" className="w-full" disabled={!canStart || Boolean(snapshot.preparing)} loading={Boolean(snapshot.preparing)} onClick={() => (send({ type: 'ROOM/START' }), sfx.reveal())} icon={<Play />}>
              {snapshot.preparing
                ? 'Preparando desafios…'
                : canStart
                  ? `Iniciar ${game.title}`
                  : onlineCount > game.maxPlayers
                    ? `Máximo de ${game.maxPlayers} jogadores neste jogo`
                    : `Mínimo de ${game.minPlayers} jogadores online (${onlineCount}/${game.minPlayers})`}
            </Button>
          ) : (
            <div className="rounded-3xl border border-line bg-surface/95 p-4 text-center font-semibold text-white/70 backdrop-blur">Aguardando {host?.nickname ?? 'o anfitrião'} iniciar a partida…</div>
          )}
        </div>
      </div>

      <aside className="grid content-start gap-5">
        <RoomCodePanel />
        <Card>
          <SectionTitle right={<Badge color="green">{onlineCount} online</Badge>}>Jogadores ({snapshot.players.length})</SectionTitle>
          <PlayerList showHostActions />
        </Card>
        <Card>
          <SectionTitle>Reações</SectionTitle>
          <ReactionBar />
        </Card>
        <SessionScoreboard />
      </aside>
      <Modal open={Boolean(rulesGame)} onClose={() => setRulesFor(null)} title={rulesGame ? `Regras: ${rulesGame.title}` : ''} wide>
        {rulesGame && (
          <div className="grid gap-4">
            <p className="text-white/70">{rulesGame.shortDescription}</p>
            <ul className="grid gap-2 text-sm text-white/80">
              {rulesGame.rulesSummary.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-bold">{i + 1}</span>
                  {r}
                </li>
              ))}
            </ul>
            <div className="text-xs text-white/70">
              {rulesGame.minPlayers}–{rulesGame.maxPlayers} jogadores • ideal {rulesGame.recommendedPlayers}
            </div>
            {isHost && rulesGame.slug !== snapshot.gameSlug && (
              <Button
                onClick={() => {
                  send({ type: 'ROOM/SELECT_GAME', slug: rulesGame.slug });
                  setRulesFor(null);
                }}
              >
                Escolher este jogo
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export function SessionScoreboard() {
  const { snapshot } = useRoom();
  if (!snapshot) return null;
  const sorted = [...snapshot.players].sort((a, b) => b.crowns - a.crowns || b.sessionScore - a.sessionScore);
  if (!sorted.some((p) => p.sessionScore > 0 || p.crowns > 0)) return null;
  return (
    <Card>
      <SectionTitle>
        <span className="inline-flex items-center gap-1">
          <Trophy size={14} /> Placar geral da sala
        </span>
      </SectionTitle>
      <div className="grid gap-1.5">
        {sorted.map((p, i) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl bg-white/[.03] px-3 py-2 text-sm">
            <span className="truncate">
              <b className="mr-2 text-white/60">{i + 1}º</b>
              {p.nickname}
            </span>
            <span className="font-display tabular-nums">
              {p.crowns > 0 && <span className="mr-2 text-amber-300">👑{p.crowns}</span>}
              {p.sessionScore} pts
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

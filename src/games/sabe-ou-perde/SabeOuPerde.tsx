import { useState } from 'react';
import { Ban, Crown, Dices, FastForward, Flag, Pause, Rewind, RotateCw, ShieldCheck, Trophy, Zap, type LucideProps } from 'lucide-react';
import type { GameMatchProps, Player } from '../../types/game.types';
import type { SopState, TileType } from './logic';
import { ANSWER_MS, BOARD_SIZE, EFFECT_MS, GAME_OVER_MS, ROLL_MS, STEAL_MS, TURN_BANNER_MS, tileAt } from './logic';
import { Badge, Button, Card, cn } from '../../components/ui';
import { Avatar, nameOf } from '../../components/shared/PlayerBits';
import { PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { sfx } from '../../core/audio/sfx';

const TILE_STYLE: Record<TileType, { icon: React.FC<LucideProps> | null; color: string; label: string }> = {
  START: { icon: Flag, color: '#8B5CF6', label: 'Início' },
  NORMAL: { icon: null, color: '', label: '' },
  ADVANCE_2: { icon: FastForward, color: '#10B981', label: 'Avançar 2' },
  RETREAT_2: { icon: Rewind, color: '#EF4444', label: 'Voltar 2' },
  EXTRA_TURN: { icon: RotateCw, color: '#06B6D4', label: 'Jogar de novo' },
  SKIP_TURN: { icon: Ban, color: '#F59E0B', label: 'Perder turno' },
  STEAL_POINTS: { icon: Zap, color: '#EC4899', label: 'Roubar pontos' },
  SHIELD: { icon: ShieldCheck, color: '#EAB308', label: 'Escudo' },
  FINISH: { icon: Trophy, color: '#FACC15', label: 'Chegada' },
};

const COLS = 6;
/** Trilha em serpentina: linha de baixo 1→6, depois 12←7, 13→18… (desenhada de cima para baixo). */
function serpentineRows(): number[][] {
  const rows: number[][] = [];
  for (let r = 0; r < BOARD_SIZE / COLS; r++) {
    const row = Array.from({ length: COLS }, (_, i) => r * COLS + i + 1);
    rows.push(r % 2 === 0 ? row : row.reverse());
  }
  return rows.reverse();
}
const ROWS = serpentineRows();

function Board({ s, players }: { s: SopState; players: Player[] }) {
  const byPos: Record<number, string[]> = {};
  s.participants.forEach((id) => (byPos[s.tokens[id].pos] ??= []).push(id));
  const highlight = s.effect ? s.effect.to : null;
  return (
    <div className="grid gap-1.5" role="grid" aria-label="Tabuleiro de 30 casas">
      {ROWS.map((row, r) => (
        <div key={r} className="grid grid-cols-6 gap-1.5">
          {row.map((n) => {
            const t = tileAt(n);
            const st = TILE_STYLE[t];
            const Icon = st.icon;
            const here = byPos[n] ?? [];
            return (
              <div
                key={n}
                title={st.label || `Casa ${n}`}
                className={cn('relative flex aspect-square min-w-0 flex-col items-center justify-between rounded-xl border p-1 transition', highlight === n ? 'border-white shadow-neon' : 'border-line', t === 'NORMAL' ? 'bg-white/[.03]' : '')}
                style={st.color ? { backgroundColor: `${st.color}22`, borderColor: highlight === n ? undefined : `${st.color}66` } : undefined}
              >
                <span className="self-start text-[10px] font-bold leading-none text-white/50">{n}</span>
                {Icon && <Icon size={16} style={{ color: st.color }} className="shrink-0" />}
                <div className="flex flex-wrap justify-center -space-x-2">
                  {here.slice(0, 4).map((id) => {
                    const p = players.find((x) => x.id === id);
                    return p ? (
                      <span key={id} className={cn('rounded-full', id === s.currentId && 'ring-2 ring-arcade-cyan')}>
                        <Avatar id={p.avatar} size={18} />
                      </span>
                    ) : null;
                  })}
                  {here.length > 4 && <span className="text-[9px] font-bold">+{here.length - 4}</span>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px]">
      {(['ADVANCE_2', 'RETREAT_2', 'EXTRA_TURN', 'SKIP_TURN', 'STEAL_POINTS', 'SHIELD'] as TileType[]).map((t) => {
        const st = TILE_STYLE[t];
        const Icon = st.icon!;
        return (
          <span key={t} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5" style={{ color: st.color }}>
            <Icon size={12} /> {st.label}
          </span>
        );
      })}
    </div>
  );
}

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function SabeOuPerde({ state: s, meId, players, send }: GameMatchProps<SopState>) {
  const [busy, setBusy] = useState(false);
  const myTurn = s.currentId === meId;
  const current = nameOf(players, s.currentId);
  const letters = ['A', 'B', 'C', 'D'];

  usePhaseEffect(`${s.turnCount}:${s.phase}`, () => {
    setBusy(false);
    if (s.phase === 'ROLLING_DICE' && myTurn) sfx.pop();
    if (s.phase === 'ANSWERING_QUESTION') sfx.reveal();
    if (s.phase === 'MOVING_AND_SPECIAL_EFFECT') s.effect?.kind === 'WRONG' ? sfx.error() : sfx.success();
    if (s.phase === 'GAME_OVER') sfx.success();
  });

  const act = (type: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    send({ type, ...extra });
    window.setTimeout(() => setBusy(false), 1500);
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[1fr_1fr]">
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-display font-bold">Tabuleiro</span>
          <Badge color="cyan">
            <Crown size={12} /> Casa 30 vence
          </Badge>
        </div>
        <Board s={s} players={players} />
        <Legend />
        <div className="grid gap-1">
          {s.turnOrder.map((id) => {
            const p = players.find((x) => x.id === id);
            const t = s.tokens[id];
            return (
              <div key={id} className={cn('flex items-center gap-2 rounded-xl px-2 py-1 text-sm', id === s.currentId ? 'bg-arcade-cyan/10' : 'bg-white/[.02]')}>
                {p && <Avatar id={p.avatar} size={22} />}
                <span className="flex-1 truncate font-semibold">{p?.nickname}</span>
                {t.hasShield && <span title="Escudo de Proteção">🛡️</span>}
                {t.skipNextTurn && <span title="Perde o próximo turno">⏸️</span>}
                <Badge color="gray">Casa {t.pos}</Badge>
                <span className="w-14 text-right font-display font-bold tabular-nums">{p?.matchScore ?? 0}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3" glow={myTurn ? 'cyan' : undefined}>
          <PhaseTitle kicker={s.isExtraTurn ? 'Turno extra!' : `Turno ${s.turnCount}`} title={myTurn ? 'Sua vez!' : `Vez de ${current}`} />

          {s.phase === 'TURN_START' && (
            <>
              <div className="rounded-2xl border border-arcade-amber/40 bg-arcade-amber/10 p-3 text-center font-semibold text-amber-200">
                <Pause size={16} className="mr-1 inline" />
                {s.banner}
              </div>
              <TimerBar endsAt={s.endsAt} totalMs={TURN_BANNER_MS} />
            </>
          )}

          {s.phase === 'ROLLING_DICE' && (
            <>
              <TimerBar endsAt={s.endsAt} totalMs={ROLL_MS} />
              {myTurn ? (
                <Button size="xl" variant="cyan" disabled={busy} onClick={() => act('ROLL_DICE')} icon={<Dices size={28} />}>
                  Lançar Dado
                </Button>
              ) : (
                <p className="text-center text-white/60">{current} vai lançar o dado… (automático em 15s)</p>
              )}
            </>
          )}

          {(s.phase === 'ANSWERING_QUESTION' || s.phase === 'MOVING_AND_SPECIAL_EFFECT' || s.phase === 'STEAL_CHOICE') && s.question && (
            <>
              <div className="flex items-center justify-between">
                <Badge color="gray">{s.question.category}</Badge>
                {s.dice && (
                  <span className="flex items-center gap-1 font-display text-lg font-bold" aria-label={`Dado: ${s.dice}`}>
                    <span key={`${s.turnCount}-${s.dice}`} className="animate-pop text-4xl leading-none">
                      {DICE_FACES[s.dice - 1]}
                    </span>
                    {s.dice}
                  </span>
                )}
              </div>
              <div className="font-display text-xl font-bold leading-snug">{s.question.text}</div>
              {s.phase === 'ANSWERING_QUESTION' && <TimerBar endsAt={s.endsAt} totalMs={ANSWER_MS} />}
              <div className="grid gap-2">
                {s.question.options.map((o, i) => {
                  const revealed = s.correctIndex !== null;
                  const isRight = revealed && i === s.correctIndex;
                  const isWrongPick = revealed && i === s.chosenIndex && i !== s.correctIndex;
                  return (
                    <button
                      key={i}
                      disabled={!myTurn || s.phase !== 'ANSWERING_QUESTION' || busy}
                      onClick={() => act('ANSWER_TRIVIA', { index: i })}
                      className={cn(
                        'flex min-h-12 items-center gap-3 rounded-2xl border px-3 py-2 text-left font-semibold transition',
                        isRight ? 'border-arcade-green bg-arcade-green/15' : isWrongPick ? 'border-arcade-red bg-arcade-red/15' : 'border-line bg-white/[.03]',
                        myTurn && s.phase === 'ANSWERING_QUESTION' && 'hover:border-arcade-cyan',
                      )}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 font-display text-sm font-bold">{letters[i]}</span>
                      {o}
                    </button>
                  );
                })}
              </div>
              {!myTurn && s.phase === 'ANSWERING_QUESTION' && <p className="text-center text-xs text-white/40">Só {current} pode responder. Torça!</p>}
            </>
          )}

          {s.phase === 'STEAL_CHOICE' && (
            <div className="flex flex-col gap-2 rounded-2xl border border-brand-pink/40 bg-brand-pink/10 p-3">
              <div className="font-semibold text-pink-200">⚡ {myTurn ? 'Escolha de quem roubar 200 pontos:' : `${current} está escolhendo de quem roubar…`}</div>
              <TimerBar endsAt={s.endsAt} totalMs={STEAL_MS} color="purple" />
              {myTurn && (
                <div className="grid grid-cols-2 gap-2">
                  {s.stealTargets?.map((id) => {
                    const p = players.find((x) => x.id === id);
                    return (
                      <Button key={id} size="sm" variant="secondary" disabled={busy} onClick={() => act('STEAL', { target: id })}>
                        {p?.nickname} {s.tokens[id].hasShield ? '🛡️' : ''} ({p?.matchScore ?? 0})
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {s.phase === 'MOVING_AND_SPECIAL_EFFECT' && s.effect && (
            <>
              <div className={cn('rounded-2xl border p-3 text-center font-semibold', s.effect.kind === 'WRONG' ? 'border-arcade-red/40 bg-arcade-red/10 text-red-200' : 'border-arcade-green/40 bg-arcade-green/10 text-emerald-200')}>{s.effect.text}</div>
              <TimerBar endsAt={s.endsAt} totalMs={EFFECT_MS} />
            </>
          )}

          {s.phase === 'GAME_OVER' && (
            <div className="flex flex-col items-center gap-2 text-center animate-pop">
              <Trophy size={44} className="text-amber-300" />
              <div className="font-display text-2xl font-bold">{s.banner}</div>
              {s.effect && <div className="text-sm text-white/60">{s.effect.text}</div>}
              <TimerBar endsAt={s.endsAt} totalMs={GAME_OVER_MS} />
            </div>
          )}
        </Card>
        <p className="text-center text-xs text-white/40">Acerto: +100 pts + 20 por casa avançada • Errou: fica parado • Chegada: +500</p>
      </div>
    </div>
  );
}

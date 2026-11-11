import { useState } from 'react';
import { Bomb, Flag, Heart, Send } from 'lucide-react';
import type { GameMatchProps } from '../../types/game.types';
import type { CatState } from './logic';
import { Badge, Button, Card, Input, cn } from '../../components/ui';
import { Avatar, nameOf } from '../../components/shared/PlayerBits';
import { PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { useNow, useSyncTimer } from '../../hooks/useSyncTimer';
import { normalizeWord } from '../../lib/textUtils';
import { sfx } from '../../core/audio/sfx';

function Hearts({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1].map((i) => (
        <Heart key={i} size={14} className={i < n ? 'fill-arcade-red text-arcade-red' : 'text-white/20'} />
      ))}
    </span>
  );
}

export default function Categorias({ state: s, meId, players, send }: GameMatchProps<CatState>) {
  const [text, setText] = useState('');
  const [localErr, setLocalErr] = useState<string | null>(null);
  const now = useNow(250);
  const isActive = s.phase === 'BOMB_TURN' && s.activeId === meId;
  const remaining = useSyncTimer(s.phase === 'BOMB_TURN' ? s.endsAt : null, { tickSound: s.phase === 'BOMB_TURN' });
  const myReject = s.reject && s.reject.pid === meId ? s.reject : null;

  usePhaseEffect(`${s.round}:${s.phase}:${s.activeId}:${s.used.length}`, () => {
    setText('');
    setLocalErr(null);
    if (s.phase === 'BOMB_TURN' && s.activeId === meId) sfx.pop();
    if (s.phase === 'ROUND_SUMMARY') sfx.win();
  });
  usePhaseEffect(String(s.explodedAt ?? ''), () => sfx.buzzer());
  usePhaseEffect(String(s.reject?.at ?? ''), () => s.reject?.pid === meId && sfx.error());

  const submit = () => {
    const norm = normalizeWord(text);
    if (!norm) return;
    if (s.used.some((u) => !u.annulled && u.norm === norm)) {
      setLocalErr('Palavra já utilizada! Tente outra rápido!');
      sfx.error();
      return;
    }
    send({ type: 'WORD', text: text.trim() });
  };

  const urgent = remaining <= 3000;
  const errMsg = localErr ?? myReject?.msg ?? null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Card className="text-center" glow="purple">
        <div className="text-xs font-bold uppercase tracking-[.2em] text-arcade-cyan">Categoria</div>
        <div className="font-display text-3xl font-bold sm:text-4xl">{s.category}</div>
        {s.letters && (
          <div className="mt-2 flex flex-wrap justify-center gap-1">
            <span className="text-sm text-white/60">Começando com:</span>
            {s.letters.map((l) => (
              <Badge key={l} color="amber">
                {l}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {s.phase === 'ROUND_INTRO' && <PhaseTitle kicker="Prepare-se" title="A bomba vai começar a passar!" sub="Envie uma palavra válida que ainda não foi dita antes que ela exploda." />}

      {s.phase === 'BOMB_TURN' && (
        <Card className={cn('flex flex-col gap-4', urgent && 'animate-pulse')} glow={urgent ? 'red' : 'cyan'}>
          <div className="flex items-center justify-center gap-3">
            <Bomb size={34} className={cn(urgent ? 'text-arcade-red' : 'text-arcade-amber')} />
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest text-white/50">A bomba está com</div>
              <div className="font-display text-2xl font-bold">{isActive ? 'VOCÊ!' : nameOf(players, s.activeId)}</div>
            </div>
            <div className={cn('font-display text-4xl font-bold tabular-nums', urgent ? 'text-arcade-red' : 'text-white')}>{(remaining / 1000).toFixed(1)}</div>
          </div>
          <TimerBar endsAt={s.endsAt} totalMs={s.turnMs} color="red" />
          {isActive && (
            <>
              <form
                key={s.reject?.at ?? 0}
                className={cn('flex gap-2', errMsg && 'animate-shake')}
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <Input value={text} onChange={(e) => (setText(e.target.value), setLocalErr(null))} placeholder="Digite e aperte Enter!" autoFocus autoComplete="off" maxLength={30} invalid={Boolean(errMsg)} />
                <Button type="submit" variant="cyan" disabled={!text.trim()} icon={<Send size={18} />}>
                  Enviar
                </Button>
              </form>
              {errMsg && <p className="text-center text-sm font-semibold text-arcade-red">{errMsg}</p>}
            </>
          )}
          <div className="text-center text-xs text-white/40">Volta {Math.min(s.lap + 1, 3)} de 3 {s.lap >= 2 && '• turbo: 7s por turno!'}</div>
        </Card>
      )}

      {s.phase === 'ROUND_SUMMARY' && (
        <Card className="flex flex-col items-center gap-3 text-center animate-pop" glow="green">
          <PhaseTitle kicker="Fim da rodada" title="Sobreviventes" />
          <div className="flex flex-wrap justify-center gap-2">
            {Object.keys(s.bonuses).length === 0 && <span className="text-white/60">Ninguém sobreviveu!</span>}
            {Object.entries(s.bonuses).map(([id, b]) => (
              <Badge key={id} color="green">
                {nameOf(players, id)} +{b} bônus
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {s.order.map((id) => {
          const p = players.find((x) => x.id === id);
          const lives = s.lives[id] ?? 0;
          return (
            <div key={id} className={cn('flex items-center gap-2 rounded-2xl border px-2 py-2', id === s.activeId && s.phase === 'BOMB_TURN' ? 'border-arcade-amber bg-arcade-amber/10' : 'border-line', lives === 0 && 'opacity-40')}>
              {p && <Avatar id={p.avatar} size={28} dim={lives === 0} />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p?.nickname}</div>
                <Hearts n={lives} />
              </div>
              {id === s.activeId && s.phase === 'BOMB_TURN' && <Bomb size={16} className="text-arcade-amber" />}
            </div>
          );
        })}
      </div>

      <Card className="grid gap-2">
        <div className="text-xs font-bold uppercase tracking-[.18em] text-white/50">Palavras da rodada ({s.used.filter((u) => !u.annulled).length})</div>
        {s.used.length === 0 && <div className="text-sm text-white/40">Nenhuma palavra ainda.</div>}
        {s.used.map((u) => {
          const canContest = s.phase === 'BOMB_TURN' && u.pid !== meId && !u.annulled && now < u.contestUntil && !u.contests.includes(meId) && s.participants.includes(meId);
          return (
            <div key={u.id} className="flex items-center gap-2 rounded-xl bg-white/[.03] px-3 py-2 animate-rise">
              <span className={cn('flex-1 font-display text-lg font-bold', u.annulled && 'text-arcade-red line-through')}>{u.word}</span>
              <span className="text-xs text-white/50">{nameOf(players, u.pid)}</span>
              {u.contests.length > 0 && !u.annulled && <Badge color="amber">{u.contests.length} contest.</Badge>}
              {u.annulled && <Badge color="red">anulada</Badge>}
              {canContest && (
                <Button size="sm" variant="danger" onClick={() => send({ type: 'CONTEST', wordId: u.id })} icon={<Flag size={14} />}>
                  Contestar!
                </Button>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

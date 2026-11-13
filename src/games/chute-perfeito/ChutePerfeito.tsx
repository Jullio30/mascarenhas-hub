import { useState } from 'react';
import { Check, Crosshair, Send, Target } from 'lucide-react';
import type { GameMatchProps } from '../../types/game.types';
import { REVEAL_MS, type ChuteState, type ChuteView } from './logic';
import { Badge, Button, Card, Input, cn } from '../../components/ui';
import { Avatar, nameOf } from '../../components/shared/PlayerBits';
import { PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { parseLocaleNumber } from '../../core/contentPacks/contentPackManager';
import { sfx } from '../../core/audio/sfx';

/** "1500000,5" → "1.500.000,5" (formatação pt-BR em tempo real; anos ficam sem separador). */
export function formatTyping(raw: string, isYear: boolean): string {
  const neg = raw.trim().startsWith('-');
  const cleaned = raw.replace(/[^\d,]/g, '');
  const [intPart, ...dec] = cleaned.split(',');
  const int = intPart.replace(/^0+(?=\d)/, '');
  const grouped = isYear ? int : int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + grouped + (dec.length ? ',' + dec.join('').slice(0, 4) : cleaned.endsWith(',') ? ',' : '');
}

export const fmt = (n: number, isYear = false) => (isYear ? String(n) : n.toLocaleString('pt-BR', { maximumFractionDigits: 4 }));

export default function ChutePerfeito({ state: s, view, meId, players, config, send }: GameMatchProps<ChuteState, ChuteView>) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState<number | null>(null);
  usePhaseEffect(`${s.round}:${s.phase}`, () => {
    setText('');
    setPending(null);
    if (s.phase === 'GUESSING_PHASE') sfx.pop();
    if (s.phase === 'REVEAL_AND_SCORING') sfx.reveal();
  });
  const inGame = s.participants.includes(meId);
  const myGuess = view?.myGuess ?? pending;
  const value = parseLocaleNumber(text);
  const q = s.question;
  const r = s.reveal;

  const submit = () => {
    if (value === null) return;
    setPending(value);
    send({ type: 'GUESS', value });
    sfx.click();
  };

  // linha numérica: posição relativa de palpites e valor real
  const span = r ? (() => {
    const vals = [r.correctValue, ...r.rows.filter((x) => x.relError <= 5).map((x) => x.guess)];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return { min, max: max === min ? min + 1 : max };
  })() : null;
  const pos = (v: number) => (span ? ((v - span.min) / (span.max - span.min)) * 100 : 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Card className="flex flex-col gap-3 text-center" glow={s.phase === 'GUESSING_PHASE' ? 'cyan' : 'green'}>
        <div className="flex justify-center gap-2">
          <Badge color="cyan">{q.categoryLabel}</Badge>
          {q.unit && <Badge color="amber">Unidade: {q.unit}</Badge>}
        </div>
        <PhaseTitle title={q.text} />
        {s.phase === 'GUESSING_PHASE' && <TimerBar endsAt={s.endsAt} totalMs={Number(config.guessTimeSeconds ?? 25) * 1000} />}
      </Card>

      {s.phase === 'GUESSING_PHASE' && (
        <Card className="flex flex-col gap-3">
          {!inGame ? (
            <p className="text-center text-white/75">Você está assistindo.</p>
          ) : myGuess !== null ? (
            <div className="flex flex-col items-center gap-1 text-center">
              <Badge color="green">
                <Check size={12} /> Palpite secreto registrado
              </Badge>
              <div className="font-display text-3xl font-bold tabular-nums">
                {fmt(myGuess, q.isYear)} <span className="text-base text-white/70">{q.unit}</span>
              </div>
            </div>
          ) : (
            <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), submit())}>
              <Input
                value={text}
                inputMode="decimal"
                autoFocus
                placeholder={q.isYear ? 'Ex.: 1969' : 'Ex.: 1.500.000'}
                className="text-center font-display text-2xl tabular-nums"
                onChange={(e) => setText(formatTyping(e.target.value, q.isYear))}
              />
              <Button type="submit" disabled={value === null} icon={<Send size={18} />}>
                Chutar
              </Button>
            </form>
          )}
          <div className="text-center text-sm text-white/75">
            {s.answeredIds.length}/{s.participants.length} chutaram
          </div>
        </Card>
      )}

      {s.phase === 'REVEAL_AND_SCORING' && r && span && (
        <>
          <Card className="flex flex-col items-center gap-3 text-center animate-pop" glow="green">
            <div className="text-xs font-bold uppercase tracking-[.2em] text-white/80">Valor real</div>
            <div className="font-display text-5xl font-bold text-arcade-green tabular-nums">
              {fmt(r.correctValue, q.isYear)} <span className="text-xl text-white/80">{q.unit}</span>
            </div>
            {r.note && <p className="text-sm text-white/80">{r.note}</p>}
            <div className="relative my-4 h-14 w-full">
              <div className="absolute left-0 right-0 top-7 h-1 rounded-full bg-white/15" />
              <div className="absolute top-2 -translate-x-1/2 text-arcade-green" style={{ left: `${pos(r.correctValue)}%` }}>
                <Target size={22} />
              </div>
              {r.rows
                .filter((x) => x.relError <= 5)
                .map((x) => {
                  const p = players.find((pl) => pl.id === x.playerId);
                  return p ? (
                    <div key={x.playerId} className="absolute top-8 -translate-x-1/2" style={{ left: `${pos(x.guess)}%` }} title={`${p.nickname}: ${fmt(x.guess, q.isYear)}`}>
                      <Avatar id={p.avatar} size={22} />
                    </div>
                  ) : null;
                })}
            </div>
            <TimerBar endsAt={s.endsAt} totalMs={REVEAL_MS} color="purple" />
          </Card>
          <Card className="flex flex-col gap-2">
            {r.rows.map((x, i) => {
              const p = players.find((pl) => pl.id === x.playerId);
              return (
                <div key={x.playerId} className={cn('flex items-center gap-2 rounded-2xl border p-2 animate-rise', x.placement === 1 ? 'border-arcade-amber/60 bg-arcade-amber/10' : 'border-line bg-surface/70')} style={{ animationDelay: `${i * 80}ms` }}>
                  <span className="w-8 text-center font-display font-bold text-white/80">{x.placement ? `${x.placement}º` : '—'}</span>
                  {p && <Avatar id={p.avatar} size={28} />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p?.nickname}</div>
                    <div className="text-xs text-white/75 tabular-nums">
                      chutou {fmt(x.guess, q.isYear)} • erro {fmt(Math.round(x.error * 1000) / 1000, q.isYear)}
                    </div>
                  </div>
                  {x.exact && (
                    <Badge color="amber">
                      <Crosshair size={12} /> Cravada!
                    </Badge>
                  )}
                  <div className="text-right text-xs text-white/75 tabular-nums">
                    <div>precisão {x.precisionPoints}</div>
                    {x.placementPoints > 0 && <div>colocação +{x.placementPoints}</div>}
                  </div>
                  <Badge color={x.total > 0 ? 'green' : 'gray'}>+{x.total}</Badge>
                </div>
              );
            })}
            {r.noGuess.length > 0 && <div className="text-xs text-white/65">Sem palpite: {r.noGuess.map((id) => nameOf(players, id)).join(', ')}</div>}
          </Card>
        </>
      )}
    </div>
  );
}

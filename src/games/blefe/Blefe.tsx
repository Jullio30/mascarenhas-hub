import { useState } from 'react';
import { CheckCircle2, LifeBuoy, PenLine, Send, Skull, VenetianMask } from 'lucide-react';
import type { GameMatchProps, Player } from '../../types/game.types';
import type { BlefeRevealOption, BlefeState, BlefeView } from './logic';
import { FOOL_POINTS, INTRO_MS, REVEAL_STEP_MS, SCOREBOARD_MS, TRUTH_POINTS, revealDuration } from './logic';
import { Badge, Button, Card, Input, cn } from '../../components/ui';
import { Avatar, nameOf } from '../../components/shared/PlayerBits';
import { PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { useSyncTimer } from '../../hooks/useSyncTimer';
import { sfx } from '../../core/audio/sfx';
import { usePrivateNotice } from '../_shared/notice';

function Avatars({ ids, players }: { ids: string[]; players: Player[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const p = players.find((x) => x.id === id);
        return (
          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-black/30 py-0.5 pl-0.5 pr-2 text-xs font-semibold">
            {p && <Avatar id={p.avatar} size={18} />}
            {p?.nickname ?? '—'}
          </span>
        );
      })}
    </div>
  );
}

function DramaticReveal({ s, players }: { s: BlefeState; players: Player[] }) {
  const list = s.reveal ?? [];
  const fooled = list.filter((o) => !o.isTrue && o.voters.length > 0);
  const total = revealDuration(fooled.length);
  const remaining = useSyncTimer(s.endsAt, { resolutionMs: 150 });
  const elapsed = s.phase === 'DRAMATIC_REVEAL' ? total - remaining : total;
  const step = Math.floor(elapsed / REVEAL_STEP_MS); // 0..fooled.length → a verdade aparece por último
  const truth = list.find((o) => o.isTrue);
  const lieCard = (o: BlefeRevealOption, i: number) => (
    <div key={o.optionId} className="animate-pop rounded-2xl border border-arcade-red/40 bg-arcade-red/10 p-3" style={{ animationDelay: `${i * 40}ms` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-xl font-bold">“{o.text}”</span>
        <Badge color="red">MENTIRA</Badge>
      </div>
      <div className="mt-2 text-xs uppercase tracking-widest text-white/80">Enganados</div>
      <Avatars ids={o.voters} players={players} />
      <div className="mt-2 text-sm">
        {o.isHouse ? (
          <span className="text-white/75">Distrator da casa (ninguém pontua)</span>
        ) : (
          <span className="text-red-200">
            <Skull size={14} className="mr-1 inline" />
            Mente Criminosa: <b>{o.authorPlayerIds.map((a) => nameOf(players, a)).join(' & ')}</b> (+{FOOL_POINTS} pts por vítima!)
          </span>
        )}
      </div>
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      {fooled.slice(0, Math.min(step + 1, fooled.length)).map(lieCard)}
      {truth && step >= fooled.length && (
        <div className="animate-pop rounded-3xl border-2 border-arcade-green bg-arcade-green/15 p-4 shadow-neon-green">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-emerald-300">
            <CheckCircle2 size={18} /> Resposta verdadeira
          </div>
          <div className="mt-1 font-display text-3xl font-bold text-white">{truth.text}</div>
          <div className="mt-2 text-xs uppercase tracking-widest text-white/80">Acertaram (+{TRUTH_POINTS} cada)</div>
          {truth.voters.length ? <Avatars ids={truth.voters} players={players} /> : <span className="text-sm text-white/75">Ninguém! A sala inteira foi enganada.</span>}
          {s.factExplanation && <p className="mt-3 text-sm text-white/75">{s.factExplanation}</p>}
        </div>
      )}
    </div>
  );
}

export default function Blefe({ state: s, view, meId, players, config, send }: GameMatchProps<BlefeState, BlefeView>) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const inRound = s.participants.includes(meId);
  const submitted = s.submittedIds.includes(meId) || Boolean(view?.myBluff);
  const myVote = view?.myVote ?? null;
  const own = view?.ownOptionIds ?? [];
  const writeMs = Number(config.writeTimeSeconds ?? 45) * 1000;
  const voteMs = Number(config.voteTimeSeconds ?? 30) * 1000;
  usePrivateNotice(view?.notice);

  usePhaseEffect(`${s.round}:${s.phase}`, () => {
    setBusy(false);
    if (s.phase === 'WRITING_BLUFFS') setText('');
    if (s.phase === 'QUESTION_INTRO') sfx.reveal();
    if (s.phase === 'VOTING') sfx.pop();
    if (s.phase === 'DRAMATIC_REVEAL') sfx.buzzer();
    if (s.phase === 'ROUND_SCOREBOARD') (s.pointsDelta[meId] ?? 0) > 0 ? sfx.success() : sfx.error();
  });

  const doSend = (type: string, extra: Record<string, unknown>) => {
    setBusy(true);
    send({ type, ...extra });
    window.setTimeout(() => setBusy(false), 1200);
  };

  // sugestão chega pela visão privada: preenche o campo uma única vez
  const [usedSuggestion, setUsedSuggestion] = useState<string | null>(null);
  if (view?.suggestion && view.suggestion !== usedSuggestion && s.phase === 'WRITING_BLUFFS' && !submitted) {
    setUsedSuggestion(view.suggestion);
    setText(view.suggestion);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Card className="flex flex-col gap-3 text-center" glow={s.phase === 'QUESTION_INTRO' ? 'purple' : undefined}>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge color="purple">
            Rodada {s.round} de {s.totalRounds}
          </Badge>
          <Badge color="gray">{s.question.categoryLabel}</Badge>
        </div>
        <div className="font-display text-2xl font-bold leading-snug">{s.question.text}</div>
        {s.phase === 'QUESTION_INTRO' && <TimerBar endsAt={s.endsAt} totalMs={INTRO_MS} color="purple" />}
      </Card>

      {s.phase === 'WRITING_BLUFFS' && (
        <Card className="flex flex-col gap-3" glow="purple">
          <PhaseTitle kicker="Hora de mentir" title={submitted ? 'Blefe enviado!' : 'Escreva uma mentira convincente que pareça ser a resposta verdadeira!'} sub={`${s.submittedIds.length}/${s.participants.length} já enviaram`} />
          <TimerBar endsAt={s.endsAt} totalMs={writeMs} color="purple" />
          {inRound && !submitted && (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                doSend('BLUFF', { text });
              }}
            >
              <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={60} placeholder="Sua mentira…" autoComplete="off" autoFocus />
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Button type="submit" disabled={busy || !text.trim()} icon={<Send size={18} />}>
                  Enviar blefe
                </Button>
                <Button type="button" variant="secondary" disabled={Boolean(view?.suggestion) || busy} onClick={() => doSend('SUGGEST', {})} icon={<LifeBuoy size={18} />}>
                  Me Salva!
                </Button>
              </div>
              <span className="text-right text-xs text-white/70">{text.length}/60</span>
            </form>
          )}
          {submitted && view?.myBluff && (
            <div className="rounded-2xl border border-[#A855F7]/40 bg-[#A855F7]/10 p-3 text-center">
              <div className="text-xs uppercase tracking-widest text-white/80">Sua mentira</div>
              <div className="font-display text-xl font-bold">“{view.myBluff}”</div>
            </div>
          )}
        </Card>
      )}

      {s.phase === 'VOTING' && s.options && (
        <Card className="flex flex-col gap-3" glow="cyan">
          <PhaseTitle kicker="Votação secreta" title={myVote ? 'Voto registrado!' : 'Qual destas é a VERDADE?'} sub={`${s.votedIds.length}/${s.participants.length} votaram`} />
          <TimerBar endsAt={s.endsAt} totalMs={voteMs} />
          <div className="grid gap-2">
            {s.options.map((o) => {
              const mine = own.includes(o.optionId);
              const chosen = myVote === o.optionId;
              return (
                <button
                  key={o.optionId}
                  disabled={mine || Boolean(myVote) || !inRound || busy}
                  onClick={() => doSend('VOTE', { optionId: o.optionId })}
                  className={cn(
                    'flex min-h-14 items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left font-display text-lg font-bold transition',
                    chosen ? 'border-arcade-cyan bg-arcade-cyan/15' : 'border-line bg-white/[.03] enabled:hover:border-arcade-cyan/60',
                    mine && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <span>{o.text}</span>
                  {mine && <span className="shrink-0 text-xs font-semibold text-white/75">Sua Mentira (Não votável)</span>}
                </button>
              );
            })}
          </div>
          {s.didNotSubmit.length > 0 && <p className="text-center text-xs text-white/70">Não enviaram blefe: {s.didNotSubmit.map((id) => nameOf(players, id)).join(', ')}</p>}
        </Card>
      )}

      {s.phase === 'DRAMATIC_REVEAL' && (
        <Card className="flex flex-col gap-3">
          <PhaseTitle kicker="Revelação" title={<span className="inline-flex items-center gap-2"><VenetianMask /> Quem enganou quem?</span>} />
          <DramaticReveal s={s} players={players} />
        </Card>
      )}

      {s.phase === 'ROUND_SCOREBOARD' && (
        <Card className="flex flex-col gap-3" glow="green">
          <PhaseTitle kicker="Placar da rodada" title={`A verdade era: ${s.trueAnswer ?? ''}`} />
          <TimerBar endsAt={s.endsAt} totalMs={SCOREBOARD_MS} />
          <div className="grid gap-1.5">
            {[...players]
              .filter((p) => s.participants.includes(p.id))
              .sort((a, b) => (s.pointsDelta[b.id] ?? 0) - (s.pointsDelta[a.id] ?? 0) || b.matchScore - a.matchScore)
              .map((p) => (
                <div key={p.id} className={cn('flex items-center gap-2 rounded-xl px-2 py-1.5', p.id === meId ? 'bg-[#A855F7]/15' : 'bg-white/[.03]')}>
                  <Avatar id={p.avatar} size={26} />
                  <span className="flex-1 truncate font-semibold">{p.nickname}</span>
                  <Badge color={(s.pointsDelta[p.id] ?? 0) > 0 ? 'green' : 'gray'}>+{s.pointsDelta[p.id] ?? 0}</Badge>
                  <span className="w-16 text-right font-display font-bold tabular-nums">{p.matchScore}</span>
                </div>
              ))}
          </div>
          <p className="text-center text-xs text-white/70">
            <PenLine size={12} className="mr-1 inline" />
            Verdade +{TRUTH_POINTS} • cada vítima da sua mentira +{FOOL_POINTS}
          </p>
        </Card>
      )}
    </div>
  );
}

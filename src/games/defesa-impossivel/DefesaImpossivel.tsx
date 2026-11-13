import { useState } from 'react';
import { Gavel, Megaphone, RefreshCw, Send } from 'lucide-react';
import type { GameMatchProps } from '../../types/game.types';
import { ASSIGN_MS, JURY_LEVELS, JURY_MS, MAX_NOTE, type DiState, type DiView } from './logic';
import { Badge, Button, Card, Input, cn } from '../../components/ui';
import { Avatar, nameOf } from '../../components/shared/PlayerBits';
import { BigCountdown, PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { sfx } from '../../core/audio/sfx';

export default function DefesaImpossivel({ state: s, view, meId, players, send }: GameMatchProps<DiState, DiView>) {
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  usePhaseEffect(`${s.turnIndex}:${s.phase}`, () => {
    setPending(null);
    if (s.phase === 'DEFENSE_PRESENTATION') sfx.reveal();
    if (s.phase === 'JURY_VOTING') sfx.buzzer();
    if (s.phase === 'VERDICT_REVEAL') sfx.success();
  });
  const defender = players.find((p) => p.id === s.defenderId);
  const isDefender = meId === s.defenderId;
  const myVote = view?.myVote ?? pending;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-center gap-3">
        {defender && <Avatar id={defender.avatar} size={46} ring="#F97316" />}
        <div>
          <div className="text-xs font-bold uppercase tracking-[.2em] text-orange-300">Defensor da vez</div>
          <div className="font-display text-2xl font-bold">{isDefender ? 'Você!' : defender?.nickname}</div>
        </div>
      </div>

      <Card className="flex flex-col items-center gap-3 text-center" glow={s.phase === 'DEFENSE_PRESENTATION' ? 'red' : 'purple'}>
        <div className="text-xs font-bold uppercase tracking-[.2em] text-white/80">Tese absurda</div>
        <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">“{s.thesis}”</h2>
        {s.phase === 'THESIS_ASSIGNMENT' && (
          <>
            <TimerBar endsAt={s.endsAt} totalMs={ASSIGN_MS} />
            {isDefender ? (
              <div className="grid w-full gap-2 sm:grid-cols-2">
                <Button variant="secondary" disabled={s.swapUsed} icon={<RefreshCw size={18} />} onClick={() => (send({ type: 'SWAP' }), sfx.click())}>
                  {s.swapUsed ? 'Troca já usada' : 'Trocar tese (1x)'}
                </Button>
                <Button icon={<Megaphone size={18} />} onClick={() => send({ type: 'START' })}>
                  Começar minha defesa!
                </Button>
              </div>
            ) : (
              <p className="text-white/75">{defender?.nickname} está se preparando…</p>
            )}
          </>
        )}
        {s.phase === 'DEFENSE_PRESENTATION' && (
          <>
            <BigCountdown endsAt={s.endsAt} totalMs={s.defenseMs} tenths={false} />
            <p className="text-sm text-white/75">{isDefender ? 'Defenda como se acreditasse fielmente! Fale (presencial/chamada) e/ou escreva seus argumentos.' : 'Ouça (ou leia) os argumentos do Defensor.'}</p>
            {isDefender && (
              <form className="flex w-full gap-2" onSubmit={(e) => (e.preventDefault(), note.trim() && (send({ type: 'NOTE', text: note }), setNote('')))}>
                <Input value={note} maxLength={MAX_NOTE} placeholder="Escreva um argumento…" onChange={(e) => setNote(e.target.value)} />
                <Button type="submit" disabled={!note.trim()} icon={<Send size={18} />}>
                  Postar
                </Button>
              </form>
            )}
            {isDefender && (
              <Button variant="danger" icon={<Gavel size={18} />} onClick={() => send({ type: 'END_DEFENSE' })}>
                Encerrar defesa e ir para o júri
              </Button>
            )}
          </>
        )}
      </Card>

      {s.notes.length > 0 && s.phase !== 'THESIS_ASSIGNMENT' && (
        <Card className="flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Quadro de argumentos</div>
          {s.notes.map((n, i) => (
            <div key={i} className="rounded-2xl border border-line bg-white/[.03] px-3 py-2 animate-rise">
              <b className="mr-2 text-orange-300">{i + 1}.</b>
              {n}
            </div>
          ))}
        </Card>
      )}

      {s.phase === 'JURY_VOTING' && (
        <Card className="flex flex-col gap-3" glow="purple">
          <PhaseTitle kicker="O júri decide" title={isDefender ? 'O júri está votando…' : 'Como foi a defesa?'} />
          <TimerBar endsAt={s.endsAt} totalMs={JURY_MS} color="purple" />
          {s.jurors.includes(meId) && (
            <div className="grid gap-2">
              {JURY_LEVELS.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  disabled={Boolean(myVote)}
                  onClick={() => (setPending(l.key), send({ type: 'VOTE', level: l.key }), sfx.click())}
                  className={cn('flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 text-left font-semibold transition', myVote === l.key ? 'border-brand-pink bg-brand-pink/15' : 'border-line bg-white/[.03] enabled:hover:border-brand-pink/60', myVote && myVote !== l.key && 'opacity-50')}
                >
                  <span className="text-2xl">{l.emoji}</span>
                  <span className="flex-1">{l.label}</span>
                  <Badge color="amber">{l.points} pts</Badge>
                </button>
              ))}
            </div>
          )}
          <div className="text-center text-sm text-white/75">
            {s.votedIds.length}/{s.jurors.length} jurados votaram
          </div>
        </Card>
      )}

      {s.phase === 'VERDICT_REVEAL' && s.verdict && (
        <Card className="flex flex-col items-center gap-3 text-center animate-pop" glow="green">
          {s.verdict.skipped ? (
            <PhaseTitle kicker="Turno pulado" title={`${defender?.nickname ?? 'Defensor'} estava desconectado`} />
          ) : (
            <>
              <div className="text-xs font-bold uppercase tracking-[.2em] text-white/80">Veredito do grupo</div>
              <div className="font-display text-5xl font-bold text-arcade-green">+{s.verdict.points} pts</div>
              <div className="text-white/75">média do júri: {s.verdict.avg}</div>
              <div className="flex flex-wrap justify-center gap-2">
                {Object.entries(s.verdict.votes).map(([id, lv]) => {
                  const l = JURY_LEVELS.find((x) => x.key === lv);
                  return (
                    <Badge key={id} color="gray">
                      {l?.emoji} {nameOf(players, id)}
                    </Badge>
                  );
                })}
                {Object.keys(s.verdict.votes).length === 0 && <span className="text-white/70">Nenhum jurado votou.</span>}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

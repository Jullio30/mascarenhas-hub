import { useState } from 'react';
import { Ban, Check, Drama, Lock, Send, Vote } from 'lucide-react';
import type { GameMatchProps } from '../../types/game.types';
import { FINAL_MS, MAX_JUSTIFY, PREF_MS, RESOLUTION_MS, VOTE_MS, type IcState, type IcView, type Opt } from './logic';
import { Badge, Button, Card, Input, cn } from '../../components/ui';
import { Avatar, nameOf } from '../../components/shared/PlayerBits';
import { HoldToReveal, PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { sfx } from '../../core/audio/sfx';

export default function ImpulsaoContraria({ state: s, view, meId, players, config, send }: GameMatchProps<IcState, IcView>) {
  const [pendingPref, setPendingPref] = useState<Opt | null>(null);
  const [pendingVote, setPendingVote] = useState<string | null>(null);
  const [just, setJust] = useState('');
  usePhaseEffect(`${s.round}:${s.phase}`, () => {
    setPendingPref(null);
    setPendingVote(null);
    setJust('');
    if (s.phase === 'STANCE_AND_DEBATE') sfx.reveal();
    if (s.phase === 'SECRET_VOTING') sfx.buzzer();
    if (s.phase === 'FINAL_CONTRADICTION_REVEAL') sfx.success();
  });
  const label = (o: Opt | null | undefined) => (o === 'A' ? s.dilemma.a : o === 'B' ? s.dilemma.b : '—');
  const inGame = s.participants.includes(meId);
  const myPref = view?.myTruePreference ?? pendingPref;
  const myVote = view?.myVote ?? pendingVote;
  const canVote = s.canVote[meId] !== false;
  const roster = s.participants.map((id) => players.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (s.phase === 'FINAL_CONTRADICTION_REVEAL' && s.final) {
    const imp = players.find((p) => p.id === s.final!.impostorId);
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <Card className="flex flex-col items-center gap-3 text-center animate-pop" glow="red">
          <div className="text-xs font-bold uppercase tracking-[.2em] text-red-300">O Impostor Secreto era…</div>
          {imp && <Avatar id={imp.avatar} size={72} ring="#EF4444" />}
          <div className="font-display text-4xl font-bold">{imp?.nickname}</div>
          <TimerBar endsAt={s.endsAt} totalMs={FINAL_MS} color="red" />
        </Card>
        <Card className="flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Painel da contradição</div>
          {s.final.history.map((h) => (
            <div key={h.round} className="rounded-2xl border border-line bg-surface/70 p-3 animate-rise">
              <div className="text-sm font-semibold">
                Rodada {h.round}: “{h.dilemma.text}”
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-sm">
                <Badge color="green">Preferência real: {h.impostorTrue === 'A' ? h.dilemma.a : h.dilemma.b}</Badge>
                <Badge color="red">Defendeu no debate: {h.impostorDefended === 'A' ? h.dilemma.a : h.dilemma.b}</Badge>
              </div>
            </div>
          ))}
          <p className="text-xs text-white/70">As preferências dos jogadores normais continuam privadas (eram as mesmas que eles defenderam).</p>
        </Card>
        <Card className="flex flex-col gap-1.5">
          <div className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Pontos da partida</div>
          {Object.entries(s.final.delta)
            .sort((a, b) => b[1] - a[1])
            .map(([id, pts]) => (
              <div key={id} className="flex items-center justify-between rounded-xl bg-white/[.03] px-3 py-2 text-sm">
                <span>
                  {nameOf(players, id)} {id === s.final!.impostorId && <Badge color="red">impostor</Badge>}
                </span>
                <Badge color="green">+{pts}</Badge>
              </div>
            ))}
          {Object.keys(s.final.delta).length === 0 && <div className="text-sm text-white/70">Ninguém pontuou.</div>}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Card className="flex flex-col gap-3 text-center" glow="purple">
        <PhaseTitle kicker={`Dilema ${s.round} de ${s.totalRounds}`} title={s.dilemma.text} />
        <div className="grid grid-cols-2 gap-2">
          {(['A', 'B'] as Opt[]).map((o) => (
            <div key={o} className="rounded-2xl border border-line bg-white/[.03] p-2 font-display text-lg font-bold">
              <span className="mr-1 text-white/60">{o}</span> {label(o)}
            </div>
          ))}
        </div>
      </Card>

      {inGame && view?.role && s.phase !== 'SECRET_PREFERENCE_INPUT' && (
        <HoldToReveal label="Segure para ver seu papel e sua postura">
          {view.role === 'impostor' ? (
            <div className="grid gap-1 text-center">
              <div className="font-display text-2xl font-bold text-arcade-red">🎭 VOCÊ É O IMPOSTOR!</div>
              <p>
                Sua preferência real registrada foi <b>{label(view.myTruePreference)}</b>, mas você é OBRIGADO a defender a opção contrária: <b className="text-red-300">{label(view.myDefended)}</b>!
              </p>
            </div>
          ) : (
            <div className="grid gap-1 text-center">
              <div className="font-display text-2xl font-bold text-arcade-green">Você é um Jogador Normal</div>
              <p>
                Defenda sinceramente sua escolha: <b className="text-emerald-300">{label(view.myDefended ?? view.myTruePreference)}</b>!
              </p>
            </div>
          )}
          {view.autoAssigned && <p className="mt-1 text-xs text-amber-300">Você não escolheu a tempo: sua preferência foi sorteada.</p>}
        </HoldToReveal>
      )}

      {s.phase === 'SECRET_PREFERENCE_INPUT' && (
        <Card className="flex flex-col gap-3 text-center">
          <PhaseTitle kicker="Fase 1 • Registro secreto" title="Qual você REALMENTE prefere?" sub={s.round === 1 ? 'Responda com sinceridade: os papéis (normal/impostor) só aparecem depois.' : 'Sua preferência verdadeira será gravada em segredo.'} />
          <TimerBar endsAt={s.endsAt} totalMs={PREF_MS} />
          {!inGame ? (
            <p className="text-white/75">Você está assistindo.</p>
          ) : myPref ? (
            <Badge color="green" className="mx-auto">
              <Lock size={12} /> Preferência gravada: {label(myPref)}
            </Badge>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(['A', 'B'] as Opt[]).map((o) => (
                <Button key={o} size="lg" variant="secondary" onClick={() => (setPendingPref(o), send({ type: 'PREFERENCE', option: o }), sfx.click())}>
                  {label(o)}
                </Button>
              ))}
            </div>
          )}
          <div className="text-sm text-white/75">
            {s.preferenceIds.length}/{s.participants.length} registraram
          </div>
        </Card>
      )}

      {(s.phase === 'STANCE_AND_DEBATE' || s.phase === 'SECRET_VOTING' || s.phase === 'VOTE_RESOLUTION') && s.stances && (
        <Card className="flex flex-col gap-3">
          {s.phase === 'STANCE_AND_DEBATE' && (
            <>
              <PhaseTitle kicker="Fase 2 • Debate" title="Quem está mentindo sobre a própria preferência?" sub="Debata por voz e/ou escreva sua justificativa." />
              <TimerBar endsAt={s.endsAt} totalMs={Number(config.debateSeconds ?? 45) * 1000} color="purple" />
              {inGame && (
                <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), just.trim() && (send({ type: 'JUSTIFY', text: just }), setJust('')))}>
                  <Input value={just} maxLength={MAX_JUSTIFY} placeholder="Por que você defende sua opção?" onChange={(e) => setJust(e.target.value)} />
                  <Button type="submit" disabled={!just.trim()} icon={<Send size={18} />}>
                    Enviar
                  </Button>
                </form>
              )}
            </>
          )}
          {s.phase === 'SECRET_VOTING' && (
            <>
              <PhaseTitle kicker="Fase 3 • Votação secreta" title="Quem é o Impostor?" />
              <TimerBar endsAt={s.endsAt} totalMs={VOTE_MS} color="red" />
              {inGame && !canVote && <p className="text-center text-sm text-amber-300">Você já foi eliminado/identificado nas votações anteriores e não pode votar nesta rodada.</p>}
              <div className="text-center text-sm text-white/75">
                {s.votedIds.length}/{s.voters.length} votaram
              </div>
            </>
          )}
          {s.phase === 'VOTE_RESOLUTION' && s.resolution && (
            <>
              <PhaseTitle
                kicker="Fase 4 • Apuração"
                title={s.resolution.mostVoted ? `${nameOf(players, s.resolution.mostVoted)} foi o mais votado` : s.resolution.tie ? 'Empate no topo — ninguém foi identificado' : 'Ninguém votou'}
                sub={s.resolution.mostVoted ? 'Ele(a) não poderá votar nas próximas rodadas — mas continua jogando. O impostor continua na partida até o fim!' : undefined}
              />
              <TimerBar endsAt={s.endsAt} totalMs={RESOLUTION_MS} color="purple" />
            </>
          )}
          <div className="grid gap-2">
            {roster.map((p) => {
              const stance = s.stances?.[p.id];
              const blocked = s.canVote[p.id] === false;
              const votes = s.resolution?.counts[p.id] ?? 0;
              const votable = s.phase === 'SECRET_VOTING' && inGame && canVote && p.id !== meId && !myVote;
              return (
                <div key={p.id} className={cn('grid gap-1 rounded-2xl border p-2', myVote === p.id ? 'border-brand-pink bg-brand-pink/10' : 'border-line bg-surface/70')}>
                  <div className="flex items-center gap-2">
                    <Avatar id={p.avatar} size={30} />
                    <span className="flex-1 truncate font-semibold">
                      {p.nickname} {p.id === meId && <span className="text-xs text-white/60">(você)</span>}
                    </span>
                    {blocked && (
                      <Badge color="gray">
                        <Ban size={10} /> sem voto
                      </Badge>
                    )}
                    <Badge color={stance === 'A' ? 'cyan' : 'pink'}>defende: {label(stance)}</Badge>
                    {s.phase === 'SECRET_VOTING' && s.votedIds.includes(p.id) && <Check size={16} className="text-arcade-green" />}
                    {s.phase === 'VOTE_RESOLUTION' && <Badge color={votes ? 'red' : 'gray'}>{votes} voto(s)</Badge>}
                    {votable && (
                      <Button size="sm" variant="danger" icon={<Vote size={14} />} onClick={() => (setPendingVote(p.id), send({ type: 'VOTE', target: p.id }), sfx.click())}>
                        Votar
                      </Button>
                    )}
                  </div>
                  {s.justifications[p.id] && <p className="pl-10 text-sm italic text-white/80">“{s.justifications[p.id]}”</p>}
                  {s.phase === 'VOTE_RESOLUTION' && s.resolution?.votes[p.id] && <p className="pl-10 text-xs text-white/65">votou em {nameOf(players, s.resolution.votes[p.id])}</p>}
                </div>
              );
            })}
          </div>
          {s.phase === 'VOTE_RESOLUTION' && (
            <p className="flex items-center justify-center gap-1 text-center text-xs text-white/65">
              <Drama size={12} /> Os pontos ficam guardados em segredo e são revelados no final, junto com o impostor.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

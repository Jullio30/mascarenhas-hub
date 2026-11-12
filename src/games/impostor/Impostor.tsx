import { useState } from 'react';
import { Drama, MessageSquare, Send, ShieldCheck, Skull, Vote } from 'lucide-react';
import type { GameMatchProps } from '../../types/game.types';
import type { ImpState, ImpView } from './logic';
import { CLUE_MS, LAST_GUESS_MS, REVEAL_MS, VOTE_MS } from './logic';
import { Badge, Button, Card, Input, cn } from '../../components/ui';
import { Avatar, PlayerChip, nameOf } from '../../components/shared/PlayerBits';
import { HoldToReveal, PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { sfx } from '../../core/audio/sfx';

function RoleCard({ view }: { view: ImpView | null }) {
  if (!view) return <div className="py-6 text-white/80">Carregando seu papel…</div>;
  if (view.role === 'SPECTATOR') return <div className="py-6 text-white/75">Você está assistindo esta rodada.</div>;
  return (
    <div className="flex flex-col items-center gap-2 py-2 text-center">
      <Badge color="cyan">Categoria: {view.category}</Badge>
      {view.role === 'IMPOSTOR' ? (
        <>
          <Skull className="text-arcade-red" size={40} />
          <div className="font-display text-3xl font-bold text-arcade-red">VOCÊ É O IMPOSTOR!</div>
          <div className="text-sm text-white/80">Blefe para descobrir a palavra.</div>
        </>
      ) : (
        <>
          <ShieldCheck className="text-arcade-green" size={36} />
          <div className="text-xs uppercase tracking-widest text-white/80">Palavra secreta</div>
          <div className="font-display text-4xl font-bold text-white">{view.secret_word}</div>
        </>
      )}
    </div>
  );
}

export default function Impostor({ state: s, view, meId, players, send }: GameMatchProps<ImpState, ImpView>) {
  const [clue, setClue] = useState('');
  const [busy, setBusy] = useState(false);
  const active = s.order[s.clueIndex];
  const isActive = active === meId && s.phase === 'CLUE_ROTATION';
  const inRound = s.order.includes(meId);

  usePhaseEffect(`${s.round}:${s.phase}:${s.clueIndex}`, () => {
    setBusy(false);
    if (s.phase === 'ROLE_REVEAL') sfx.reveal();
    if (s.phase === 'CLUE_ROTATION' && s.order[s.clueIndex] === meId) sfx.pop();
    if (s.phase === 'VOTE_REVELATION') sfx.buzzer();
    if (s.phase === 'ROUND_SUMMARY') (s.pointsDelta[meId] ?? 0) > 0 ? sfx.success() : sfx.error();
  });

  const submit = (type: string, extra: Record<string, unknown>) => {
    setBusy(true);
    send({ type, ...extra });
    window.setTimeout(() => setBusy(false), 1500);
  };

  const ClueList = (
    <div className="flex flex-col gap-2">
      {s.order.map((pid, i) => {
        const c = s.clues[i];
        const isNow = i === s.clueIndex && s.phase === 'CLUE_ROTATION';
        return (
          <PlayerChip
            key={pid}
            compact
            player={players.find((p) => p.id === pid)}
            highlight={isNow ? 'cyan' : undefined}
            right={c ? <span className={cn('max-w-[50%] truncate font-display text-lg font-bold', c.skipped ? 'text-white/65' : 'text-white')}>{c.text}</span> : isNow ? <Badge color="cyan">falando…</Badge> : <span className="text-white/40">—</span>}
          />
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {s.annulled && <div className="rounded-2xl border border-arcade-amber/40 bg-arcade-amber/10 p-3 text-center text-sm text-amber-200">Rodada anulada: o impostor desconectou. Nova palavra sorteada!</div>}

      {s.phase === 'ROLE_REVEAL' && (
        <Card className="flex flex-col gap-4" glow="purple">
          <PhaseTitle kicker={`Categoria pública: ${s.category}`} title="Descubra seu papel" sub="Ninguém pode ver sua tela! Segure o cartão para espiar." />
          <HoldToReveal>
            <RoleCard view={view} />
          </HoldToReveal>
          <TimerBar endsAt={s.endsAt} totalMs={REVEAL_MS} color="purple" />
        </Card>
      )}

      {s.phase === 'CLUE_ROTATION' && (
        <Card className="flex flex-col gap-4" glow="cyan">
          <PhaseTitle kicker="Rodada de dicas" title={isActive ? 'Sua vez de dar uma dica!' : `Vez de ${nameOf(players, active)}`} sub={`Categoria: ${s.category} • uma palavra ou expressão curta`} />
          {isActive && s.clueMode === 'typed' && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!clue.trim()) return;
                submit('CLUE', { text: clue });
                setClue('');
              }}
            >
              <Input value={clue} onChange={(e) => setClue(e.target.value)} maxLength={30} placeholder="Sua dica…" autoFocus autoComplete="off" />
              <Button type="submit" variant="cyan" disabled={busy || !clue.trim()} icon={<Send size={18} />}>
                Enviar
              </Button>
            </form>
          )}
          {isActive && s.clueMode === 'spoken' && (
            <Button size="lg" variant="cyan" disabled={busy} onClick={() => submit('CLUE', {})} icon={<MessageSquare />}>
              Dica Dada (falei em voz alta)
            </Button>
          )}
          <TimerBar endsAt={s.endsAt} totalMs={CLUE_MS} />
          {ClueList}
          {inRound && (
            <details className="rounded-2xl border border-line p-3 text-sm text-white/75">
              <summary className="cursor-pointer select-none font-semibold">Relembrar meu papel</summary>
              <div className="mt-3">
                <HoldToReveal label="Segure para relembrar">
                  <RoleCard view={view} />
                </HoldToReveal>
              </div>
            </details>
          )}
        </Card>
      )}

      {s.phase === 'DISCUSSION_AND_VOTING' && (
        <Card className="flex flex-col gap-4" glow="red">
          <PhaseTitle kicker="Discussão e votação secreta" title="Quem é o impostor?" sub={`${s.votedIds.length}/${s.order.length} votaram • votos revelados ao final`} />
          <TimerBar endsAt={s.endsAt} totalMs={VOTE_MS} color="red" />
          <div className="grid gap-2">
            {s.clues.map((c) => (
              <div key={c.pid} className="flex items-center justify-between rounded-xl bg-white/[.03] px-3 py-2 text-sm">
                <span className="text-white/75">{nameOf(players, c.pid)}</span>
                <span className="font-display font-bold">{c.text}</span>
              </div>
            ))}
          </div>
          {inRound && !s.votedIds.includes(meId) ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {s.order
                .filter((id) => id !== meId)
                .map((id) => {
                  const p = players.find((x) => x.id === id);
                  return (
                    <button
                      key={id}
                      disabled={busy}
                      onClick={() => submit('VOTE', { target: id })}
                      className="flex min-h-14 items-center gap-2 rounded-2xl border border-line bg-white/[.03] px-3 py-2 text-left font-semibold transition hover:border-arcade-red hover:bg-arcade-red/10 disabled:opacity-50"
                    >
                      {p && <Avatar id={p.avatar} size={30} />}
                      <span className="truncate">{p?.nickname}</span>
                    </button>
                  );
                })}
            </div>
          ) : (
            <p className="text-center text-white/75">
              <Vote className="mr-1 inline" size={16} />
              {inRound ? 'Voto registrado em segredo. Aguardando os demais…' : 'Você está assistindo.'}
            </p>
          )}
        </Card>
      )}

      {(s.phase === 'VOTE_REVELATION' || s.phase === 'IMPOSTOR_LAST_GUESS' || s.phase === 'ROUND_SUMMARY') && s.tally && (
        <Card className="flex flex-col gap-3">
          <PhaseTitle kicker="Votos revelados" title={s.phase === 'VOTE_REVELATION' ? (s.escaped ? 'O impostor escapou!' : 'Impostor desmascarado!') : ' '} />
          <div className="grid gap-2">
            {s.order.map((id, i) => {
              const votes = s.tally?.[id] ?? 0;
              const isImp = s.impostorIds?.includes(id);
              return (
                <div key={id} className="animate-rise" style={{ animationDelay: `${i * 120}ms` }}>
                  <PlayerChip
                    compact
                    player={players.find((p) => p.id === id)}
                    highlight={isImp ? 'red' : undefined}
                    sub={s.votes?.[id] ? `votou em ${nameOf(players, s.votes[id])}` : 'não votou'}
                    right={
                      <div className="flex items-center gap-2">
                        {isImp && <Badge color="red">IMPOSTOR</Badge>}
                        <span className="font-display text-xl font-bold tabular-nums">{votes}</span>
                      </div>
                    }
                  />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {s.phase === 'IMPOSTOR_LAST_GUESS' && s.guessOptions && (
        <Card className="flex flex-col gap-4" glow="red">
          <PhaseTitle kicker="Chute final" title={s.caughtId === meId ? 'Última chance: qual é a palavra?' : `${nameOf(players, s.caughtId)} está tentando adivinhar a palavra…`} sub="Se acertar, o impostor rouba uma vitória parcial!" />
          <TimerBar endsAt={s.endsAt} totalMs={LAST_GUESS_MS} color="red" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {s.guessOptions.map((w) => (
              <Button key={w} variant="secondary" disabled={s.caughtId !== meId || busy} onClick={() => submit('LAST_GUESS', { word: w })}>
                {w}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {s.phase === 'ROUND_SUMMARY' && (
        <Card className="flex flex-col items-center gap-3 text-center animate-pop" glow={s.escaped || s.guessCorrect ? 'red' : 'green'}>
          <Drama size={36} className="text-brand-pink" />
          <div className="text-sm uppercase tracking-widest text-white/80">A palavra era</div>
          <div className="font-display text-4xl font-bold">{s.secretWord}</div>
          <div className="text-white/80">
            {s.escaped
              ? 'O impostor escapou da votação! +15 para o impostor.'
              : s.guessCorrect
                ? `Desmascarado, mas acertou o chute final (“${s.guessedWord}”)! +10 para o impostor.`
                : `Desmascarado e errou o chute${s.guessedWord ? ` (“${s.guessedWord}”)` : ''}! Cidadãos vencem.`}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {Object.entries(s.pointsDelta).map(([id, pts]) => (
              <Badge key={id} color={s.impostorIds?.includes(id) ? 'red' : 'green'}>
                {nameOf(players, id)} +{pts}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

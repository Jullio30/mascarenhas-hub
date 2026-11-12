import { useState } from 'react';
import { KeyRound, SkipForward, Send, Users } from 'lucide-react';
import type { GameMatchProps } from '../../types/game.types';
import type { MSState, MSView } from './logic';
import { ATTEMPT_POINTS, STEP_MS } from './logic';
import { Badge, Button, Card, Input, cn } from '../../components/ui';
import { Avatar, nameOf } from '../../components/shared/PlayerBits';
import { PhaseTitle, SyncTimer, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { validateClue } from '../../lib/textUtils';
import { sfx } from '../../core/audio/sfx';

export default function MegaSenha({ state: s, view, meId, players, send }: GameMatchProps<MSState, MSView>) {
  const [text, setText] = useState('');
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const isGiver = meId === s.giverId;
  const isGuesser = meId === s.guesserId;
  const giver = players.find((p) => p.id === s.giverId);
  const guesser = players.find((p) => p.id === s.guesserId);
  const last = s.results[s.results.length - 1];

  usePhaseEffect(`${s.turnIndex}:${s.wordIndex}:${s.phase}:${s.attempt}`, () => {
    setBusy(false);
    setText('');
    if (s.phase === 'WORD_RESULT') last?.correct ? sfx.success() : sfx.error();
    if (s.phase === 'GUESS' && isGuesser) sfx.pop();
  });
  usePhaseEffect(String(s.clueError?.at ?? ''), () => {
    if (isGiver && s.clueError) {
      setLocalErr(s.clueError.msg);
      setShakeKey((k) => k + 1);
      setBusy(false);
      sfx.error();
    }
  });

  const submitClue = () => {
    const secret = view?.secret_word;
    const err = secret ? validateClue(text, secret) : null;
    if (err) {
      setLocalErr(err);
      setShakeKey((k) => k + 1);
      sfx.error();
      return;
    }
    setLocalErr(null);
    setBusy(true);
    send({ type: 'CLUE', text: text.trim() });
  };

  const submitGuess = () => {
    if (!text.trim()) return;
    setBusy(true);
    send({ type: 'GUESS', text: text.trim() });
  };

  const pts = ATTEMPT_POINTS[s.attempt - 1];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        {[
          { p: giver, label: 'Passador de dicas', me: isGiver, color: '#8B5CF6' },
          { p: guesser, label: 'Adivinhador', me: isGuesser, color: '#06B6D4' },
        ].map(({ p, label, me, color }) => (
          <div key={label} className={cn('flex items-center gap-2 rounded-2xl border p-3', me ? 'border-brand-purple/60 bg-brand-purple/10' : 'border-line')}>
            {p && <Avatar id={p.avatar} size={36} ring={color} />}
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">{label}</div>
              <div className="truncate font-bold">{me ? 'Você' : p?.nickname}</div>
            </div>
          </div>
        ))}
      </div>

      {s.mode === 'teams' && s.teams && (
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          {s.teams.map((t, i) => (
            <Badge key={i} color={t.includes(s.giverId) ? 'purple' : 'gray'}>
              <Users size={12} /> Dupla {String.fromCharCode(65 + i)}: {t.map((id) => nameOf(players, id)).join(' & ')}
            </Badge>
          ))}
        </div>
      )}

      {s.phase === 'TURN_INTRO' && (
        <Card className="text-center" glow="purple">
          <PhaseTitle kicker={`Turno ${s.round} de ${s.totalRounds}`} title={`${giver?.nickname} passa dicas para ${guesser?.nickname}`} sub={`${s.turnSeconds}s ou ${s.wordsPerTurn} palavras • ambos ganham os pontos de cada acerto`} />
        </Card>
      )}

      {(s.phase === 'CLUE' || s.phase === 'GUESS') && (
        <Card className="flex flex-col gap-4" glow={s.phase === 'GUESS' ? 'cyan' : 'purple'}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge color="amber">Palavra {s.wordIndex + 1}/{s.wordsPerTurn}</Badge>
            <Badge color="green">Valendo {pts} pts • dica {s.attempt}/3</Badge>
            <span className="text-sm text-white/75">
              Turno: <SyncTimer endsAt={s.turnEndsAt} />
            </span>
          </div>

          <div className="text-center">
            {isGiver && view?.secret_word ? (
              <>
                <div className="text-xs uppercase tracking-widest text-white/70">A senha é</div>
                <div className="font-display text-4xl font-bold tracking-wide text-violet-200">{view.secret_word.toUpperCase()}</div>
              </>
            ) : (
              <>
                <div className="text-xs uppercase tracking-widest text-white/70">Senha secreta • {s.wordCategory}</div>
                <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                  {Array.from({ length: s.wordLength }).map((_, i) => (
                    <span key={i} className="h-9 w-7 rounded-lg border border-white/15 bg-white/5" />
                  ))}
                </div>
                <div className="mt-1 text-xs text-white/60">{s.wordLength} letras</div>
              </>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {s.clues.map((c, i) => (
              <div key={i} className="rounded-2xl border border-brand-purple/40 bg-brand-purple/10 px-4 py-2 text-center">
                <div className="text-[10px] uppercase text-white/70">Dica {i + 1}</div>
                <div className="font-display text-xl font-bold">{c}</div>
                {s.guesses[i] && <div className="text-xs text-arcade-red line-through">{s.guesses[i]}</div>}
              </div>
            ))}
          </div>

          <TimerBar endsAt={s.endsAt} totalMs={STEP_MS} color={s.phase === 'GUESS' ? 'cyan' : 'purple'} />

          {s.phase === 'CLUE' && isGiver && (
            <>
              <form
                key={shakeKey}
                className={cn('flex gap-2', shakeKey > 0 && 'animate-shake')}
                onSubmit={(e) => {
                  e.preventDefault();
                  submitClue();
                }}
              >
                <Input value={text} onChange={(e) => (setText(e.target.value.replace(/\s/g, '')), setLocalErr(null))} maxLength={24} placeholder="Uma única palavra…" autoFocus autoComplete="off" invalid={Boolean(localErr)} />
                <Button type="submit" disabled={busy || !text.trim()} icon={<Send size={18} />}>
                  Dica
                </Button>
              </form>
              {localErr && <p className="text-center text-sm font-semibold text-arcade-red">{localErr}</p>}
              {!s.skipUsed && (
                <Button variant="ghost" size="sm" onClick={() => send({ type: 'SKIP_WORD' })} icon={<SkipForward size={16} />}>
                  Pular palavra (1 por turno)
                </Button>
              )}
            </>
          )}
          {s.phase === 'CLUE' && !isGiver && <p className="text-center text-white/75">{nameOf(players, s.giverId)} está pensando na dica…</p>}

          {s.phase === 'GUESS' && isGuesser && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submitGuess();
              }}
            >
              <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={30} placeholder="Qual é a senha?" autoFocus autoComplete="off" />
              <Button type="submit" variant="cyan" disabled={busy || !text.trim()} icon={<KeyRound size={18} />}>
                Chutar
              </Button>
            </form>
          )}
          {s.phase === 'GUESS' && !isGuesser && <p className="text-center text-white/75">{nameOf(players, s.guesserId)} está tentando adivinhar…</p>}
        </Card>
      )}

      {s.phase === 'WORD_RESULT' && last && (
        <Card className="flex flex-col items-center gap-2 text-center animate-pop" glow={last.correct ? 'green' : 'red'}>
          <div className={cn('font-display text-4xl font-bold', last.correct ? 'text-arcade-green' : 'text-arcade-red')}>{last.correct ? `Acertou! +${last.points}` : 'Não foi dessa vez'}</div>
          <div className="text-white/70">
            A senha era <b className="text-white">{last.word}</b>
          </div>
        </Card>
      )}

      {s.phase === 'TURN_SUMMARY' && (
        <Card className="flex flex-col items-center gap-3 text-center animate-pop">
          <PhaseTitle kicker="Fim do turno" title={s.skippedTurn ? 'Turno pulado (jogador desconectado)' : `${giver?.nickname} & ${guesser?.nickname}: +${s.turnPoints} pts cada`} />
          <div className="flex flex-wrap justify-center gap-2">
            {s.results.map((r, i) => (
              <Badge key={i} color={r.correct ? 'green' : 'red'}>
                {r.word} {r.correct ? `+${r.points}` : '✗'}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

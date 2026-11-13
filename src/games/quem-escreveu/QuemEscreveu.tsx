import { useState } from 'react';
import { Check, PenLine, Send, X } from 'lucide-react';
import type { GameMatchProps } from '../../types/game.types';
import { MAX_ANSWER, REVEAL_STEP_MS, revealDuration, type WwState, type WwView } from './logic';
import { Badge, Button, Card, cn } from '../../components/ui';
import { Avatar, nameOf } from '../../components/shared/PlayerBits';
import { PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { useSyncTimer } from '../../hooks/useSyncTimer';
import { sfx } from '../../core/audio/sfx';

export default function QuemEscreveu({ state: s, view, meId, players, config, send }: GameMatchProps<WwState, WwView>) {
  const [text, setText] = useState('');
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  usePhaseEffect(`${s.round}:${s.phase}`, () => {
    setText('');
    setGuesses({});
    if (s.phase === 'GUESSING_AUTHORS') sfx.pop();
    if (s.phase === 'REVEAL_AUTHORS') sfx.reveal();
  });
  const inGame = s.participants.includes(meId);
  const roster = s.participants.map((id) => players.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const others = roster.filter((p) => p.id !== meId);
  const guessable = (s.answers ?? []).filter((a) => a.anonymousId !== view?.myAnonId);
  const allSet = guessable.every((a) => guesses[a.anonymousId]);
  const revealEnd = s.reveal ? s.reveal.startedAt + revealDuration(s.reveal.items.length) : null;
  const rem = useSyncTimer(s.phase === 'REVEAL_AUTHORS' ? revealEnd : null);
  const shown = s.reveal ? Math.min(s.reveal.items.length, Math.floor((revealDuration(s.reveal.items.length) - rem) / REVEAL_STEP_MS) + 1) : 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Card className="flex flex-col gap-3 text-center" glow="purple">
        <PhaseTitle kicker={`Pergunta ${s.round} de ${s.totalRounds}`} title={s.question} />
        {s.phase === 'WRITING_SECRET_ANSWERS' && <TimerBar endsAt={s.endsAt} totalMs={Number(config.writeTimeSeconds ?? 40) * 1000} color="purple" />}
        {s.phase === 'GUESSING_AUTHORS' && <TimerBar endsAt={s.endsAt} totalMs={Number(config.guessTimeSeconds ?? 45) * 1000} />}
      </Card>

      {s.phase === 'WRITING_SECRET_ANSWERS' && (
        <Card className="flex flex-col gap-3">
          {!inGame ? (
            <p className="text-center text-white/75">Você está assistindo.</p>
          ) : view?.myAnswer ? (
            <div className="grid gap-2 text-center">
              <Badge color="green" className="mx-auto">
                <Check size={12} /> Resposta enviada em segredo
              </Badge>
              <p className="italic text-white/80">“{view.myAnswer}”</p>
            </div>
          ) : (
            <form className="grid gap-2" onSubmit={(e) => (e.preventDefault(), text.trim() && (send({ type: 'ANSWER', text }), sfx.click()))}>
              <textarea
                value={text}
                maxLength={MAX_ANSWER}
                rows={3}
                autoFocus
                placeholder="Escreva sua resposta… (dica: disfarce seu estilo!)"
                onChange={(e) => setText(e.target.value)}
                className="w-full resize-none rounded-2xl border border-line bg-obsidian/70 p-3 text-base text-white outline-none focus:border-brand-purple"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-white/65">
                  {text.length}/{MAX_ANSWER}
                </span>
                <Button type="submit" disabled={!text.trim()} icon={<Send size={18} />}>
                  Enviar em segredo
                </Button>
              </div>
            </form>
          )}
          <div className="text-center text-sm text-white/75">
            {s.submittedIds.length}/{s.participants.length} responderam
          </div>
        </Card>
      )}

      {s.phase === 'GUESSING_AUTHORS' && s.answers && (
        <Card className="flex flex-col gap-3">
          <p className="text-center text-sm text-white/80">{view?.myGuesses ? 'Palpites enviados! Aguardando os demais…' : inGame ? 'Quem escreveu cada resposta? Escolha um autor para cada card.' : 'Você está assistindo.'}</p>
          {s.answers.map((a) => {
            const mine = a.anonymousId === view?.myAnonId;
            const sel = view?.myGuesses?.[a.anonymousId] ?? guesses[a.anonymousId];
            return (
              <div key={a.anonymousId} className={cn('grid gap-2 rounded-2xl border p-3', mine ? 'border-brand-purple/60 bg-brand-purple/10' : 'border-line bg-white/[.03]')}>
                <p className="font-semibold">“{a.text}”</p>
                {mine ? (
                  <Badge color="purple" className="w-fit">
                    <PenLine size={12} /> Sua resposta
                  </Badge>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {others.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={!inGame || Boolean(view?.myGuesses)}
                        onClick={() => setGuesses((g) => ({ ...g, [a.anonymousId]: p.id }))}
                        className={cn('flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold transition', sel === p.id ? 'border-brand-pink bg-brand-pink/20' : 'border-line text-white/80 enabled:hover:border-brand-pink/60')}
                      >
                        <Avatar id={p.avatar} size={18} /> {p.nickname}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {inGame && !view?.myGuesses && (
            <Button disabled={!Object.keys(guesses).length} onClick={() => (send({ type: 'GUESSES', guesses }), sfx.click())}>
              {allSet ? 'Confirmar palpites' : `Confirmar (${Object.keys(guesses).length}/${guessable.length} escolhidos)`}
            </Button>
          )}
          <div className="text-center text-sm text-white/75">
            {s.guessedIds.length}/{s.participants.length} confirmaram
          </div>
        </Card>
      )}

      {s.phase === 'REVEAL_AUTHORS' && s.reveal && (
        <Card className="flex flex-col gap-3">
          {s.reveal.items.slice(0, shown).map((it) => {
            const author = players.find((p) => p.id === it.authorId);
            return (
              <div key={it.anonymousId} className="grid gap-2 rounded-2xl border border-line bg-surface/70 p-3 animate-rise">
                <p className="font-semibold">“{it.text}”</p>
                <div className="flex items-center gap-2">
                  {author && <Avatar id={author.avatar} size={28} ring="#10B981" />}
                  <span className="font-display text-lg font-bold">{author?.nickname}</span>
                  {it.wrong.length > 0 && <Badge color="amber">disfarce +{it.wrong.length * 50}</Badge>}
                </div>
                <div className="flex flex-wrap gap-1 text-xs">
                  {it.right.map((id) => (
                    <Badge key={id} color="green">
                      <Check size={10} /> {nameOf(players, id)}
                    </Badge>
                  ))}
                  {it.wrong.map((id) => (
                    <Badge key={id} color="red">
                      <X size={10} /> {nameOf(players, id)}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
          {shown >= s.reveal.items.length && (
            <div className="flex flex-wrap justify-center gap-2 animate-pop">
              {Object.entries(s.reveal.delta)
                .sort((a, b) => b[1] - a[1])
                .map(([id, pts]) => (
                  <Badge key={id} color="green">
                    {nameOf(players, id)} +{pts}
                  </Badge>
                ))}
            </div>
          )}
          <p className="text-center text-xs text-white/70">+100 por autoria certa • autor ganha +50 por cada um que errou a dele</p>
        </Card>
      )}
    </div>
  );
}

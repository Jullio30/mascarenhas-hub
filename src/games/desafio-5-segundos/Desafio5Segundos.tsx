import { useEffect, useRef, useState } from 'react';
import { Hand, Send, ThumbsDown, ThumbsUp, Zap } from 'lucide-react';
import type { GameMatchProps } from '../../types/game.types';
import type { D5State, D5View as View } from './logic';
import { PREP_MS, VALIDATION_MS, promptText } from './logic';
import { Badge, Button, Card, Input, cn } from '../../components/ui';
import { Avatar, nameOf } from '../../components/shared/PlayerBits';
import { BigCountdown, PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { useSyncTimer } from '../../hooks/useSyncTimer';
import { sfx } from '../../core/audio/sfx';

export default function Desafio5Segundos({ state: s, view, meId, players, send }: GameMatchProps<D5State, View>) {
  const hot = players.find((p) => p.id === s.hotSeat);
  const isHot = meId === s.hotSeat;
  const [busy, setBusy] = useState(false);
  const title = s.prompt ? promptText(s.prompt, s.answersPerTurn) : '';

  usePhaseEffect(`${s.turnIndex}:${s.phase}`, () => {
    setBusy(false);
    if (s.phase === 'COUNTDOWN_ACTIVE') sfx.reveal();
    if (s.phase === 'PEER_VALIDATION') sfx.buzzer();
    if (s.phase === 'ROUND_SUMMARY') (s.points > 0 ? sfx.success() : sfx.error());
  });

  const act = (type: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    send({ type, ...extra });
    window.setTimeout(() => setBusy(false), 1500);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-center gap-3">
        {hot && <Avatar id={hot.avatar} size={46} ring="#06B6D4" />}
        <div>
          <div className="text-xs font-bold uppercase tracking-[.2em] text-arcade-cyan">Jogador da vez</div>
          <div className="font-display text-2xl font-bold">{isHot ? 'Você!' : hot?.nickname}</div>
        </div>
      </div>

      {s.phase === 'TURN_PREPARATION' && (
        <Card className="flex flex-col items-center gap-5 text-center" glow="cyan">
          <PhaseTitle
            kicker="Preparação"
            title={isHot ? 'Dedos no teclado…' : `Aguardando ${hot?.nickname ?? ''} ficar pronto`}
            sub={`O tema só aparece quando o jogador da vez estiver pronto. Serão até ${s.answersPerTurn} respostas em ${s.countdownMs / 1000} segundos! Enter confirma e pula para o próximo campo.`}
          />
          {isHot ? (
            <Button size="xl" variant="cyan" className="w-full" loading={busy} onClick={() => act('READY')} icon={<Zap />}>
              Estou Pronto! Revelar Tema
            </Button>
          ) : (
            <div className="text-white/80">O tema será revelado automaticamente ao fim do tempo.</div>
          )}
          <div className="w-full">
            <TimerBar endsAt={s.endsAt} totalMs={PREP_MS} />
          </div>
        </Card>
      )}

      {s.phase === 'COUNTDOWN_ACTIVE' && s.prompt && (
        <Card className="flex flex-col items-center gap-4 text-center" glow="red">
          <Badge color="pink">{s.prompt.category}</Badge>
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{title}</h2>
          <BigCountdown endsAt={s.endsAt} totalMs={s.countdownMs} />
          {isHot ? <TypingAnswers key={s.turnIndex} n={s.answersPerTurn} endsAt={s.endsAt} send={send} /> : <AnswerList answers={s.answers} n={s.answersPerTurn} />}
        </Card>
      )}

      {s.phase === 'PEER_VALIDATION' && (
        <Card className="flex flex-col gap-4 text-center" glow="purple">
          <PhaseTitle kicker="Avaliação do grupo" title={title} sub={s.finishedEarly ? 'Terminou antes do tempo!' : 'O tempo acabou! Avalie cada resposta.'} />
          {s.voters.includes(meId) && !s.votedIds.includes(meId) && !view?.myVotes ? (
            <PeerVoting key={s.turnIndex} answers={s.answers} busy={busy} onSubmit={(votes) => act('VOTE', { votes })} />
          ) : (
            <>
              <AnswerList answers={s.answers} n={s.answers.length} />
              <p className="text-white/75">{isHot ? 'Você não vota nas próprias respostas. O grupo está avaliando…' : s.voters.includes(meId) ? 'Avaliação enviada! Aguardando os demais…' : 'Você está assistindo.'}</p>
            </>
          )}
          <div className="text-sm text-white/80">
            {s.votedIds.length}/{s.voters.length} avaliaram
          </div>
          <TimerBar endsAt={s.endsAt} totalMs={VALIDATION_MS} color="purple" />
        </Card>
      )}

      {s.phase === 'ROUND_SUMMARY' && (
        <Card className="flex flex-col items-center gap-4 text-center animate-pop" glow={s.points > 0 ? 'green' : 'red'}>
          {s.verdict === 'skipped' ? (
            <PhaseTitle kicker="Turno pulado" title={`${hot?.nickname ?? 'Jogador'} não estava pronto`} />
          ) : s.verdict === 'empty' ? (
            <PhaseTitle kicker="Tempo esgotado" title="Nenhuma resposta enviada" sub="0 pontos neste turno" />
          ) : (
            <>
              <div className="font-display text-5xl font-bold text-arcade-green">+{s.points} pts</div>
              <div className="text-white/75">{title}</div>
              <div className="grid w-full gap-2">
                {s.answers.map((ans, i) => {
                  const ups = s.upCounts?.[i] ?? 0;
                  const voters = Object.entries(s.votes ?? {});
                  return (
                    <div key={i} className={cn('flex items-center gap-3 rounded-2xl border px-3 py-2 text-left', ups > 0 ? 'border-arcade-green/50 bg-arcade-green/10' : 'border-line bg-white/[.03]')}>
                      <span className="flex-1 font-semibold">{ans}</span>
                      <span className="flex gap-1">
                        {voters.map(([pid, list]) => (
                          <span key={pid} title={`${nameOf(players, pid)}: ${list[i] ? '👍' : '👎'}`} className="text-sm">
                            {list[i] ? '👍' : '👎'}
                          </span>
                        ))}
                      </span>
                      <Badge color={ups > 0 ? 'green' : 'gray'}>+{ups}</Badge>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-white/70">+1 ponto por voto favorável em cada resposta</p>
            </>
          )}
          <div className="text-sm text-white/70">
            <Hand className="mr-1 inline" size={14} />
            Próximo jogador em instantes…
          </div>
        </Card>
      )}
    </div>
  );
}

function AnswerList({ answers, n }: { answers: string[]; n: number }) {
  return (
    <div className="grid w-full gap-2">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={cn('min-h-11 rounded-2xl border px-3 py-2.5 text-left font-semibold', answers[i] ? 'border-arcade-cyan/50 bg-arcade-cyan/10' : 'border-line text-white/65')}>
          {answers[i] || `${i + 1}ª resposta`}
        </div>
      ))}
    </div>
  );
}

/** Campos de digitação rápida: Enter avança; o rascunho é enviado ao vivo e no zerar do cronômetro. */
function TypingAnswers({ n, endsAt, send }: { n: number; endsAt: number | null; send: GameMatchProps<D5State>['send'] }) {
  const [values, setValues] = useState<string[]>(() => Array.from({ length: n }, () => ''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const latest = useRef(values);
  const sentFinal = useRef(false);
  const rem = useSyncTimer(endsAt);
  latest.current = values;

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  // envio ao vivo (debounce) — garante que o texto digitado conte mesmo se o tempo acabar
  useEffect(() => {
    if (sentFinal.current) return;
    const t = window.setTimeout(() => send({ type: 'ANSWERS', answers: latest.current }), 250);
    return () => clearTimeout(t);
  }, [values, send]);

  // cronômetro zerou: envia imediatamente o que estiver nos campos
  useEffect(() => {
    if (endsAt && rem <= 0 && !sentFinal.current) {
      sentFinal.current = true;
      send({ type: 'ANSWERS', answers: latest.current, final: true });
    }
  }, [rem, endsAt, send]);

  const finish = () => {
    if (sentFinal.current) return;
    sentFinal.current = true;
    send({ type: 'ANSWERS', answers: latest.current, final: true });
    sfx.click();
  };

  return (
    <div className="grid w-full gap-2">
      {values.map((v, i) => (
        <Input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={v}
          placeholder={`${i + 1}ª resposta + Enter`}
          maxLength={40}
          autoComplete="off"
          enterKeyHint={i === n - 1 ? 'done' : 'next'}
          onChange={(e) => setValues((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const nextEmpty = values.findIndex((x, j) => j > i && !x.trim());
            if (nextEmpty >= 0) refs.current[nextEmpty]?.focus();
            else if (values.every((x, j) => (j === i ? v.trim() : x.trim()))) finish();
            else refs.current[i + 1]?.focus();
          }}
        />
      ))}
      <Button variant="success" size="lg" onClick={finish} icon={<Send />}>
        Terminei! Enviar respostas
      </Button>
    </div>
  );
}

function PeerVoting({ answers, busy, onSubmit }: { answers: string[]; busy: boolean; onSubmit: (votes: boolean[]) => void }) {
  const [votes, setVotes] = useState<(boolean | null)[]>(() => answers.map(() => null));
  const set = (i: number, v: boolean) => {
    setVotes((cur) => cur.map((x, j) => (j === i ? v : x)));
    sfx.click();
  };
  const ready = votes.every((v) => v !== null);
  return (
    <div className="grid gap-3">
      {answers.map((ans, i) => (
        <div key={i} className="flex items-center gap-2 rounded-2xl border border-line bg-white/[.03] p-2 pl-3 text-left">
          <span className="flex-1 font-semibold">{ans}</span>
          <button
            type="button"
            aria-label={`Favorável a ${ans}`}
            onClick={() => set(i, true)}
            className={cn('grid h-11 w-11 place-items-center rounded-xl border transition', votes[i] === true ? 'border-arcade-green bg-arcade-green/25 text-emerald-200' : 'border-line text-white/70')}
          >
            <ThumbsUp size={18} />
          </button>
          <button
            type="button"
            aria-label={`Contrário a ${ans}`}
            onClick={() => set(i, false)}
            className={cn('grid h-11 w-11 place-items-center rounded-xl border transition', votes[i] === false ? 'border-arcade-red bg-arcade-red/25 text-red-200' : 'border-line text-white/70')}
          >
            <ThumbsDown size={18} />
          </button>
        </div>
      ))}
      <Button size="lg" disabled={!ready || busy} onClick={() => onSubmit(votes.map((v) => v === true))}>
        {ready ? 'Confirmar avaliação' : 'Avalie todas as respostas'}
      </Button>
    </div>
  );
}

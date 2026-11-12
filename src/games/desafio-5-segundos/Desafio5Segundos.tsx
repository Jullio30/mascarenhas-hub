import { useEffect, useRef, useState } from 'react';
import { Check, CheckCheck, Hand, Mic, X, Zap } from 'lucide-react';
import type { GameMatchProps } from '../../types/game.types';
import type { D5State, D5Vote } from './logic';
import { PREP_MS, VALIDATION_MS } from './logic';
import { Badge, Button, Card, Input, cn } from '../../components/ui';
import { Avatar, nameOf } from '../../components/shared/PlayerBits';
import { BigCountdown, PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { sfx } from '../../core/audio/sfx';

const VERDICT_LABEL: Record<D5Vote, string> = { valid: 'Validado', partial: 'Parcial', fail: 'Falhou' };

export default function Desafio5Segundos({ state: s, meId, players, send }: GameMatchProps<D5State>) {
  const hot = players.find((p) => p.id === s.hotSeat);
  const isHot = meId === s.hotSeat;
  const [busy, setBusy] = useState(false);

  usePhaseEffect(`${s.turnIndex}:${s.phase}`, () => {
    setBusy(false);
    if (s.phase === 'COUNTDOWN_ACTIVE') sfx.reveal();
    if (s.phase === 'PEER_VALIDATION') sfx.buzzer();
    if (s.phase === 'ROUND_SUMMARY') s.verdict === 'valid' ? sfx.success() : s.verdict === 'partial' ? sfx.pop() : sfx.error();
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
          <PhaseTitle kicker="Preparação" title={isHot ? 'Respire fundo…' : `Aguardando ${hot?.nickname ?? ''} ficar pronto`} sub="O tema só aparece quando o jogador da vez estiver pronto. Serão 3 respostas em 5 segundos!" />
          {isHot ? (
            <Button size="xl" variant="cyan" className="w-full" loading={busy} onClick={() => act('READY')} icon={<Zap />}>
              Estou Pronto! Revelar Tema
            </Button>
          ) : (
            <div className="text-white/70">O tema será revelado automaticamente ao fim do tempo.</div>
          )}
          <div className="w-full">
            <TimerBar endsAt={s.endsAt} totalMs={PREP_MS} />
          </div>
        </Card>
      )}

      {s.phase === 'COUNTDOWN_ACTIVE' && s.prompt && (
        <Card className="flex flex-col items-center gap-4 text-center" glow="red">
          <Badge color="pink">{s.prompt.category}</Badge>
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{s.prompt.text}</h2>
          <BigCountdown endsAt={s.endsAt} totalMs={s.countdownMs} />
          {isHot && s.answerMode === 'voice' && (
            <Button size="xl" variant="success" className="w-full" loading={busy} onClick={() => act('DONE')} icon={<Mic />}>
              Falei os 3!
            </Button>
          )}
          {isHot && s.answerMode === 'typing' && <TypingAnswers answers={s.answers} send={send} />}
          {!isHot && s.answerMode === 'typing' && <AnswerList answers={s.answers} />}
          {!isHot && s.answerMode === 'voice' && <p className="text-white/75">Ouça com atenção: você vai julgar as respostas!</p>}
        </Card>
      )}

      {s.phase === 'PEER_VALIDATION' && (
        <Card className="flex flex-col gap-4 text-center" glow="purple">
          <PhaseTitle kicker="Julgamento rápido" title={s.prompt?.text ?? ''} sub={s.finishedEarly ? `Terminou com ${((s.remainingAtDone ?? 0) / 1000).toFixed(1)}s de sobra` : 'O tempo estourou!'} />
          {s.answerMode === 'typing' && <AnswerList answers={s.answers} />}
          {s.voters.includes(meId) && !s.votedIds.includes(meId) ? (
            <div className={cn('grid gap-3', s.allowPartial ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2')}>
              <Button size="lg" variant="success" disabled={busy} onClick={() => act('VOTE', { vote: 'valid' })} icon={<CheckCheck />}>
                Validar (3 de 3)
              </Button>
              {s.allowPartial && (
                <Button size="lg" variant="secondary" disabled={busy} onClick={() => act('VOTE', { vote: 'partial' })} icon={<Check />}>
                  Parcial (2 de 3)
                </Button>
              )}
              <Button size="lg" variant="danger" disabled={busy} onClick={() => act('VOTE', { vote: 'fail' })} icon={<X />}>
                Falhou
              </Button>
            </div>
          ) : (
            <p className="text-white/75">{isHot ? 'Os outros jogadores estão julgando seu desempenho…' : 'Voto registrado! Aguardando os demais…'}</p>
          )}
          <div className="text-sm text-white/70">
            {s.votedIds.length}/{s.voters.length} votos
          </div>
          <TimerBar endsAt={s.endsAt} totalMs={VALIDATION_MS} color="purple" />
        </Card>
      )}

      {s.phase === 'ROUND_SUMMARY' && (
        <Card className="flex flex-col items-center gap-4 text-center animate-pop" glow={s.verdict === 'valid' ? 'green' : s.verdict === 'partial' ? 'purple' : 'red'}>
          {s.verdict === 'skipped' ? (
            <PhaseTitle kicker="Turno pulado" title={`${hot?.nickname ?? 'Jogador'} estava desconectado`} />
          ) : (
            <>
              <div className={cn('font-display text-5xl font-bold', s.verdict === 'valid' ? 'text-arcade-green' : s.verdict === 'partial' ? 'text-violet-300' : 'text-arcade-red')}>
                {s.verdict ? VERDICT_LABEL[s.verdict] : ''}
              </div>
              <div className="text-xl font-bold">+{s.points} pontos {s.bonus && <Badge color="amber">⚡ bônus velocidade</Badge>}</div>
              {s.prompt && <div className="text-white/75">{s.prompt.text}</div>}
              {s.votes && Object.keys(s.votes).length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {Object.entries(s.votes).map(([pid, v]) => (
                    <Badge key={pid} color={v === 'valid' ? 'green' : v === 'partial' ? 'purple' : 'red'}>
                      {nameOf(players, pid)}: {VERDICT_LABEL[v]}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="text-sm text-white/60">
            <Hand className="mr-1 inline" size={14} />
            Próximo jogador em instantes…
          </div>
        </Card>
      )}
    </div>
  );
}

function AnswerList({ answers }: { answers: string[] }) {
  return (
    <div className="grid w-full gap-2 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className={cn('min-h-12 rounded-2xl border px-3 py-3 font-semibold', answers[i] ? 'border-arcade-cyan/50 bg-arcade-cyan/10' : 'border-line text-white/55')}>
          {answers[i] || `${i + 1}ª resposta`}
        </div>
      ))}
    </div>
  );
}

function TypingAnswers({ answers, send }: { answers: string[]; send: GameMatchProps<D5State>['send'] }) {
  const [values, setValues] = useState(['', '', '']);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  useEffect(() => {
    refs[0].current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="grid w-full gap-2">
      {[0, 1, 2].map((i) => (
        <Input
          key={i}
          ref={refs[i]}
          value={values[i]}
          disabled={Boolean(answers[i])}
          placeholder={`${i + 1}ª resposta + Enter`}
          maxLength={40}
          autoComplete="off"
          onChange={(e) => setValues((v) => v.map((x, j) => (j === i ? e.target.value : x)))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && values[i].trim()) {
              send({ type: 'ANSWER_PART', index: i, text: values[i] });
              refs[i + 1]?.current?.focus();
            }
          }}
        />
      ))}
    </div>
  );
}

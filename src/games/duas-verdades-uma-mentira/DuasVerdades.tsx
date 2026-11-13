import { useEffect, useState } from 'react';
import { Check, Lightbulb, Send, Skull, X } from 'lucide-react';
import type { GameMatchProps } from '../../types/game.types';
import { MAX_STATEMENT, REVEAL_MS, type DvState, type DvView } from './logic';
import { Badge, Button, Card, cn } from '../../components/ui';
import { Avatar, nameOf } from '../../components/shared/PlayerBits';
import { PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { usePrivateNotice } from '../_shared/notice';
import { sfx } from '../../core/audio/sfx';

export default function DuasVerdades({ state: s, view, meId, players, config, send }: GameMatchProps<DvState, DvView>) {
  usePrivateNotice(view?.notice);
  const [pendingVote, setPendingVote] = useState<string | null>(null);
  usePhaseEffect(`${s.round}:${s.phase}:${s.queuePos}`, () => {
    setPendingVote(null);
    if (s.phase === 'SHOWCASE_VOTING') sfx.pop();
    if (s.phase === 'STATEMENT_REVEAL') sfx.reveal();
  });
  const author = players.find((p) => p.id === s.currentAuthorId);
  const isAuthor = meId === s.currentAuthorId;
  const inGame = s.participants.includes(meId);
  const myVote = view?.myVote ?? pendingVote;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {s.phase === 'WRITING_STATEMENTS' && (
        <Card className="flex flex-col gap-4" glow="purple">
          <PhaseTitle kicker="Fase 1 • Escreva seu trio" title="2 verdades e 1 mentira" sub="Pode ser sobre você, curiosidades, história, cultura pop… Marque em segredo qual é a mentira." />
          <TimerBar endsAt={s.endsAt} totalMs={Number(config.writeTimeSeconds ?? 60) * 1000} color="purple" />
          {!inGame ? (
            <p className="text-center text-white/75">Você está assistindo.</p>
          ) : view?.myTrio ? (
            <div className="grid gap-2 text-center">
              <Badge color="green" className="mx-auto">
                <Check size={12} /> Trio enviado!
              </Badge>
              {view.myTrio.statements.map((t, i) => (
                <div key={i} className={cn('rounded-2xl border px-3 py-2 text-left text-sm', i === view.myTrio!.lieIndex ? 'border-arcade-red/60 bg-arcade-red/10' : 'border-line bg-white/[.03]')}>
                  {i === view.myTrio!.lieIndex ? '🤥 ' : '✅ '}
                  {t}
                </div>
              ))}
              <p className="text-sm text-white/70">Aguardando os demais jogadores…</p>
            </div>
          ) : (
            <TrioForm view={view} send={send} />
          )}
          <div className="text-center text-sm text-white/75">
            {s.submittedIds.length}/{s.participants.length} enviaram
          </div>
        </Card>
      )}

      {(s.phase === 'SHOWCASE_VOTING' || s.phase === 'STATEMENT_REVEAL') && (
        <Card className="flex flex-col gap-4" glow={s.phase === 'STATEMENT_REVEAL' ? 'green' : 'cyan'}>
          <div className="flex items-center justify-center gap-3">
            {author && <Avatar id={author.avatar} size={44} ring="#06B6D4" />}
            <div>
              <div className="text-xs font-bold uppercase tracking-[.2em] text-arcade-cyan">
                Autor {s.queuePos + 1} de {s.queue.length}
              </div>
              <div className="font-display text-2xl font-bold">{isAuthor ? 'Suas afirmações' : author?.nickname}</div>
            </div>
          </div>
          {s.phase === 'SHOWCASE_VOTING' && <TimerBar endsAt={s.endsAt} totalMs={Number(config.voteTimeSeconds ?? 25) * 1000} />}
          {s.phase === 'STATEMENT_REVEAL' && <TimerBar endsAt={s.endsAt} totalMs={REVEAL_MS} color="purple" />}
          <p className="text-center text-sm text-white/80">
            {s.phase === 'SHOWCASE_VOTING' ? (isAuthor ? 'Faça cara de paisagem! Os outros estão votando…' : inGame ? 'Qual destas é a MENTIRA?' : 'Você está assistindo.') : 'Revelação!'}
          </p>
          <div className="grid gap-2">
            {s.statements.map((st) => {
              const isLie = s.reveal?.lieKey === st.key;
              const chosen = myVote === st.key;
              const voters = s.reveal ? Object.entries(s.reveal.votes).filter(([, k]) => k === st.key).map(([id]) => id) : [];
              return (
                <button
                  key={st.key}
                  type="button"
                  disabled={s.phase !== 'SHOWCASE_VOTING' || isAuthor || !inGame || Boolean(myVote)}
                  onClick={() => {
                    setPendingVote(st.key);
                    send({ type: 'VOTE', key: st.key });
                    sfx.click();
                  }}
                  className={cn(
                    'flex min-h-16 flex-col gap-1 rounded-2xl border-2 p-3 text-left transition',
                    s.reveal ? (isLie ? 'border-arcade-red bg-arcade-red/15 animate-pop' : 'border-arcade-green/60 bg-arcade-green/10') : chosen ? 'border-brand-pink bg-brand-pink/15' : 'border-line bg-white/[.03] enabled:hover:border-brand-pink/60',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10 font-display font-bold">{st.key}</span>
                    <span className="flex-1 font-semibold">{st.text}</span>
                    {s.reveal && (isLie ? <Badge color="red">🤥 MENTIRA</Badge> : <Badge color="green">✅ Verdade</Badge>)}
                  </span>
                  {voters.length > 0 && (
                    <span className="flex flex-wrap gap-1 pl-10">
                      {voters.map((id) => {
                        const p = players.find((x) => x.id === id);
                        return p ? <Avatar key={id} id={p.avatar} size={22} /> : null;
                      })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {s.phase === 'SHOWCASE_VOTING' && (
            <div className="text-center text-sm text-white/75">
              {s.votedIds.length}/{s.participants.length - 1} votaram
            </div>
          )}
          {s.reveal && (
            <div className="grid gap-2 text-sm">
              {s.reveal.correct.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <Check size={14} className="text-arcade-green" /> Acertaram (+100): {s.reveal.correct.map((id) => nameOf(players, id)).join(', ')}
                </div>
              )}
              {s.reveal.fooled.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <Skull size={14} className="text-arcade-red" /> Caíram na conversa: {s.reveal.fooled.map((id) => nameOf(players, id)).join(', ')} → {nameOf(players, s.reveal.authorId)} +{s.reveal.fooled.length * 50}
                </div>
              )}
              {s.reveal.correct.length === 0 && s.reveal.fooled.length === 0 && <div className="text-white/70">Ninguém votou.</div>}
            </div>
          )}
        </Card>
      )}

      {s.phase === 'ROUND_SUMMARY' && (
        <Card className="flex flex-col gap-3 animate-pop" glow="purple">
          <PhaseTitle kicker={`Fim do ciclo ${s.round}`} title="Placar do ciclo" />
          {s.participants
            .map((id) => ({ id, pts: s.cycleDelta[id] ?? 0 }))
            .sort((a, b) => b.pts - a.pts)
            .map(({ id, pts }) => {
              const p = players.find((x) => x.id === id);
              return (
                <div key={id} className="flex items-center gap-2 rounded-2xl border border-line bg-surface/70 p-2">
                  {p && <Avatar id={p.avatar} size={28} />}
                  <span className="flex-1 font-semibold">{p?.nickname}</span>
                  <Badge color={pts > 0 ? 'green' : 'gray'}>+{pts}</Badge>
                </div>
              );
            })}
        </Card>
      )}
    </div>
  );
}

function TrioForm({ view, send }: { view: DvView | null; send: GameMatchProps<DvState>['send'] }) {
  const [values, setValues] = useState(['', '', '']);
  const [lie, setLie] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const suggestion = view?.suggestion;
  useEffect(() => {
    if (!suggestion) return;
    setValues([...suggestion.statements]);
    setLie(suggestion.lieIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion?.count]);
  const ready = values.every((v) => v.trim()) && lie !== null;
  return (
    <div className="grid gap-3">
      {values.map((v, i) => (
        <div key={i} className={cn('grid gap-1 rounded-2xl border p-2', lie === i ? 'border-arcade-red/70 bg-arcade-red/10' : 'border-line')}>
          <div className="flex items-center justify-between text-xs font-bold text-white/75">
            <span>Afirmação {i + 1}</span>
            <span>
              {v.length}/{MAX_STATEMENT}
            </span>
          </div>
          <textarea
            value={v}
            maxLength={MAX_STATEMENT}
            rows={2}
            placeholder={i === 0 ? 'Ex.: Já comi um inseto de propósito' : i === 1 ? 'Ex.: O polvo tem três corações' : 'Ex.: Já fui em um show do Roberto Carlos'}
            onChange={(e) => setValues((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
            className="w-full resize-none rounded-xl border border-line bg-obsidian/70 p-2 text-base text-white outline-none focus:border-brand-purple"
          />
          <button
            type="button"
            onClick={() => setLie(i)}
            className={cn('inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border text-sm font-bold transition', lie === i ? 'border-arcade-red bg-arcade-red/25 text-red-100' : 'border-line text-white/75')}
          >
            {lie === i ? <X size={14} /> : null} {lie === i ? 'Esta é a MENTIRA' : 'Marcar como mentira'}
          </button>
        </div>
      ))}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" icon={<Lightbulb size={18} />} disabled={(suggestion?.count ?? 0) >= 5} onClick={() => (send({ type: 'SUGGEST' }), sfx.click())}>
          Sugerir trio de curiosidades
        </Button>
        <Button
          icon={<Send size={18} />}
          disabled={!ready || busy}
          onClick={() => {
            setBusy(true);
            send({ type: 'SUBMIT', statements: values, lieIndex: lie });
            window.setTimeout(() => setBusy(false), 1500);
          }}
        >
          {ready ? 'Enviar meu trio' : 'Preencha e marque a mentira'}
        </Button>
      </div>
    </div>
  );
}

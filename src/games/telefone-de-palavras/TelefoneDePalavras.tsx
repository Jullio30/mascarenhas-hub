import { useState } from 'react';
import { ArrowRight, Dices, Send, Sparkles, Star } from 'lucide-react';
import type { GameMatchProps } from '../../types/game.types';
import { EVAL_MS, MAX_WORD, type TpState, type TpView } from './logic';
import { Badge, Button, Card, Input, cn } from '../../components/ui';
import { Avatar, nameOf } from '../../components/shared/PlayerBits';
import { PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { sfx } from '../../core/audio/sfx';

const STAR_LABEL = ['', 'Nada a ver / Quebrou tudo', 'Forçou a barra', 'Faz algum sentido', 'Conexão muito boa', 'Conexão perfeita / Genial'];

export default function TelefoneDePalavras({ state: s, view, meId, players, config, send }: GameMatchProps<TpState, TpView>) {
  const [word, setWord] = useState('');
  usePhaseEffect(`${s.round}:${s.phase}:${s.slotPos}`, () => {
    setWord('');
    if (s.phase === 'CHAIN_PROGRESSION' && s.activeId === meId) sfx.coin();
    if (s.phase === 'CONNECTION_EVALUATION') sfx.reveal();
  });
  const turnMs = Number(config.turnSeconds ?? 15) * 1000;
  const active = players.find((p) => p.id === s.activeId);
  const isActive = s.activeId === meId;
  const last = s.chain[s.chain.length - 1]?.word;
  const submit = (type: string, extra: Record<string, unknown>) => {
    send({ type, ...extra });
    setWord('');
    sfx.click();
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {s.phase === 'INITIAL_WORD_SETUP' && (
        <Card className="flex flex-col gap-4 text-center" glow="cyan">
          {s.initialMode === 'catalog' ? (
            <>
              <PhaseTitle kicker={`Rodada ${s.round} • Palavra inicial sorteada`} title={last ?? '…'} sub={`Quem começa a corrente: ${nameOf(players, s.slots[0])}`} />
              <TimerBar endsAt={s.endsAt} totalMs={4000} />
            </>
          ) : s.setterId === meId ? (
            <>
              <PhaseTitle kicker={`Rodada ${s.round} • Você começa!`} title="Escolha a Palavra Inicial" sub={s.initialMode === 'hybrid' ? 'Digite uma palavra ou sorteie uma do catálogo.' : 'Digite a palavra que abre a corrente.'} />
              <TimerBar endsAt={s.endsAt} totalMs={turnMs} />
              <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), word.trim() && submit('SET_INITIAL', { word }))}>
                <Input value={word} maxLength={MAX_WORD} autoFocus placeholder="Palavra inicial…" onChange={(e) => setWord(e.target.value)} />
                <Button type="submit" disabled={!word.trim()} icon={<Send size={18} />}>
                  OK
                </Button>
              </form>
              {s.initialMode === 'hybrid' && (
                <Button variant="secondary" icon={<Dices size={18} />} onClick={() => submit('SET_INITIAL', { random: true })}>
                  Sortear do catálogo
                </Button>
              )}
            </>
          ) : (
            <>
              <PhaseTitle kicker={`Rodada ${s.round}`} title={`${nameOf(players, s.setterId)} está escolhendo a palavra inicial…`} />
              <TimerBar endsAt={s.endsAt} totalMs={turnMs} />
            </>
          )}
        </Card>
      )}

      {(s.phase === 'CHAIN_PROGRESSION' || s.phase === 'CONNECTION_EVALUATION' || s.phase === 'ROUND_SUMMARY') && s.chain.length > 0 && s.phase !== 'CHAIN_PROGRESSION' && (
        <Card className="flex flex-col items-center gap-3 text-center" glow="purple">
          <div className="text-xs font-bold uppercase tracking-[.2em] text-arcade-cyan">Palavra Inicial ⟷ Palavra Final</div>
          <div className="flex flex-wrap items-center justify-center gap-3 font-display text-3xl font-bold sm:text-4xl">
            <span className="text-cyan-300">{s.chain[0].word}</span>
            <span className="text-white/60">⟷</span>
            <span className="text-pink-300">{s.chain[s.chain.length - 1].word}</span>
          </div>
        </Card>
      )}

      {s.phase === 'CHAIN_PROGRESSION' && (
        <Card className="flex flex-col gap-4 text-center" glow={isActive ? 'cyan' : undefined}>
          <div className="flex items-center justify-center gap-3">
            {active && <Avatar id={active.avatar} size={42} ring="#06B6D4" />}
            <div className="text-left">
              <div className="text-xs font-bold uppercase tracking-[.2em] text-arcade-cyan">
                Elo {s.slotPos + 1} de {s.slots.length}
              </div>
              <div className="font-display text-xl font-bold">{isActive ? 'Sua vez!' : `Vez de ${active?.nickname ?? '…'}`}</div>
            </div>
          </div>
          <TimerBar endsAt={s.endsAt} totalMs={turnMs} />
          <div className="text-white/80">
            A palavra anterior foi: <span className="font-display text-3xl font-bold text-white">{last}</span>
          </div>
          {isActive ? (
            <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), word.trim() && submit('WORD', { word }))}>
              <Input value={word} maxLength={MAX_WORD} autoFocus placeholder="Digite uma palavra associada…" onChange={(e) => setWord(e.target.value)} />
              <Button type="submit" disabled={!word.trim()} icon={<Send size={18} />}>
                Enviar
              </Button>
            </form>
          ) : (
            <p className="text-sm text-white/70">Repetições valem! A relação pode ser livre, criativa ou indireta.</p>
          )}
        </Card>
      )}

      {s.chain.length > 0 && s.phase !== 'INITIAL_WORD_SETUP' && (
        <Card className="flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Trilha da corrente</div>
          <ChainTrail state={s} players={players} meId={meId} />
        </Card>
      )}

      {s.phase === 'CONNECTION_EVALUATION' && <Evaluation key={s.round} state={s} view={view} meId={meId} players={players} send={send} />}

      {s.phase === 'ROUND_SUMMARY' && s.result && (
        <Card className="flex flex-col items-center gap-3 text-center animate-pop" glow="green">
          <div className="font-display text-5xl font-bold text-amber-300">
            {s.result.avg ? `${s.result.avg.toFixed(1)} / 5.0 ⭐` : '—'}
          </div>
          <div className="font-display text-xl font-bold">{s.result.label}</div>
          <div className="grid w-full gap-1.5">
            {Object.entries(s.result.delta)
              .sort((a, b) => b[1] - a[1])
              .map(([id, pts]) => {
                const p = players.find((x) => x.id === id);
                return (
                  <div key={id} className="flex items-center gap-2 rounded-2xl border border-line bg-surface/70 p-2 text-left">
                    {p && <Avatar id={p.avatar} size={26} />}
                    <span className="flex-1 font-semibold">{p?.nickname}</span>
                    {(s.result?.creative[id] ?? 0) > 0 && (
                      <Badge color="amber">
                        <Sparkles size={12} /> {s.result?.creative[id]}× criativo
                      </Badge>
                    )}
                    <Badge color="green">+{pts}</Badge>
                  </div>
                );
              })}
          </div>
          <p className="text-xs text-white/70">Cada membro da corrente: média × 20 pts • Elo Mais Criativo: +50 por voto</p>
        </Card>
      )}
    </div>
  );
}

function ChainTrail({ state: s, players, meId, onPick, picked }: { state: TpState; players: GameMatchProps<TpState>['players']; meId: string; onPick?: (i: number) => void; picked?: number | null }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {s.chain.map((l, i) => {
        const p = players.find((x) => x.id === l.authorId);
        const pickable = Boolean(onPick) && l.authorId && l.authorId !== meId;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ArrowRight size={14} className="text-white/50" />}
            <button
              type="button"
              disabled={!pickable}
              onClick={() => pickable && onPick?.(i)}
              className={cn(
                'flex flex-col items-center rounded-2xl border px-3 py-1.5 transition',
                picked === i ? 'border-arcade-amber bg-arcade-amber/20' : i === 0 || i === s.chain.length - 1 ? 'border-arcade-cyan/60 bg-arcade-cyan/10' : 'border-line bg-white/[.03]',
                pickable && 'hover:border-arcade-amber/70',
              )}
            >
              <span className="font-display text-lg font-bold">{l.word}</span>
              <span className="text-[10px] text-white/70">{p ? p.nickname : 'sorteada'}</span>
            </button>
          </span>
        );
      })}
    </div>
  );
}

function Evaluation({ state: s, view, meId, players, send }: { state: TpState; view: TpView | null; meId: string; players: GameMatchProps<TpState>['players']; send: GameMatchProps<TpState>['send'] }) {
  const [stars, setStars] = useState(0);
  const [creative, setCreative] = useState<number | null>(null);
  const done = Boolean(view?.myRating) || s.ratedIds.includes(meId);
  const inGame = s.participants.includes(meId);
  return (
    <Card className="flex flex-col gap-4 text-center" glow="purple">
      <PhaseTitle kicker="Avaliação coletiva" title="Até que ponto a conexão fez sentido?" />
      <TimerBar endsAt={s.endsAt} totalMs={EVAL_MS} color="purple" />
      {!inGame ? (
        <p className="text-white/75">Você está assistindo.</p>
      ) : done ? (
        <p className="text-white/80">Avaliação enviada! Aguardando os demais…</p>
      ) : (
        <>
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} estrelas`} onClick={() => (setStars(n), sfx.click())} className="p-1">
                <Star size={38} className={cn('transition', n <= stars ? 'fill-amber-300 text-amber-300' : 'text-white/40')} />
              </button>
            ))}
          </div>
          <div className="min-h-5 text-sm text-white/80">{STAR_LABEL[stars]}</div>
          <div className="grid gap-2 text-left">
            <div className="text-sm font-semibold text-white/80">Destaque criativo (opcional): toque no elo mais genial de um colega</div>
            <ChainTrail state={s} players={players} meId={meId} onPick={(i) => setCreative((c) => (c === i ? null : i))} picked={creative} />
          </div>
          <Button disabled={!stars} onClick={() => send({ type: 'RATE', stars, creative })}>
            {stars ? 'Enviar avaliação' : 'Dê de 1 a 5 estrelas'}
          </Button>
        </>
      )}
      <div className="text-sm text-white/75">
        {s.ratedIds.length}/{s.participants.length} avaliaram
      </div>
    </Card>
  );
}

import { useState } from 'react';
import { Crown, Hand, Hourglass, Lock, MessagesSquare, Sparkles, Vote } from 'lucide-react';
import type { GameMatchProps, Player } from '../../types/game.types';
import type { QmpState, QmpView } from './logic';
import { DEFAULT_DISCUSS_SECONDS, DEFAULT_VOTE_SECONDS, REVEAL_MS } from './logic';
import { Badge, Button, Card, cn } from '../../components/ui';
import { Avatar, nameOf } from '../../components/shared/PlayerBits';
import { PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { sfx } from '../../core/audio/sfx';

/**
 * Os 4 estados do jogador na rodada são visualmente distintos (ícone + cor + texto):
 *  discutindo (cinza) · pronto para votar (ciano, mão levantada) · escolhendo voto (âmbar, ampulheta) · votou (verde, cadeado).
 * "Pronto" NUNCA usa o mesmo ícone/cor de "votou", para ninguém achar que já votou.
 */
type PlayerStatus = 'discussing' | 'ready' | 'choosing' | 'voted';

const STATUS_UI: Record<PlayerStatus, { label: string; icon: typeof Hand; cls: string }> = {
  discussing: { label: 'Discutindo', icon: MessagesSquare, cls: 'border-white/15 bg-white/5 text-white/75' },
  ready: { label: 'Pronto p/ votar', icon: Hand, cls: 'border-arcade-cyan/60 bg-arcade-cyan/10 text-cyan-200' },
  choosing: { label: 'Escolhendo voto', icon: Hourglass, cls: 'border-amber-400/60 bg-amber-400/10 text-amber-200' },
  voted: { label: 'Já votou', icon: Lock, cls: 'border-arcade-green/60 bg-arcade-green/10 text-emerald-200' },
};

function statusOf(s: QmpState, id: string): PlayerStatus {
  if (s.phase === 'DISCUSSION') return (s.readyIds ?? []).includes(id) ? 'ready' : 'discussing';
  return s.votedIds.includes(id) ? 'voted' : 'choosing';
}

function StatusChip({ status }: { status: PlayerStatus }) {
  const ui = STATUS_UI[status];
  const Icon = ui.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold', ui.cls)}>
      <Icon size={12} aria-hidden /> {ui.label}
    </span>
  );
}

function StatusList({ s, roster }: { s: QmpState; roster: Player[] }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2" aria-label="Situação dos jogadores">
      {roster.map((p) => (
        <div key={p.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-white/[.03] px-2 py-1.5">
          <Avatar id={p.avatar} size={24} />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.nickname}</span>
          <StatusChip status={statusOf(s, p.id)} />
        </div>
      ))}
    </div>
  );
}

export default function QuemEMaisProvavel({ state: s, view, meId, players, config, send }: GameMatchProps<QmpState, QmpView>) {
  const [pending, setPending] = useState<string | null>(null);
  const inRound = s.participants.includes(meId);
  const myVote = view?.myVote ?? pending;
  const voted = s.votedIds.includes(meId) || Boolean(view?.myVote);
  const imReady = (s.readyIds ?? []).includes(meId);
  const voteMs = Number(config.voteTimeSeconds ?? DEFAULT_VOTE_SECONDS) * 1000;
  const discussMs = Number(config.discussTimeSeconds ?? DEFAULT_DISCUSS_SECONDS) * 1000;

  usePhaseEffect(`${s.round}:${s.phase}`, () => {
    setPending(null);
    if (s.phase === 'DISCUSSION') sfx.pop();
    if (s.phase === 'SECRET_VOTING') sfx.reveal();
    if (s.phase === 'SIMULTANEOUS_REVEAL') sfx.reveal();
  });

  const roster = s.participants.map((id) => players.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const maxVotes = Math.max(1, ...Object.values(s.received ?? {}));
  const readyCount = (s.readyIds ?? []).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Card className="flex flex-col gap-4 text-center" glow={s.phase === 'SECRET_VOTING' ? 'purple' : undefined}>
        <PhaseTitle kicker={`Pergunta ${s.round} de ${s.totalRounds}`} title={s.prompt} />
        {s.phase === 'DISCUSSION' && <TimerBar endsAt={s.endsAt} totalMs={discussMs} color="cyan" />}
        {s.phase === 'SECRET_VOTING' && <TimerBar endsAt={s.endsAt} totalMs={voteMs} color="purple" />}
      </Card>

      {s.phase === 'DISCUSSION' && (
        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5 font-bold text-cyan-200">
              <MessagesSquare size={16} /> Etapa de discussão — votação fechada
            </span>
            <Badge color="cyan">
              {readyCount}/{s.participants.length} prontos
            </Badge>
          </div>
          <p className="text-sm text-white/80">
            Acusem, defendam-se e argumentem. A votação abre sozinha quando todos estiverem prontos ou quando o tempo acabar.
          </p>
          {inRound ? (
            imReady ? (
              <div className="grid gap-2">
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-arcade-cyan/60 bg-arcade-cyan/10 p-3 text-center font-semibold text-cyan-100">
                  <Hand size={18} /> Você está pronto para votar — ainda NÃO votou. Aguardando os demais…
                </div>
                <Button variant="secondary" onClick={() => (send({ type: 'READY', ready: false }), sfx.click())}>
                  Quero continuar discutindo
                </Button>
              </div>
            ) : (
              <Button variant="cyan" icon={<Hand size={18} />} onClick={() => (send({ type: 'READY', ready: true }), sfx.click())}>
                Estou pronto para votar
              </Button>
            )
          ) : (
            <p className="text-center text-sm text-white/75">Você está assistindo.</p>
          )}
          <StatusList s={s} roster={roster} />
        </Card>
      )}

      {s.phase === 'SECRET_VOTING' && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm text-white/75">
            <span className="flex items-center gap-1.5">
              {voted ? (
                <>
                  <Lock size={14} className="text-arcade-green" /> Voto secreto registrado! Aguardando os demais…
                </>
              ) : inRound ? (
                <>
                  <Vote size={14} className="text-amber-300" /> Votação aberta: toque em quem você acha mais provável
                </>
              ) : (
                'Você está assistindo'
              )}
            </span>
            <Badge color="pink">
              {s.votedIds.length}/{s.participants.length} votaram
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {roster.map((p) => {
              const self = p.id === meId;
              const chosen = myVote === p.id;
              return (
                <button
                  key={p.id}
                  disabled={self || voted || !inRound}
                  onClick={() => {
                    setPending(p.id);
                    send({ type: 'VOTE', target: p.id });
                    sfx.click();
                  }}
                  className={cn(
                    'relative flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center transition',
                    chosen ? 'border-brand-pink bg-brand-pink/15' : 'border-line bg-white/[.03]',
                    self ? 'cursor-not-allowed opacity-50' : 'enabled:hover:border-brand-pink/60',
                    voted && !chosen && !self && 'opacity-60',
                  )}
                >
                  <Avatar id={p.avatar} size={36} />
                  <span className="w-full truncate text-sm font-semibold">{p.nickname}</span>
                  <StatusChip status={statusOf(s, p.id)} />
                  {self && <span className="text-[10px] text-white/80">Você (não pode votar em si mesmo)</span>}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {s.phase === 'SIMULTANEOUS_REVEAL' && s.received && (
        <>
          <Card className="flex flex-col items-center gap-3 text-center animate-pop" glow="purple">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-pink-300">
              <Sparkles size={16} /> Mais provável da rodada!
            </div>
            {s.winners && s.winners.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-4">
                {s.winners.map((id) => {
                  const p = players.find((x) => x.id === id);
                  return (
                    <div key={id} className="flex flex-col items-center gap-1">
                      <Crown className="text-amber-300" size={26} />
                      {p && <Avatar id={p.avatar} size={64} />}
                      <span className="font-display text-2xl font-bold">{nameOf(players, id)}</span>
                      <Badge color="pink">{s.received?.[id]} voto(s)</Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-white/75">Ninguém votou nesta rodada.</div>
            )}
            <TimerBar endsAt={s.endsAt} totalMs={REVEAL_MS} color="purple" />
          </Card>

          <Card className="flex flex-col gap-2">
            {[...roster]
              .sort((a, b) => (s.received?.[b.id] ?? 0) - (s.received?.[a.id] ?? 0))
              .map((p, i) => {
                const n = s.received?.[p.id] ?? 0;
                const voters = Object.entries(s.votes ?? {})
                  .filter(([, t]) => t === p.id)
                  .map(([v]) => players.find((x) => x.id === v));
                return (
                  <div key={p.id} className="animate-rise rounded-2xl border border-line bg-surface/70 p-2" style={{ animationDelay: `${i * 90}ms` }}>
                    <div className="flex items-center gap-2">
                      <Avatar id={p.avatar} size={28} />
                      <span className="flex-1 truncate text-sm font-semibold">{p.nickname}</span>
                      <span className="text-xs text-white/80">votou em {nameOf(players, s.votes?.[p.id]) || '—'}</span>
                      <Badge color={(s.pointsDelta[p.id] ?? 0) > 0 ? 'green' : 'gray'}>+{s.pointsDelta[p.id] ?? 0}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div className={cn('h-full rounded-full', s.winners?.includes(p.id) ? 'bg-brand-pink' : 'bg-white/30')} style={{ width: `${(n / maxVotes) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right font-display font-bold tabular-nums">{n}</span>
                    </div>
                    {voters.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {voters.map((v) => v && <Avatar key={v.id} id={v.avatar} size={20} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            <p className="pt-1 text-center text-xs text-white/70">+1 por voto recebido • +2 para quem votou no(s) mais votado(s)</p>
          </Card>
        </>
      )}
    </div>
  );
}

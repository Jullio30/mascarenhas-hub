import { useState } from 'react';
import { Fingerprint, Gavel, MessageSquare, Scale, Send, Skull, Trophy, UserCheck } from 'lucide-react';
import type { GameMatchProps, Player } from '../../types/game.types';
import type { InfState, InfView } from './logic';
import { IMPASSE_TEXT, CHECK_MS, CLUE_MS, DISCUSSION_MS, DISTRIBUTION_MS, ELIM_REVEAL_MS, GUESS_MS, NO_ELIM_MS, RESULT_MS, REVOTE_MS, TIEBREAK_MS, VOTE_MS } from './logic';
import { Badge, Button, Card, Input, cn } from '../../components/ui';
import { Avatar, PlayerChip, nameOf } from '../../components/shared/PlayerBits';
import { HoldToReveal, PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { sfx } from '../../core/audio/sfx';
import { usePrivateNotice } from '../_shared/notice';

function WordCard({ view }: { view: InfView | null }) {
  if (!view?.word) return <div className="py-6 text-white/80">Carregando sua palavra…</div>;
  return (
    <div className="flex flex-col items-center gap-2 py-2 text-center">
      <Badge color="green">Tema Geral: {view.category}</Badge>
      <div className="text-xs uppercase tracking-widest text-white/80">Sua Palavra Secreta</div>
      <div className="font-display text-4xl font-bold">{view.word}</div>
      <div className="max-w-xs text-xs text-amber-200/90">Aviso: você NÃO sabe se sua palavra é a da Maioria ou a do Infiltrado. Preste atenção nas dicas!</div>
    </div>
  );
}

function VoteGrid({ ids, players, meId, disabled, onVote, chosen, color = 'red' }: { ids: string[]; players: Player[]; meId: string; disabled: boolean; onVote: (id: string) => void; chosen: string | null; color?: 'red' | 'amber' }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {ids.map((id) => {
        const p = players.find((x) => x.id === id);
        const self = id === meId;
        return (
          <button
            key={id}
            disabled={disabled || self}
            onClick={() => onVote(id)}
            className={cn(
              'flex min-h-14 items-center gap-2 rounded-2xl border px-3 py-2 text-left font-semibold transition disabled:opacity-50',
              chosen === id ? (color === 'red' ? 'border-arcade-red bg-arcade-red/15' : 'border-arcade-amber bg-arcade-amber/15') : 'border-line bg-white/[.03]',
              color === 'red' ? 'enabled:hover:border-arcade-red' : 'enabled:hover:border-arcade-amber',
            )}
          >
            {p && <Avatar id={p.avatar} size={30} />}
            <span className="min-w-0">
              <span className="block truncate">{p?.nickname}</span>
              {self && <span className="block text-[10px] text-white/80">Você</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function Infiltrado({ state: s, view, meId, players, isHost, send }: GameMatchProps<InfState, InfView>) {
  const [clue, setClue] = useState('');
  const [guess, setGuess] = useState('');
  const [busy, setBusy] = useState(false);
  usePrivateNotice(view?.notice);
  const alive = s.participants.filter((id) => s.alive[id]);
  const amAlive = Boolean(s.alive[meId]);
  const active = s.order[s.clueIndex];
  const myVote = view?.myVote ?? null;

  usePhaseEffect(`${s.round}:${s.cycle}:${s.phase}:${s.clueIndex}`, () => {
    setBusy(false);
    if (s.phase === 'SECRET_WORD_DISTRIBUTION') sfx.reveal();
    if (s.phase === 'CLUE_ROUND' && s.order[s.clueIndex] === meId) sfx.pop();
    if (s.phase === 'ELIMINATION_REVEAL') sfx.buzzer();
    if (s.phase === 'MATCH_RESULT') (s.pointsDelta[meId] ?? 0) > 0 ? sfx.success() : sfx.error();
  });

  const act = (type: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    send({ type, ...extra });
    window.setTimeout(() => setBusy(false), 1200);
  };

  const cycles = [...new Set(s.clues.map((c) => c.cycle))];
  const ClueBoard = (
    <div className="grid gap-2">
      {s.participants.map((pid) => {
        const mine = s.clues.filter((c) => c.pid === pid);
        const dead = !s.alive[pid];
        const elim = s.eliminations.find((e) => e.pid === pid);
        return (
          <PlayerChip
            key={pid}
            compact
            player={players.find((p) => p.id === pid)}
            highlight={s.phase === 'CLUE_ROUND' && pid === active ? 'cyan' : dead ? (elim?.role === 'INFILTRADO' ? 'red' : undefined) : undefined}
            sub={dead ? `Eliminado no ciclo ${elim?.cycle} — ${elim?.role === 'INFILTRADO' ? 'era INFILTRADO' : 'era COMUM'}` : undefined}
            right={
              <div className="flex max-w-[60%] flex-wrap justify-end gap-1">
                {cycles.map((c) => {
                  const cl = mine.find((x) => x.cycle === c);
                  return (
                    <span key={c} className={cn('rounded-lg px-2 py-0.5 text-sm font-bold', cl?.skipped ? 'text-white/65' : 'bg-white/[.06]')}>
                      {cl ? cl.text : '—'}
                    </span>
                  );
                })}
              </div>
            }
          />
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge color="green">
          <Fingerprint size={12} /> {s.undercoverCount} infiltrado{s.undercoverCount > 1 ? 's' : ''} entre {s.participants.length}
        </Badge>
        <Badge color="gray">Tema: {s.category}</Badge>
        {s.quickMode && <Badge color="amber">Modo Rápido 3J</Badge>}
        {!amAlive && s.participants.includes(meId) && s.phase !== 'MATCH_RESULT' && <Badge color="red">Você foi eliminado — assistindo</Badge>}
      </div>

      {s.phase === 'SECRET_WORD_DISTRIBUTION' && (
        <Card className="flex flex-col gap-4" glow="green">
          <PhaseTitle kicker="Distribuição secreta" title="Descubra sua palavra" sub="Ninguém sabe o próprio papel. Não mostre sua tela!" />
          <HoldToReveal label="Segure para revelar sua Palavra Secreta">
            <WordCard view={view} />
          </HoldToReveal>
          <TimerBar endsAt={s.endsAt} totalMs={DISTRIBUTION_MS} />
        </Card>
      )}

      {s.phase === 'CLUE_ROUND' && (
        <Card className="flex flex-col gap-4" glow="cyan">
          <PhaseTitle kicker={`Ciclo ${s.cycle} — dicas`} title={active === meId ? 'Sua vez de dar uma dica!' : `Vez de ${nameOf(players, active)}`} sub="1 a 3 palavras, sem dizer a sua palavra" />
          {active === meId && s.clueMode === 'typed' && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!clue.trim()) return;
                act('CLUE', { text: clue });
                setClue('');
              }}
            >
              <Input value={clue} onChange={(e) => setClue(e.target.value)} maxLength={40} placeholder="Sua dica…" autoFocus autoComplete="off" />
              <Button type="submit" variant="cyan" disabled={busy || !clue.trim()} icon={<Send size={18} />}>
                Enviar
              </Button>
            </form>
          )}
          {active === meId && s.clueMode === 'spoken' && (
            <Button size="lg" variant="cyan" disabled={busy} onClick={() => act('CLUE')} icon={<MessageSquare />}>
              Dica dada (falei em voz alta)
            </Button>
          )}
          <TimerBar endsAt={s.endsAt} totalMs={CLUE_MS} />
          {ClueBoard}
        </Card>
      )}

      {s.phase === 'DISCUSSION' && (
        <Card className="flex flex-col gap-4" glow="purple">
          <PhaseTitle kicker={`Ciclo ${s.cycle} — discussão`} title="Quem está com a palavra diferente?" sub={`${s.readyIds.length}/${alive.length} prontos para votar (maioria inicia a votação)`} />
          <TimerBar endsAt={s.endsAt} totalMs={DISCUSSION_MS} color="purple" />
          {ClueBoard}
          <div className="grid gap-2 sm:grid-cols-2">
            {amAlive && (
              <Button variant="secondary" disabled={busy || s.readyIds.includes(meId)} onClick={() => act('READY')} icon={<UserCheck size={18} />}>
                {s.readyIds.includes(meId) ? 'Pronto!' : 'Estou pronto para votar'}
              </Button>
            )}
            {isHost && (
              <Button disabled={busy} onClick={() => act('GO_VOTE')} icon={<Gavel size={18} />}>
                Ir para Votação Agora
              </Button>
            )}
          </div>
        </Card>
      )}

      {s.phase === 'SECRET_VOTING' && (
        <Card className="flex flex-col gap-4" glow="red">
          <PhaseTitle kicker={`Ciclo ${s.cycle} — votação secreta`} title="Quem você quer eliminar?" sub={`${s.votedIds.length}/${alive.length} votaram`} />
          <TimerBar endsAt={s.endsAt} totalMs={VOTE_MS} color="red" />
          {amAlive ? (
            myVote ? (
              <p className="text-center text-white/75">Voto registrado em segredo: {nameOf(players, myVote)}</p>
            ) : (
              <VoteGrid ids={alive} players={players} meId={meId} disabled={busy} chosen={myVote} onVote={(id) => act('VOTE', { target: id })} />
            )
          ) : (
            <p className="text-center text-white/75">Eliminados não votam. Acompanhe!</p>
          )}
          {ClueBoard}
        </Card>
      )}

      {s.phase === 'TIE_DEFENSE_AND_REVOTE' && s.tied && (
        <Card className="flex flex-col gap-4" glow="red">
          <PhaseTitle kicker="Empate!" title="Defesa rápida e votação de desempate" sub="Os empatados podem se defender. Vote apenas entre eles." />
          <TimerBar endsAt={s.endsAt} totalMs={REVOTE_MS} color="red" />
          <div className="flex flex-wrap justify-center gap-2">
            {s.tied.map((id) => (
              <Badge key={id} color="amber">
                <Scale size={12} /> {nameOf(players, id)} ({s.lastTally?.[id] ?? 0} votos)
              </Badge>
            ))}
          </div>
          {s.tieVoters?.includes(meId) && amAlive ? (
            myVote ? (
              <p className="text-center text-white/75">Voto de desempate registrado.</p>
            ) : (
              <VoteGrid ids={s.tied} players={players} meId={meId} disabled={busy} chosen={myVote} color="amber" onVote={(id) => act('VOTE', { target: id })} />
            )
          ) : (
            <p className="text-center text-white/75">{amAlive ? 'Você está empatado: defenda-se enquanto os outros votam!' : 'Acompanhe o desempate.'}</p>
          )}
        </Card>
      )}

      {s.phase === 'HOST_TIEBREAK' && s.tied && (
        <Card className="flex flex-col gap-4" glow="red">
          <PhaseTitle
            kicker="Empate persistente pela 2ª vez"
            title={isHost ? 'Voto de minerva: você decide quem sai' : 'O anfitrião vai dar o voto de minerva…'}
            sub={s.maxCycles && s.cycle >= s.maxCycles ? 'Votação final: sem decisão, os Infiltrados escapam por falta de consenso.' : 'Sem decisão no tempo, ninguém é eliminado (sem sorteio) e o jogo segue.'}
          />
          <TimerBar endsAt={s.endsAt} totalMs={TIEBREAK_MS} color="red" />
          {isHost && <VoteGrid ids={s.tied} players={players} meId="" disabled={busy} chosen={null} onVote={(id) => act('TIEBREAK', { target: id })} />}
        </Card>
      )}

      {s.phase === 'NO_ELIMINATION' && (
        <Card className="flex flex-col items-center gap-3 text-center animate-pop">
          <Scale size={36} className="text-amber-300" />
          <div className="font-display text-2xl font-bold">{s.noElimReason === 'impasse' ? `${IMPASSE_TEXT}.` : 'Empate Persistente! Ninguém foi eliminado neste ciclo.'}</div>
          {s.noElimReason === 'impasse' && <p className="text-sm text-white/75">O voto de minerva não foi dado a tempo — ninguém é eliminado por sorteio. O jogo segue para o próximo ciclo.</p>}
          <TimerBar endsAt={s.endsAt} totalMs={NO_ELIM_MS} />
        </Card>
      )}

      {(s.phase === 'ELIMINATION_REVEAL' || s.phase === 'INFILTRADO_LAST_CHANCE_GUESS' || s.phase === 'VICTORY_CHECK') && s.eliminatedId && (
        <Card className="flex flex-col items-center gap-3 text-center animate-pop" glow={s.eliminatedRole === 'INFILTRADO' ? 'red' : 'purple'}>
          {players.find((p) => p.id === s.eliminatedId) && <Avatar id={players.find((p) => p.id === s.eliminatedId)!.avatar} size={64} />}
          <div className="font-display text-2xl font-bold">
            {nameOf(players, s.eliminatedId)} foi eliminado! Era {s.eliminatedRole === 'INFILTRADO' ? <span className="text-arcade-red">um INFILTRADO!</span> : <span className="text-violet-300">um JOGADOR COMUM!</span>}
          </div>
          {s.phase === 'ELIMINATION_REVEAL' && <TimerBar endsAt={s.endsAt} totalMs={ELIM_REVEAL_MS} />}
          {s.lastTally && (
            <div className="flex flex-wrap justify-center gap-1.5 text-xs text-white/75">
              {Object.entries(s.lastTally).map(([id, n]) => (
                <span key={id} className="rounded-full bg-white/5 px-2 py-0.5">
                  {nameOf(players, id)}: {n}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {s.phase === 'INFILTRADO_LAST_CHANCE_GUESS' && (
        <Card className="flex flex-col gap-4" glow="red">
          <PhaseTitle
            kicker="Última chance"
            title={s.eliminatedId === meId ? 'Você foi descoberto como Infiltrado!' : `${nameOf(players, s.eliminatedId)} tenta adivinhar a palavra da Maioria…`}
            sub={s.eliminatedId === meId ? 'Mas se você adivinhar agora qual é a Palavra Exata da Maioria, você rouba a vitória imediatamente!' : 'Se acertar, os Infiltrados vencem na hora.'}
          />
          <TimerBar endsAt={s.endsAt} totalMs={GUESS_MS} color="red" />
          {s.eliminatedId === meId && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!guess.trim()) return;
                act('GUESS', { text: guess });
              }}
            >
              <Input value={guess} onChange={(e) => setGuess(e.target.value)} maxLength={40} placeholder="Palavra da Maioria…" autoFocus autoComplete="off" />
              <Button type="submit" variant="danger" disabled={busy || !guess.trim()} icon={<Send size={18} />}>
                Chutar
              </Button>
            </form>
          )}
        </Card>
      )}

      {s.phase === 'VICTORY_CHECK' && (
        <Card className="flex flex-col items-center gap-2 text-center">
          {s.guessCorrect === false && <div className="font-display text-xl font-bold text-arcade-red">Palpite incorreto! O jogo continua…{s.guessText ? ` (chutou “${s.guessText}”)` : ''}</div>}
          <div className="text-white/75">Verificando condições de vitória…</div>
          <TimerBar endsAt={s.endsAt} totalMs={CHECK_MS} />
        </Card>
      )}

      {s.phase === 'MATCH_RESULT' && (
        <Card className="flex flex-col items-center gap-4 text-center animate-pop" glow={s.winner === 'COMUNS' ? 'green' : 'red'}>
          <Trophy size={40} className={s.winner === 'COMUNS' ? 'text-emerald-300' : 'text-arcade-red'} />
          <div className="font-display text-3xl font-bold">{s.winner === 'COMUNS' ? 'Vitória dos Jogadores Comuns!' : 'Vitória dos Infiltrados!'}</div>
          <div className="text-white/80">{s.winReason}</div>
          {s.guessCorrect && s.guessText && <div className="text-sm text-red-200">Chute certeiro: “{s.guessText}”</div>}
          <div className="grid w-full gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-arcade-green/40 bg-arcade-green/10 p-3">
              <div className="text-xs uppercase tracking-widest text-white/80">Palavra da Maioria</div>
              <div className="font-display text-2xl font-bold">{s.majorityWord}</div>
            </div>
            <div className="rounded-2xl border border-arcade-red/40 bg-arcade-red/10 p-3">
              <div className="text-xs uppercase tracking-widest text-white/80">Palavra do Infiltrado</div>
              <div className="font-display text-2xl font-bold">{s.undercoverWord}</div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {s.undercoverIds?.map((id) => (
              <Badge key={id} color="red">
                <Skull size={12} /> {nameOf(players, id)} era Infiltrado
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {Object.entries(s.pointsDelta).map(([id, pts]) => (
              <Badge key={id} color="green">
                {nameOf(players, id)} +{pts}
              </Badge>
            ))}
          </div>
          <TimerBar endsAt={s.endsAt} totalMs={RESULT_MS} />
        </Card>
      )}

      {s.phase !== 'SECRET_WORD_DISTRIBUTION' && s.phase !== 'MATCH_RESULT' && s.participants.includes(meId) && (
        <details className="rounded-2xl border border-line p-3 text-sm text-white/75">
          <summary className="cursor-pointer select-none font-semibold">Relembrar minha palavra</summary>
          <div className="mt-3">
            <HoldToReveal label="Segure para relembrar">
              <WordCard view={view} />
            </HoldToReveal>
          </div>
        </details>
      )}
    </div>
  );
}

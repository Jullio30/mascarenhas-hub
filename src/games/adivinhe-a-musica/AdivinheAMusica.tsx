import { useMemo, useState } from 'react';
import { CheckCircle2, Droplet, Music2, Send } from 'lucide-react';
import type { GameMatchProps } from '../../types/game.types';
import type { MusicState, MusicView } from './logic';
import { QUIZ_MS, ROUND_MS, STAGE_MS, STAGE_POINTS } from './logic';
import { DEFAULT_CATALOG } from '../../data/defaultPacks';
import { Badge, Button, Card, Input, cn } from '../../components/ui';
import { PlayerChip } from '../../components/shared/PlayerBits';
import { PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { useSyncTimer } from '../../hooks/useSyncTimer';
import { normalize } from '../../lib/textUtils';
import { sfx } from '../../core/audio/sfx';

const ALL_TITLES = Array.from(new Set(DEFAULT_CATALOG.songs.map((s) => s.title))).sort((a, b) => a.localeCompare(b));

export default function AdivinheAMusica(props: GameMatchProps<MusicState, MusicView>) {
  if (props.state.unavailable) return <UnavailableRound text={props.state.unavailable} isHost={props.isHost} />;
  if (props.state.mode === 'quiz') return <QuizRound {...props} />;
  return <SongRound {...props} />;
}

function SongRound({ state: s, meId, players, presence, send }: GameMatchProps<MusicState, MusicView>) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const mine = s.correct[meId];
  const inRound = s.participants.includes(meId);
  const att = s.attempts[meId];
  const used = att && att.stage === s.stage ? att.used : 0;
  const left = 2 - used;
  const stageRemaining = useSyncTimer(s.phase === 'ROUND_ACTIVE' ? s.startedAt + s.stage * STAGE_MS : null);

  usePhaseEffect(`${s.round}:${s.phase}:${s.stage}`, () => {
    if (s.phase === 'ROUND_ACTIVE') sfx.reveal();
    if (s.phase === 'ROUND_SUMMARY') sfx.buzzer();
  });
  usePhaseEffect(String(s.wrongAt[meId] ?? ''), () => sfx.error());
  usePhaseEffect(String(Boolean(mine)), () => mine && sfx.success());

  const suggestions = useMemo(() => {
    const q = normalize(text);
    if (q.length < 2) return [];
    return ALL_TITLES.filter((t) => normalize(t).includes(q)).slice(0, 6);
  }, [text]);

  const guess = (value: string) => {
    if (!value.trim() || left <= 0) return;
    send({ type: 'GUESS', text: value.trim() });
    setText('');
    setOpen(false);
  };

  const c = s.clues;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      {s.phase === 'ROUND_ACTIVE' && (
        <div className="grid grid-cols-4 gap-2">
          {STAGE_POINTS.map((p, i) => (
            <div key={i} className={cn('rounded-2xl border p-2 text-center transition', i + 1 === s.stage ? 'border-arcade-cyan bg-arcade-cyan/15 shadow-neon-cyan' : i + 1 < s.stage ? 'border-line opacity-50' : 'border-line')}>
              <div className="text-[10px] font-bold uppercase text-white/80">Estágio {i + 1}</div>
              <div className="font-display text-xl font-bold tabular-nums">{p} pts</div>
            </div>
          ))}
        </div>
      )}
      {s.phase === 'ROUND_ACTIVE' && (
        <div className="grid gap-1">
          <TimerBar endsAt={s.endsAt} totalMs={ROUND_MS} color="purple" />
          <div className="text-center text-xs text-white/80">Próxima dica em {Math.ceil(stageRemaining / 1000)}s</div>
        </div>
      )}

      <Card className="grid gap-3" glow={s.phase === 'ROUND_SUMMARY' ? 'green' : 'purple'}>
        {s.phase === 'ROUND_SUMMARY' && s.answer && (
          <div className="text-center animate-pop">
            <div className="text-xs uppercase tracking-widest text-white/80">A música era</div>
            <div className="font-display text-3xl font-bold text-arcade-green">{s.answer.title}</div>
            <div className="text-white/80">{s.answer.artist}</div>
          </div>
        )}
        {c.stage1 && (
          <Clue n={1} title="Época • Gênero • Dica">
            <div className="flex flex-wrap gap-2">
              <Badge color="amber">{c.stage1.era}</Badge>
              <Badge color="pink">{c.stage1.genre}</Badge>
            </div>
            <p className="mt-2 text-lg font-semibold">“{c.stage1.hint}”</p>
          </Clue>
        )}
        {c.stage2 && (
          <Clue n={2} title="Curiosidade">
            <p className="text-lg">{c.stage2}</p>
          </Clue>
        )}
        {c.stage3 && (
          <Clue n={3} title="Artista • Tema da letra">
            <p className="font-display text-2xl font-bold text-arcade-cyan">{c.stage3.artist}</p>
            <p className="text-white/80">{c.stage3.theme}</p>
          </Clue>
        )}
        {c.stage4 && s.phase === 'ROUND_ACTIVE' && (
          <Clue n={4} title="Múltipla escolha">
            <div className="grid gap-2 sm:grid-cols-2">
              {c.stage4.map((opt) => (
                <Button key={opt} variant="secondary" disabled={!inRound || Boolean(mine) || left <= 0} onClick={() => guess(opt)}>
                  {opt}
                </Button>
              ))}
            </div>
          </Clue>
        )}
      </Card>

      {s.phase === 'ROUND_ACTIVE' && inRound && (
        <Card className="grid gap-3">
          {mine ? (
            <div className="flex items-center justify-center gap-2 text-center text-lg font-bold text-arcade-green animate-pop">
              <CheckCircle2 /> Você acertou no Estágio {mine.stage}! +{mine.points} pts {mine.firstBlood && <Badge color="red">🩸 First Blood +3</Badge>}
            </div>
          ) : (
            <>
              <form
                key={s.wrongAt[meId] ?? 0}
                className={cn('relative flex gap-2', Boolean(s.wrongAt[meId]) && 'animate-shake')}
                onSubmit={(e) => {
                  e.preventDefault();
                  guess(text);
                }}
              >
                <div className="relative flex-1">
                  <Input
                    value={text}
                    onChange={(e) => (setText(e.target.value), setOpen(true))}
                    onFocus={() => setOpen(true)}
                    onBlur={() => window.setTimeout(() => setOpen(false), 150)}
                    placeholder="Nome da música…"
                    autoComplete="off"
                    disabled={left <= 0}
                  />
                  {open && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-line bg-surface2 shadow-xl">
                      {suggestions.map((t) => (
                        <button key={t} type="button" className="block min-h-12 w-full px-4 text-left hover:bg-white/10" onMouseDown={(e) => e.preventDefault()} onClick={() => guess(t)}>
                          <Music2 className="mr-2 inline" size={14} />“{t}”
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="submit" disabled={!text.trim() || left <= 0} icon={<Send size={18} />}>
                  Palpite
                </Button>
              </form>
              <div className="text-center text-xs text-white/80">{left > 0 ? `${left} palpite(s) restante(s) neste estágio` : 'Sem palpites neste estágio — aguarde a próxima dica!'}</div>
            </>
          )}
        </Card>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {s.participants.map((id) => {
          const ok = s.correct[id];
          return (
            <PlayerChip
              key={id}
              compact
              status={presence[id] ?? 'disconnected'}
              player={players.find((p) => p.id === id)}
              highlight={ok ? 'green' : undefined}
              right={
                ok ? (
                  <Badge color="green">
                    {s.firstBlood === id && <Droplet size={12} />} Acertou!{s.phase === 'ROUND_SUMMARY' ? ` +${ok.points}` : ''}
                  </Badge>
                ) : null
              }
            />
          );
        })}
      </div>
      {s.phase === 'ROUND_SUMMARY' && <PhaseTitle title="" sub="Próxima música em instantes…" />}
    </div>
  );
}

function Clue({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-4 animate-rise">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/70">
        Dica {n} • {title}
      </div>
      {children}
    </div>
  );
}

/** Nível 3 do fallback: a modalidade escolhida não tem desafio possível — aviso claro, sem trocar de modo. */
function UnavailableRound({ text, isHost }: { text: string; isHost: boolean }) {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <Card className="grid gap-3 text-center" glow="purple">
        <div className="flex justify-center">
          <Badge color="amber">
            <Music2 size={12} /> Modalidade indisponível
          </Badge>
        </div>
        <p className="text-lg font-semibold">{text}</p>
        <p className="text-sm text-white/75">{isHost ? 'Use “Encerrar” no topo da partida para voltar ao lobby.' : 'Aguarde o anfitrião encerrar a partida.'}</p>
      </Card>
    </div>
  );
}

/** Rodada de múltipla escolha (artista, informação, contexto, décadas, gêneros). */
function QuizRound({ state: s, view, meId, players, presence, send }: GameMatchProps<MusicState, MusicView>) {
  const [pending, setPending] = useState<number | null>(null);
  const q = s.quiz;
  const inRound = s.participants.includes(meId);
  const myPick = view?.myPick ?? pending;
  const answered = s.quizAnswered.includes(meId) || myPick !== null;
  const result = s.quizResult;

  usePhaseEffect(`${s.round}:${s.phase}`, () => {
    setPending(null);
    if (s.phase === 'ROUND_ACTIVE') sfx.reveal();
    if (s.phase === 'ROUND_SUMMARY') (s.correct[meId] ? sfx.success() : sfx.buzzer());
  });

  if (!q) return null;
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <Card className="grid gap-4 text-center" glow={s.phase === 'ROUND_SUMMARY' ? 'green' : 'purple'}>
        <div className="flex justify-center">
          <Badge color="pink">
            <Music2 size={12} /> {q.kindLabel}
          </Badge>
        </div>
        <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{q.question}</h2>
        {s.phase === 'ROUND_ACTIVE' && <TimerBar endsAt={s.endsAt} totalMs={QUIZ_MS} color="purple" />}
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((opt, i) => {
            const correct = result?.correctIndex === i;
            const mine = myPick === i;
            const pickers = result ? Object.entries(result.picks).filter(([, v]) => v === i).map(([id]) => players.find((p) => p.id === id)) : [];
            return (
              <button
                key={i}
                type="button"
                disabled={!inRound || answered || s.phase !== 'ROUND_ACTIVE'}
                onClick={() => {
                  setPending(i);
                  send({ type: 'QUIZ_ANSWER', index: i });
                  sfx.click();
                }}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-3 py-2 font-semibold transition',
                  result ? (correct ? 'border-arcade-green bg-arcade-green/15' : mine ? 'border-arcade-red bg-arcade-red/10' : 'border-line opacity-60') : mine ? 'border-brand-pink bg-brand-pink/15' : 'border-line bg-white/[.03] enabled:hover:border-brand-pink/60',
                )}
              >
                <span>{opt}</span>
                {pickers.length > 0 && (
                  <span className="flex flex-wrap justify-center gap-1 text-xs font-normal text-white/75">{pickers.map((p) => p?.nickname).join(', ')}</span>
                )}
              </button>
            );
          })}
        </div>
        {s.phase === 'ROUND_ACTIVE' && (
          <p className="text-sm text-white/75">{answered ? 'Resposta registrada! Aguardando os demais…' : inRound ? 'Escolha uma alternativa — quanto mais rápido, mais pontos.' : 'Você está assistindo.'}</p>
        )}
        {result && <p className="rounded-2xl bg-white/[.04] p-3 text-sm text-white/85 animate-rise">{result.note}</p>}
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        {s.participants.map((id) => {
          const ok = s.correct[id];
          return (
            <PlayerChip
              key={id}
              compact
              status={presence[id] ?? 'disconnected'}
              player={players.find((p) => p.id === id)}
              highlight={ok ? 'green' : undefined}
              right={
                s.phase === 'ROUND_SUMMARY' ? (
                  ok ? (
                    <Badge color="green">
                      {s.firstBlood === id && <Droplet size={12} />} +{ok.points}
                    </Badge>
                  ) : (
                    <Badge color="gray">0</Badge>
                  )
                ) : s.quizAnswered.includes(id) ? (
                  <Badge color="purple">respondeu</Badge>
                ) : null
              }
            />
          );
        })}
      </div>
      {s.phase === 'ROUND_SUMMARY' && <PhaseTitle title="" sub="Próxima rodada em instantes…" />}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { CheckCircle2, Droplet, Music2, Send } from 'lucide-react';
import type { GameMatchProps } from '../../types/game.types';
import type { MusicState } from './logic';
import { ROUND_MS, STAGE_MS, STAGE_POINTS } from './logic';
import { SONGS } from '../../data/defaultPacks';
import { Badge, Button, Card, Input, cn } from '../../components/ui';
import { PlayerChip } from '../../components/shared/PlayerBits';
import { PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { useSyncTimer } from '../../hooks/useSyncTimer';
import { normalize } from '../../lib/textUtils';
import { sfx } from '../../core/audio/sfx';

const ALL_TITLES = Array.from(new Set(SONGS.map((s) => s.title))).sort((a, b) => a.localeCompare(b));

export default function AdivinheAMusica({ state: s, meId, players, presence, send }: GameMatchProps<MusicState>) {
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
              <div className="text-[10px] font-bold uppercase text-white/70">Estágio {i + 1}</div>
              <div className="font-display text-xl font-bold tabular-nums">{p} pts</div>
            </div>
          ))}
        </div>
      )}
      {s.phase === 'ROUND_ACTIVE' && (
        <div className="grid gap-1">
          <TimerBar endsAt={s.endsAt} totalMs={ROUND_MS} color="purple" />
          <div className="text-center text-xs text-white/70">Próxima dica em {Math.ceil(stageRemaining / 1000)}s</div>
        </div>
      )}

      <Card className="grid gap-3" glow={s.phase === 'ROUND_SUMMARY' ? 'green' : 'purple'}>
        {s.phase === 'ROUND_SUMMARY' && s.answer && (
          <div className="text-center animate-pop">
            <div className="text-xs uppercase tracking-widest text-white/70">A música era</div>
            <div className="font-display text-3xl font-bold text-arcade-green">{s.answer.title}</div>
            <div className="text-white/70">{s.answer.artist}</div>
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
              <div className="text-center text-xs text-white/70">{left > 0 ? `${left} palpite(s) restante(s) neste estágio` : 'Sem palpites neste estágio — aguarde a próxima dica!'}</div>
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
      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/60">
        Dica {n} • {title}
      </div>
      {children}
    </div>
  );
}

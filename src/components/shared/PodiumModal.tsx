import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Crown, Home, Sparkles } from 'lucide-react';
import { useRoom } from '../../hooks/useRoom';
import { getGame } from '../../core/registry/gameRegistry';
import { sfx } from '../../core/audio/sfx';
import { Badge, Button, Card, cn } from '../ui';
import { Avatar } from './PlayerBits';
import { SessionScoreboard } from '../lobby/Lobby';

const HEIGHTS = ['h-40', 'h-28', 'h-20'];
const COLORS = ['from-amber-300 to-amber-500', 'from-slate-200 to-slate-400', 'from-orange-400 to-orange-700'];

export default function PodiumModal() {
  const { snapshot, isHost, send, meId } = useRoom();
  const podium = snapshot?.podium;

  useEffect(() => {
    if (!podium) return;
    sfx.win();
    const end = Date.now() + 1800;
    const colors = ['#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B'];
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [podium]);

  if (!snapshot || !podium) return null;
  const nameOf = (id: string) => snapshot.players.find((p) => p.id === id);
  const top = podium.entries.filter((e) => e.rank <= 3);
  // Exibição clássica: 2º, 1º, 3º
  const byRank = (r: number) => top.filter((e) => e.rank === r);
  const columns = [2, 1, 3].map((r) => ({ rank: r, entries: byRank(r) })).filter((c) => c.entries.length > 0);

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8">
      <div className="text-center">
        <Badge color="pink">
          <Sparkles size={12} /> {getGame(podium.game).title}
        </Badge>
        <h1 className="mt-2 font-display text-4xl font-bold">
          Pódio Oficial do <span className="brand-text">Mascarenhas Hub</span>
        </h1>
      </div>

      <div className="flex items-end justify-center gap-3 sm:gap-6">
        {columns.map(({ rank, entries }) => (
          <div key={rank} className="flex w-28 flex-col items-center gap-2 sm:w-40">
            <div className="flex flex-wrap justify-center gap-2">
              {entries.map((e) => {
                const p = nameOf(e.playerId);
                if (!p) return null;
                return (
                  <div key={e.playerId} className="flex flex-col items-center animate-pop">
                    {e.crown && <Crown className="text-amber-300 drop-shadow-[0_0_8px_#F59E0B]" />}
                    <Avatar id={p.avatar} size={rank === 1 ? 64 : 50} ring={rank === 1 ? '#F59E0B' : undefined} />
                    <div className={cn('mt-1 max-w-full truncate font-bold', e.playerId === meId && 'text-violet-300')}>{p.nickname}</div>
                    <div className="font-display text-sm tabular-nums text-white/70">{e.score} pts</div>
                  </div>
                );
              })}
            </div>
            <div className={cn('grid w-full place-items-center rounded-t-2xl bg-gradient-to-b font-display text-3xl font-bold text-obsidian', HEIGHTS[rank - 1], COLORS[rank - 1])}>{rank}º</div>
          </div>
        ))}
      </div>

      {podium.highlights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {podium.highlights.map((h) => {
            const p = nameOf(h.playerId);
            return (
              <Card key={h.title} className="flex items-center gap-3">
                {p && <Avatar id={p.avatar} size={42} />}
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-arcade-cyan">{h.title}</div>
                  <div className="font-bold">{p?.nickname}</div>
                  <div className="text-xs text-white/50">{h.detail}</div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <div className="grid gap-1.5">
          {podium.entries.map((e) => (
            <div key={e.playerId} className="flex items-center justify-between rounded-xl bg-white/[.03] px-3 py-2">
              <span>
                <b className="mr-2 text-white/40">{e.rank}º</b>
                {nameOf(e.playerId)?.nickname}
                {e.crown && ' 👑'}
              </span>
              <span className="font-display tabular-nums">{e.score} pts</span>
            </div>
          ))}
        </div>
      </Card>
      <SessionScoreboard />

      {isHost ? (
        <Button size="lg" onClick={() => send({ type: 'ROOM/BACK_TO_LOBBY' })} icon={<Home />}>
          Voltar ao lobby e escolher outro jogo
        </Button>
      ) : (
        <div className="text-center text-white/60">Aguardando o anfitrião voltar ao lobby…</div>
      )}
    </div>
  );
}

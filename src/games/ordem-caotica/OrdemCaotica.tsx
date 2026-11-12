import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Lock, Target } from 'lucide-react';
import type { GameMatchProps, Player } from '../../types/game.types';
import type { OcState, OcView } from './logic';
import { REVEAL_MS } from './logic';
import { Badge, Button, Card, cn } from '../../components/ui';
import { Avatar } from '../../components/shared/PlayerBits';
import { PhaseTitle, TimerBar } from '../../components/shared/SyncTimer';
import { usePhaseEffect } from '../../hooks/usePhaseEffect';
import { sfx } from '../../core/audio/sfx';

type Send = GameMatchProps<OcState>['send'];

/** Lista ordenável: arrastar (pointer events, mouse + toque), botões ▲/▼ e toque-para-trocar. */
function SortBoard({ s, view, meId, send, totalMs }: { s: OcState; view: OcView | null; meId: string; send: Send; totalMs: number }) {
  const initial = s.challenge.elements.map((e) => e.id);
  // a visão privada pode chegar atrasada com a ordem da rodada ANTERIOR: só aproveita se for deste desafio
  const sameItems = (ids: string[] | null | undefined): ids is string[] => Boolean(ids && ids.length === initial.length && initial.every((id) => ids.includes(id)));
  const [order, setOrder] = useState<string[]>(sameItems(view?.myOrder) ? view!.myOrder! : initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [lockedLocal, setLockedLocal] = useState(false);
  const locked = lockedLocal || Boolean(view?.locked) || s.lockedIds.includes(meId);
  const canPlay = s.participants.includes(meId) && !locked;
  const listRef = useRef<HTMLDivElement>(null);
  const draftTimer = useRef<number | null>(null);
  const byId = Object.fromEntries(s.challenge.elements.map((e) => [e.id, e]));
  // rede de segurança: se a ordem local não corresponde aos itens do desafio, recomeça da ordem original
  useEffect(() => {
    if (!sameItems(order)) setOrder(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.challenge.id]);
  const shown = sameItems(order) ? order : initial;

  // envia o rascunho (debounce) para o auto-envio no fim do tempo
  const update = (next: string[]) => {
    setOrder(next);
    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => send({ type: 'ORDER', ids: next, lock: false }), 450);
  };
  useEffect(() => () => void (draftTimer.current && window.clearTimeout(draftTimer.current)), []);

  const move = (id: string, to: number) => {
    const from = order.indexOf(id);
    if (from < 0 || to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, id);
    update(next);
    sfx.click();
  };

  const tap = (id: string) => {
    if (!canPlay) return;
    if (!selected) return setSelected(id);
    if (selected === id) return setSelected(null);
    const next = [...order];
    const a = next.indexOf(selected);
    const b = next.indexOf(id);
    [next[a], next[b]] = [next[b], next[a]];
    setSelected(null);
    update(next);
    sfx.pop();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot]') as HTMLElement | null;
    if (!el || !listRef.current?.contains(el)) return;
    const to = Number(el.dataset.slot);
    if (Number.isFinite(to) && order[to] !== dragging) move(dragging, to);
  };

  return (
    <Card className="flex flex-col gap-3" glow="cyan">
      <PhaseTitle kicker={`Desafio ${s.round} de ${s.totalRounds}`} title={s.challenge.title} sub={locked ? 'Ordem travada! Aguardando os demais…' : 'Arraste pela alça, use ▲▼ ou toque em dois itens para trocá-los.'} />
      <TimerBar endsAt={s.endsAt} totalMs={totalMs} />
      <div className="text-center text-xs font-bold uppercase tracking-widest text-cyan-300">{s.challenge.topSlotLabel}</div>
      <div ref={listRef} className="grid gap-2" onPointerMove={onPointerMove} onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)} onLostPointerCapture={() => setDragging(null)}>
        {shown.map((id, i) => {
          const el = byId[id];
          if (!el) return null;
          const isSel = selected === id;
          return (
            <div
              key={id}
              data-slot={i}
              className={cn(
                'flex items-center gap-2 rounded-2xl border bg-white/[.03] p-2 transition',
                isSel ? 'border-arcade-cyan shadow-neon-cyan' : 'border-line',
                dragging === id && 'scale-[1.02] border-arcade-cyan/70 bg-arcade-cyan/10',
                locked && 'opacity-80',
              )}
            >
              <span className="w-8 shrink-0 text-center font-display text-lg font-bold text-white/80">{i + 1}º</span>
              <button
                type="button"
                aria-label="Arrastar"
                disabled={!canPlay}
                className="grid h-10 w-8 shrink-0 cursor-grab place-items-center rounded-lg text-white/70 hover:text-white disabled:cursor-default"
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => {
                  if (!canPlay) return;
                  e.preventDefault();
                  // captura o ponteiro: soltar fora da lista também encerra o arrasto (evita arrasto "preso" no mouse)
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  setSelected(null);
                  setDragging(id);
                }}
              >
                <GripVertical size={18} />
              </button>
              <button type="button" disabled={!canPlay} onClick={() => tap(id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                {el.imageUrl && <img src={el.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-white/5 object-contain" loading="lazy" />}
                <span className="min-w-0">
                  <span className="block font-semibold leading-tight">{el.label}</span>
                  {isSel ? <span className="block text-[11px] text-cyan-300">Selecionado — toque em outro item para trocar</span> : el.subtitle && <span className="block truncate text-xs text-white/65">{el.subtitle}</span>}
                </span>
              </button>
              <div className="flex shrink-0 flex-col">
                <button type="button" aria-label="Subir" disabled={!canPlay || i === 0} onClick={() => move(id, i - 1)} className="grid h-7 w-9 place-items-center rounded-lg text-white/80 hover:bg-white/10 disabled:opacity-25">
                  <ChevronUp size={18} />
                </button>
                <button type="button" aria-label="Descer" disabled={!canPlay || i === shown.length - 1} onClick={() => move(id, i + 1)} className="grid h-7 w-9 place-items-center rounded-lg text-white/80 hover:bg-white/10 disabled:opacity-25">
                  <ChevronDown size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-center text-xs font-bold uppercase tracking-widest text-cyan-300">{s.challenge.bottomSlotLabel}</div>
      {s.participants.includes(meId) && (
        <Button
          size="lg"
          variant="cyan"
          disabled={locked}
          onClick={() => {
            setLockedLocal(true);
            if (draftTimer.current) window.clearTimeout(draftTimer.current);
            send({ type: 'ORDER', ids: order, lock: true });
            sfx.success();
          }}
          icon={<Lock size={18} />}
        >
          {locked ? 'Ordem confirmada' : 'Confirmar Ordem'}
        </Button>
      )}
      <div className="text-center text-xs text-white/70">
        {s.lockedIds.length}/{s.participants.length} confirmaram • sem confirmar, vale a ordem que estiver na sua tela
      </div>
    </Card>
  );
}

function Reveal({ s, players, meId }: { s: OcState; players: Player[]; meId: string }) {
  const correct = s.correctOrderIds ?? [];
  const byId = Object.fromEntries(s.challenge.elements.map((e) => [e.id, e]));
  const mine = s.results?.[meId];
  const ranking = Object.entries(s.results ?? {}).sort((a, b) => b[1].total - a[1].total);
  const badge = (pts: number) =>
    pts === 100 ? <Badge color="green">🎯 Posição exata +100</Badge> : pts === 50 ? <Badge color="amber">↕️ Deslocado 1 +50</Badge> : <Badge color="gray">❌ 2+ posições 0</Badge>;
  return (
    <>
      <Card className="flex flex-col gap-3" glow="green">
        <PhaseTitle kicker="Ordem oficial verificada" title={s.challenge.title} />
        <TimerBar endsAt={s.endsAt} totalMs={REVEAL_MS} />
        <div className="grid gap-2">
          {correct.map((id, i) => (
            <div key={id} className="flex animate-rise items-center gap-2 rounded-2xl border border-arcade-green/30 bg-arcade-green/10 p-2" style={{ animationDelay: `${i * 110}ms` }}>
              <span className="w-8 text-center font-display text-lg font-bold text-emerald-300">{i + 1}º</span>
              {byId[id]?.imageUrl && <img src={byId[id].imageUrl} alt="" className="h-9 w-9 rounded-lg object-contain" />}
              <span className="min-w-0 flex-1 font-semibold leading-tight">{byId[id]?.label}</span>
              <span className="shrink-0 font-display font-bold tabular-nums text-emerald-200">{s.values?.[id]}</span>
            </div>
          ))}
        </div>
        {s.explanation && <p className="text-sm text-white/80">{s.explanation}</p>}
        {s.source && <p className="text-xs text-white/70">Fonte: {s.source}</p>}
      </Card>

      {mine && (
        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-bold">Sua precisão</span>
            <Badge color="cyan">
              <Target size={12} /> +{mine.total} pts{mine.auto ? ' (envio automático)' : ''}
            </Badge>
          </div>
          {mine.order.map((id, i) => (
            <div key={id} className="flex items-center gap-2 rounded-xl bg-white/[.03] px-2 py-1.5 text-sm">
              <span className="w-7 text-center font-bold text-white/80">{i + 1}º</span>
              <span className="min-w-0 flex-1 truncate">{byId[id]?.label}</span>
              {badge(mine.points[id] ?? 0)}
            </div>
          ))}
        </Card>
      )}

      <Card className="flex flex-col gap-1.5">
        <div className="mb-1 font-display font-bold">Resultado da rodada</div>
        {ranking.map(([pid, r]) => {
          const p = players.find((x) => x.id === pid);
          return (
            <div key={pid} className="flex items-center gap-2 rounded-xl bg-white/[.03] px-2 py-1.5 text-sm">
              {p && <Avatar id={p.avatar} size={24} />}
              <span className="flex-1 truncate font-semibold">{p?.nickname ?? '—'}</span>
              <span className="text-xs text-white/70">{Object.values(r.points).filter((x) => x === 100).length} exatos</span>
              <span className="w-14 text-right font-display font-bold tabular-nums">+{r.total}</span>
            </div>
          );
        })}
      </Card>
    </>
  );
}

export default function OrdemCaotica({ state: s, view, meId, players, config, send }: GameMatchProps<OcState, OcView>) {
  const totalMs = Number(config.timeSeconds ?? 40) * 1000;
  usePhaseEffect(`${s.round}:${s.phase}`, () => {
    if (s.phase === 'CHALLENGE_ACTIVE') sfx.pop();
    if (s.phase === 'REVEAL_AND_PRECISION') sfx.reveal();
  });
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {s.phase === 'CHALLENGE_ACTIVE' && <SortBoard key={`${s.round}:${s.challenge.id}`} s={s} view={view} meId={meId} send={send} totalMs={totalMs} />}
      {s.phase === 'REVEAL_AND_PRECISION' && <Reveal s={s} players={players} meId={meId} />}
    </div>
  );
}

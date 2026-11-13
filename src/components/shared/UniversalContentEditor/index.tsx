import { useEffect, useMemo, useState } from 'react';
import { FilePlus2, Library, Pencil, Save, Trash2 } from 'lucide-react';
import type { GameSlug } from '../../../types/game.types';
import { REGISTERED_GAMES } from '../../../core/registry/gameRegistry';
import {
  CONTENT_GAMES,
  deletePack,
  formatFor,
  packToText,
  parseBlock,
  savePack,
  syncPacksFromCloud,
  useCustomPacks,
  type CustomPack,
} from '../../../core/contentPacks/contentPackManager';
import { useHubStore } from '../../../store/useHubStore';
import { Badge, Button, Input, Modal, SectionTitle, cn } from '../../ui';
import { ConfirmButton } from '../ConfirmButton';

const titleOf = (slug: GameSlug) => REGISTERED_GAMES.find((g) => g.slug === slug)?.title ?? slug;

interface Draft {
  id?: string;
  name: string;
  game: GameSlug;
  theme: string;
  text: string;
}

const emptyDraft = (game: GameSlug): Draft => ({ name: '', game, theme: '', text: '' });

/**
 * Editor Universal de Conteúdo Personalizado.
 * Entrada em bloco (1 item por linha) com parser adaptado ao jogo alvo; criar, editar e excluir pacotes.
 */
export default function UniversalContentEditor({ open, onClose, initialGame }: { open: boolean; onClose: () => void; initialGame?: GameSlug }) {
  const packs = useCustomPacks();
  const toast = useHubStore((s) => s.toast);
  const startGame = initialGame && CONTENT_GAMES.includes(initialGame) ? initialGame : CONTENT_GAMES[0];
  const [filter, setFilter] = useState<GameSlug | 'all'>(startGame);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [cloud, setCloud] = useState<'synced' | 'local-only' | null>(null);

  useEffect(() => {
    if (!open) return;
    setFilter(startGame);
    setDraft(null);
    void syncPacksFromCloud().then(setCloud);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const parsed = useMemo(() => (draft ? parseBlock(draft.game, draft.text) : null), [draft]);
  const visible = packs.filter((p) => filter === 'all' || p.game === filter).sort((a, b) => b.updatedAt - a.updatedAt);
  const fmt = draft ? formatFor(draft.game) : null;

  const edit = (p: CustomPack) => setDraft({ id: p.id, name: p.name, game: p.game, theme: p.theme, text: packToText(p) });

  const save = () => {
    if (!draft || !parsed) return;
    if (!draft.name.trim()) return toast('Dê um nome ao pacote', 'error');
    if (parsed.valid.length === 0) return toast('Nenhum item válido no bloco de texto', 'error');
    const saved = savePack(draft);
    toast(`Pacote “${saved.name}” salvo com ${saved.lines.length} itens`, 'success');
    setFilter(saved.game);
    setDraft(null);
  };

  return (
    <Modal open={open} onClose={onClose} title={<span className="inline-flex items-center gap-2"><Library size={20} /> Meus Pacotes de Conteúdo</span>} wide>
      {!draft ? (
        <div className="grid gap-4">
          <p className="text-sm text-white/80">
            Crie listas próprias de perguntas, temas e palavras para os jogos. Os pacotes ficam salvos neste dispositivo
            {cloud === 'synced' ? ' e sincronizados na sua conta' : ''} e o anfitrião escolhe no lobby quais usar.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid flex-1 gap-1 text-sm font-semibold text-white/80">
              Jogo
              <select className="min-h-12 rounded-2xl border border-line bg-obsidian/70 px-3 text-base text-white" value={filter} onChange={(e) => setFilter(e.target.value as GameSlug | 'all')}>
                <option value="all">Todos os jogos</option>
                {CONTENT_GAMES.map((g) => (
                  <option key={g} value={g}>
                    {titleOf(g)}
                  </option>
                ))}
              </select>
            </label>
            <Button icon={<FilePlus2 size={18} />} onClick={() => setDraft(emptyDraft(filter === 'all' ? startGame : filter))}>
              Novo pacote
            </Button>
          </div>
          <div className="grid gap-2">
            {visible.length === 0 && <div className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-white/70">Nenhum pacote ainda. Crie o primeiro!</div>}
            {visible.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface/70 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="truncate text-xs text-white/75">
                    {titleOf(p.game)} {p.theme && `• ${p.theme}`} • {p.lines.length} itens
                  </div>
                </div>
                <Button size="sm" variant="secondary" icon={<Pencil size={16} />} onClick={() => edit(p)}>
                  Editar
                </Button>
                <ConfirmButton size="sm" variant="ghost" confirmLabel="Excluir?" onConfirm={() => (deletePack(p.id), toast('Pacote excluído', 'info'))} aria-label="Excluir pacote">
                  <Trash2 size={16} />
                </ConfirmButton>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-white/80">
              Nome do pacote
              <Input value={draft.name} maxLength={40} placeholder="Ex.: Perguntas da firma" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-white/80">
              Jogo alvo
              <select
                className="min-h-12 rounded-2xl border border-line bg-obsidian/70 px-3 text-base text-white disabled:opacity-60"
                value={draft.game}
                disabled={Boolean(draft.id)}
                onChange={(e) => setDraft({ ...draft, game: e.target.value as GameSlug })}
              >
                {CONTENT_GAMES.map((g) => (
                  <option key={g} value={g}>
                    {titleOf(g)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-semibold text-white/80">
            Tema / categoria (opcional)
            <Input value={draft.theme} maxLength={40} placeholder="Ex.: Pokémon, Firma, Família…" onChange={(e) => setDraft({ ...draft, theme: e.target.value })} />
          </label>
          <div className="grid gap-1">
            <SectionTitle right={parsed && <Badge color={parsed.valid.length ? 'green' : 'gray'}>{parsed.valid.length} itens válidos identificados neste bloco</Badge>}>Itens (1 por linha)</SectionTitle>
            <p className="text-xs text-white/75">{fmt?.hint}</p>
            <textarea
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              placeholder={fmt?.placeholder}
              rows={12}
              spellCheck
              className="min-h-56 w-full resize-y rounded-2xl border border-line bg-obsidian/70 p-3 font-mono text-sm leading-relaxed text-white outline-none placeholder:text-white/45 focus:border-brand-purple"
            />
            {parsed && (parsed.duplicates > 0 || parsed.invalid.length > 0) && (
              <div className="grid gap-1 text-xs">
                {parsed.duplicates > 0 && <span className="text-amber-300">{parsed.duplicates} linha(s) duplicada(s) serão ignoradas.</span>}
                {parsed.invalid.slice(0, 5).map((l) => (
                  <span key={l.line} className="text-red-300">
                    Linha {l.line} ignorada: {l.reason}
                  </span>
                ))}
                {parsed.invalid.length > 5 && <span className="text-red-300">…e mais {parsed.invalid.length - 5} linha(s) inválida(s).</span>}
              </div>
            )}
          </div>
          <div className={cn('grid gap-2', 'grid-cols-2')}>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button icon={<Save size={18} />} onClick={save} disabled={!parsed?.valid.length}>
              Salvar pacote
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

-- Mascarenhas Hub — migração v3 (OPCIONAL e NÃO destrutiva)
-- Sincroniza os pacotes do Editor Universal de Conteúdo entre dispositivos/sessões do mesmo usuário.
-- Sem esta tabela o app funciona normalmente: os pacotes ficam no localStorage
-- (`mascarenhas_hub_custom_packs_v1`) e a sincronização é desativada em silêncio.
-- Não apaga, renomeia nem altera nenhuma tabela existente.

create table if not exists public.custom_packs (
  id          uuid primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create index if not exists custom_packs_owner_idx on public.custom_packs (owner_id);

alter table public.custom_packs enable row level security;

-- Cada usuário (inclusive anônimo) só enxerga e altera os próprios pacotes.
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'custom_packs' and policyname = 'custom_packs_owner_select') then
    create policy custom_packs_owner_select on public.custom_packs for select using (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'custom_packs' and policyname = 'custom_packs_owner_insert') then
    create policy custom_packs_owner_insert on public.custom_packs for insert with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'custom_packs' and policyname = 'custom_packs_owner_update') then
    create policy custom_packs_owner_update on public.custom_packs for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'custom_packs' and policyname = 'custom_packs_owner_delete') then
    create policy custom_packs_owner_delete on public.custom_packs for delete using (owner_id = auth.uid());
  end if;
end $$;

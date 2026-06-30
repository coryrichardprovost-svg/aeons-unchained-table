create table if not exists public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  category text not null default 'Lore',
  name text not null default 'New Knowledge Entry',
  entry_type text not null default '',
  image_url text not null default '',
  summary text not null default '',
  details text not null default '',
  location_id uuid references public.world_locations(id) on delete set null,
  environment text not null default '',
  rarity text not null default '',
  visibility text not null default 'chronicler' check (visibility in ('chronicler', 'hinted', 'discovered', 'players')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists knowledge_entries_set_updated_at on public.knowledge_entries;
create trigger knowledge_entries_set_updated_at
before update on public.knowledge_entries
for each row execute function public.set_updated_at();

alter table public.knowledge_entries enable row level security;

grant select, insert, update, delete on public.knowledge_entries to authenticated;

drop policy if exists "authenticated users can manage knowledge entries" on public.knowledge_entries;
create policy "authenticated users can manage knowledge entries"
on public.knowledge_entries
for all
to authenticated
using (true)
with check (true);

notify pgrst, 'reload schema';

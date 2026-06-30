create table if not exists public.knowledge_categories (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  category_kind text not null default 'generic' check (category_kind in ('bestiary', 'generic')),
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

alter table public.knowledge_entries
add column if not exists category_id uuid references public.knowledge_categories(id) on delete set null;

drop trigger if exists knowledge_categories_set_updated_at on public.knowledge_categories;
create trigger knowledge_categories_set_updated_at
before update on public.knowledge_categories
for each row execute function public.set_updated_at();

alter table public.knowledge_categories enable row level security;

grant select, insert, update, delete on public.knowledge_categories to authenticated;

drop policy if exists "authenticated users can manage knowledge categories" on public.knowledge_categories;
create policy "authenticated users can manage knowledge categories"
on public.knowledge_categories
for all
to authenticated
using (true)
with check (true);

insert into public.knowledge_categories (name, category_kind, sort_order)
values
  ('Bestiary', 'bestiary', 10),
  ('Fauna', 'generic', 20),
  ('Flora', 'generic', 30),
  ('Enemies', 'generic', 40),
  ('Factions', 'generic', 50),
  ('History', 'generic', 60),
  ('Cultures', 'generic', 70),
  ('Magic', 'generic', 80),
  ('Artifacts', 'generic', 90),
  ('Materials', 'generic', 100),
  ('Secrets', 'generic', 110)
on conflict (name) do nothing;

update public.knowledge_entries
set category_id = knowledge_categories.id
from public.knowledge_categories
where knowledge_entries.category_id is null
  and knowledge_entries.category = knowledge_categories.name;

notify pgrst, 'reload schema';

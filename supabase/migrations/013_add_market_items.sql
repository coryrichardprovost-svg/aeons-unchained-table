create table if not exists public.item_types (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  name text not null unique,
  columns jsonb not null default '["name", "description", "value", "weight"]'::jsonb,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  item_type_id uuid not null references public.item_types(id) on delete cascade,
  name text not null default 'New Item',
  description text not null default '',
  value text not null default '',
  weight text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.item_types (name, columns, is_default, sort_order)
values
  ('Consumables', '["name", "description", "effect", "value", "weight"]'::jsonb, true, 10),
  ('Armor', '["name", "description", "defense", "protection", "resistance", "value", "weight"]'::jsonb, true, 20),
  ('Arsenal', '["name", "description", "range", "attack", "penetration", "value", "weight"]'::jsonb, true, 30),
  ('Accessories', '["name", "description", "protection", "defense", "resistance", "value", "weight"]'::jsonb, true, 40),
  ('Miscellaneous', '["name", "description", "value", "weight"]'::jsonb, true, 50)
on conflict do nothing;

drop trigger if exists item_types_set_updated_at on public.item_types;
create trigger item_types_set_updated_at
before update on public.item_types
for each row execute function public.set_updated_at();

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

alter table public.item_types enable row level security;
alter table public.items enable row level security;

grant select on public.item_types to authenticated;
grant insert, update, delete on public.item_types to authenticated;
grant select on public.items to authenticated;
grant insert, update, delete on public.items to authenticated;

drop policy if exists "authenticated users can read item types" on public.item_types;
create policy "authenticated users can read item types"
on public.item_types for select
to authenticated
using (true);

drop policy if exists "chroniclers can create item types" on public.item_types;
create policy "chroniclers can create item types"
on public.item_types for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
);

drop policy if exists "chroniclers can update item types" on public.item_types;
create policy "chroniclers can update item types"
on public.item_types for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
)
with check (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
);

drop policy if exists "chroniclers can delete item types" on public.item_types;
create policy "chroniclers can delete item types"
on public.item_types for delete
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
);

drop policy if exists "authenticated users can read items" on public.items;
create policy "authenticated users can read items"
on public.items for select
to authenticated
using (true);

drop policy if exists "chroniclers can create items" on public.items;
create policy "chroniclers can create items"
on public.items for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
);

drop policy if exists "chroniclers can update items" on public.items;
create policy "chroniclers can update items"
on public.items for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
)
with check (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
);

drop policy if exists "chroniclers can delete items" on public.items;
create policy "chroniclers can delete items"
on public.items for delete
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
);

notify pgrst, 'reload schema';

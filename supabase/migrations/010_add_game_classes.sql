create table if not exists public.game_classes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  name text not null default 'New Class',
  description text not null default '',
  attribute_bonuses jsonb not null default '{
    "str": "",
    "spd": "",
    "int": "",
    "cha": "",
    "con": "",
    "dex": "",
    "wis": "",
    "fth": ""
  }'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  abilities jsonb not null default '[]'::jsonb,
  subclasses jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists game_classes_set_updated_at on public.game_classes;
create trigger game_classes_set_updated_at
before update on public.game_classes
for each row execute function public.set_updated_at();

alter table public.game_classes enable row level security;

grant select on public.game_classes to authenticated;
grant insert, update, delete on public.game_classes to authenticated;

drop policy if exists "authenticated users can read game classes" on public.game_classes;
create policy "authenticated users can read game classes"
on public.game_classes for select
to authenticated
using (true);

drop policy if exists "chroniclers can create game classes" on public.game_classes;
create policy "chroniclers can create game classes"
on public.game_classes for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
);

drop policy if exists "chroniclers can update game classes" on public.game_classes;
create policy "chroniclers can update game classes"
on public.game_classes for update
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

drop policy if exists "chroniclers can delete game classes" on public.game_classes;
create policy "chroniclers can delete game classes"
on public.game_classes for delete
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

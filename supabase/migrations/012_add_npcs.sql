create table if not exists public.npcs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  name text not null default 'New NPC',
  age text not null default '',
  sex text not null default '',
  class_name text not null default '',
  level integer not null default 1 check (level >= 0),
  personality_type text not null default '',
  description text not null default '',
  image_url text not null default '',
  location_id uuid references public.world_locations(id) on delete set null,
  faction text not null default '',
  organization text not null default '',
  status jsonb not null default '{
    "health": { "current": "", "max": "" },
    "stamina": { "current": "", "max": "" },
    "mind": { "current": "", "max": "" },
    "divinity": { "current": "", "max": "" }
  }'::jsonb,
  attributes jsonb not null default '{
    "str": "10",
    "spd": "10",
    "int": "10",
    "cha": "10",
    "con": "10",
    "dex": "10",
    "wis": "10",
    "fth": "10"
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists npcs_set_updated_at on public.npcs;
create trigger npcs_set_updated_at
before update on public.npcs
for each row execute function public.set_updated_at();

alter table public.npcs enable row level security;

grant select on public.npcs to authenticated;
grant insert, update, delete on public.npcs to authenticated;

drop policy if exists "authenticated users can read npcs" on public.npcs;
create policy "authenticated users can read npcs"
on public.npcs for select
to authenticated
using (true);

drop policy if exists "chroniclers can create npcs" on public.npcs;
create policy "chroniclers can create npcs"
on public.npcs for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
);

drop policy if exists "chroniclers can update npcs" on public.npcs;
create policy "chroniclers can update npcs"
on public.npcs for update
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

drop policy if exists "chroniclers can delete npcs" on public.npcs;
create policy "chroniclers can delete npcs"
on public.npcs for delete
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

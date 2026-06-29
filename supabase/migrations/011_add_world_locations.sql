create table if not exists public.world_locations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  parent_location_id uuid references public.world_locations(id) on delete set null,
  name text not null default 'New Location',
  location_type text not null default 'Point of Interest',
  public_description text not null default '',
  chronicler_notes text not null default '',
  factions text not null default '',
  npcs text not null default '',
  quests text not null default '',
  resources text not null default '',
  visibility text not null default 'chronicler' check (visibility in ('chronicler', 'players')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists world_locations_set_updated_at on public.world_locations;
create trigger world_locations_set_updated_at
before update on public.world_locations
for each row execute function public.set_updated_at();

alter table public.world_locations enable row level security;

grant select on public.world_locations to authenticated;
grant insert, update, delete on public.world_locations to authenticated;

drop policy if exists "authenticated users can read world locations" on public.world_locations;
create policy "authenticated users can read world locations"
on public.world_locations for select
to authenticated
using (true);

drop policy if exists "chroniclers can create world locations" on public.world_locations;
create policy "chroniclers can create world locations"
on public.world_locations for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
);

drop policy if exists "chroniclers can update world locations" on public.world_locations;
create policy "chroniclers can update world locations"
on public.world_locations for update
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

drop policy if exists "chroniclers can delete world locations" on public.world_locations;
create policy "chroniclers can delete world locations"
on public.world_locations for delete
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

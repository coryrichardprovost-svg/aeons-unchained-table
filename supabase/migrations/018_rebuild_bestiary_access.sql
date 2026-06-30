create table if not exists public.bestiary_creatures (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  name text not null default 'New Creature',
  creature_type text not null default '',
  image_url text not null default '',
  description text not null default '',
  origin_location_id uuid references public.world_locations(id) on delete set null,
  strengths text not null default '',
  weaknesses text not null default '',
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
  visibility text not null default 'chronicler' check (visibility in ('chronicler', 'players')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists bestiary_creatures_set_updated_at on public.bestiary_creatures;
create trigger bestiary_creatures_set_updated_at
before update on public.bestiary_creatures
for each row execute function public.set_updated_at();

alter table public.bestiary_creatures enable row level security;

grant select, insert, update, delete on public.bestiary_creatures to authenticated;

drop policy if exists "authenticated users can read bestiary creatures" on public.bestiary_creatures;
drop policy if exists "authenticated users can manage bestiary creatures" on public.bestiary_creatures;
drop policy if exists "chroniclers can create bestiary creatures" on public.bestiary_creatures;
drop policy if exists "chroniclers can update bestiary creatures" on public.bestiary_creatures;
drop policy if exists "chroniclers can delete bestiary creatures" on public.bestiary_creatures;

create policy "authenticated users can manage bestiary creatures"
on public.bestiary_creatures
for all
to authenticated
using (true)
with check (true);

notify pgrst, 'reload schema';

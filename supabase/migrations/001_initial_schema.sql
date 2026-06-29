-- Aeons Unchained Table initial Supabase schema.
-- Run this in Supabase SQL Editor after creating your project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('trailblazer', 'chronicler')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  dm_user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'recruiting', 'active', 'archived')),
  premise text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  name text not null,
  class_name text not null default 'Unchosen Class',
  level integer not null default 1 check (level >= 1),
  ancestry text not null default '',
  background text not null default '',
  resolve_current integer not null default 10 check (resolve_current >= 0),
  resolve_max integer not null default 10 check (resolve_max >= 0),
  wounds integer not null default 0 check (wounds >= 0),
  notes text not null default '',
  sheet_data jsonb not null default '{}'::jsonb,
  attributes jsonb not null default '{
    "str": 10,
    "spd": 10,
    "int": 10,
    "cha": 10,
    "con": 10,
    "dex": 10,
    "wis": 10,
    "fth": 10
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.campaign_invites (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  invited_by_user_id uuid not null references public.profiles(id) on delete cascade,
  invited_username text not null,
  invited_user_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create table if not exists public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  role text not null check (role in ('chronicler', 'trailblazer', 'observer')),
  created_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

drop trigger if exists characters_set_updated_at on public.characters;
create trigger characters_set_updated_at
before update on public.characters
for each row execute function public.set_updated_at();

drop trigger if exists game_classes_set_updated_at on public.game_classes;
create trigger game_classes_set_updated_at
before update on public.game_classes
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.campaigns enable row level security;
alter table public.characters enable row level security;
alter table public.game_classes enable row level security;
alter table public.campaign_invites enable row level security;
alter table public.campaign_members enable row level security;

grant select on public.game_classes to authenticated;
grant insert, update, delete on public.game_classes to authenticated;

create policy "profiles are readable by authenticated users"
on public.profiles for select
to authenticated
using (true);

create policy "users can create their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users can read their own roles"
on public.user_roles for select
to authenticated
using (auth.uid() = user_id);

create policy "users can create their own roles"
on public.user_roles for insert
to authenticated
with check (auth.uid() = user_id);

create policy "dms can create campaigns"
on public.campaigns for insert
to authenticated
with check (auth.uid() = dm_user_id);

create policy "campaign owners can manage campaigns"
on public.campaigns for all
to authenticated
using (auth.uid() = dm_user_id)
with check (auth.uid() = dm_user_id);

create policy "players can manage their own characters"
on public.characters for all
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "campaign owners can read campaign characters"
on public.characters for select
to authenticated
using (
  exists (
    select 1
    from public.campaigns
    where campaigns.id = characters.campaign_id
      and campaigns.dm_user_id = auth.uid()
  )
);

create policy "authenticated users can read game classes"
on public.game_classes for select
to authenticated
using (true);

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

create policy "campaign owners can manage invites"
on public.campaign_invites for all
to authenticated
using (
  exists (
    select 1
    from public.campaigns
    where campaigns.id = campaign_invites.campaign_id
      and campaigns.dm_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.campaigns
    where campaigns.id = campaign_invites.campaign_id
      and campaigns.dm_user_id = auth.uid()
  )
);

create policy "users can read invites addressed to them"
on public.campaign_invites for select
to authenticated
using (
  invited_user_id = auth.uid()
  or invited_username = (
    select username from public.profiles where id = auth.uid()
  )
);

create policy "campaign members can read their memberships"
on public.campaign_members for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.campaigns
    where campaigns.id = campaign_members.campaign_id
      and campaigns.dm_user_id = auth.uid()
  )
);

create policy "campaign owners can manage memberships"
on public.campaign_members for all
to authenticated
using (
  exists (
    select 1
    from public.campaigns
    where campaigns.id = campaign_members.campaign_id
      and campaigns.dm_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.campaigns
    where campaigns.id = campaign_members.campaign_id
      and campaigns.dm_user_id = auth.uid()
  )
);

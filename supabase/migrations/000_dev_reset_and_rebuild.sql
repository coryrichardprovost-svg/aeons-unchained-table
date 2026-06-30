-- Development reset for Aeons Unchained Table.
-- This wipes local/test Supabase app data and Auth users, then rebuilds a clean schema.
-- Do not run this against a production project.
--
-- After running, create accounts normally through the app.

drop trigger if exists on_auth_user_created on auth.users;
drop schema if exists public cascade;
create schema public;

create extension if not exists pgcrypto;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant all on functions to postgres, service_role;
alter default privileges in schema public grant all on sequences to postgres, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;

delete from auth.identities;
delete from auth.users;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  email text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('trailblazer', 'chronicler')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  dm_user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'recruiting', 'active', 'archived')),
  premise text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.characters (
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

create table public.game_classes (
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

create table public.world_locations (
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

create table public.npcs (
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

create table public.item_types (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  name text not null unique,
  columns jsonb not null default '["name", "description", "value", "weight"]'::jsonb,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.items (
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

create table public.markets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  location_id uuid references public.world_locations(id) on delete set null,
  name text not null default 'New Market',
  market_type text not null default '',
  description text not null default '',
  chronicler_notes text not null default '',
  visibility text not null default 'chronicler' check (visibility in ('chronicler', 'players')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.market_shops (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  market_id uuid not null references public.markets(id) on delete cascade,
  name text not null default 'New Shop',
  shop_type text not null default '',
  shopkeeper text not null default '',
  description text not null default '',
  chronicler_notes text not null default '',
  allowed_item_type_ids jsonb not null default '[]'::jsonb,
  stock_mode text not null default 'types' check (stock_mode in ('types', 'curated')),
  visibility text not null default 'chronicler' check (visibility in ('chronicler', 'players')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.market_shop_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.market_shops(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  is_available boolean not null default true,
  quantity text not null default '',
  price_override text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, item_id)
);

insert into public.item_types (name, columns, is_default, sort_order)
values
  ('Consumables', '["name", "description", "effect", "value", "weight"]'::jsonb, true, 10),
  ('Armor', '["name", "description", "defense", "protection", "resistance", "value", "weight"]'::jsonb, true, 20),
  ('Arsenal', '["name", "description", "range", "attack", "penetration", "value", "weight"]'::jsonb, true, 30),
  ('Accessories', '["name", "description", "protection", "defense", "resistance", "value", "weight"]'::jsonb, true, 40),
  ('Miscellaneous', '["name", "description", "value", "weight"]'::jsonb, true, 50);

create table public.campaign_invites (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  invited_by_user_id uuid not null references public.profiles(id) on delete cascade,
  invited_username text not null,
  invited_user_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create table public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  role text not null check (role in ('chronicler', 'trailblazer', 'observer')),
  created_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

grant select on public.campaigns to authenticated;
grant select, insert, update, delete on public.characters to authenticated;
grant select, insert, update, delete on public.game_classes to authenticated;
grant select, insert, update, delete on public.world_locations to authenticated;
grant select, insert, update, delete on public.npcs to authenticated;
grant select, insert, update, delete on public.item_types to authenticated;
grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.markets to authenticated;
grant select, insert, update, delete on public.market_shops to authenticated;
grant select, insert, update, delete on public.market_shop_items to authenticated;
grant select on public.campaign_members to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger campaigns_set_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

create trigger characters_set_updated_at
before update on public.characters
for each row execute function public.set_updated_at();

create trigger game_classes_set_updated_at
before update on public.game_classes
for each row execute function public.set_updated_at();

create trigger world_locations_set_updated_at
before update on public.world_locations
for each row execute function public.set_updated_at();

create trigger npcs_set_updated_at
before update on public.npcs
for each row execute function public.set_updated_at();

create trigger item_types_set_updated_at
before update on public.item_types
for each row execute function public.set_updated_at();

create trigger items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

create trigger markets_set_updated_at
before update on public.markets
for each row execute function public.set_updated_at();

create trigger market_shops_set_updated_at
before update on public.market_shops
for each row execute function public.set_updated_at();

create trigger market_shop_items_set_updated_at
before update on public.market_shop_items
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  clean_username text;
  requested_role text;
  clean_role text;
begin
  requested_username := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
  clean_username := lower(trim(requested_username));
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'trailblazer');
  clean_role := case
    when clean_username = 'the chronicler' and lower(trim(requested_role)) = 'chronicler' then 'chronicler'
    else 'trailblazer'
  end;

  insert into public.profiles (id, username, display_name, email)
  values (new.id, clean_username, clean_username, lower(new.email))
  on conflict (id) do update
  set
    username = excluded.username,
    display_name = excluded.display_name,
    email = excluded.email;

  insert into public.user_roles (user_id, role)
  values (new.id, clean_role)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.get_email_for_username(input_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email
  from public.profiles
  where username = lower(trim(input_username))
  limit 1;
$$;

grant execute on function public.get_email_for_username(text) to anon;
grant execute on function public.get_email_for_username(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.campaigns enable row level security;
alter table public.characters enable row level security;
alter table public.game_classes enable row level security;
alter table public.world_locations enable row level security;
alter table public.npcs enable row level security;
alter table public.item_types enable row level security;
alter table public.items enable row level security;
alter table public.markets enable row level security;
alter table public.market_shops enable row level security;
alter table public.market_shop_items enable row level security;
alter table public.campaign_invites enable row level security;
alter table public.campaign_members enable row level security;

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

create policy "authenticated users can read world locations"
on public.world_locations for select
to authenticated
using (true);

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

create policy "authenticated users can read npcs"
on public.npcs for select
to authenticated
using (true);

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

create policy "authenticated users can read item types"
on public.item_types for select
to authenticated
using (true);

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

create policy "authenticated users can read items"
on public.items for select
to authenticated
using (true);

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

create policy "authenticated users can read markets"
on public.markets for select
to authenticated
using (true);

create policy "chroniclers can create markets"
on public.markets for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
);

create policy "chroniclers can update markets"
on public.markets for update
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

create policy "chroniclers can delete markets"
on public.markets for delete
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
);

create policy "authenticated users can read market shops"
on public.market_shops for select
to authenticated
using (true);

create policy "chroniclers can create market shops"
on public.market_shops for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
);

create policy "chroniclers can update market shops"
on public.market_shops for update
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

create policy "chroniclers can delete market shops"
on public.market_shops for delete
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
);

create policy "authenticated users can read market shop items"
on public.market_shop_items for select
to authenticated
using (true);

create policy "chroniclers can create market shop items"
on public.market_shop_items for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'chronicler'
  )
);

create policy "chroniclers can update market shop items"
on public.market_shop_items for update
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

create policy "chroniclers can delete market shop items"
on public.market_shop_items for delete
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

notify pgrst, 'reload schema';

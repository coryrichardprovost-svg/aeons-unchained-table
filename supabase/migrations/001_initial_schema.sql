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

create table if not exists public.bestiary_creatures (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  name text not null default 'New Creature',
  creature_type text not null default '',
  image_url text not null default '',
  description text not null default '',
  origin_location_id uuid references public.world_locations(id) on delete set null,
  origin_location_ids jsonb not null default '[]'::jsonb,
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

create table if not exists public.knowledge_categories (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  name text not null unique,
  category_kind text not null default 'generic' check (category_kind in ('bestiary', 'generic')),
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  category_id uuid references public.knowledge_categories(id) on delete set null,
  category text not null default 'Lore',
  name text not null default 'New Knowledge Entry',
  entry_type text not null default '',
  image_url text not null default '',
  summary text not null default '',
  details text not null default '',
  strengths text not null default '',
  weaknesses text not null default '',
  location_id uuid references public.world_locations(id) on delete set null,
  location_ids jsonb not null default '[]'::jsonb,
  environment text not null default '',
  rarity text not null default '',
  status jsonb not null default '{
    "health": "",
    "stamina": "",
    "mind": "",
    "divinity": ""
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
  visibility text not null default 'chronicler' check (visibility in ('chronicler', 'hinted', 'discovered', 'players')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.markets (
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

create table if not exists public.market_shops (
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

create table if not exists public.market_shop_items (
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
  ('Miscellaneous', '["name", "description", "value", "weight"]'::jsonb, true, 50)
on conflict (name) do nothing;

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

drop trigger if exists world_locations_set_updated_at on public.world_locations;
create trigger world_locations_set_updated_at
before update on public.world_locations
for each row execute function public.set_updated_at();

drop trigger if exists npcs_set_updated_at on public.npcs;
create trigger npcs_set_updated_at
before update on public.npcs
for each row execute function public.set_updated_at();

drop trigger if exists bestiary_creatures_set_updated_at on public.bestiary_creatures;
create trigger bestiary_creatures_set_updated_at
before update on public.bestiary_creatures
for each row execute function public.set_updated_at();

drop trigger if exists knowledge_entries_set_updated_at on public.knowledge_entries;
create trigger knowledge_entries_set_updated_at
before update on public.knowledge_entries
for each row execute function public.set_updated_at();

drop trigger if exists knowledge_categories_set_updated_at on public.knowledge_categories;
create trigger knowledge_categories_set_updated_at
before update on public.knowledge_categories
for each row execute function public.set_updated_at();

drop trigger if exists item_types_set_updated_at on public.item_types;
create trigger item_types_set_updated_at
before update on public.item_types
for each row execute function public.set_updated_at();

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

drop trigger if exists markets_set_updated_at on public.markets;
create trigger markets_set_updated_at
before update on public.markets
for each row execute function public.set_updated_at();

drop trigger if exists market_shops_set_updated_at on public.market_shops;
create trigger market_shops_set_updated_at
before update on public.market_shops
for each row execute function public.set_updated_at();

drop trigger if exists market_shop_items_set_updated_at on public.market_shop_items;
create trigger market_shop_items_set_updated_at
before update on public.market_shop_items
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.campaigns enable row level security;
alter table public.characters enable row level security;
alter table public.game_classes enable row level security;
alter table public.world_locations enable row level security;
alter table public.npcs enable row level security;
alter table public.bestiary_creatures enable row level security;
alter table public.knowledge_categories enable row level security;
alter table public.knowledge_entries enable row level security;
alter table public.item_types enable row level security;
alter table public.items enable row level security;
alter table public.markets enable row level security;
alter table public.market_shops enable row level security;
alter table public.market_shop_items enable row level security;
alter table public.campaign_invites enable row level security;
alter table public.campaign_members enable row level security;

grant select on public.game_classes to authenticated;
grant insert, update, delete on public.game_classes to authenticated;
grant select on public.world_locations to authenticated;
grant insert, update, delete on public.world_locations to authenticated;
grant select on public.npcs to authenticated;
grant insert, update, delete on public.npcs to authenticated;
grant select on public.bestiary_creatures to authenticated;
grant insert, update, delete on public.bestiary_creatures to authenticated;
grant select on public.knowledge_categories to authenticated;
grant insert, update, delete on public.knowledge_categories to authenticated;
grant select on public.knowledge_entries to authenticated;
grant insert, update, delete on public.knowledge_entries to authenticated;
grant select on public.item_types to authenticated;
grant insert, update, delete on public.item_types to authenticated;
grant select on public.items to authenticated;
grant insert, update, delete on public.items to authenticated;
grant select on public.markets to authenticated;
grant insert, update, delete on public.markets to authenticated;
grant select on public.market_shops to authenticated;
grant insert, update, delete on public.market_shops to authenticated;
grant select on public.market_shop_items to authenticated;
grant insert, update, delete on public.market_shop_items to authenticated;

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

create policy "authenticated users can manage bestiary creatures"
on public.bestiary_creatures for all
to authenticated
using (true)
with check (true);

create policy "authenticated users can manage knowledge entries"
on public.knowledge_entries for all
to authenticated
using (true)
with check (true);

create policy "authenticated users can manage knowledge categories"
on public.knowledge_categories for all
to authenticated
using (true)
with check (true);

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

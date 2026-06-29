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

drop trigger if exists markets_set_updated_at on public.markets;
create trigger markets_set_updated_at
before update on public.markets
for each row execute function public.set_updated_at();

drop trigger if exists market_shops_set_updated_at on public.market_shops;
create trigger market_shops_set_updated_at
before update on public.market_shops
for each row execute function public.set_updated_at();

alter table public.markets enable row level security;
alter table public.market_shops enable row level security;

grant select on public.markets to authenticated;
grant insert, update, delete on public.markets to authenticated;
grant select on public.market_shops to authenticated;
grant insert, update, delete on public.market_shops to authenticated;

drop policy if exists "authenticated users can read markets" on public.markets;
create policy "authenticated users can read markets"
on public.markets for select
to authenticated
using (true);

drop policy if exists "chroniclers can create markets" on public.markets;
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

drop policy if exists "chroniclers can update markets" on public.markets;
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

drop policy if exists "chroniclers can delete markets" on public.markets;
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

drop policy if exists "authenticated users can read market shops" on public.market_shops;
create policy "authenticated users can read market shops"
on public.market_shops for select
to authenticated
using (true);

drop policy if exists "chroniclers can create market shops" on public.market_shops;
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

drop policy if exists "chroniclers can update market shops" on public.market_shops;
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

drop policy if exists "chroniclers can delete market shops" on public.market_shops;
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

notify pgrst, 'reload schema';

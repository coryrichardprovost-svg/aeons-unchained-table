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

drop trigger if exists market_shop_items_set_updated_at on public.market_shop_items;
create trigger market_shop_items_set_updated_at
before update on public.market_shop_items
for each row execute function public.set_updated_at();

alter table public.market_shop_items enable row level security;

grant select on public.market_shop_items to authenticated;
grant insert, update, delete on public.market_shop_items to authenticated;

drop policy if exists "authenticated users can read market shop items" on public.market_shop_items;
create policy "authenticated users can read market shop items"
on public.market_shop_items for select
to authenticated
using (true);

drop policy if exists "chroniclers can create market shop items" on public.market_shop_items;
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

drop policy if exists "chroniclers can update market shop items" on public.market_shop_items;
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

drop policy if exists "chroniclers can delete market shop items" on public.market_shop_items;
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

notify pgrst, 'reload schema';

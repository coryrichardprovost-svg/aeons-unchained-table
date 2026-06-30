create or replace function public.current_user_is_chronicler()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'chronicler'
    )
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and lower(trim(profiles.username)) = 'the chronicler'
    );
$$;

grant execute on function public.current_user_is_chronicler() to authenticated;

drop policy if exists "chroniclers can create bestiary creatures" on public.bestiary_creatures;
create policy "chroniclers can create bestiary creatures"
on public.bestiary_creatures for insert
to authenticated
with check (public.current_user_is_chronicler());

drop policy if exists "chroniclers can update bestiary creatures" on public.bestiary_creatures;
create policy "chroniclers can update bestiary creatures"
on public.bestiary_creatures for update
to authenticated
using (public.current_user_is_chronicler())
with check (public.current_user_is_chronicler());

drop policy if exists "chroniclers can delete bestiary creatures" on public.bestiary_creatures;
create policy "chroniclers can delete bestiary creatures"
on public.bestiary_creatures for delete
to authenticated
using (public.current_user_is_chronicler());

notify pgrst, 'reload schema';

-- Repair migration for projects that ran the initial schema before profile inserts were allowed.
-- Safe to run more than once.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'users can create their own profile'
  ) then
    create policy "users can create their own profile"
    on public.profiles for insert
    to authenticated
    with check (auth.uid() = id);
  end if;
end
$$;

do $$
begin
  update public.user_roles
  set role = 'trailblazer'
  where role = 'player';

  update public.user_roles
  set role = 'chronicler'
  where role = 'dm';

  if exists (
    select 1
    from information_schema.constraint_column_usage
    where table_schema = 'public'
      and table_name = 'user_roles'
      and constraint_name = 'user_roles_role_check'
  ) then
    alter table public.user_roles drop constraint user_roles_role_check;
  end if;

  alter table public.user_roles
    add constraint user_roles_role_check
    check (role in ('trailblazer', 'chronicler'));
end
$$;

do $$
begin
  update public.campaign_members
  set role = 'trailblazer'
  where role = 'player';

  update public.campaign_members
  set role = 'chronicler'
  where role = 'dm';

  if exists (
    select 1
    from information_schema.constraint_column_usage
    where table_schema = 'public'
      and table_name = 'campaign_members'
      and constraint_name = 'campaign_members_role_check'
  ) then
    alter table public.campaign_members drop constraint campaign_members_role_check;
  end if;

  alter table public.campaign_members
    add constraint campaign_members_role_check
    check (role in ('trailblazer', 'chronicler', 'observer'));
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_roles'
      and policyname = 'users can create their own roles'
  ) then
    create policy "users can create their own roles"
    on public.user_roles for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;
end
$$;

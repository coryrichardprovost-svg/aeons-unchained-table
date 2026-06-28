-- Username-based login support.
-- Supabase Auth still authenticates by email internally, but the app can accept username + password.

alter table public.profiles
add column if not exists email text unique;

do $$
begin
  if to_regclass('public.user_roles') is not null then
    alter table public.user_roles drop constraint if exists user_roles_role_check;

    update public.user_roles
    set role = 'trailblazer'
    where role = 'player';

    update public.user_roles
    set role = 'chronicler'
    where role = 'dm';

    alter table public.user_roles
      add constraint user_roles_role_check
      check (role in ('trailblazer', 'chronicler'));
  end if;

  if to_regclass('public.campaign_members') is not null then
    alter table public.campaign_members drop constraint if exists campaign_members_role_check;

    update public.campaign_members
    set role = 'trailblazer'
    where role = 'player';

    update public.campaign_members
    set role = 'chronicler'
    where role = 'dm';

    alter table public.campaign_members
      add constraint campaign_members_role_check
      check (role in ('trailblazer', 'chronicler', 'observer'));
  end if;
end;
$$;

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
  values (
    new.id,
    clean_username,
    clean_username,
    lower(new.email)
  )
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

drop trigger if exists on_auth_user_created on auth.users;
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

notify pgrst, 'reload schema';

-- Development helper only.
-- Use this when a test signup says "user already registered" but the account cannot sign in.
--
-- Replace these two values before running:
--   target_email
--   target_username

do $$
declare
  target_email text := 'REPLACE_WITH_TEST_EMAIL@example.com';
  target_username text := 'replace with username';
  target_user_id uuid;
begin
  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    select id
    into target_user_id
    from public.profiles
    where username = lower(trim(target_username))
    limit 1;
  end if;

  if target_user_id is not null then
    delete from public.campaign_members where user_id = target_user_id;
    delete from public.campaign_invites where invited_user_id = target_user_id or invited_by_user_id = target_user_id;
    delete from public.characters where owner_user_id = target_user_id;
    delete from public.campaigns where dm_user_id = target_user_id;
    delete from public.user_roles where user_id = target_user_id;
    delete from public.profiles where id = target_user_id;
    delete from auth.identities where user_id = target_user_id;
    delete from auth.users where id = target_user_id;
  end if;

  delete from public.profiles
  where username = lower(trim(target_username))
     or lower(email) = lower(target_email);
end;
$$;

notify pgrst, 'reload schema';

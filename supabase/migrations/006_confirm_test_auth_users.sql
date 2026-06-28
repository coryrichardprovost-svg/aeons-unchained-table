-- Development helper only.
-- Use this when Supabase creates test users but no confirmation email arrives.
-- It marks existing Auth users as email-confirmed so they can sign in locally.

update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where email_confirmed_at is null;

notify pgrst, 'reload schema';

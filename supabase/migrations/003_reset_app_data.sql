-- Development reset for Aeons Unchained Table public app data.
-- This does NOT delete Supabase Auth users.
-- To delete Auth users, use Supabase Dashboard > Authentication > Users.

truncate table public.campaign_members restart identity cascade;
truncate table public.campaign_invites restart identity cascade;
truncate table public.characters restart identity cascade;
truncate table public.campaigns restart identity cascade;
truncate table public.user_roles restart identity cascade;
truncate table public.profiles restart identity cascade;

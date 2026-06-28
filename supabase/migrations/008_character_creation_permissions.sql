-- Repair permissions needed when creating and loading player characters.
-- Some character policies reference campaigns, so authenticated users need
-- table-level SELECT permission even when row-level security limits the rows.

grant select on public.campaigns to authenticated;
grant select, insert, update, delete on public.characters to authenticated;
grant select on public.campaign_members to authenticated;

notify pgrst, 'reload schema';

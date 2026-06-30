alter table public.knowledge_entries
add column if not exists location_ids jsonb not null default '[]'::jsonb;

update public.knowledge_entries
set location_ids = jsonb_build_array(location_id)
where location_id is not null
  and location_ids = '[]'::jsonb;

notify pgrst, 'reload schema';

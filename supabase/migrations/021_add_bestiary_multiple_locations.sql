alter table public.bestiary_creatures
add column if not exists origin_location_ids jsonb not null default '[]'::jsonb;

update public.bestiary_creatures
set origin_location_ids = jsonb_build_array(origin_location_id)
where origin_location_id is not null
  and origin_location_ids = '[]'::jsonb;

notify pgrst, 'reload schema';

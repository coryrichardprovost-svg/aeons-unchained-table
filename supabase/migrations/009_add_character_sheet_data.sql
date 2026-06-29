alter table public.characters
add column if not exists sheet_data jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';

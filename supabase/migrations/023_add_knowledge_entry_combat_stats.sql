alter table public.knowledge_entries
add column if not exists strengths text not null default '',
add column if not exists weaknesses text not null default '',
add column if not exists status jsonb not null default '{
  "health": "",
  "stamina": "",
  "mind": "",
  "divinity": ""
}'::jsonb,
add column if not exists attributes jsonb not null default '{
  "str": "10",
  "spd": "10",
  "int": "10",
  "cha": "10",
  "con": "10",
  "dex": "10",
  "wis": "10",
  "fth": "10"
}'::jsonb;

notify pgrst, 'reload schema';

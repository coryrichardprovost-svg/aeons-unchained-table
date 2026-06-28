# Aeons Unchained Table Data Model

This is the first database target for the hosted version. The current app uses local browser storage for character profiles, but these entities are the shape we should move toward when we add Supabase, Neon, or another Postgres-backed service.

## Core Tables

### users

Stores account identity.

- `id`
- `username`
- `display_name`
- `email`
- `created_at`

### user_roles

Lets one account be a player, a DM, or both.

- `id`
- `user_id`
- `role` (`player`, `dm`)
- `created_at`

### campaigns

Owned by a DM.

- `id`
- `dm_user_id`
- `name`
- `status` (`draft`, `recruiting`, `active`, `archived`)
- `premise`
- `created_at`
- `updated_at`

### campaign_members

Connects users and characters to campaigns.

- `id`
- `campaign_id`
- `user_id`
- `character_id`
- `role` (`dm`, `player`, `observer`)
- `created_at`

### campaign_invites

DM invites players by username.

- `id`
- `campaign_id`
- `invited_by_user_id`
- `invited_username`
- `invited_user_id`
- `status` (`pending`, `accepted`, `declined`, `expired`)
- `created_at`
- `responded_at`

### characters

Player-owned character profiles.

- `id`
- `owner_user_id`
- `name`
- `class_name`
- `level`
- `ancestry`
- `background`
- `campaign_id`
- `resolve_current`
- `resolve_max`
- `wounds`
- `notes`
- `created_at`
- `updated_at`

### character_attributes

Keeps sheet stats flexible.

- `id`
- `character_id`
- `attribute_key`
- `attribute_value`

### character_inventory_items

- `id`
- `character_id`
- `name`
- `item_type`
- `status`
- `quantity`
- `notes`

### character_abilities

- `id`
- `character_id`
- `name`
- `category`
- `description`

### character_knowledge

- `id`
- `character_id`
- `campaign_id`
- `title`
- `body`
- `visibility` (`private`, `party`, `dm`)

### character_notes

- `id`
- `character_id`
- `campaign_id`
- `title`
- `body`
- `visibility` (`private`, `party`, `dm`)

### crafting_projects

- `id`
- `character_id`
- `name`
- `status`
- `materials`
- `notes`

## DM And Session Tables

### sessions

- `id`
- `campaign_id`
- `title`
- `scheduled_for`
- `status` (`planned`, `live`, `completed`)
- `recap`

### campaign_resources

Maps, handouts, NPC cards, and other DM-created resources.

- `id`
- `campaign_id`
- `created_by_user_id`
- `resource_type`
- `title`
- `body`
- `file_url`
- `visibility` (`dm`, `party`, `public`)

### stage_rooms

Future live session space.

- `id`
- `campaign_id`
- `session_id`
- `active_map_resource_id`
- `status`

## First Backend Milestone

The first real persistence milestone should be:

1. Authenticated users
2. `characters` table
3. Character create/edit/list
4. Character owner permissions
5. Campaign creation
6. Campaign invites by username

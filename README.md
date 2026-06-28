# Aeons Unchained Table

Aeons Unchained Table is a web app shell for Nate's Aeons Unchained TTRPG: a Chronicler world-building space, Trailblazer character workspace, campaign organizer, and future live stage for video, maps, events, and resources.

## What is built now

- Role-based entry shell for Trailblazer or Chronicler
- Username/password sign-up and sign-in through Supabase Auth
- Real routed Trailblazer workspace under `/player/...`
- Real routed Chronicler workspace under `/dm/...`
- Trailblazer License creation and editing backed by Supabase
- Trailblazer workspace with License dashboard, inventory, class, knowledge, skills, notes, crafting, and stage pages
- Chronicler workspace reframed around world-building, campaign creation, NPCs, quests, regional markets, rules, sessions, and stage tools
- Database planning document at `docs/data-model.md`
- Supabase setup guide at `docs/supabase-setup.md`
- Chronicler access guide at `docs/chronicler-access.md`
- Test reset guide at `docs/reset-test-users.md`
- Initial Supabase SQL schema at `supabase/migrations/001_initial_schema.sql`
- Vercel-friendly Next.js project structure
- Supabase-backed profiles, roles, and character saving

## Open in VS Code

Open this folder:

```text
Aeons-Unchained-Table
```

Then install dependencies and run locally:

```bash
npm install
npm run dev
```

The app will usually run at:

```text
http://localhost:3000
```

## Future build path

Good next pieces:

- Chronicler campaign and world-builder flows
- Uploadable maps and resources
- Session stage with video integration and shared map state
- Vercel deployment connected to GitHub

For the eventual hosted version, a practical stack would be:

- Next.js on Vercel
- Postgres through Supabase
- Auth through Supabase Auth
- File storage for maps and handouts through Supabase Storage, UploadThing, S3, or Vercel Blob

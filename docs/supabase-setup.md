# Connect Supabase

Your Supabase project is the hosted database and auth layer for Aeons Unchained Table.

## 1. Find your project values

In Supabase:

1. Open the `aeons unchained table` project.
2. Open the project Connect dialog or API settings.
3. Copy the Project URL.
4. Copy the Publishable key.

Use the publishable key for the browser app. Do not put a secret or service-role key in `NEXT_PUBLIC_*` variables.

## 2. Create `.env.local`

Copy `.env.example` to `.env.local` and fill in your project values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

Restart the dev server after changing `.env.local`.

## 3. Create the database tables

For a clean development reset, run the single reset-and-rebuild script.

1. Open SQL Editor.
2. Create a new query.
3. Paste the contents of `supabase/migrations/000_dev_reset_and_rebuild.sql`.
4. Run the query.

This creates:

- profiles
- user roles
- campaigns
- characters
- campaign invites
- campaign members
- row-level security policies
- username login support

## 4. Enable auth

In Supabase Auth settings:

1. Enable email/password signups.
2. For local testing, turn off email confirmation if your Supabase project shows that option.
   - Go to Authentication > Sign In / Providers > Email.
   - Turn off Confirm email.
   - Save.
3. Add local redirect URL:

```text
http://localhost:3000
```

Later, after Vercel deployment, add:

```text
https://your-vercel-app.vercel.app
```

## 5. Current app state

The app now has Supabase client helpers, sign-up/sign-in, sign-out, and Supabase-backed character profile saving.
New signups are Trailblazers by default. To grant Nate Chronicler access, follow `docs/chronicler-access.md`.

Next implementation step:

1. Run the SQL schema if you have not already.
2. Create an account at `/auth`.
3. Create a character at `/player/characters`.
4. Build the DM campaign creation flow.

## Username login

Run `supabase/migrations/004_username_login.sql` after the initial schema. This keeps Supabase Auth email/password internally, but lets the app sign users in with:

- username
- password

Usernames are unique in `profiles`.

## Chronicler Account

After the reset-and-rebuild script runs, create the Chronicler account through the app:

1. Go to `/auth`.
2. Choose Sign Up.
3. Username: `The Chronicler`.
4. Email: your real Chronicler email.
5. Password: your chosen password.

Use a second, different email for a separate Trailblazer test account.

# Reset Supabase For Testing

Use the clean development reset when auth starts getting tangled.

## Clean Reset

This wipes test Auth users, app tables, roles, characters, campaigns, and old broken constraints. It then rebuilds everything cleanly.

1. Open SQL Editor.
2. New query.
3. Paste `supabase/migrations/000_dev_reset_and_rebuild.sql`.
4. Run it.

## Create The Chronicler

After the reset script runs:

1. Go to `/auth`.
2. Choose Sign Up.
3. Use username `The Chronicler`.
4. Use your real email.
5. Use your password.

The reserved username `The Chronicler` receives the `chronicler` role.

## Create Player Test Accounts

After the reset script runs:

1. Go to `/auth`.
2. Choose Sign Up.
3. Enter a unique username, email, password, and repeat password.
4. Create the account.

The app normalizes username casing, so `Cory`, `cory`, and `CORY` resolve to the same stored username.

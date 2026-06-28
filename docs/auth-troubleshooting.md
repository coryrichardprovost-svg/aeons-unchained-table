# Auth Troubleshooting

## New account did not send an email

For local testing, the simplest setup is to turn off email confirmation if your Supabase project shows that option:

1. Open Supabase.
2. Go to Authentication.
3. Open Sign In / Providers.
4. Open Email.
5. Turn off Confirm email.
6. Save.

Then create the account again, or manually confirm the existing user:

1. Open Authentication.
2. Open Users.
3. Click the user.
4. Confirm the email if Supabase shows that option.

If your Supabase screen only shows Enable Email provider and Secure email change, use the SQL helper instead:

1. Open Supabase SQL Editor.
2. Run `supabase/migrations/006_confirm_test_auth_users.sql`.
3. Return to the app and sign in with username and password.

The app uses username and password for sign-in, but Supabase Auth still keeps an email internally for normal player accounts.

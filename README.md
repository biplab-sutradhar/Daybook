# Daybook

A private personal productivity workspace built with React, TypeScript, Tailwind CSS, and Supabase.

## 1. Required tools

- Node.js 22.22.2+, 24.15.0+, or 26.0.0+
- npm 10+ or pnpm
- A Supabase account
- A free Vercel account for deployment

## 2. Install dependencies

```bash
npm install
```

## 3. Create or connect to a Supabase project

1. Open the Supabase Dashboard.
2. Click New project.
3. Pick an organization and a database region.
4. Create a database password and save it somewhere secure.
5. Wait for the project to finish provisioning.

## 4. Find the correct Supabase values

In the Supabase dashboard:

- Go to Project settings > API.
- Copy the Project URL.
- Copy the anon/public key (publishable key).

Use these values in your frontend environment, not the service role key.

## 5. Configure the frontend environment

Create a `.env.local` file based on `.env.example`:

```bash
cp .env.example .env.local
```

Then edit it:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Do not commit `.env.local` or any secrets.

## 6. Apply the SQL migrations

From the Supabase SQL editor, run these files in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_integrity.sql`
3. `supabase/migrations/003_single_user.sql`
4. `supabase/migrations/004_topics.sql`
5. `supabase/migrations/006_portfolio_demo.sql`

Do not run `005_lock_to_login.sql`. It is a separate, single-owner setup that requires manually replacing its user-ID placeholder. For Daybook, run `006_portfolio_demo.sql` instead; it configures signup and per-account access:

- Visitors can create an account and sign in.
- The database keeps at most 10 accounts.
- Text content across every account stays within 100 MB.
- Each account, and the rows that belong to it, is deleted 7 days after signup.

If the migration reports that `pg_cron` could not be scheduled, enable the `pg_cron` extension in Database → Extensions and run `006` again. The sign-in screen also deletes expired accounts, so a free spot does not depend on the nightly job.

## 7. Allow signup

1. Open Supabase > Authentication > Providers > Email.
2. Turn new signups on.
3. Turn Confirm email off, so a new account can sign in immediately after signup.

## 8. Sign up or sign in

Open the app and create an account or sign in. The session is kept in the browser and is sent with every page.

A copy of the workspace is also stored in this browser so the next visit can open faster. Settings has **Delete data on this device** for clearing it sooner.

## 9. Run locally

```bash
npm run dev
```

Then visit the local Vite URL displayed in the terminal.

## 10. Build and test

```bash
npm run check
npm run test
npm run build
```

The build verifies the TypeScript project and production bundle compile.

## 11. Deploy to Vercel for free

1. Push the repository to GitHub.
2. Open Vercel.
3. Import the repository.
4. Set the framework to Vite.
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
6. Deploy.

## 12. Export and backup data

Use the Settings page to export a JSON backup of your personal data.

You can also back up the production database in Supabase:

1. Open Supabase Project settings.
2. Go to Database > Backups or choose the export route available for your plan.
3. Export the database or use pg_dump if you have a local Postgres client.
4. Keep a local encrypted copy of the JSON and SQL exports.

Do not treat autosave as a backup layer. Keep a separate, deliberate export routine.

## 13. Common errors and troubleshooting

- Missing env values: confirm `.env.local` is present and Vite variables are spelled correctly.
- Auth errors: confirm email signups are turned on and Confirm email is turned off.
- "All 10 demo spots are in use": wait until an account reaches 7 days, or open the sign-in screen so expired accounts are removed.
- "This demo can store 100 MB": delete content, or wait until an account and its rows expire.
- RLS errors: confirm `006_portfolio_demo.sql` was run after migrations `001` through `004`.
- The `PASTE-YOUR-AUTH-USER-ID-HERE` error means `005_lock_to_login.sql` was run. For this setup, skip `005` and run `006_portfolio_demo.sql` after `001` through `004`.
- Wrong date problems: keep a single local-date strategy for daily logs, due dates, and review periods.
- Stale autosave: the app uses request IDs so older writes cannot overwrite newer content.

## 14. Privacy note

This build is a public portfolio demo. Row level security lets a signed-in visitor read and edit only their own rows. Ownership of a row still cannot be changed from the frontend.

Accounts and their rows are deleted 7 days after signup. The browser copy follows the same deadline and can also be cleared from Settings. Do not put private or client data in the demo.

No service-role key or database password is meant to live in browser code.

## 15. Current implementation status

This repository includes the full TypeScript application structure, migration SQL, and documentation.

The production app requires a real Supabase project to be configured in `.env.local` and the SQL migration to be executed in the Supabase dashboard before authentication and persistence work in a live environment.

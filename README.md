# Daybook

Daybook is my personal productivity workspace. I built it around the tools I use to plan work, keep notes, reflect on my days, and stay on top of ongoing goals. I use it in my day-to-day life, and I’m sharing the source publicly.

This repository is the app’s source code; it is not an invitation to use my personal Supabase project. To run your own copy, create and configure your own Supabase project and keep its credentials private.

## What it does

- **To-dos:** Capture and organize tasks, set priorities and due dates, and keep track of what needs attention.
- **Notes and topics:** Group notes into topics, keep a timeline of entries, pin important topics, and use text or checklist entries.
- **Daily log:** Write an entry for each day, browse entries in a calendar, search past writing, and use optional prompts.
- **Inbox:** Capture things to sort out later.
- **Goals:** Track personal goals alongside everyday work.
- **Today, activity, and reviews:** Get a view of current priorities and recent activity, and write daily or weekly reflections.
- **Classic notes:** Keep standalone notes as well as topic-based notes.
- **Autosave and local cache:** Changes save to Supabase, with a browser copy to help the workspace reopen quickly.
- **Export and shortcuts:** Download workspace data and use keyboard shortcuts for quick capture and common actions.
- **Light and dark themes**, with layouts for desktop and mobile.

## Technology

- React and TypeScript
- Vite
- Tailwind CSS
- Supabase Auth and Postgres

## Run your own copy

### Requirements

- Node.js 22.22.2+, 24.15.0+, or 26.0.0+
- npm 10+ or pnpm
- Your own Supabase project

### Install and configure

1. Clone or download this repository and install dependencies:

   ```sh
   npm install
   ```

2. Create a `.env.local` file in the project root:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   VITE_SITE_URL=https://your-public-site.example
   ```

   Find these values in your Supabase project’s API settings. Use the publishable/anon key in the browser app; **never** put a service-role key or database password in frontend environment variables.

3. In the Supabase SQL Editor, run these migrations in order:

   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_integrity.sql`
   - `supabase/migrations/003_single_user.sql`
   - `supabase/migrations/004_topics.sql`
   - `supabase/migrations/006_portfolio_demo.sql`

   Do not run `005_lock_to_login.sql` for this setup. It is an alternative single-owner policy that requires replacing a user-ID placeholder. Migration `006_portfolio_demo.sql` configures the account-based signup flow used by the app. Do not use both profiles interchangeably.

4. In Supabase Authentication settings, allow email signups, enable email confirmation, and add the value of `VITE_SITE_URL` to the allowed redirect URLs. Users will receive an email confirmation link that returns them to your public site.

5. Start the development server:

   ```sh
   npm run dev
   ```

   Open the local URL printed by Vite.

### Data retention and limits

The account-based SQL profile in `006_portfolio_demo.sql` is configured with a maximum of 10 accounts, a shared 100 MB text-content limit, and automatic account and row deletion 7 days after signup. The local browser cache is also cleaned up on that schedule. These are active database behaviors, not just interface copy.

Because of automatic deletion, **do not use this profile for long-term or irreplaceable personal records**. Export your data regularly from Settings and keep backups somewhere you control. If you want a different retention or account policy, review and deliberately change the relevant SQL functions and scheduled job in `006_portfolio_demo.sql` before using your own deployment.

The browser cache is a convenience, not a backup. Signing out does not make an export, and deleting browser data does not delete the Supabase account.

## Development

```sh
npm run check
npm test
npm run build
```

To preview a production build locally:

```sh
npm run preview
```

## Deploying your copy

Build the app with `npm run build` and deploy the generated `dist` directory to a static hosting provider. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SITE_URL` to that provider’s environment settings. `VITE_SITE_URL` defaults to `https://daybook-notes.vercel.app/`; set it to your deployment’s public URL when deploying elsewhere. Configure your Supabase Auth allowed redirect URLs to include that URL.

## Privacy and security

- Each signed-in account is restricted to its own rows by Supabase row-level security policies.
- Keep `.env.local` out of version control.
- Never expose a Supabase service-role key or database credentials in client code.
- Review the migrations and data-retention behavior before connecting real personal information.

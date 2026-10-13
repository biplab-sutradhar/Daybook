-- Run this after 001_initial_schema.sql and 002_integrity.sql.
-- Removes the login requirement so the app can save with the publishable key.
-- Safe to run more than once.
-- The workspace id must match WORKSPACE_USER_ID in src/lib/workspaceUser.ts.

do $$
declare
  fk record;
begin
  for fk in
    select c.conrelid::regclass as table_name, c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass
      and n.nspname = 'public'
      and t.relname in ('profiles', 'tasks', 'goals', 'notes', 'inbox_items', 'daily_logs', 'review_entries')
  loop
    execute format('alter table %s drop constraint %I', fk.table_name, fk.conname);
  end loop;
end $$;

do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'tasks', 'goals', 'notes', 'inbox_items', 'daily_logs', 'review_entries')
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

grant select, insert, update, delete on public.profiles, public.tasks, public.goals, public.notes, public.inbox_items, public.daily_logs, public.review_entries to anon, authenticated;

create policy "profiles_workspace" on public.profiles
  for all to anon, authenticated
  using (id = '11111111-1111-4111-8111-111111111111'::uuid)
  with check (id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy "tasks_workspace" on public.tasks
  for all to anon, authenticated
  using (user_id = '11111111-1111-4111-8111-111111111111'::uuid)
  with check (user_id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy "goals_workspace" on public.goals
  for all to anon, authenticated
  using (user_id = '11111111-1111-4111-8111-111111111111'::uuid)
  with check (user_id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy "notes_workspace" on public.notes
  for all to anon, authenticated
  using (user_id = '11111111-1111-4111-8111-111111111111'::uuid)
  with check (user_id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy "inbox_workspace" on public.inbox_items
  for all to anon, authenticated
  using (user_id = '11111111-1111-4111-8111-111111111111'::uuid)
  with check (user_id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy "daily_logs_workspace" on public.daily_logs
  for all to anon, authenticated
  using (user_id = '11111111-1111-4111-8111-111111111111'::uuid)
  with check (user_id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy "reviews_workspace" on public.review_entries
  for all to anon, authenticated
  using (user_id = '11111111-1111-4111-8111-111111111111'::uuid)
  with check (user_id = '11111111-1111-4111-8111-111111111111'::uuid);

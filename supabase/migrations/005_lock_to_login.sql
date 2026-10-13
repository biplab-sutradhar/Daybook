-- Run this after 004_topics.sql.
-- Safe to run again after the owner id below has been replaced.
--
-- Before running:
-- 1. Authentication → Users: create one user and copy that user's id.
-- 2. Authentication → Providers → Email: turn off new signups.
-- 3. Put the same id in VITE_OWNER_USER_ID in .env.local and replace the placeholder below.
-- 4. Run migrations 001 through 004 first. Once this file has run, do not rerun 003 or 004:
--    those migrations intentionally grant public access for the initial workspace setup.
--
-- Existing rows stay on workspace id 11111111-1111-4111-8111-111111111111.
-- This file revokes anon access and allows only the configured authenticated user.
-- Do not add the foreign keys back to auth.users. That workspace id is not a login id.

do $$
declare
  owner_id text := 'PASTE-YOUR-AUTH-USER-ID-HERE';
begin
  if owner_id = 'PASTE-YOUR-AUTH-USER-ID-HERE' then
    raise exception 'Replace PASTE-YOUR-AUTH-USER-ID-HERE in 005_lock_to_login.sql with your user id from Authentication → Users, then run this file again.';
  end if;

  if owner_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'The owner id in 005_lock_to_login.sql must be the UUID from Authentication → Users.';
  end if;

  execute format(
    'create or replace function public.is_workspace_owner()
     returns boolean
     language sql
     stable
     security invoker
     set search_path = public
     as $fn$ select auth.uid() = %L::uuid $fn$',
    owner_id
  );
end $$;

revoke all on function public.is_workspace_owner() from public, anon;
grant execute on function public.is_workspace_owner() to authenticated;

revoke all on table
  public.profiles,
  public.tasks,
  public.goals,
  public.notes,
  public.inbox_items,
  public.daily_logs,
  public.review_entries,
  public.topics,
  public.topic_entries
from anon;

grant select, insert, update, delete on table
  public.profiles,
  public.tasks,
  public.goals,
  public.notes,
  public.inbox_items,
  public.daily_logs,
  public.review_entries,
  public.topics,
  public.topic_entries
to authenticated;

do $$
declare
  pol record;
  item record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'tasks', 'goals', 'notes', 'inbox_items',
        'daily_logs', 'review_entries', 'topics', 'topic_entries'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;

  for item in
    select *
    from (
      values
        ('profiles', 'id'),
        ('tasks', 'user_id'),
        ('goals', 'user_id'),
        ('notes', 'user_id'),
        ('inbox_items', 'user_id'),
        ('daily_logs', 'user_id'),
        ('review_entries', 'user_id'),
        ('topics', 'user_id'),
        ('topic_entries', 'user_id')
    ) as tables(table_name, column_name)
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_workspace_owner() and %I = %L::uuid) with check (public.is_workspace_owner() and %I = %L::uuid)',
      item.table_name || '_owner',
      item.table_name,
      item.column_name,
      '11111111-1111-4111-8111-111111111111',
      item.column_name,
      '11111111-1111-4111-8111-111111111111'
    );
  end loop;
end $$;
-- Portfolio demo limits.
-- Run after 001 through 004. This replaces the single-owner lock in 005.
-- Safe to run more than once.
--
-- Keeps at most 10 accounts. Deletes each account 7 days after signup.
-- Rejects writes that would push text content past 100 MB for all accounts together.

-- Remove the single-owner helper from 005 when it exists.
drop function if exists public.is_workspace_owner();

grant usage on schema public to authenticated;

do $$
declare
  pol record;
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
end $$;

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

create policy profiles_owner on public.profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy tasks_owner on public.tasks
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy goals_owner on public.goals
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy notes_owner on public.notes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy inbox_owner on public.inbox_items
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy daily_logs_owner on public.daily_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy reviews_owner on public.review_entries
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy topics_owner on public.topics
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy topic_entries_owner on public.topic_entries
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Drop rows that are not tied to a real login before restoring foreign keys.
-- The old fixed workspace id is one of those rows.
delete from public.topic_entries where user_id not in (select id from auth.users);
delete from public.topics where user_id not in (select id from auth.users);
delete from public.tasks where user_id not in (select id from auth.users);
delete from public.goals where user_id not in (select id from auth.users);
delete from public.notes where user_id not in (select id from auth.users);
delete from public.inbox_items where user_id not in (select id from auth.users);
delete from public.daily_logs where user_id not in (select id from auth.users);
delete from public.review_entries where user_id not in (select id from auth.users);
delete from public.profiles where id not in (select id from auth.users);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_id_fkey') then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tasks_user_id_fkey') then
    alter table public.tasks
      add constraint tasks_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'goals_user_id_fkey') then
    alter table public.goals
      add constraint goals_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'notes_user_id_fkey') then
    alter table public.notes
      add constraint notes_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'inbox_items_user_id_fkey') then
    alter table public.inbox_items
      add constraint inbox_items_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'daily_logs_user_id_fkey') then
    alter table public.daily_logs
      add constraint daily_logs_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'review_entries_user_id_fkey') then
    alter table public.review_entries
      add constraint review_entries_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'topics_user_id_fkey') then
    alter table public.topics
      add constraint topics_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'topic_entries_user_id_fkey') then
    alter table public.topic_entries
      add constraint topic_entries_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

create or replace function public.demo_row_bytes(table_name text, row_data jsonb)
returns bigint
language plpgsql
immutable
set search_path = public
as $$
declare
  total bigint := 0;
  field_name text;
  fields text[];
begin
  fields := case table_name
    when 'profiles' then array['display_name']
    when 'goals' then array['title', 'description']
    when 'tasks' then array['title', 'description']
    when 'daily_logs' then array['content']
    when 'notes' then array['title', 'content', 'tags']
    when 'inbox_items' then array['title', 'content']
    when 'review_entries' then array['went_well', 'lessons_learned', 'improvements', 'next_focus']
    when 'topics' then array['title', 'left_off']
    when 'topic_entries' then array['content', 'items']
    else array[]::text[]
  end;

  foreach field_name in array fields loop
    total := total + octet_length(coalesce(row_data ->> field_name, ''));
  end loop;

  return total;
end;
$$;

create or replace function public.demo_content_bytes()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select sum(public.demo_row_bytes('profiles', to_jsonb(item))) from public.profiles item), 0)
    + coalesce((select sum(public.demo_row_bytes('goals', to_jsonb(item))) from public.goals item), 0)
    + coalesce((select sum(public.demo_row_bytes('tasks', to_jsonb(item))) from public.tasks item), 0)
    + coalesce((select sum(public.demo_row_bytes('daily_logs', to_jsonb(item))) from public.daily_logs item), 0)
    + coalesce((select sum(public.demo_row_bytes('notes', to_jsonb(item))) from public.notes item), 0)
    + coalesce((select sum(public.demo_row_bytes('inbox_items', to_jsonb(item))) from public.inbox_items item), 0)
    + coalesce((select sum(public.demo_row_bytes('review_entries', to_jsonb(item))) from public.review_entries item), 0)
    + coalesce((select sum(public.demo_row_bytes('topics', to_jsonb(item))) from public.topics item), 0)
    + coalesce((select sum(public.demo_row_bytes('topic_entries', to_jsonb(item))) from public.topic_entries item), 0);
$$;

create or replace function public.enforce_demo_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  byte_limit constant bigint := 100 * 1024 * 1024;
  new_bytes bigint;
  old_bytes bigint := 0;
begin
  new_bytes := public.demo_row_bytes(tg_table_name, to_jsonb(new));
  if tg_op = 'UPDATE' then
    old_bytes := public.demo_row_bytes(tg_table_name, to_jsonb(old));
  end if;

  if new_bytes <= old_bytes then
    return new;
  end if;

  if public.demo_content_bytes() - old_bytes + new_bytes > byte_limit then
    raise exception 'DEMO_QUOTA';
  end if;

  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'tasks', 'goals', 'notes', 'inbox_items',
    'daily_logs', 'review_entries', 'topics', 'topic_entries'
  ]
  loop
    execute format('drop trigger if exists demo_quota on public.%I', table_name);
    execute format(
      'create trigger demo_quota before insert or update on public.%I for each row execute procedure public.enforce_demo_quota()',
      table_name
    );
  end loop;
end $$;

create or replace function public.purge_expired_demo_users()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from auth.users
  where created_at < now() - interval '7 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

create or replace function public.enforce_demo_user_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count integer;
begin
  begin
    perform public.purge_expired_demo_users();
  exception
    when others then
      null;
  end;

  select count(*) into active_count
  from auth.users
  where created_at >= now() - interval '7 days';

  if active_count >= 10 then
    raise exception 'DEMO_FULL';
  end if;

  return new;
end;
$$;

drop trigger if exists demo_user_cap on auth.users;
create trigger demo_user_cap
before insert on auth.users
for each row execute procedure public.enforce_demo_user_cap();

create or replace function public.demo_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  spots integer;
  used_bytes bigint;
  expires_at timestamptz;
begin
  select count(*) into spots
  from auth.users
  where created_at >= now() - interval '7 days';

  used_bytes := public.demo_content_bytes();

  if auth.uid() is not null then
    select created_at + interval '7 days' into expires_at
    from auth.users
    where id = auth.uid();
  end if;

  return jsonb_build_object(
    'spots_used', spots,
    'spots_limit', 10,
    'bytes_used', used_bytes,
    'bytes_limit', 104857600,
    'expires_at', expires_at
  );
end;
$$;

revoke all on function public.demo_row_bytes(text, jsonb) from public;
revoke all on function public.demo_content_bytes() from public;
revoke all on function public.enforce_demo_quota() from public;
revoke all on function public.purge_expired_demo_users() from public;
revoke all on function public.enforce_demo_user_cap() from public;
revoke all on function public.demo_status() from public;

grant execute on function public.enforce_demo_quota() to authenticated;
grant execute on function public.purge_expired_demo_users() to anon, authenticated;
grant execute on function public.demo_status() to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.enforce_demo_user_cap() to supabase_auth_admin;
    grant execute on function public.purge_expired_demo_users() to supabase_auth_admin;
  end if;
end $$;

do $$
begin
  begin
    perform cron.unschedule('purge-demo-users');
  exception
    when others then
      null;
  end;

  perform cron.schedule(
    'purge-demo-users',
    '15 3 * * *',
    'select public.purge_expired_demo_users()'
  );
exception
  when others then
    raise notice 'pg_cron was not scheduled (%). Enable the pg_cron extension, then run this migration again. The app also purges expired accounts when the sign-in screen opens.', sqlerrm;
end $$;

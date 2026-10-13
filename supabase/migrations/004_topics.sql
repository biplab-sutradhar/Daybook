-- Run this after 001_initial_schema.sql, 002_integrity.sql, and 003_single_user.sql.
-- Adds topic-based notes: every note entry lives under a topic (or in Unsorted when topic_id is null).
-- Existing rows in public.notes are copied into topics once. The notes table is left untouched as a backup.
-- Safe to run more than once.
-- The workspace id must match WORKSPACE_USER_ID in src/lib/workspaceUser.ts.

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  left_off text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'done')),
  is_pinned boolean not null default false,
  last_activity_at timestamptz not null default now(),
  source_note_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.topic_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic_id uuid references public.topics(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'checklist')),
  content text not null default '',
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.topics drop constraint if exists topics_title_not_blank;
alter table public.topics
  add constraint topics_title_not_blank check (char_length(btrim(title)) > 0);

alter table public.topic_entries drop constraint if exists topic_entries_items_array;
alter table public.topic_entries
  add constraint topic_entries_items_array check (jsonb_typeof(items) = 'array');

create index if not exists idx_topics_user_activity on public.topics (user_id, last_activity_at desc);
create index if not exists idx_topic_entries_topic on public.topic_entries (topic_id, created_at);
create index if not exists idx_topic_entries_user_created on public.topic_entries (user_id, created_at desc);

create or replace function public.enforce_entry_topic_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.topic_id is not null and not exists (
    select 1
    from public.topics
    where id = new.topic_id
      and user_id = new.user_id
  ) then
    raise exception 'topic must belong to the same user';
  end if;
  return new;
end;
$$;

create or replace function public.bump_topic_activity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.topic_id is not null then
    update public.topics
    set last_activity_at = new.updated_at
    where id = new.topic_id
      and last_activity_at < new.updated_at;
  end if;
  return null;
end;
$$;

drop trigger if exists topics_touch_updated_at on public.topics;
create trigger topics_touch_updated_at
before update on public.topics
for each row execute procedure public.touch_updated_at();

drop trigger if exists topics_prevent_owner_change on public.topics;
create trigger topics_prevent_owner_change
before update on public.topics
for each row execute procedure public.prevent_user_id_change();

drop trigger if exists topic_entries_touch_updated_at on public.topic_entries;
create trigger topic_entries_touch_updated_at
before update on public.topic_entries
for each row execute procedure public.touch_updated_at();

drop trigger if exists topic_entries_prevent_owner_change on public.topic_entries;
create trigger topic_entries_prevent_owner_change
before update on public.topic_entries
for each row execute procedure public.prevent_user_id_change();

drop trigger if exists topic_entries_topic_owner on public.topic_entries;
create trigger topic_entries_topic_owner
before insert or update on public.topic_entries
for each row execute procedure public.enforce_entry_topic_owner();

drop trigger if exists topic_entries_bump_activity on public.topic_entries;
create trigger topic_entries_bump_activity
after insert or update on public.topic_entries
for each row execute procedure public.bump_topic_activity();

alter table public.topics enable row level security;
alter table public.topic_entries enable row level security;

grant select, insert, update, delete on public.topics, public.topic_entries to anon, authenticated;

drop policy if exists "topics_workspace" on public.topics;
create policy "topics_workspace" on public.topics
  for all to anon, authenticated
  using (user_id = '11111111-1111-4111-8111-111111111111'::uuid)
  with check (user_id = '11111111-1111-4111-8111-111111111111'::uuid);

drop policy if exists "topic_entries_workspace" on public.topic_entries;
create policy "topic_entries_workspace" on public.topic_entries
  for all to anon, authenticated
  using (user_id = '11111111-1111-4111-8111-111111111111'::uuid)
  with check (user_id = '11111111-1111-4111-8111-111111111111'::uuid);

-- Copy each existing note into its own topic, keeping the original dates.
-- source_note_id makes this a one-time copy even if the file is run again.
do $$
declare
  note record;
  new_topic_id uuid;
  body text;
begin
  for note in
    select n.*
    from public.notes n
    where not exists (select 1 from public.topics t where t.source_note_id = n.id)
    order by n.created_at
  loop
    insert into public.topics (user_id, title, status, is_pinned, last_activity_at, source_note_id, created_at, updated_at)
    values (
      note.user_id,
      coalesce(nullif(btrim(note.title), ''), 'Untitled note'),
      'active',
      note.is_favorite,
      note.updated_at,
      note.id,
      note.created_at,
      note.updated_at
    )
    returning id into new_topic_id;

    body := btrim(
      coalesce(note.content, '')
      || case when cardinality(note.tags) > 0 then E'\n\nTags: ' || array_to_string(note.tags, ', ') else '' end
    );

    if body <> '' then
      insert into public.topic_entries (user_id, topic_id, kind, content, created_at, updated_at)
      values (note.user_id, new_topic_id, 'text', body, note.created_at, note.updated_at);
    end if;
  end loop;
end $$;

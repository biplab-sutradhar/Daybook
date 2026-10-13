-- Run this after 001_initial_schema.sql.
-- It tightens ownership checks and keeps updated timestamps consistent.
-- Re-running this file is safe.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_user_id_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_task_goal_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.goal_id is not null and not exists (
    select 1
    from public.goals
    where id = new.goal_id
      and user_id = new.user_id
  ) then
    raise exception 'goal must belong to the same user';
  end if;
  return new;
end;
$$;

create or replace function public.limit_top_priorities()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_count integer;
begin
  if new.is_top_priority and new.status <> 'completed' then
    select count(*)
      into current_count
    from public.tasks
    where user_id = new.user_id
      and is_top_priority
      and status <> 'completed'
      and id <> new.id;

    if current_count >= 3 then
      raise exception 'Only three top priorities are allowed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
before update on public.tasks
for each row execute procedure public.touch_updated_at();

drop trigger if exists tasks_prevent_owner_change on public.tasks;
create trigger tasks_prevent_owner_change
before update on public.tasks
for each row execute procedure public.prevent_user_id_change();

drop trigger if exists tasks_goal_owner on public.tasks;
create trigger tasks_goal_owner
before insert or update on public.tasks
for each row execute procedure public.enforce_task_goal_owner();

drop trigger if exists tasks_limit_priorities on public.tasks;
create trigger tasks_limit_priorities
before insert or update on public.tasks
for each row execute procedure public.limit_top_priorities();

drop trigger if exists goals_touch_updated_at on public.goals;
create trigger goals_touch_updated_at
before update on public.goals
for each row execute procedure public.touch_updated_at();

drop trigger if exists goals_prevent_owner_change on public.goals;
create trigger goals_prevent_owner_change
before update on public.goals
for each row execute procedure public.prevent_user_id_change();

drop trigger if exists notes_touch_updated_at on public.notes;
create trigger notes_touch_updated_at
before update on public.notes
for each row execute procedure public.touch_updated_at();

drop trigger if exists notes_prevent_owner_change on public.notes;
create trigger notes_prevent_owner_change
before update on public.notes
for each row execute procedure public.prevent_user_id_change();

drop trigger if exists inbox_touch_updated_at on public.inbox_items;
create trigger inbox_touch_updated_at
before update on public.inbox_items
for each row execute procedure public.touch_updated_at();

drop trigger if exists inbox_prevent_owner_change on public.inbox_items;
create trigger inbox_prevent_owner_change
before update on public.inbox_items
for each row execute procedure public.prevent_user_id_change();

drop trigger if exists logs_touch_updated_at on public.daily_logs;
create trigger logs_touch_updated_at
before update on public.daily_logs
for each row execute procedure public.touch_updated_at();

drop trigger if exists logs_prevent_owner_change on public.daily_logs;
create trigger logs_prevent_owner_change
before update on public.daily_logs
for each row execute procedure public.prevent_user_id_change();

drop trigger if exists reviews_touch_updated_at on public.review_entries;
create trigger reviews_touch_updated_at
before update on public.review_entries
for each row execute procedure public.touch_updated_at();

drop trigger if exists reviews_prevent_owner_change on public.review_entries;
create trigger reviews_prevent_owner_change
before update on public.review_entries
for each row execute procedure public.prevent_user_id_change();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute procedure public.touch_updated_at();

alter table public.tasks drop constraint if exists tasks_title_not_blank;
alter table public.tasks
  add constraint tasks_title_not_blank check (char_length(btrim(title)) > 0);

alter table public.goals drop constraint if exists goals_title_not_blank;
alter table public.goals
  add constraint goals_title_not_blank check (char_length(btrim(title)) > 0);

alter table public.inbox_items drop constraint if exists inbox_title_not_blank;
alter table public.inbox_items
  add constraint inbox_title_not_blank check (char_length(btrim(title)) > 0);

alter table public.notes drop constraint if exists notes_title_not_blank;
alter table public.notes
  add constraint notes_title_not_blank check (char_length(btrim(title)) > 0);

drop policy if exists "tasks_insert_private" on public.tasks;
create policy "tasks_insert_private" on public.tasks
  for insert with check (
    auth.uid() = user_id
    and (
      goal_id is null
      or exists (
        select 1 from public.goals
        where id = goal_id
          and user_id = auth.uid()
      )
    )
  );

drop policy if exists "tasks_update_private" on public.tasks;
create policy "tasks_update_private" on public.tasks
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      goal_id is null
      or exists (
        select 1 from public.goals
        where id = goal_id
          and user_id = auth.uid()
      )
    )
  );

create index if not exists idx_tasks_user_status on public.tasks (user_id, status);
create index if not exists idx_tasks_user_top on public.tasks (user_id) where is_top_priority;
create index if not exists idx_tasks_completed_at on public.tasks (user_id, completed_at);
create index if not exists idx_inbox_archived on public.inbox_items (user_id, is_archived);
create index if not exists idx_notes_favorite on public.notes (user_id, is_favorite);
create index if not exists idx_reviews_period on public.review_entries (user_id, review_type, period_start);

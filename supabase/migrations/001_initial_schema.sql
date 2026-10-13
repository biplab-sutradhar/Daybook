create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_date date,
  status text not null check (status in ('active', 'paused', 'completed')) default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null check (status in ('todo', 'in_progress', 'completed')) default 'todo',
  priority text not null check (priority in ('low', 'normal', 'high')) default 'normal',
  due_date date,
  goal_id uuid references public.goals(id) on delete set null,
  is_top_priority boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text,
  item_type text not null check (item_type in ('unsorted', 'task', 'note', 'goal')) default 'unsorted',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_type text not null check (review_type in ('daily', 'weekly')),
  period_start date not null,
  period_end date not null,
  went_well text,
  lessons_learned text,
  improvements text,
  next_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, review_type, period_start, period_end)
);

create index if not exists idx_tasks_user_id on public.tasks (user_id);
create index if not exists idx_tasks_due_date on public.tasks (due_date);
create index if not exists idx_tasks_status on public.tasks (status);
create index if not exists idx_tasks_goal_id on public.tasks (goal_id);
create index if not exists idx_daily_logs_user_id on public.daily_logs (user_id);
create index if not exists idx_daily_logs_entry_date on public.daily_logs (entry_date);
create index if not exists idx_goals_user_id on public.goals (user_id);
create index if not exists idx_notes_user_id on public.notes (user_id);
create index if not exists idx_notes_tags on public.notes using gin (tags);
create index if not exists idx_inbox_user_id on public.inbox_items (user_id);
create index if not exists idx_review_entries_user_id on public.review_entries (user_id);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.daily_logs enable row level security;
alter table public.goals enable row level security;
alter table public.notes enable row level security;
alter table public.inbox_items enable row level security;
alter table public.review_entries enable row level security;

drop policy if exists "profiles_select_private" on public.profiles;
create policy "profiles_select_private" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_private" on public.profiles;
create policy "profiles_insert_private" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_private" on public.profiles;
create policy "profiles_update_private" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_delete_private" on public.profiles;
create policy "profiles_delete_private" on public.profiles
  for delete using (auth.uid() = id);

drop policy if exists "tasks_select_private" on public.tasks;
create policy "tasks_select_private" on public.tasks
  for select using (auth.uid() = user_id);

drop policy if exists "tasks_insert_private" on public.tasks;
create policy "tasks_insert_private" on public.tasks
  for insert with check (auth.uid() = user_id);

drop policy if exists "tasks_update_private" on public.tasks;
create policy "tasks_update_private" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id and (goal_id is null or goal_id in (select id from public.goals where user_id = auth.uid())));

drop policy if exists "tasks_delete_private" on public.tasks;
create policy "tasks_delete_private" on public.tasks
  for delete using (auth.uid() = user_id);

drop policy if exists "daily_logs_select_private" on public.daily_logs;
create policy "daily_logs_select_private" on public.daily_logs
  for select using (auth.uid() = user_id);

drop policy if exists "daily_logs_insert_private" on public.daily_logs;
create policy "daily_logs_insert_private" on public.daily_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "daily_logs_update_private" on public.daily_logs;
create policy "daily_logs_update_private" on public.daily_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "daily_logs_delete_private" on public.daily_logs;
create policy "daily_logs_delete_private" on public.daily_logs
  for delete using (auth.uid() = user_id);

drop policy if exists "goals_select_private" on public.goals;
create policy "goals_select_private" on public.goals
  for select using (auth.uid() = user_id);

drop policy if exists "goals_insert_private" on public.goals;
create policy "goals_insert_private" on public.goals
  for insert with check (auth.uid() = user_id);

drop policy if exists "goals_update_private" on public.goals;
create policy "goals_update_private" on public.goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "goals_delete_private" on public.goals;
create policy "goals_delete_private" on public.goals
  for delete using (auth.uid() = user_id);

drop policy if exists "notes_select_private" on public.notes;
create policy "notes_select_private" on public.notes
  for select using (auth.uid() = user_id);

drop policy if exists "notes_insert_private" on public.notes;
create policy "notes_insert_private" on public.notes
  for insert with check (auth.uid() = user_id);

drop policy if exists "notes_update_private" on public.notes;
create policy "notes_update_private" on public.notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes_delete_private" on public.notes;
create policy "notes_delete_private" on public.notes
  for delete using (auth.uid() = user_id);

drop policy if exists "inbox_select_private" on public.inbox_items;
create policy "inbox_select_private" on public.inbox_items
  for select using (auth.uid() = user_id);

drop policy if exists "inbox_insert_private" on public.inbox_items;
create policy "inbox_insert_private" on public.inbox_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "inbox_update_private" on public.inbox_items;
create policy "inbox_update_private" on public.inbox_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "inbox_delete_private" on public.inbox_items;
create policy "inbox_delete_private" on public.inbox_items
  for delete using (auth.uid() = user_id);

drop policy if exists "reviews_select_private" on public.review_entries;
create policy "reviews_select_private" on public.review_entries
  for select using (auth.uid() = user_id);

drop policy if exists "reviews_insert_private" on public.review_entries;
create policy "reviews_insert_private" on public.review_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "reviews_update_private" on public.review_entries;
create policy "reviews_update_private" on public.review_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reviews_delete_private" on public.review_entries;
create policy "reviews_delete_private" on public.review_entries
  for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

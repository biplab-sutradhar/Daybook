import type { DemoStatus } from './demo';
import { formatDbError } from './errors';
import { goalUpdatePayload } from './goals';
import { noteUpdatePayload } from './notes';
import { requireSupabaseClient } from './supabase';
import { taskUpdatePayload } from './tasks';
import { cleanItems, entryUpdatePayload, topicUpdatePayload, validateEntry, validateTopicTitle } from './topics';
import type {
  DailyLog,
  EntryInput,
  EntryPatch,
  Goal,
  GoalInput,
  GoalPatch,
  InboxInput,
  InboxItem,
  InboxPatch,
  Note,
  NoteInput,
  NotePatch,
  Profile,
  ReviewDraft,
  ReviewEntry,
  Task,
  TaskInput,
  TaskPatch,
  Topic,
  TopicEntry,
  TopicInput,
  TopicPatch,
} from './types';

type QueryError = { message: string; code?: string };

interface QueryResult<T> {
  data: T | null;
  error: QueryError | null;
}

function assertData<T>(result: QueryResult<T>, fallback: string): T {
  if (result.error || result.data === null) {
    throw new Error(formatDbError(result.error, fallback));
  }
  return result.data;
}

function assertList<T>(result: QueryResult<T[]>, fallback: string): T[] {
  if (result.error) throw new Error(formatDbError(result.error, fallback));
  return result.data ?? [];
}

function assertWrite(error: QueryError | null, fallback: string) {
  if (error) throw new Error(formatDbError(error, fallback));
}

async function assertDeleted(table: string, id: string, fallback: string) {
  const supabase = requireSupabaseClient();
  const result = await supabase.from(table).delete({ count: 'exact' }).eq('id', id);
  assertWrite(result.error, fallback);
  if (!result.count) {
    throw new Error('That record was not found, or it is not available to this account.');
  }
}

export interface WorkspaceData {
  profile: Profile | null;
  tasks: Task[];
  goals: Goal[];
  notes: Note[];
  inbox: InboxItem[];
  logs: DailyLog[];
  reviews: ReviewEntry[];
  topics: Topic[];
  entries: TopicEntry[];
}

function normalizeEntry(entry: TopicEntry): TopicEntry {
  return { ...entry, items: Array.isArray(entry.items) ? entry.items : [] };
}

export async function fetchWorkspace(): Promise<WorkspaceData> {
  const supabase = requireSupabaseClient();
  const [tasks, goals, notes, inbox, logs, reviews, topics, entries, profile] = await Promise.all([
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('goals').select('*').order('created_at', { ascending: false }),
    supabase.from('notes').select('*').order('updated_at', { ascending: false }),
    supabase.from('inbox_items').select('*').order('created_at', { ascending: false }),
    supabase.from('daily_logs').select('*').order('entry_date', { ascending: false }),
    supabase.from('review_entries').select('*').order('period_start', { ascending: false }),
    supabase.from('topics').select('*').order('last_activity_at', { ascending: false }),
    supabase.from('topic_entries').select('*').order('created_at', { ascending: true }),
    supabase.from('profiles').select('*').maybeSingle(),
  ]);

  if (profile.error) throw new Error(formatDbError(profile.error, 'Could not load your profile.'));

  return {
    tasks: assertList(tasks, 'Could not load tasks.'),
    goals: assertList(goals, 'Could not load goals.'),
    notes: assertList(notes, 'Could not load notes.'),
    inbox: assertList(inbox, 'Could not load inbox items.'),
    logs: assertList(logs, 'Could not load daily logs.'),
    reviews: assertList(reviews, 'Could not load reviews.'),
    topics: assertList<Topic>(topics, 'Could not load topics.'),
    entries: assertList<TopicEntry>(entries, 'Could not load topic entries.').map(normalizeEntry),
    profile: profile.data as Profile | null,
  };
}

export async function createTopic(userId: string, input: TopicInput) {
  const supabase = requireSupabaseClient();
  const result = await supabase.from('topics').insert({
    user_id: userId,
    title: validateTopicTitle(input.title),
    left_off: input.left_off ?? '',
    status: input.status ?? 'active',
  }).select('*').single();

  return assertData(result, 'Could not create the topic.') as Topic;
}

export async function updateTopic(id: string, patch: TopicPatch) {
  const supabase = requireSupabaseClient();
  const result = await supabase.from('topics').update(topicUpdatePayload(patch)).eq('id', id).select('*').single();
  return assertData(result, 'Could not update the topic.') as Topic;
}

export async function deleteTopic(id: string) {
  await assertDeleted('topics', id, 'Could not delete the topic.');
}

export async function createEntry(userId: string, input: EntryInput) {
  validateEntry(input);
  const supabase = requireSupabaseClient();
  const result = await supabase.from('topic_entries').insert({
    user_id: userId,
    topic_id: input.topic_id,
    kind: input.kind,
    content: input.content.trim(),
    items: cleanItems(input.items),
  }).select('*').single();

  return normalizeEntry(assertData(result, 'Could not save the note.') as TopicEntry);
}

export async function updateEntry(id: string, patch: EntryPatch) {
  const supabase = requireSupabaseClient();
  const result = await supabase.from('topic_entries').update(entryUpdatePayload(patch)).eq('id', id).select('*').single();
  return normalizeEntry(assertData(result, 'Could not update the note.') as TopicEntry);
}

export async function deleteEntry(id: string) {
  await assertDeleted('topic_entries', id, 'Could not delete the note.');
}

export async function ensureProfile(userId: string, displayName: string, email: string | undefined) {
  const supabase = requireSupabaseClient();
  const existing = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (existing.error) throw new Error(formatDbError(existing.error, 'Could not load your profile.'));

  const profile = existing.data as Profile | null;
  if (!profile) {
    const inserted = await supabase.from('profiles').insert({ id: userId, display_name: displayName || null }).select('*').single();
    if (inserted.error && /duplicate key|already exists/i.test(inserted.error.message)) {
      const again = await supabase.from('profiles').select('*').eq('id', userId).single();
      return assertData(again, 'Could not load your profile.') as Profile;
    }
    return assertData(inserted, 'Could not create your profile.') as Profile;
  }

  if (displayName && (!profile.display_name || profile.display_name === email)) {
    const updated = await supabase.from('profiles').update({ display_name: displayName, updated_at: new Date().toISOString() }).eq('id', userId).select('*').single();
    return assertData(updated, 'Could not update your profile.') as Profile;
  }

  return profile;
}

export async function createTask(userId: string, input: TaskInput) {
  const supabase = requireSupabaseClient();
  const now = new Date().toISOString();
  const result = await supabase.from('tasks').insert({
    user_id: userId,
    title: input.title.trim(),
    description: input.description.trim() || null,
    status: input.status,
    priority: input.priority,
    due_date: input.due_date || null,
    goal_id: input.goal_id,
    is_top_priority: input.is_top_priority,
    completed_at: input.status === 'completed' ? now : null,
  }).select('*').single();

  return assertData(result, 'Could not create the task.') as Task;
}

export async function updateTask(id: string, patch: TaskPatch) {
  const supabase = requireSupabaseClient();
  const result = await supabase.from('tasks').update(taskUpdatePayload(patch)).eq('id', id).select('*').single();
  return assertData(result, 'Could not update the task.') as Task;
}

export async function deleteTask(id: string) {
  await assertDeleted('tasks', id, 'Could not delete the task.');
}

export async function createGoal(userId: string, input: GoalInput) {
  const supabase = requireSupabaseClient();
  const result = await supabase.from('goals').insert({
    user_id: userId,
    title: input.title.trim(),
    description: input.description.trim() || null,
    target_date: input.target_date || null,
    status: input.status,
  }).select('*').single();

  return assertData(result, 'Could not create the goal.') as Goal;
}

export async function updateGoal(id: string, patch: GoalPatch) {
  const supabase = requireSupabaseClient();
  const result = await supabase.from('goals').update(goalUpdatePayload(patch)).eq('id', id).select('*').single();
  return assertData(result, 'Could not update the goal.') as Goal;
}

export async function deleteGoal(id: string) {
  await assertDeleted('goals', id, 'Could not delete the goal.');
}

export async function createNote(userId: string, input: NoteInput) {
  const supabase = requireSupabaseClient();
  const result = await supabase.from('notes').insert({
    user_id: userId,
    title: input.title.trim(),
    content: input.content,
    tags: input.tags,
    is_favorite: input.is_favorite,
  }).select('*').single();

  return assertData(result, 'Could not create the note.') as Note;
}

export async function updateNote(id: string, patch: NotePatch) {
  const supabase = requireSupabaseClient();
  const result = await supabase.from('notes').update(noteUpdatePayload(patch)).eq('id', id).select('*').single();
  return assertData(result, 'Could not update the note.') as Note;
}

export async function deleteNote(id: string) {
  await assertDeleted('notes', id, 'Could not delete the note.');
}

export async function createInboxItem(userId: string, input: InboxInput) {
  const title = input.title.trim();
  if (!title) throw new Error('Write something before saving.');

  const supabase = requireSupabaseClient();
  const result = await supabase.from('inbox_items').insert({
    user_id: userId,
    title,
    content: input.content.trim() || null,
    item_type: input.item_type,
  }).select('*').single();

  return assertData(result, 'Could not save the capture.') as InboxItem;
}

export async function updateInboxItem(id: string, patch: InboxPatch) {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new Error('A capture needs some text.');
    payload.title = title;
  }
  if (patch.content !== undefined) payload.content = patch.content?.trim() || null;
  if (patch.item_type !== undefined) payload.item_type = patch.item_type;
  if (patch.is_archived !== undefined) payload.is_archived = patch.is_archived;

  const supabase = requireSupabaseClient();
  const result = await supabase.from('inbox_items').update(payload).eq('id', id).select('*').single();
  return assertData(result, 'Could not update the capture.') as InboxItem;
}

export async function deleteInboxItem(id: string) {
  await assertDeleted('inbox_items', id, 'Could not delete the capture.');
}

export async function saveDailyLog(userId: string, entryDate: string, content: string) {
  const supabase = requireSupabaseClient();
  const result = await supabase.from('daily_logs').upsert({
    user_id: userId,
    entry_date: entryDate,
    content,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,entry_date' }).select('*').single();

  return assertData(result, 'Could not save the daily log.') as DailyLog;
}

export async function saveReview(userId: string, draft: ReviewDraft) {
  const supabase = requireSupabaseClient();
  const result = await supabase.from('review_entries').upsert({
    user_id: userId,
    review_type: draft.review_type,
    period_start: draft.period_start,
    period_end: draft.period_end,
    went_well: draft.went_well.trim() || null,
    lessons_learned: draft.lessons_learned.trim() || null,
    improvements: draft.improvements.trim() || null,
    next_focus: draft.next_focus.trim() || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,review_type,period_start,period_end' }).select('*').single();

  return assertData(result, 'Could not save the review.') as ReviewEntry;
}

export async function fetchDemoStatus(): Promise<DemoStatus | null> {
  try {
    const supabase = requireSupabaseClient();
    const result = await supabase.rpc('demo_status');
    if (result.error || result.data == null) return null;
    return result.data as DemoStatus;
  } catch {
    return null;
  }
}

export async function purgeExpiredAccounts() {
  try {
    const supabase = requireSupabaseClient();
    await supabase.rpc('purge_expired_demo_users');
  } catch {
    // The sign-in screen still works when the purge function is not installed yet.
  }
}

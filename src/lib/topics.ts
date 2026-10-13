import { dateKeyToLocalDate, timestampToLocalDateKey, toLocalDateKey } from './date';
import type { ChecklistItem, DailyLog, EntryKind, EntryPatch, Task, Topic, TopicEntry, TopicPatch } from './types';

export const UNSORTED_ID = 'unsorted';
export const STALE_AFTER_DAYS = 7;
export const RESUME_AFTER_DAYS = 3;

const DAY_MS = 86_400_000;

export function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function timeOf(iso: string) {
  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? 0 : value;
}

export function byNewest(left: string, right: string) {
  return timeOf(right) - timeOf(left);
}

export function checklistFromText(text: string): ChecklistItem[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\[[ xX]?\]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .map((line) => ({ id: makeId(), text: line, done: false }));
}

export function cleanItems(items: ChecklistItem[]): ChecklistItem[] {
  return items
    .map((item) => ({ id: item.id || makeId(), text: item.text.trim(), done: Boolean(item.done) }))
    .filter((item) => item.text);
}

export function entryText(entry: { kind: EntryKind; content: string; items: ChecklistItem[] }) {
  if (entry.kind === 'checklist') {
    return [entry.content, ...entry.items.map((item) => item.text)].filter((part) => part.trim()).join('\n');
  }
  return entry.content;
}

export function entryPreview(entry: { kind: EntryKind; content: string; items: ChecklistItem[] }, max = 140) {
  const text = entryText(entry).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function validateEntry(entry: { kind: EntryKind; content: string; items: ChecklistItem[] }) {
  if (entry.kind === 'checklist') {
    if (!entry.items.some((item) => item.text.trim())) throw new Error('Add at least one checklist item.');
    return;
  }
  if (!entry.content.trim()) throw new Error('Write something before saving.');
}

export function validateTopicTitle(title: string) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('A topic needs a title.');
  if (trimmed.length > 120) throw new Error('Keep the topic title under 120 characters.');
  return trimmed;
}

export function topicUpdatePayload(patch: TopicPatch) {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = validateTopicTitle(patch.title);
  if (patch.left_off !== undefined) {
    payload.left_off = patch.left_off;
    payload.last_activity_at = now;
  }
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.is_pinned !== undefined) payload.is_pinned = patch.is_pinned;
  payload.updated_at = now;
  return payload;
}

export function entryUpdatePayload(patch: EntryPatch) {
  const payload: Record<string, unknown> = {};
  if (patch.topic_id !== undefined) payload.topic_id = patch.topic_id;
  if (patch.kind !== undefined) payload.kind = patch.kind;
  if (patch.content !== undefined) payload.content = patch.content.trim();
  if (patch.items !== undefined) payload.items = cleanItems(patch.items);
  payload.updated_at = new Date().toISOString();
  return payload;
}

export function daysBetweenKeys(fromKey: string, toKey: string) {
  return Math.round((dateKeyToLocalDate(toKey).getTime() - dateKeyToLocalDate(fromKey).getTime()) / DAY_MS);
}

export function daysSince(iso: string, now: Date = new Date()) {
  const key = timestampToLocalDateKey(iso);
  if (!key) return 0;
  return Math.max(0, daysBetweenKeys(key, toLocalDateKey(now)));
}

export function isStale(topic: Pick<Topic, 'status' | 'last_activity_at'>, now: Date = new Date()) {
  return topic.status === 'active' && daysSince(topic.last_activity_at, now) >= STALE_AFTER_DAYS;
}

export function sortTopics(topics: Topic[]) {
  return [...topics].sort((left, right) => Number(right.is_pinned) - Number(left.is_pinned) || byNewest(left.last_activity_at, right.last_activity_at));
}

export function recentTopics(topics: Topic[], limit = 5) {
  return topics
    .filter((topic) => topic.status !== 'done')
    .sort((left, right) => byNewest(left.last_activity_at, right.last_activity_at))
    .slice(0, limit);
}

export function entriesForTopic(entries: TopicEntry[], topicId: string | null) {
  return entries
    .filter((entry) => entry.topic_id === topicId)
    .sort((left, right) => timeOf(left.created_at) - timeOf(right.created_at));
}

export function latestEntry(entries: TopicEntry[], topicId: string | null) {
  let latest: TopicEntry | null = null;
  for (const entry of entries) {
    if (entry.topic_id !== topicId) continue;
    if (!latest || timeOf(entry.created_at) > timeOf(latest.created_at)) latest = entry;
  }
  return latest;
}

export function groupEntriesByDay(entries: TopicEntry[]) {
  const sorted = [...entries].sort((left, right) => timeOf(left.created_at) - timeOf(right.created_at));
  const groups: Array<{ day: string; entries: TopicEntry[] }> = [];
  for (const entry of sorted) {
    const day = timestampToLocalDateKey(entry.created_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.entries.push(entry);
    else groups.push({ day, entries: [entry] });
  }
  return groups;
}

export type ActivityKind = 'entry' | 'topic' | 'task' | 'log';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  day: string;
  at: string;
  title: string;
  topicId: string | null;
  topicTitle: string | null;
  checklist?: boolean;
}

export interface ActivityDay {
  day: string;
  events: ActivityEvent[];
}

export function buildActivityTimeline(
  data: { topics: Topic[]; entries: TopicEntry[]; tasks: Task[]; logs: DailyLog[] },
  options: { sinceDay?: string | null; topicFilter?: string | null } = {},
): ActivityDay[] {
  const titles = new Map(data.topics.map((topic) => [topic.id, topic.title]));
  const filter = options.topicFilter ?? null;
  const matchesTopic = (topicId: string | null) => {
    if (filter === null) return true;
    if (filter === UNSORTED_ID) return topicId === null;
    return topicId === filter;
  };
  const events: ActivityEvent[] = [];

  for (const entry of data.entries) {
    if (!matchesTopic(entry.topic_id)) continue;
    events.push({
      id: `entry-${entry.id}`,
      kind: 'entry',
      day: timestampToLocalDateKey(entry.created_at),
      at: entry.created_at,
      title: entryPreview(entry),
      topicId: entry.topic_id,
      topicTitle: entry.topic_id ? titles.get(entry.topic_id) ?? null : null,
      checklist: entry.kind === 'checklist',
    });
  }

  for (const topic of data.topics) {
    if (!matchesTopic(topic.id)) continue;
    events.push({
      id: `topic-${topic.id}`,
      kind: 'topic',
      day: timestampToLocalDateKey(topic.created_at),
      at: topic.created_at,
      title: topic.title,
      topicId: topic.id,
      topicTitle: topic.title,
    });
  }

  if (filter === null) {
    for (const task of data.tasks) {
      if (task.status !== 'completed' || !task.completed_at) continue;
      events.push({
        id: `task-${task.id}`,
        kind: 'task',
        day: timestampToLocalDateKey(task.completed_at),
        at: task.completed_at,
        title: task.title,
        topicId: null,
        topicTitle: null,
      });
    }

    for (const log of data.logs) {
      if (!log.content.trim()) continue;
      events.push({
        id: `log-${log.id}`,
        kind: 'log',
        day: log.entry_date,
        at: log.updated_at,
        title: log.content.replace(/\s+/g, ' ').trim().slice(0, 140),
        topicId: null,
        topicTitle: null,
      });
    }
  }

  const since = options.sinceDay ?? null;
  const byDay = new Map<string, ActivityEvent[]>();
  for (const event of events) {
    if (!event.day || (since && event.day < since)) continue;
    const list = byDay.get(event.day);
    if (list) list.push(event);
    else byDay.set(event.day, [event]);
  }

  return [...byDay.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([day, dayEvents]) => ({ day, events: dayEvents.sort((left, right) => byNewest(left.at, right.at)) }));
}

export function summarizeTopics(days: ActivityDay[]) {
  const counts = new Map<string, { topicId: string | null; title: string | null; count: number }>();
  for (const day of days) {
    for (const event of day.events) {
      if (event.kind !== 'entry') continue;
      const key = event.topicId ?? UNSORTED_ID;
      const current = counts.get(key);
      if (current) current.count += 1;
      else counts.set(key, { topicId: event.topicId, title: event.topicTitle, count: 1 });
    }
  }
  return [...counts.values()].sort((left, right) => right.count - left.count);
}

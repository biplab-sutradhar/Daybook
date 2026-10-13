import { formatDate } from './date';
import { entryPreview } from './topics';
import type { DailyLog, InboxItem, Note, Task, Topic, TopicEntry } from './types';

export interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  at: string;
}

export function buildActivity(input: {
  tasks: Task[];
  notes: Note[];
  inbox: InboxItem[];
  logs: DailyLog[];
  topics?: Topic[];
  entries?: TopicEntry[];
}): ActivityItem[] {
  const topicTitles = new Map((input.topics ?? []).map((topic) => [topic.id, topic.title]));
  const copiedNotes = new Map((input.topics ?? []).filter((topic) => topic.source_note_id).map((topic) => [topic.source_note_id, topic.updated_at]));
  const visibleNotes = input.notes.filter((note) => {
    const copiedAt = copiedNotes.get(note.id);
    return !copiedAt || new Date(note.updated_at).getTime() > new Date(copiedAt).getTime();
  });
  const items: ActivityItem[] = [
    ...input.tasks.map((task) => ({
      id: `task-${task.id}`,
      label: task.status === 'completed' ? 'Completed a task' : 'Updated a task',
      detail: task.title,
      at: task.completed_at && task.status === 'completed' ? task.completed_at : task.updated_at,
    })),
    ...(input.entries ?? []).map((entry) => ({
      id: `entry-${entry.id}`,
      label: entry.topic_id ? `Wrote in ${topicTitles.get(entry.topic_id) ?? 'a topic'}` : 'Wrote an unsorted note',
      detail: entryPreview(entry, 80),
      at: entry.updated_at,
    })),
    ...visibleNotes.map((note) => ({
      id: `note-${note.id}`,
      label: note.is_favorite ? 'Updated a favorite classic note' : 'Updated a classic note',
      detail: note.title || 'Untitled note',
      at: note.updated_at,
    })),
    ...input.inbox.map((item) => ({
      id: `inbox-${item.id}`,
      label: item.is_archived ? 'Archived a capture' : 'Captured a thought',
      detail: item.title,
      at: item.updated_at,
    })),
    ...input.logs
      .filter((log) => log.content.trim())
      .map((log) => ({
        id: `log-${log.id}`,
        label: 'Wrote a daily log',
        detail: formatDate(log.entry_date),
        at: log.updated_at,
      })),
  ];

  return items.sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime()).slice(0, 6);
}

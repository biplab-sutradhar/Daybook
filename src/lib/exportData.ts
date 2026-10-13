import { formatTime, timestampToLocalDateKey, toLocalDateKey } from './date';
import type { WorkspaceData } from './db';
import { entriesForTopic, groupEntriesByDay, sortTopics } from './topics';
import type { DailyLog, Note, Topic, TopicEntry } from './types';

export interface WorkspaceExport extends WorkspaceData {
  format_version: 1;
  exported_at: string;
}

export function buildExport(data: WorkspaceData): WorkspaceExport {
  return {
    format_version: 1,
    exported_at: new Date().toISOString(),
    ...data,
  };
}

export function notesToMarkdown(notes: Note[]) {
  if (notes.length === 0) return '# Notes\n\nNo notes yet.\n';

  const body = [...notes]
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
    .map((note) => {
      const tags = note.tags.length ? `\n\nTags: ${note.tags.join(', ')}` : '';
      const favorite = note.is_favorite ? '\n\nFavorite: yes' : '';
      return `## ${note.title}\n${tags}${favorite}\n\n${note.content}`.trimEnd();
    })
    .join('\n\n');

  return `# Notes\n\n${body}\n`;
}

function entryToMarkdown(entry: TopicEntry) {
  const time = `_${formatTime(entry.created_at)}_`;
  if (entry.kind === 'checklist') {
    const items = entry.items.map((item) => `- [${item.done ? 'x' : ' '}] ${item.text}`).join('\n');
    return [time, entry.content.trim(), items].filter(Boolean).join('\n\n');
  }
  return `${time}\n\n${entry.content.trim()}`;
}

function timelineToMarkdown(entries: TopicEntry[]) {
  if (entries.length === 0) return '_No notes yet._';
  return groupEntriesByDay(entries)
    .map(({ day, entries: dayEntries }) => `### ${day}\n\n${dayEntries.map(entryToMarkdown).join('\n\n')}`)
    .join('\n\n');
}

export function topicsToMarkdown(topics: Topic[], entries: TopicEntry[]) {
  const unsorted = entriesForTopic(entries, null);
  if (topics.length === 0 && unsorted.length === 0) return '# Notes by topic\n\nNo topics yet.\n';

  const sections = sortTopics(topics).map((topic) => {
    const meta = [`Status: ${topic.status}`, topic.is_pinned ? 'Pinned' : '', `Started: ${timestampToLocalDateKey(topic.created_at)}`].filter(Boolean).join(' · ');
    const leftOff = topic.left_off.trim() ? `\n\n**Where I left off:** ${topic.left_off.trim()}` : '';
    return `## ${topic.title}\n\n${meta}${leftOff}\n\n${timelineToMarkdown(entriesForTopic(entries, topic.id))}`;
  });
  if (unsorted.length) sections.push(`## Unsorted\n\n${timelineToMarkdown(unsorted)}`);

  return `# Notes by topic\n\n${sections.join('\n\n')}\n`;
}

export function logsToMarkdown(logs: DailyLog[]) {
  if (logs.length === 0) return '# Daily logs\n\nNo daily logs yet.\n';

  const body = [...logs]
    .sort((left, right) => right.entry_date.localeCompare(left.entry_date))
    .map((log) => `## ${log.entry_date}\n\n${log.content || '_Empty entry._'}`)
    .join('\n\n');

  return `# Daily logs\n\n${body}\n`;
}

export function downloadText(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  // Firefox ignores clicks on detached anchors, and Safari cancels the download if the URL is revoked synchronously.
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportFilename(kind: 'json' | 'topics' | 'notes' | 'logs') {
  const day = toLocalDateKey();
  if (kind === 'json') return `daybook-${day}.json`;
  if (kind === 'topics') return `daybook-topics-${day}.md`;
  if (kind === 'notes') return `daybook-classic-notes-${day}.md`;
  return `daybook-daily-logs-${day}.md`;
}

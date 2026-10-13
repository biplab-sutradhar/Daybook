import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CircleCheck, FolderPlus, ListChecks, NotebookPen, StickyNote } from 'lucide-react';

import { formatDayLabel, formatTime, shiftDateKey, toLocalDateKey } from '../lib/date';
import { buildActivityTimeline, summarizeTopics, UNSORTED_ID, type ActivityEvent } from '../lib/topics';
import { cn } from '../lib/utils';
import type { WorkspaceController } from '../hooks/useWorkspace';
import { EmptyState, FilterChips, PageHeader, Select } from '../components/ui';

type Range = '7' | '30' | 'all';

const ALL_TOPICS = '__all__';

function iconFor(event: ActivityEvent): LucideIcon {
  if (event.kind === 'task') return CircleCheck;
  if (event.kind === 'log') return NotebookPen;
  if (event.kind === 'topic') return FolderPlus;
  return event.checklist ? ListChecks : StickyNote;
}

function labelFor(event: ActivityEvent) {
  if (event.kind === 'task') return 'Completed to-do';
  if (event.kind === 'log') return 'Daily log';
  if (event.kind === 'topic') return 'Started topic';
  return event.checklist ? 'Checklist' : 'Note';
}

export function ActivityPage({
  workspace,
  onOpenTopic,
  onOpenTasks,
  onOpenLog,
}: {
  workspace: WorkspaceController;
  onOpenTopic: (topicId: string) => void;
  onOpenTasks: () => void;
  onOpenLog: (date: string) => void;
}) {
  const [range, setRange] = useState<Range>('7');
  const [topicFilter, setTopicFilter] = useState<string>(ALL_TOPICS);
  const today = toLocalDateKey();
  const sinceDay = range === 'all' ? null : shiftDateKey(today, -(Number(range) - 1));

  const days = useMemo(
    () => buildActivityTimeline(
      { topics: workspace.topics, entries: workspace.entries, tasks: workspace.tasks, logs: workspace.logs },
      { sinceDay, topicFilter: topicFilter === ALL_TOPICS ? null : topicFilter },
    ),
    [sinceDay, topicFilter, workspace.entries, workspace.logs, workspace.tasks, workspace.topics],
  );
  const summary = useMemo(() => summarizeTopics(days), [days]);
  const totalEntries = summary.reduce((total, item) => total + item.count, 0);
  const rangeLabel = range === '7' ? 'in the last 7 days' : range === '30' ? 'in the last 30 days' : 'in total';
  const sortedTopics = [...workspace.topics].sort((left, right) => left.title.localeCompare(right.title));

  function open(event: ActivityEvent) {
    if (event.kind === 'task') return onOpenTasks();
    if (event.kind === 'log') return onOpenLog(event.day);
    onOpenTopic(event.topicId ?? UNSORTED_ID);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Your log"
        title="Activity"
        description="What you worked on, and under which topic, day by day."
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips
          label="Time range"
          value={range}
          onChange={(next) => setRange(next)}
          options={[
            { id: '7', label: '7 days' },
            { id: '30', label: '30 days' },
            { id: 'all', label: 'All time' },
          ]}
        />
        <Select aria-label="Filter by topic" className="sm:w-64" value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}>
          <option value={ALL_TOPICS}>All activity</option>
          <option value={UNSORTED_ID}>Unsorted notes</option>
          {sortedTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
        </Select>
      </div>

      {topicFilter === ALL_TOPICS && summary.length > 0 && (
        <section className="surface p-4">
          <h3 className="text-sm font-semibold">
            {totalEntries} {totalEntries === 1 ? 'note' : 'notes'} across {summary.length} {summary.length === 1 ? 'topic' : 'topics'} {rangeLabel}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.map((item) => (
              <button
                key={item.topicId ?? UNSORTED_ID}
                type="button"
                className="chip"
                onClick={() => setTopicFilter(item.topicId ?? UNSORTED_ID)}
              >
                <span className="max-w-48 truncate">{item.topicId ? item.title ?? 'Topic' : 'Unsorted'}</span>
                <span className="min-w-5 rounded-full bg-stone-100 px-1.5 text-center text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">{item.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {topicFilter !== ALL_TOPICS && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-stone-500">Showing only</span>
          <span className="font-medium">{topicFilter === UNSORTED_ID ? 'Unsorted notes' : workspace.topics.find((topic) => topic.id === topicFilter)?.title ?? 'this topic'}</span>
          <button type="button" className="rounded-lg px-2 py-1 font-medium text-stone-600 underline hover:text-stone-900 dark:text-stone-300 dark:hover:text-white" onClick={() => setTopicFilter(ALL_TOPICS)}>Show everything</button>
          <button type="button" className="rounded-lg px-2 py-1 font-medium text-stone-600 underline hover:text-stone-900 dark:text-stone-300 dark:hover:text-white" onClick={() => onOpenTopic(topicFilter)}>Open topic</button>
        </div>
      )}

      {days.length === 0 ? (
        <EmptyState
          title="Nothing logged in this period"
          description="Notes you add to topics, to-dos you complete, and daily logs will show up here, grouped by day."
        />
      ) : (
        <div className="space-y-5">
          {days.map((day) => (
            <section key={day.day}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold">{formatDayLabel(day.day, today)}</h3>
                <span className="text-xs text-stone-500">{day.events.length} {day.events.length === 1 ? 'item' : 'items'}</span>
              </div>
              <ol className="surface divide-y divide-stone-100 overflow-hidden dark:divide-stone-800">
                {day.events.map((event) => {
                  const Icon = iconFor(event);
                  return (
                    <li key={event.id}>
                      <button type="button" onClick={() => open(event)} className="flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-stone-50 sm:px-4 dark:hover:bg-stone-800/60">
                        <span
                          className={cn(
                            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                            event.kind === 'task' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
                            event.kind === 'log' && 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
                            event.kind === 'topic' && 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
                            event.kind === 'entry' && 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
                          )}
                        >
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                            {(event.kind === 'entry' || event.kind === 'topic') && (
                              <span className={cn('badge max-w-56 truncate', event.topicId ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200')}>
                                {event.topicId ? event.topicTitle ?? 'Topic' : 'Unsorted'}
                              </span>
                            )}
                            <span>{labelFor(event)}</span>
                            {event.kind !== 'log' && <span>· {formatTime(event.at)}</span>}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-sm break-words">{event.title}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

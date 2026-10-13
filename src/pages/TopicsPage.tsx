import { useMemo, useState } from 'react';
import { ChevronRight, Clock, Inbox, Pin, Search } from 'lucide-react';

import { formatDayLabel, timestampToLocalDateKey } from '../lib/date';
import { daysSince, entryPreview, entryText, isStale, latestEntry, sortTopics, UNSORTED_ID } from '../lib/topics';
import type { TopicStatus } from '../lib/types';
import { cn, formatRelativeTime } from '../lib/utils';
import type { WorkspaceController } from '../hooks/useWorkspace';
import { EmptyState, FilterChips, PageHeader, QuickAdd } from '../components/ui';

export function TopicsPage({
  workspace,
  notify,
  onOpenTopic,
}: {
  workspace: WorkspaceController;
  notify: (message: string) => void;
  onOpenTopic: (topicId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TopicStatus | 'all'>('active');
  const needle = query.trim().toLowerCase();
  const now = new Date();

  const entryCounts = useMemo(() => {
    const counts = new Map<string | null, number>();
    for (const entry of workspace.entries) counts.set(entry.topic_id, (counts.get(entry.topic_id) ?? 0) + 1);
    return counts;
  }, [workspace.entries]);
  const unsortedCount = entryCounts.get(null) ?? 0;

  const entryMatches = useMemo(() => {
    if (!needle) return [];
    return workspace.entries
      .filter((entry) => entryText(entry).toLowerCase().includes(needle))
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .slice(0, 20);
  }, [needle, workspace.entries]);

  const visible = useMemo(() => {
    const matchedTopicIds = new Set(entryMatches.map((entry) => entry.topic_id));
    return sortTopics(workspace.topics.filter((topic) => {
      if (needle) {
        return `${topic.title}\n${topic.left_off}`.toLowerCase().includes(needle) || matchedTopicIds.has(topic.id);
      }
      return filter === 'all' || topic.status === filter;
    }));
  }, [entryMatches, filter, needle, workspace.topics]);

  const titles = new Map(workspace.topics.map((topic) => [topic.id, topic.title]));
  const countFor = (status: TopicStatus) => workspace.topics.filter((topic) => topic.status === status).length;

  async function startTopic(title: string) {
    const topic = await workspace.createTopic({ title });
    notify(`Started “${topic.title}”.`);
    onOpenTopic(topic.id);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Notes"
        title="Topics"
        description="Every note lives under a topic, with a “where I left off” line, so you can always pick up the thread."
      />

      <QuickAdd label="Start a new topic" placeholder="Start a new topic, e.g. “Learning React hooks”…" buttonLabel="Start" onAdd={startTopic} />

      {unsortedCount > 0 && !needle && (
        <button
          type="button"
          onClick={() => onOpenTopic(UNSORTED_ID)}
          className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/60 dark:hover:bg-amber-950"
        >
          <Inbox size={20} className="shrink-0 text-amber-700 dark:text-amber-300" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-amber-900 dark:text-amber-100">Unsorted · {unsortedCount} {unsortedCount === 1 ? 'note needs' : 'notes need'} a topic</span>
            <span className="block text-sm text-amber-800/80 dark:text-amber-200/80">Give them a heading now, so you can find them later.</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-amber-700 dark:text-amber-300" />
        </button>
      )}

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" aria-hidden />
        <input type="search" className="field pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics and everything you wrote" aria-label="Search notes" />
      </div>

      {!needle && (
        <FilterChips
          label="Topic status"
          value={filter}
          onChange={(next) => setFilter(next)}
          options={[
            { id: 'active', label: 'Active', count: countFor('active') },
            { id: 'paused', label: 'Paused', count: countFor('paused') },
            { id: 'done', label: 'Done', count: countFor('done') },
            { id: 'all', label: 'All', count: workspace.topics.length },
          ]}
        />
      )}

      {needle && entryMatches.length > 0 && (
        <section className="surface p-3 sm:p-4">
          <h3 className="mb-2 px-1 text-sm font-semibold">Matching notes</h3>
          <ul className="space-y-1">
            {entryMatches.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="block w-full rounded-xl px-2 py-2 text-left hover:bg-stone-100 dark:hover:bg-stone-800"
                  onClick={() => onOpenTopic(entry.topic_id ?? UNSORTED_ID)}
                >
                  <span className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    <span className="badge bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200">{entry.topic_id ? titles.get(entry.topic_id) ?? 'Topic' : 'Unsorted'}</span>
                    {formatDayLabel(timestampToLocalDateKey(entry.created_at))}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm">{entryPreview(entry, 200)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {visible.length === 0 ? (
        needle ? (
          entryMatches.length === 0 && <EmptyState title="Nothing matches" description="Try a different word. Search covers topic titles, “left off” lines, and every note." />
        ) : workspace.topics.length === 0 ? (
          <EmptyState title="No topics yet" description="Start a topic above for anything you are learning, planning, or thinking about. Then add short notes to it over time." />
        ) : (
          <EmptyState title={`No ${filter} topics`} description="Switch the filter above to see your other topics." />
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((topic) => {
            const latest = latestEntry(workspace.entries, topic.id);
            const stale = isStale(topic, now);
            const count = entryCounts.get(topic.id) ?? 0;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => onOpenTopic(topic.id)}
                className={cn('surface flex flex-col p-4 text-left transition hover:border-stone-300 active:scale-[0.99] dark:hover:border-stone-700', topic.status === 'done' && 'opacity-75')}
              >
                <span className="flex items-start gap-2">
                  <span className="min-w-0 flex-1 font-semibold break-words">{topic.title}</span>
                  {topic.is_pinned && <Pin size={14} className="mt-1 shrink-0 fill-current text-stone-500" aria-label="Pinned" />}
                </span>
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  {topic.status !== 'active' && (
                    <span className="badge bg-stone-100 text-stone-600 capitalize dark:bg-stone-800 dark:text-stone-300">{topic.status}</span>
                  )}
                  {stale && (
                    <span className="badge gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                      <Clock size={11} />Not touched in {daysSince(topic.last_activity_at, now)} days
                    </span>
                  )}
                </span>
                {topic.left_off.trim() ? (
                  <span className="mt-2 line-clamp-2 text-sm text-stone-700 dark:text-stone-200">
                    <span className="font-medium text-stone-500">Left off: </span>{topic.left_off}
                  </span>
                ) : latest ? (
                  <span className="mt-2 line-clamp-2 text-sm text-stone-600 dark:text-stone-300">{entryPreview(latest)}</span>
                ) : (
                  <span className="mt-2 text-sm text-stone-400">No notes yet.</span>
                )}
                <span className="mt-auto pt-3 text-xs text-stone-500">
                  {count} {count === 1 ? 'note' : 'notes'} · {formatRelativeTime(topic.last_activity_at)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

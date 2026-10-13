import { describe, expect, it } from 'vitest';

import {
  buildActivityTimeline,
  checklistFromText,
  daysSince,
  entryPreview,
  groupEntriesByDay,
  isStale,
  recentTopics,
  sortTopics,
  summarizeTopics,
  UNSORTED_ID,
  validateEntry,
} from './topics';
import type { DailyLog, Task, Topic, TopicEntry } from './types';

function localIso(year: number, month: number, day: number, hour = 12) {
  return new Date(year, month - 1, day, hour).toISOString();
}

function topic(overrides: Partial<Topic>): Topic {
  return {
    id: 'topic',
    user_id: 'user',
    title: 'Topic',
    left_off: '',
    status: 'active',
    is_pinned: false,
    last_activity_at: localIso(2026, 10, 10),
    source_note_id: null,
    created_at: localIso(2026, 10, 1),
    updated_at: localIso(2026, 10, 1),
    ...overrides,
  };
}

function entry(overrides: Partial<TopicEntry>): TopicEntry {
  return {
    id: 'entry',
    user_id: 'user',
    topic_id: null,
    kind: 'text',
    content: 'Entry',
    items: [],
    created_at: localIso(2026, 10, 10),
    updated_at: localIso(2026, 10, 10),
    ...overrides,
  };
}

const now = new Date(2026, 9, 10, 18);

describe('staleness', () => {
  it('counts calendar days since the last activity', () => {
    expect(daysSince(localIso(2026, 10, 10, 1), now)).toBe(0);
    expect(daysSince(localIso(2026, 10, 9, 23), now)).toBe(1);
    expect(daysSince(localIso(2026, 10, 1), now)).toBe(9);
  });

  it('flags active topics untouched for a week', () => {
    expect(isStale(topic({ last_activity_at: localIso(2026, 10, 3) }), now)).toBe(true);
    expect(isStale(topic({ last_activity_at: localIso(2026, 10, 4) }), now)).toBe(false);
    expect(isStale(topic({ status: 'paused', last_activity_at: localIso(2026, 9, 1) }), now)).toBe(false);
  });
});

describe('topic ordering', () => {
  const topics = [
    topic({ id: 'old', last_activity_at: localIso(2026, 10, 1) }),
    topic({ id: 'new', last_activity_at: localIso(2026, 10, 9) }),
    topic({ id: 'pinned', is_pinned: true, last_activity_at: localIso(2026, 9, 1) }),
    topic({ id: 'done', status: 'done', last_activity_at: localIso(2026, 10, 10) }),
  ];

  it('puts pinned topics first, then the most recent', () => {
    expect(sortTopics(topics).map((item) => item.id)).toEqual(['pinned', 'done', 'new', 'old']);
  });

  it('suggests recent topics that are not done', () => {
    expect(recentTopics(topics, 2).map((item) => item.id)).toEqual(['new', 'old']);
  });
});

describe('entries', () => {
  it('groups entries by local day, oldest first', () => {
    const groups = groupEntriesByDay([
      entry({ id: 'c', created_at: localIso(2026, 10, 10, 9) }),
      entry({ id: 'a', created_at: localIso(2026, 10, 3, 8) }),
      entry({ id: 'b', created_at: localIso(2026, 10, 3, 20) }),
    ]);
    expect(groups.map((group) => group.day)).toEqual(['2026-10-03', '2026-10-10']);
    expect(groups[0].entries.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('turns pasted lines into checklist items', () => {
    const items = checklistFromText('- milk\n[ ] eggs\n\n2. bread\n  ');
    expect(items.map((item) => item.text)).toEqual(['milk', 'eggs', 'bread']);
    expect(items.every((item) => !item.done && item.id)).toBe(true);
  });

  it('previews checklist text', () => {
    expect(entryPreview(entry({ kind: 'checklist', content: 'Groceries', items: [{ id: '1', text: 'milk', done: false }] }))).toBe('Groceries milk');
  });

  it('rejects empty entries', () => {
    expect(() => validateEntry({ kind: 'text', content: '   ', items: [] })).toThrow();
    expect(() => validateEntry({ kind: 'checklist', content: 'Title', items: [] })).toThrow();
    expect(() => validateEntry({ kind: 'text', content: 'Idea', items: [] })).not.toThrow();
  });
});

describe('activity timeline', () => {
  const topics = [topic({ id: 'react', title: 'React hooks', created_at: localIso(2026, 10, 3, 9) })];
  const entries = [
    entry({ id: 'e1', topic_id: 'react', content: 'Started useEffect', created_at: localIso(2026, 10, 3, 10) }),
    entry({ id: 'e2', topic_id: 'react', content: 'Learned cleanup', created_at: localIso(2026, 10, 10, 9) }),
    entry({ id: 'e3', topic_id: null, content: 'Random thought', created_at: localIso(2026, 10, 10, 11) }),
  ];
  const tasks: Task[] = [{
    id: 't1', user_id: 'user', title: 'Ship it', description: null, status: 'completed', priority: 'normal', due_date: null,
    goal_id: null, is_top_priority: false, completed_at: localIso(2026, 10, 10, 15), created_at: localIso(2026, 10, 1), updated_at: localIso(2026, 10, 10, 15),
  }];
  const logs: DailyLog[] = [{ id: 'l1', user_id: 'user', entry_date: '2026-10-09', content: 'Good day', created_at: localIso(2026, 10, 9), updated_at: localIso(2026, 10, 9, 21) }];

  it('groups everything by day, newest day first', () => {
    const days = buildActivityTimeline({ topics, entries, tasks, logs });
    expect(days.map((day) => day.day)).toEqual(['2026-10-10', '2026-10-09', '2026-10-03']);
    expect(days[0].events.map((event) => event.id)).toEqual(['task-t1', 'entry-e3', 'entry-e2']);
    expect(days[0].events.find((event) => event.id === 'entry-e2')?.topicTitle).toBe('React hooks');
  });

  it('filters by topic and date range', () => {
    const reactOnly = buildActivityTimeline({ topics, entries, tasks, logs }, { topicFilter: 'react' });
    expect(reactOnly.flatMap((day) => day.events.map((event) => event.id))).toEqual(['entry-e2', 'entry-e1', 'topic-react']);

    const unsorted = buildActivityTimeline({ topics, entries, tasks, logs }, { topicFilter: UNSORTED_ID });
    expect(unsorted.flatMap((day) => day.events.map((event) => event.id))).toEqual(['entry-e3']);

    const recent = buildActivityTimeline({ topics, entries, tasks, logs }, { sinceDay: '2026-10-09' });
    expect(recent.map((day) => day.day)).toEqual(['2026-10-10', '2026-10-09']);
  });

  it('summarizes entries per topic', () => {
    const summary = summarizeTopics(buildActivityTimeline({ topics, entries, tasks, logs }));
    expect(summary).toEqual([
      { topicId: 'react', title: 'React hooks', count: 2 },
      { topicId: null, title: null, count: 1 },
    ]);
  });
});

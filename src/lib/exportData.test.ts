import { describe, expect, it } from 'vitest';

import { exportFilename, topicsToMarkdown } from './exportData';
import type { Topic, TopicEntry } from './types';

function topic(overrides: Partial<Topic>): Topic {
  return {
    id: 'topic',
    user_id: 'user',
    title: 'Topic',
    left_off: '',
    status: 'active',
    is_pinned: false,
    last_activity_at: '2026-10-01T10:00:00',
    source_note_id: null,
    created_at: '2026-09-01T10:00:00',
    updated_at: '2026-10-01T10:00:00',
    ...overrides,
  };
}

function entry(overrides: Partial<TopicEntry>): TopicEntry {
  return {
    id: 'entry',
    user_id: 'user',
    topic_id: 'topic',
    kind: 'text',
    content: '',
    items: [],
    created_at: '2026-10-01T10:00:00',
    updated_at: '2026-10-01T10:00:00',
    ...overrides,
  };
}

describe('topicsToMarkdown', () => {
  it('says so when there is nothing to export', () => {
    expect(topicsToMarkdown([], [])).toContain('No topics yet.');
  });

  it('writes pinned topics first with left-off line, day headings, checklists, and an Unsorted section', () => {
    const markdown = topicsToMarkdown(
      [
        topic({ id: 'react', title: 'React', last_activity_at: '2026-10-05T10:00:00' }),
        topic({ id: 'sql', title: 'SQL', is_pinned: true, left_off: 'Window functions next' }),
      ],
      [
        entry({ id: 'a', topic_id: 'react', content: 'Hooks run in order', created_at: '2026-10-02T09:00:00' }),
        entry({ id: 'b', topic_id: 'react', content: 'Effects clean up', created_at: '2026-10-03T09:00:00' }),
        entry({ id: 'c', topic_id: 'sql', kind: 'checklist', items: [{ id: '1', text: 'JOINs', done: true }, { id: '2', text: 'CTEs', done: false }] }),
        entry({ id: 'd', topic_id: null, content: 'Random thought' }),
      ],
    );

    expect(markdown.indexOf('## SQL')).toBeLessThan(markdown.indexOf('## React'));
    expect(markdown).toContain('**Where I left off:** Window functions next');
    expect(markdown).toContain('- [x] JOINs');
    expect(markdown).toContain('- [ ] CTEs');
    expect(markdown.indexOf('### 2026-10-02')).toBeLessThan(markdown.indexOf('### 2026-10-03'));
    expect(markdown.indexOf('## Unsorted')).toBeGreaterThan(markdown.indexOf('## React'));
    expect(markdown).toContain('Random thought');
  });

  it('notes topics that have no entries yet', () => {
    expect(topicsToMarkdown([topic({ title: 'Empty' })], [])).toContain('_No notes yet._');
  });
});

describe('exportFilename', () => {
  it('names the topics download separately from classic notes', () => {
    expect(exportFilename('topics')).toMatch(/^daybook-topics-\d{4}-\d{2}-\d{2}\.md$/);
    expect(exportFilename('notes')).toMatch(/^daybook-classic-notes-\d{4}-\d{2}-\d{2}\.md$/);
  });
});

import { describe, expect, it } from 'vitest';

import { formatDueLabel, shiftDateKey, weekRange, dateKeyToLocalDate } from './date';
import { filterTasksByView, isOverdue } from './tasks';
import type { Task } from './types';

const today = '2026-10-10';

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 'task',
    user_id: 'user',
    title: 'Task',
    description: null,
    status: 'todo',
    priority: 'normal',
    due_date: null,
    goal_id: null,
    is_top_priority: false,
    completed_at: null,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('formatDueLabel', () => {
  it('uses relative words for nearby days', () => {
    expect(formatDueLabel(today, today)).toBe('Today');
    expect(formatDueLabel('2026-10-11', today)).toBe('Tomorrow');
    expect(formatDueLabel('2026-10-09', today)).toBe('Yesterday');
  });

  it('crosses month and year boundaries', () => {
    expect(formatDueLabel('2026-11-01', '2026-10-31')).toBe('Tomorrow');
    expect(formatDueLabel('2026-12-31', '2027-01-01')).toBe('Yesterday');
  });

  it('includes the year only for other years', () => {
    expect(formatDueLabel('2027-03-02', today)).toMatch(/2027/);
    expect(formatDueLabel('2026-12-25', today)).not.toMatch(/2026/);
  });
});

describe('date keys', () => {
  it('shifts across month ends', () => {
    expect(shiftDateKey('2026-02-28', 1)).toBe('2026-03-01');
    expect(shiftDateKey('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('builds Monday to Sunday weeks', () => {
    expect(weekRange(dateKeyToLocalDate(today))).toEqual({ start: '2026-10-05', end: '2026-10-11' });
  });
});

describe('task views', () => {
  const tasks = [
    task({ id: 'due-today', due_date: today }),
    task({ id: 'overdue', due_date: '2026-10-01' }),
    task({ id: 'future', due_date: '2026-10-20' }),
    task({ id: 'priority', is_top_priority: true }),
    task({ id: 'done', status: 'completed', due_date: '2026-10-01', completed_at: '2026-10-02T10:00:00.000Z' }),
  ];
  const ids = (list: Task[]) => list.map((item) => item.id).sort();

  it('filters each view', () => {
    expect(ids(filterTasksByView(tasks, 'today', today))).toEqual(['due-today', 'priority']);
    expect(ids(filterTasksByView(tasks, 'upcoming', today))).toEqual(['future']);
    expect(ids(filterTasksByView(tasks, 'overdue', today))).toEqual(['overdue']);
    expect(ids(filterTasksByView(tasks, 'active', today))).toEqual(['due-today', 'future', 'overdue', 'priority']);
    expect(ids(filterTasksByView(tasks, 'completed', today))).toEqual(['done']);
  });

  it('never treats completed work as overdue', () => {
    expect(isOverdue(tasks[4], today)).toBe(false);
    expect(isOverdue(tasks[1], today)).toBe(true);
  });
});

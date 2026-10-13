import { describe, expect, it } from 'vitest';

import { canTransitionTaskStatus, ensurePriority, validateGoalInput, validateNoteInput, validateTaskInput } from './validation';

describe('validation', () => {
  it('requires a task title', () => {
    const result = validateTaskInput({ title: '   ', status: 'todo', priority: 'normal' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Task title is required.');
  });

  it('accepts valid task values', () => {
    const result = validateTaskInput({ title: 'Ship sprint', status: 'in_progress', priority: 'high' });
    expect(result.valid).toBe(true);
  });

  it('validates goals', () => {
    const result = validateGoalInput({ title: '', status: 'active' });
    expect(result.valid).toBe(false);
  });

  it('allows a note that only has a title', () => {
    const result = validateNoteInput({ title: 'Idea', content: '   ' });
    expect(result.valid).toBe(true);
  });

  it('requires a note title', () => {
    const result = validateNoteInput({ title: ' ', content: 'A thought' });
    expect(result.valid).toBe(false);
  });

  it('allows sensible task status transitions', () => {
    expect(canTransitionTaskStatus('todo', 'in_progress')).toBe(true);
    expect(canTransitionTaskStatus('in_progress', 'completed')).toBe(true);
    expect(canTransitionTaskStatus('completed', 'in_progress')).toBe(true);
  });

  it('normalizes unknown priorities', () => {
    expect(ensurePriority('urgent')).toBe('normal');
    expect(ensurePriority('high')).toBe('high');
  });
});

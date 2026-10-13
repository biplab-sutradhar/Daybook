import type { GoalInput, NoteInput, TaskInput, TaskPriority, TaskStatus } from './types';

export function validateTaskInput(task: Partial<TaskInput>) {
  const errors: string[] = [];

  if (!task.title || !task.title.trim()) {
    errors.push('Task title is required.');
  }

  if (task.priority && !['low', 'normal', 'high'].includes(task.priority)) {
    errors.push('Priority must be low, normal, or high.');
  }

  if (task.status && !['todo', 'in_progress', 'completed'].includes(task.status)) {
    errors.push('Status must be todo, in progress, or completed.');
  }

  if (task.goal_id && !task.goal_id.trim()) {
    errors.push('Goal reference is invalid.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateGoalInput(goal: Partial<GoalInput>) {
  const errors: string[] = [];

  if (!goal.title || !goal.title.trim()) {
    errors.push('Goal title is required.');
  }

  if (goal.status && !['active', 'paused', 'completed'].includes(goal.status)) {
    errors.push('Goal status is invalid.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateNoteInput(note: Partial<NoteInput>) {
  const errors: string[] = [];

  if (!note.title || !note.title.trim()) {
    errors.push('Note title is required.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function canTransitionTaskStatus(current: TaskStatus, next: TaskStatus) {
  if (current === next) return true;
  if (current === 'completed' && (next === 'todo' || next === 'in_progress')) return true;
  if (current === 'todo' && next === 'completed') return true;
  if (current === 'in_progress' && (next === 'todo' || next === 'completed')) return true;
  if (current === 'todo' && next === 'in_progress') return true;
  return false;
}

export function ownableValue(value: string | null | undefined) {
  if (!value) return null;
  return value.trim() || null;
}

export function ensurePriority(priority: string): TaskPriority {
  return ['low', 'normal', 'high'].includes(priority) ? (priority as TaskPriority) : 'normal';
}

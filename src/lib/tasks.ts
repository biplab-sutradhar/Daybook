import { timestampToLocalDateKey } from './date';
import type { Task, TaskPatch, TaskPriority, TaskStatus } from './types';

export type TaskListView = 'today' | 'upcoming' | 'overdue' | 'active' | 'completed';
export type TaskSort = 'due_date' | 'priority' | 'created_at';

const priorityRank: Record<TaskPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

export function isOverdue(task: Task, today: string) {
  return Boolean(task.due_date && task.due_date < today && task.status !== 'completed');
}

export function filterTasksByView(tasks: Task[], view: TaskListView, today: string) {
  switch (view) {
    case 'today':
      return tasks.filter((task) => task.status !== 'completed' && (task.due_date === today || task.is_top_priority));
    case 'upcoming':
      return tasks.filter((task) => task.status !== 'completed' && Boolean(task.due_date && task.due_date > today));
    case 'overdue':
      return tasks.filter((task) => isOverdue(task, today));
    case 'active':
      return tasks.filter((task) => task.status !== 'completed');
    case 'completed':
      return tasks.filter((task) => task.status === 'completed');
    default:
      return tasks;
  }
}

export function sortTasks(tasks: Task[], sort: TaskSort) {
  return [...tasks].sort((left, right) => {
    if (sort === 'priority') {
      const byPriority = priorityRank[left.priority] - priorityRank[right.priority];
      if (byPriority !== 0) return byPriority;
    }

    if (sort === 'due_date' || sort === 'priority') {
      if (left.due_date !== right.due_date) {
        if (!left.due_date) return 1;
        if (!right.due_date) return -1;
        const byDate = left.due_date.localeCompare(right.due_date);
        if (byDate !== 0) return byDate;
      }
    }

    return right.created_at.localeCompare(left.created_at);
  });
}

export function canMarkTopPriority(tasks: Task[], taskId: string | null) {
  const count = tasks.filter((task) => task.is_top_priority && task.status !== 'completed' && task.id !== taskId).length;
  return count < 3;
}

export function completedOn(task: Task, day: string) {
  if (task.status !== 'completed' || !task.completed_at) return false;
  return timestampToLocalDateKey(task.completed_at) === day;
}

export function tasksCompletedBetween(tasks: Task[], start: string, end: string) {
  return tasks.filter((task) => {
    if (task.status !== 'completed' || !task.completed_at) return false;
    const day = timestampToLocalDateKey(task.completed_at);
    return day >= start && day <= end;
  });
}

export function taskUpdatePayload(patch: TaskPatch) {
  const payload: Record<string, unknown> = {};

  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new Error('Task title is required.');
    payload.title = title;
  }

  if (patch.description !== undefined) {
    payload.description = patch.description?.trim() || null;
  }

  if (patch.priority !== undefined) payload.priority = patch.priority;
  if (patch.due_date !== undefined) payload.due_date = patch.due_date || null;
  if (patch.goal_id !== undefined) payload.goal_id = patch.goal_id || null;
  if (patch.is_top_priority !== undefined) payload.is_top_priority = patch.is_top_priority;

  if (patch.status !== undefined) {
    payload.status = patch.status;
    payload.completed_at = patch.status === 'completed' ? patch.completed_at ?? new Date().toISOString() : null;
  } else if (patch.completed_at !== undefined) {
    payload.completed_at = patch.completed_at;
  }

  payload.updated_at = new Date().toISOString();
  return payload;
}

export function nextStatus(status: TaskStatus): TaskStatus {
  return status === 'completed' ? 'todo' : 'completed';
}

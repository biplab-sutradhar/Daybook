import { sortTasks } from './tasks';
import type { GoalPatch, Task } from './types';

export function tasksForGoal(tasks: Task[], goalId: string) {
  return tasks.filter((task) => task.goal_id === goalId);
}

export function goalStats(tasks: Task[], goalId: string) {
  const linked = tasksForGoal(tasks, goalId);
  const completed = linked.filter((task) => task.status === 'completed').length;
  const open = sortTasks(
    linked.filter((task) => task.status !== 'completed'),
    'priority',
  );

  return {
    linked,
    completed,
    total: linked.length,
    next: open[0] ?? null,
  };
}

export function goalUpdatePayload(patch: GoalPatch) {
  const payload: Record<string, unknown> = {};

  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new Error('Goal title is required.');
    payload.title = title;
  }

  if (patch.description !== undefined) payload.description = patch.description?.trim() || null;
  if (patch.target_date !== undefined) payload.target_date = patch.target_date || null;
  if (patch.status !== undefined) payload.status = patch.status;
  payload.updated_at = new Date().toISOString();
  return payload;
}

import type { FormEvent } from 'react';
import { useId, useState } from 'react';

import { ensurePriority } from '../lib/validation';
import type { Goal, Task, TaskInput, TaskStatus } from '../lib/types';
import { Button, Select, TextArea } from './ui';

export const emptyTaskDraft: TaskInput = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'normal',
  due_date: '',
  goal_id: null,
  is_top_priority: false,
};

export function taskToDraft(task: Task): TaskInput {
  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    due_date: task.due_date ?? '',
    goal_id: task.goal_id,
    is_top_priority: task.is_top_priority,
  };
}

export function TaskForm({
  initial,
  goals,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: TaskInput;
  goals: Goal[];
  submitLabel: string;
  onSubmit: (draft: TaskInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(draft);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save the task.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && onCancel) {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <div>
        <label className="label" htmlFor={`${id}-title`}>Title</label>
        <input id={`${id}-title`} className="field" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} required autoFocus />
      </div>
      <div>
        <label className="label" htmlFor={`${id}-description`}>Description</label>
        <TextArea id={`${id}-description`} className="min-h-20" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Optional" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={`${id}-status`}>Status</label>
          <Select id={`${id}-status`} value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as TaskStatus }))}>
            <option value="todo">Todo</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </Select>
        </div>
        <div>
          <label className="label" htmlFor={`${id}-priority`}>Priority</label>
          <Select id={`${id}-priority`} value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: ensurePriority(event.target.value) }))}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </Select>
        </div>
        <div>
          <label className="label" htmlFor={`${id}-due`}>Due date</label>
          <input id={`${id}-due`} type="date" className="field" value={draft.due_date} onChange={(event) => setDraft((current) => ({ ...current, due_date: event.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor={`${id}-goal`}>Goal</label>
          <Select id={`${id}-goal`} value={draft.goal_id ?? ''} onChange={(event) => setDraft((current) => ({ ...current, goal_id: event.target.value || null }))}>
            <option value="">No goal</option>
            {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
          </Select>
        </div>
      </div>
      <label className="flex min-h-10 items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4" checked={draft.is_top_priority} onChange={(event) => setDraft((current) => ({ ...current, is_top_priority: event.target.checked }))} />
        One of today’s top priorities
      </label>
      {error && <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">{error}</p>}
      <div className="flex gap-2">
        <Button variant="primary" type="submit" className="flex-1 sm:flex-none" disabled={busy}>{busy ? 'Saving…' : submitLabel}</Button>
        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}

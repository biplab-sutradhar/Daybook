import type { FormEvent } from 'react';
import { useId, useState } from 'react';
import { Check, Pause, Pencil, Play, Trash2 } from 'lucide-react';

import { formatDueLabel, toLocalDateKey } from '../lib/date';
import { goalStats } from '../lib/goals';
import type { Goal, GoalInput, GoalStatus } from '../lib/types';
import { cn } from '../lib/utils';
import type { WorkspaceController } from '../hooks/useWorkspace';
import { emptyTaskDraft } from '../components/TaskForm';
import { TaskRow } from '../components/TaskRow';
import { Button, EmptyState, FilterChips, IconButton, PageHeader, QuickAdd, Select, TextArea } from '../components/ui';

const emptyGoal: GoalInput = { title: '', description: '', target_date: '', status: 'active' };

const statusStyles: Record<GoalStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  paused: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  completed: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
};

export function GoalsPage({
  workspace,
  notify,
  reportError,
}: {
  workspace: WorkspaceController;
  notify: (message: string) => void;
  reportError: (message: string) => void;
}) {
  const [filter, setFilter] = useState<GoalStatus | 'all'>('active');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = toLocalDateKey();
  const visible = workspace.goals.filter((goal) => filter === 'all' || goal.status === filter);
  const countFor = (status: GoalStatus) => workspace.goals.filter((goal) => goal.status === status).length;

  async function createGoal(input: GoalInput) {
    await workspace.createGoal(input);
    setCreating(false);
    notify('Goal saved.');
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Outcomes"
        title="Goals"
        description="Finishing every task does not complete the goal. You decide when the outcome is actually done."
        actions={<Button variant="primary" onClick={() => setCreating((current) => !current)}>{creating ? 'Close form' : 'New goal'}</Button>}
      />

      <FilterChips
        label="Goal status"
        value={filter}
        onChange={(next) => setFilter(next)}
        options={[
          { id: 'active', label: 'Active', count: countFor('active') },
          { id: 'paused', label: 'Paused', count: countFor('paused') },
          { id: 'completed', label: 'Completed', count: countFor('completed') },
          { id: 'all', label: 'All', count: workspace.goals.length },
        ]}
      />

      {creating && (
        <section className="surface p-4 sm:p-5">
          <h3 className="mb-4 font-medium">New goal</h3>
          <GoalForm initial={emptyGoal} submitLabel="Create goal" onSubmit={createGoal} onCancel={() => setCreating(false)} />
        </section>
      )}

      {visible.length === 0 ? (
        <EmptyState title="No goals in this view" description="Name an outcome you care about, then add the next action underneath it." actionLabel="New goal" onAction={() => setCreating(true)} />
      ) : (
        <div className="space-y-4">
          {visible.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              workspace={workspace}
              today={today}
              editing={editingId === goal.id}
              onEdit={() => setEditingId(goal.id)}
              onCancel={() => setEditingId(null)}
              notify={notify}
              reportError={reportError}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  workspace,
  today,
  editing,
  onEdit,
  onCancel,
  notify,
  reportError,
}: {
  goal: Goal;
  workspace: WorkspaceController;
  today: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  notify: (message: string) => void;
  reportError: (message: string) => void;
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  const stats = goalStats(workspace.tasks, goal.id);
  const width = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  const openTasks = stats.linked.filter((task) => task.status !== 'completed');
  const doneTasks = stats.linked.filter((task) => task.status === 'completed');
  const targetPassed = Boolean(goal.target_date && goal.target_date < today && goal.status !== 'completed');

  async function addTask(title: string) {
    await workspace.createTask({ ...emptyTaskDraft, title, goal_id: goal.id });
    notify('Task added to this goal.');
  }

  async function setStatus(status: Goal['status']) {
    try {
      await workspace.updateGoal(goal.id, { status });
      notify(status === 'completed' ? 'Goal marked complete.' : `Goal marked ${status}.`);
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Could not update the goal.');
    }
  }

  const toggleTask = (item: Parameters<typeof workspace.setTaskStatus>[0]) => {
    void workspace.setTaskStatus(item).catch((error: unknown) => reportError(error instanceof Error ? error.message : 'Could not update the task.'));
  };

  if (editing) {
    return (
      <article className="surface p-4 sm:p-5">
        <h3 className="mb-4 font-medium">Edit goal</h3>
        <GoalForm
          initial={{ title: goal.title, description: goal.description ?? '', target_date: goal.target_date ?? '', status: goal.status }}
          submitLabel="Save goal"
          onCancel={onCancel}
          onSubmit={async (input) => {
            await workspace.updateGoal(goal.id, input);
            onCancel();
            notify('Goal updated.');
          }}
        />
      </article>
    );
  }

  return (
    <article className="surface p-4 sm:p-5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold break-words">{goal.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={cn('badge capitalize', statusStyles[goal.status])}>{goal.status}</span>
            {goal.target_date && (
              <span className={cn('badge', targetPassed ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300')}>
                Target {formatDueLabel(goal.target_date, today)}
              </span>
            )}
          </div>
          {goal.description && <p className="mt-2 text-sm break-words whitespace-pre-wrap text-stone-600 dark:text-stone-300">{goal.description}</p>}
        </div>
        <div className="-mt-1 -mr-1 flex shrink-0">
          {goal.status === 'active' && (
            <IconButton label={`Pause ${goal.title}`} title="Pause" onClick={() => void setStatus('paused')}>
              <Pause size={16} />
            </IconButton>
          )}
          {goal.status !== 'active' && (
            <IconButton label={`Resume ${goal.title}`} title="Resume" onClick={() => void setStatus('active')}>
              <Play size={16} />
            </IconButton>
          )}
          <IconButton label={`Edit ${goal.title}`} title="Edit" onClick={onEdit}>
            <Pencil size={16} />
          </IconButton>
          <IconButton
            label={`Delete ${goal.title}`}
            title="Delete"
            tone="danger"
            onClick={() => {
              if (!window.confirm(`Delete “${goal.title}”? Linked tasks stay in your list, without this goal.`)) return;
              void workspace.deleteGoal(goal.id).then(() => notify('Goal deleted.')).catch((error: unknown) => reportError(error instanceof Error ? error.message : 'Could not delete the goal.'));
            }}
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
          <div className={cn('h-full rounded-full transition-[width]', width === 100 ? 'bg-emerald-600' : 'bg-stone-700 dark:bg-stone-200')} style={{ width: `${width}%` }} />
        </div>
        <span className="w-10 text-right text-sm font-medium tabular-nums">{width}%</span>
      </div>
      <p className="mt-2 text-sm text-stone-500">
        {stats.completed} of {stats.total} linked tasks complete. {stats.next ? `Next: ${stats.next.title}` : 'No open next action yet.'}
      </p>

      {openTasks.length > 0 && (
        <div className="mt-4 space-y-2">
          {openTasks.map((task) => <TaskRow key={task.id} task={task} today={today} onToggle={toggleTask} />)}
        </div>
      )}

      {doneTasks.length > 0 && (
        <div className="mt-3">
          <button type="button" className="rounded-lg px-1 py-1 text-sm font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200" onClick={() => setShowCompleted((current) => !current)} aria-expanded={showCompleted}>
            {showCompleted ? 'Hide' : 'Show'} {doneTasks.length} completed
          </button>
          {showCompleted && (
            <div className="mt-2 space-y-2">
              {doneTasks.map((task) => <TaskRow key={task.id} task={task} today={today} onToggle={toggleTask} />)}
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <QuickAdd label={`Add a next action for ${goal.title}`} placeholder="Add a next action…" onAdd={addTask} />
      </div>

      {goal.status !== 'completed' && stats.total > 0 && stats.completed === stats.total && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <span>Every linked task is done. Is the outcome achieved?</span>
          <Button variant="primary" className="min-h-9" onClick={() => void setStatus('completed')}><Check size={16} />Complete goal</Button>
        </div>
      )}
      {goal.status !== 'completed' && !(stats.total > 0 && stats.completed === stats.total) && (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" className="min-h-9" onClick={() => void setStatus('completed')}><Check size={16} />Mark goal complete</Button>
        </div>
      )}
    </article>
  );
}

function GoalForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: GoalInput;
  submitLabel: string;
  onSubmit: (input: GoalInput) => Promise<void>;
  onCancel: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(draft);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save the goal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
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
        <TextArea id={`${id}-description`} className="min-h-20" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Optional. What does done look like?" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={`${id}-target`}>Target date</label>
          <input id={`${id}-target`} type="date" className="field" value={draft.target_date} onChange={(event) => setDraft((current) => ({ ...current, target_date: event.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor={`${id}-status`}>Status</label>
          <Select id={`${id}-status`} value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as GoalStatus }))}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </Select>
        </div>
      </div>
      {error && <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">{error}</p>}
      <div className="flex gap-2">
        <Button variant="primary" type="submit" className="flex-1 sm:flex-none" disabled={busy}>{busy ? 'Saving…' : submitLabel}</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

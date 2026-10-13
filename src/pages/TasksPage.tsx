import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

import { filterTasksByView, sortTasks, type TaskListView, type TaskSort } from '../lib/tasks';
import { toLocalDateKey } from '../lib/date';
import type { Task, TaskInput, TaskPriority, TaskStatus } from '../lib/types';
import type { WorkspaceController } from '../hooks/useWorkspace';
import { emptyTaskDraft, TaskForm, taskToDraft } from '../components/TaskForm';
import { TaskRow } from '../components/TaskRow';
import { Button, EmptyState, FilterChips, PageHeader, QuickAdd, Select } from '../components/ui';

const views: Array<{ id: TaskListView; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'active', label: 'All active' },
  { id: 'completed', label: 'Completed' },
];

const emptyMessages: Record<TaskListView, { title: string; description: string }> = {
  today: { title: 'Nothing due today', description: 'Tasks due today and your top priorities show up here.' },
  upcoming: { title: 'Nothing scheduled ahead', description: 'Give a task a future due date and it will appear here.' },
  overdue: { title: 'Nothing overdue', description: 'You are caught up on everything with a due date.' },
  active: { title: 'No open tasks', description: 'Add a task above. Completed work stays out of this list.' },
  completed: { title: 'Nothing completed yet', description: 'Finished tasks are kept here so you can look back.' },
};

export function TasksPage({
  workspace,
  notify,
  reportError,
}: {
  workspace: WorkspaceController;
  notify: (message: string) => void;
  reportError: (message: string) => void;
}) {
  const [view, setView] = useState<TaskListView>('active');
  const [status, setStatus] = useState<TaskStatus | 'all'>('all');
  const [priority, setPriority] = useState<TaskPriority | 'all'>('all');
  const [sort, setSort] = useState<TaskSort>('due_date');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = toLocalDateKey();
  const goalName = new Map(workspace.goals.map((goal) => [goal.id, goal.title]));
  const filtersActive = status !== 'all' || priority !== 'all' || query.trim() !== '';

  const counts = useMemo(() => {
    const result = {} as Record<TaskListView, number>;
    for (const item of views) result[item.id] = filterTasksByView(workspace.tasks, item.id, today).length;
    return result;
  }, [today, workspace.tasks]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = filterTasksByView(workspace.tasks, view, today)
      .filter((task) => status === 'all' || task.status === status)
      .filter((task) => priority === 'all' || task.priority === priority)
      .filter((task) => !needle || `${task.title} ${task.description ?? ''}`.toLowerCase().includes(needle));
    return sortTasks(filtered, sort);
  }, [priority, query, sort, status, today, view, workspace.tasks]);

  function clearFilters() {
    setStatus('all');
    setPriority('all');
    setQuery('');
  }

  async function quickAdd(title: string) {
    await workspace.createTask({
      ...emptyTaskDraft,
      title,
      due_date: view === 'today' ? today : '',
    });
    notify(view === 'today' ? 'Task added for today.' : 'Task added.');
  }

  async function createTask(draft: TaskInput) {
    await workspace.createTask(draft);
    setCreating(false);
    notify('Task saved.');
  }

  async function saveEdit(task: Task, draft: TaskInput) {
    await workspace.updateTask(task.id, {
      ...draft,
      completed_at: draft.status === 'completed' ? task.completed_at ?? new Date().toISOString() : null,
    });
    setEditingId(null);
    notify('Task updated.');
  }

  const fail = (fallback: string) => (error: unknown) => reportError(error instanceof Error ? error.message : fallback);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Actions"
        title="To-do"
        actions={(
          <Button onClick={() => { setCreating((current) => !current); setEditingId(null); }}>
            {creating ? 'Close form' : 'Detailed task'}
          </Button>
        )}
      />

      {creating ? (
        <section className="surface p-4 sm:p-5">
          <h3 className="mb-4 font-medium">New task</h3>
          <TaskForm initial={view === 'today' ? { ...emptyTaskDraft, due_date: today } : emptyTaskDraft} goals={workspace.goals} submitLabel="Create task" onSubmit={createTask} onCancel={() => setCreating(false)} />
        </section>
      ) : (
        <QuickAdd
          label="Quick add task"
          placeholder={view === 'today' ? 'Add a task due today…' : 'Add a task…'}
          onAdd={quickAdd}
        />
      )}

      <FilterChips
        label="Task views"
        value={view}
        onChange={(next) => { setView(next); setEditingId(null); }}
        options={views.map((item) => ({ ...item, count: counts[item.id], alert: item.id === 'overdue' }))}
      />

      <div className="flex flex-col gap-2 md:flex-row">
        <div className="relative md:flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" aria-hidden />
          <input type="search" className="field pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" aria-label="Search tasks" />
        </div>
        <div className="grid grid-cols-3 gap-2 md:w-[26rem]">
          <Select aria-label="Filter by status" className="px-2" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | 'all')}>
            <option value="all">Any status</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </Select>
          <Select aria-label="Filter by priority" className="px-2" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority | 'all')}>
            <option value="all">Any priority</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </Select>
          <Select aria-label="Sort tasks" className="px-2" value={sort} onChange={(event) => setSort(event.target.value as TaskSort)}>
            <option value="due_date">By due date</option>
            <option value="priority">By priority</option>
            <option value="created_at">Newest first</option>
          </Select>
        </div>
      </div>

      {filtersActive && (
        <div className="flex items-center justify-between gap-3 text-sm text-stone-500">
          <span>{visible.length} {visible.length === 1 ? 'task matches' : 'tasks match'}</span>
          <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-stone-700 hover:bg-stone-200/70 dark:text-stone-200 dark:hover:bg-stone-800" onClick={clearFilters}>
            <X size={14} /> Clear filters
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        filtersActive ? (
          <EmptyState title="No tasks match these filters" description="Try a different search, or clear the filters." actionLabel="Clear filters" onAction={clearFilters} />
        ) : (
          <EmptyState {...emptyMessages[view]} />
        )
      ) : (
        <div className="space-y-2">
          {visible.map((task) => (
            editingId === task.id ? (
              <section key={task.id} className="surface p-4 sm:p-5">
                <h3 className="mb-4 font-medium">Edit task</h3>
                <TaskForm initial={taskToDraft(task)} goals={workspace.goals} submitLabel="Save changes" onSubmit={(draft) => saveEdit(task, draft)} onCancel={() => setEditingId(null)} />
              </section>
            ) : (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                goalTitle={task.goal_id ? goalName.get(task.goal_id) : null}
                onToggle={(item) => {
                  void workspace.setTaskStatus(item)
                    .then(() => { if (item.status !== 'completed') notify(`Completed “${item.title}”.`); })
                    .catch(fail('Could not update the task.'));
                }}
                onStatus={(item, next) => void workspace.setTaskStatus(item, next).catch(fail('Could not update the task.'))}
                onEdit={(item) => { setEditingId(item.id); setCreating(false); }}
                onDelete={(item) => {
                  if (!window.confirm(`Delete “${item.title}”?`)) return;
                  void workspace.deleteTask(item.id).then(() => notify('Task deleted.')).catch(fail('Could not delete the task.'));
                }}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}

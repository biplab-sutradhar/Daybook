import { useState } from 'react';
import { NotebookPen, Plus } from 'lucide-react';

import { buildActivity } from '../lib/activity';
import { greetingForHour, toLocalDateKey } from '../lib/date';
import { completedOn, isOverdue } from '../lib/tasks';
import { cn, formatRelativeTime } from '../lib/utils';
import { goalStats } from '../lib/goals';
import type { Task } from '../lib/types';
import type { WorkspaceController } from '../hooks/useWorkspace';
import { emptyTaskDraft } from '../components/TaskForm';
import { TaskRow } from '../components/TaskRow';
import { Button, EmptyState, QuickAdd } from '../components/ui';

export function TodayPage({
  workspace,
  onOpenLog,
  onCapture,
  onOpenTasks,
  notify,
  reportError,
}: {
  workspace: WorkspaceController;
  onOpenLog: () => void;
  onCapture: () => void;
  onOpenTasks: () => void;
  notify: (message: string) => void;
  reportError: (message: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const today = toLocalDateKey();
  const todayDate = new Date();
  const name = workspace.profile?.display_name && !workspace.profile.display_name.includes('@') ? workspace.profile.display_name : '';
  const greeting = name ? `${greetingForHour(todayDate.getHours())}, ${name}` : greetingForHour(todayDate.getHours());
  const openTasks = workspace.tasks.filter((task) => task.status !== 'completed');
  const priorities = openTasks.filter((task) => task.is_top_priority).slice(0, 3);
  const priorityIds = new Set(priorities.map((task) => task.id));
  const dueTodayAll = openTasks.filter((task) => task.due_date === today);
  const dueToday = dueTodayAll.filter((task) => !priorityIds.has(task.id));
  const overdueAll = workspace.tasks.filter((task) => isOverdue(task, today));
  const overdue = overdueAll.filter((task) => !priorityIds.has(task.id));
  const doneToday = workspace.tasks.filter((task) => completedOn(task, today));
  const activeGoals = workspace.goals.filter((goal) => goal.status === 'active');
  const todaysLog = workspace.logs.find((log) => log.entry_date === today);
  const activity = buildActivity(workspace);
  const goalName = new Map(workspace.goals.map((goal) => [goal.id, goal.title]));
  const priorityFull = priorities.length >= 3;
  const inboxCount = workspace.inbox.filter((item) => !item.is_archived).length;

  async function toggle(task: Task) {
    try {
      await workspace.setTaskStatus(task);
      if (task.status !== 'completed') notify(`Completed “${task.title}”.`);
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Could not update the task.');
    }
  }

  async function togglePriority(taskId: string, selected: boolean) {
    try {
      await workspace.updateTask(taskId, { is_top_priority: selected });
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Could not update priorities.');
    }
  }

  async function addForToday(title: string) {
    await workspace.createTask({ ...emptyTaskDraft, title, due_date: today });
    notify('Task added for today.');
  }

  const row = (task: Task) => (
    <TaskRow key={task.id} task={task} today={today} goalTitle={task.goal_id ? goalName.get(task.goal_id) : null} onToggle={(item) => void toggle(item)} />
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">{todayDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{greeting}</h2>
          <p className="mt-1 text-stone-600 dark:text-stone-300">
            {openTasks.length === 0 ? 'Your list is clear.' : `${dueTodayAll.length + overdueAll.length} ${dueTodayAll.length + overdueAll.length === 1 ? 'task needs' : 'tasks need'} you today.`}
          </p>
        </div>
        <div className="hidden flex-wrap gap-2 sm:flex">
          <Button variant="primary" onClick={onCapture}><Plus size={16} />Quick Capture</Button>
          <Button onClick={onOpenLog}><NotebookPen size={16} />Today’s log</Button>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 sm:gap-3">
        <Summary title="Priorities" value={`${priorities.length}/3`} detail={priorities.length ? 'chosen' : 'pick some'} onClick={() => setPicking(true)} />
        <Summary title="Due today" value={String(dueTodayAll.length)} detail={overdueAll.length ? `${overdueAll.length} overdue` : 'on track'} alert={overdueAll.length > 0} onClick={onOpenTasks} />
        <Summary title="Done today" value={String(doneToday.length)} detail={`${openTasks.length} open`} onClick={onOpenTasks} />
      </section>

      <div className="grid gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <div className="space-y-5 sm:space-y-6">
          <section className="surface p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">What matters today</h3>
                {picking && <p className="text-xs text-stone-500">{priorities.length} of 3 chosen</p>}
              </div>
              <Button variant={picking ? 'primary' : 'default'} onClick={() => setPicking((current) => !current)}>{picking ? 'Done' : 'Choose'}</Button>
            </div>
            {picking ? (
              openTasks.length === 0 ? (
                <EmptyState title="No open tasks" description="Create a task first, then choose it as a priority." actionLabel="Go to tasks" onAction={onOpenTasks} />
              ) : (
                <div className="-mx-2 max-h-80 space-y-0.5 overflow-y-auto">
                  {openTasks.map((task) => {
                    const disabled = !task.is_top_priority && priorityFull;
                    return (
                      <label key={task.id} className={cn('flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm', disabled ? 'cursor-not-allowed text-stone-400' : 'cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800')}>
                        <input type="checkbox" className="h-4 w-4" checked={task.is_top_priority} disabled={disabled} onChange={(event) => void togglePriority(task.id, event.target.checked)} />
                        <span className="min-w-0 flex-1 break-words">{task.title}</span>
                      </label>
                    );
                  })}
                </div>
              )
            ) : priorities.length === 0 ? (
              <EmptyState title="No priorities selected" description="Choose up to three tasks that deserve attention first." actionLabel="Choose priorities" onAction={() => setPicking(true)} />
            ) : (
              <div className="space-y-2">{priorities.map(row)}</div>
            )}
          </section>

          <section className="surface p-4 sm:p-5">
            <h3 className="mb-4 text-lg font-semibold">What needs attention</h3>
            <QuickAdd label="Add a task due today" placeholder="Add a task due today…" onAdd={addForToday} />
            {dueToday.length === 0 && overdue.length === 0 ? (
              <p className="mt-4 text-sm text-stone-500">Nothing else is waiting. Overdue work and tasks due today show up here.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {overdue.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium tracking-[0.08em] text-rose-700 uppercase dark:text-rose-300">Overdue · {overdue.length}</p>
                    <div className="space-y-2">{overdue.map(row)}</div>
                  </div>
                )}
                {dueToday.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium tracking-[0.08em] text-stone-500 uppercase">Due today · {dueToday.length}</p>
                    <div className="space-y-2">{dueToday.map(row)}</div>
                  </div>
                )}
              </div>
            )}
          </section>

          {doneToday.length > 0 && (
            <section className="surface p-4 sm:p-5">
              <h3 className="mb-4 text-lg font-semibold">Done today</h3>
              <div className="space-y-2">{doneToday.map(row)}</div>
            </section>
          )}
        </div>

        <div className="space-y-5 sm:space-y-6">
          {inboxCount > 0 && (
            <section className="surface flex items-center justify-between gap-3 p-4 sm:p-5">
              <div>
                <h3 className="font-semibold">{inboxCount} {inboxCount === 1 ? 'capture' : 'captures'} to sort</h3>
                <p className="text-sm text-stone-500">Turn them into tasks, notes, or goals.</p>
              </div>
              <a href="#/inbox" className="btn">Open inbox</a>
            </section>
          )}

          <section className="surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Today’s log</h3>
              <Button onClick={onOpenLog}>{todaysLog?.content.trim() ? 'Continue' : 'Write'}</Button>
            </div>
            <p className="mt-3 line-clamp-4 text-sm leading-6 whitespace-pre-wrap text-stone-600 dark:text-stone-300">{todaysLog?.content.trim() || 'No entry yet. A few sentences at the end of the day is enough.'}</p>
          </section>

          <section className="surface p-4 sm:p-5">
            <h3 className="text-lg font-semibold">Active goals</h3>
            {activeGoals.length === 0 ? (
              <div className="mt-3">
                <EmptyState title="No active goals" description="A goal is an outcome. Tasks underneath it are the actions." />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {activeGoals.map((goal) => {
                  const stats = goalStats(workspace.tasks, goal.id);
                  const width = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
                  return (
                    <div key={goal.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 font-medium break-words">{goal.title}</p>
                        <p className="shrink-0 text-xs text-stone-500">{stats.completed}/{stats.total} · {width}%</p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                        <div className="h-full rounded-full bg-stone-700 transition-[width] dark:bg-stone-200" style={{ width: `${width}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-stone-500">{stats.next ? `Next: ${stats.next.title}` : 'No open task linked yet.'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="surface p-4 sm:p-5">
            <h3 className="text-lg font-semibold">Recent activity</h3>
            {activity.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">As you capture, finish, and write, the latest changes will appear here.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {activity.map((item) => (
                  <li key={item.id} className="text-sm">
                    <p className="font-medium break-words">{item.detail}</p>
                    <p className="text-xs text-stone-500">{item.label} · {formatRelativeTime(item.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Summary({ title, value, detail, alert, onClick }: { title: string; value: string; detail: string; alert?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="surface min-w-0 p-3 text-left transition hover:border-stone-300 active:scale-[0.98] sm:p-4 dark:hover:border-stone-700">
      <p className="truncate text-xs text-stone-500 sm:text-sm">{title}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight sm:mt-2 sm:text-2xl">{value}</p>
      <p className={cn('mt-0.5 truncate text-xs', alert ? 'font-medium text-rose-700 dark:text-rose-300' : 'text-stone-500')}>{detail}</p>
    </button>
  );
}

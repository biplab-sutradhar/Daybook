import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

import { formatDate, shiftDateKey, toLocalDateKey, weekRange, dateKeyToLocalDate } from '../lib/date';
import { cn } from '../lib/utils';
import { logsBetween, emptyReviewDraft, findReview, reviewToDraft } from '../lib/reviews';
import { tasksCompletedBetween } from '../lib/tasks';
import { goalStats } from '../lib/goals';
import { useQueuedAutosave } from '../hooks/useQueuedAutosave';
import type { ReviewDraft } from '../lib/types';
import type { WorkspaceController } from '../hooks/useWorkspace';
import { Button, IconButton, PageHeader, SaveState, TextArea } from '../components/ui';

export function ReviewsPage({ workspace }: { workspace: WorkspaceController }) {
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');
  const [anchor, setAnchor] = useState(toLocalDateKey());
  const range = mode === 'daily'
    ? { start: anchor, end: anchor }
    : weekRange(dateKeyToLocalDate(anchor));

  const completed = tasksCompletedBetween(workspace.tasks, range.start, range.end);
  const openTasks = workspace.tasks.filter((task) => task.status !== 'completed');
  const logs = logsBetween(workspace.logs, range.start, range.end);
  const activeGoals = workspace.goals.filter((goal) => goal.status === 'active');
  const entry = findReview(workspace.reviews, mode, range.start, range.end);
  const draft = reviewToDraft(entry, emptyReviewDraft(mode, range.start, range.end));

  const today = toLocalDateKey();
  const isCurrent = mode === 'daily' ? anchor === today : range.start === weekRange(dateKeyToLocalDate(today)).start;

  function shift(days: number) {
    setAnchor((current) => shiftDateKey(current, days));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Reflection"
        title="Reviews"
        description="Look at what happened. Unfinished work is information, not a score."
        actions={(
          <div className="inline-flex rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-700 dark:bg-stone-900" role="group" aria-label="Review type">
            {(['daily', 'weekly'] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
                className={cn('min-h-9 rounded-lg px-4 text-sm font-medium capitalize transition', mode === item ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800')}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      />

      <div className="surface flex items-center gap-2 p-1.5">
        <IconButton label={mode === 'daily' ? 'Previous day' : 'Previous week'} onClick={() => shift(mode === 'daily' ? -1 : -7)}>
          <ChevronLeft size={18} />
        </IconButton>
        <p className="min-w-0 flex-1 text-center text-sm font-medium">{mode === 'daily' ? formatDate(range.start) : `${formatDate(range.start)} – ${formatDate(range.end)}`}</p>
        <IconButton label={mode === 'daily' ? 'Next day' : 'Next week'} onClick={() => shift(mode === 'daily' ? 1 : 7)}>
          <ChevronRight size={18} />
        </IconButton>
        <Button variant="ghost" className="min-h-9 px-2.5" onClick={() => setAnchor(today)} disabled={isCurrent}>{mode === 'daily' ? 'Today' : 'This week'}</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-4">
          <h3 className="font-semibold">Completed <span className="font-normal text-stone-500">· {completed.length}</span></h3>
          {completed.length === 0 ? <p className="mt-3 text-sm text-stone-500">Nothing was completed in this period.</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {completed.map((task) => (
                <li key={task.id} className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
                  <span className="min-w-0 break-words">{task.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="surface p-4">
          <h3 className="font-semibold">Still open <span className="font-normal text-stone-500">· {openTasks.length}</span></h3>
          <p className="mt-1 text-xs text-stone-500">These are tasks that are open now, including anything overdue.</p>
          {openTasks.length === 0 ? <p className="mt-3 text-sm text-stone-500">There is no open task right now.</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {openTasks.slice(0, 8).map((task) => (
                <li key={task.id} className="break-words">
                  {task.title}
                  {task.due_date && task.due_date < today && <span className="text-rose-700 dark:text-rose-300"> · overdue</span>}
                </li>
              ))}
            </ul>
          )}
          {openTasks.length > 8 && <p className="mt-2 text-xs text-stone-500">{openTasks.length - 8} more open tasks are in the task list.</p>}
        </section>
        <section className="surface p-4">
          <h3 className="font-semibold">{mode === 'daily' ? 'Daily log' : 'Logs this week'}</h3>
          {logs.length === 0 ? <p className="mt-3 text-sm text-stone-500">No daily log in this period.</p> : logs.map((log) => (
            <div key={log.id} className="mt-3">
              <p className="text-xs text-stone-500">{formatDate(log.entry_date)}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-stone-700 dark:text-stone-200">{log.content}</p>
            </div>
          ))}
        </section>
        {mode === 'weekly' && (
          <section className="surface p-4">
            <h3 className="font-semibold">Active goals</h3>
            {activeGoals.length === 0 ? <p className="mt-3 text-sm text-stone-500">No active goals.</p> : (
              <ul className="mt-3 space-y-3 text-sm">
                {activeGoals.map((goal) => {
                  const stats = goalStats(workspace.tasks, goal.id);
                  return <li key={goal.id}>{goal.title} · {stats.completed}/{stats.total} tasks{stats.next ? ` · next: ${stats.next.title}` : ''}</li>;
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      <ReflectionEditor
        key={`${mode}:${range.start}:${range.end}`}
        initial={draft}
        onSave={(value) => workspace.saveReview(JSON.parse(value) as ReviewDraft)}
      />
    </div>
  );
}

function ReflectionEditor({
  initial,
  onSave,
}: {
  initial: ReviewDraft;
  onSave: (serialized: string) => Promise<void>;
}) {
  const autosave = useQueuedAutosave({
    storageKey: `review:${initial.review_type}:${initial.period_start}:${initial.period_end}`,
    initialValue: JSON.stringify(initial),
    save: onSave,
  });
  const draft = JSON.parse(autosave.value) as ReviewDraft;

  function update(patch: Partial<ReviewDraft>) {
    autosave.setValue(JSON.stringify({ ...draft, ...patch }));
  }

  const daily = initial.review_type === 'daily';

  return (
    <section className="surface space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">{daily ? 'Optional reflection' : 'Weekly reflection'}</h3>
        <SaveState status={autosave.status} error={autosave.error} onRetry={autosave.retry} restored={autosave.wasRestored} />
      </div>
      <Field label={daily ? 'What went well?' : 'What mattered this week?'} value={draft.went_well} onChange={(value) => update({ went_well: value })} />
      {daily && <Field label="What did I learn?" value={draft.lessons_learned} onChange={(value) => update({ lessons_learned: value })} />}
      {daily && <Field label="What can I improve tomorrow?" value={draft.improvements} onChange={(value) => update({ improvements: value })} />}
      {!daily && <Field label="What should I focus on next week?" value={draft.next_focus} onChange={(value) => update({ next_focus: value })} />}
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <TextArea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

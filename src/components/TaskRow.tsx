import { Check, Pause, Pencil, Play, Trash2 } from 'lucide-react';

import { formatDueLabel } from '../lib/date';
import { isOverdue } from '../lib/tasks';
import type { Task, TaskStatus } from '../lib/types';
import { cn } from '../lib/utils';
import { IconButton } from './ui';

export function TaskRow({
  task,
  today,
  goalTitle,
  onToggle,
  onStatus,
  onEdit,
  onDelete,
}: {
  task: Task;
  today: string;
  goalTitle?: string | null;
  onToggle: (task: Task) => void;
  onStatus?: (task: Task, status: TaskStatus) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}) {
  const overdue = isOverdue(task, today);
  const completed = task.status === 'completed';
  const inProgress = task.status === 'in_progress';
  const dueToday = !completed && task.due_date === today;

  const title = (
    <span className={cn('block font-medium break-words', completed && 'text-stone-500 line-through dark:text-stone-500')}>
      {task.title}
    </span>
  );

  return (
    <div className="flex items-start gap-1 rounded-2xl border border-stone-200 bg-white py-1.5 pr-1.5 pl-1 dark:border-stone-800 dark:bg-stone-900">
      <button
        type="button"
        className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        onClick={() => onToggle(task)}
        aria-label={completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
        title={completed ? 'Reopen' : 'Mark complete'}
      >
        <span
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full border-2 transition',
            completed
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : task.priority === 'high'
                ? 'border-rose-400 text-transparent group-hover:text-rose-400'
                : 'border-stone-300 text-transparent group-hover:text-stone-400 dark:border-stone-600',
          )}
        >
          <Check size={12} strokeWidth={3} />
        </span>
      </button>

      <div className="min-w-0 flex-1 py-2">
        {onEdit ? (
          <button type="button" className="block w-full text-left" onClick={() => onEdit(task)}>
            {title}
          </button>
        ) : title}
        {(inProgress || task.priority !== 'normal' || goalTitle || task.due_date || overdue) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {inProgress && <span className="badge bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200">In progress</span>}
            {task.priority === 'high' && <span className="badge bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200">High</span>}
            {task.priority === 'low' && <span className="badge bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">Low</span>}
            {task.due_date && (
              <span
                className={cn(
                  'badge',
                  overdue
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    : dueToday
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                      : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
                )}
              >
                {overdue ? `Overdue · ${formatDueLabel(task.due_date, today)}` : formatDueLabel(task.due_date, today)}
              </span>
            )}
            {goalTitle && <span className="badge max-w-48 truncate bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-200">{goalTitle}</span>}
          </div>
        )}
      </div>

      {(onStatus || onEdit || onDelete) && (
        <div className="flex shrink-0 items-center">
          {onStatus && !completed && (
            <IconButton
              label={inProgress ? `Move ${task.title} back to todo` : `Start ${task.title}`}
              title={inProgress ? 'Pause' : 'Start'}
              onClick={() => onStatus(task, inProgress ? 'todo' : 'in_progress')}
              className={cn(inProgress && 'text-sky-700 dark:text-sky-300')}
            >
              {inProgress ? <Pause size={16} /> : <Play size={16} />}
            </IconButton>
          )}
          {onEdit && (
            <IconButton label={`Edit ${task.title}`} title="Edit" onClick={() => onEdit(task)} className="hidden sm:inline-flex">
              <Pencil size={16} />
            </IconButton>
          )}
          {onDelete && (
            <IconButton label={`Delete ${task.title}`} title="Delete" tone="danger" onClick={() => onDelete(task)}>
              <Trash2 size={16} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

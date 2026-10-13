import type { ButtonHTMLAttributes, ComponentProps, FormEvent, ReactNode, SelectHTMLAttributes } from 'react';
import { useState } from 'react';
import { CircleAlert, CircleCheck, Plus, X } from 'lucide-react';

import type { SaveStatus } from '../lib/types';
import { cn } from '../lib/utils';

export function Button({
  variant = 'default',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'danger' | 'ghost' }) {
  const styles = {
    default: 'btn',
    primary: 'btn-primary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
  }[variant];

  return <button type={type} className={cn(styles, className)} {...props} />;
}

export function IconButton({
  label,
  className,
  type = 'button',
  tone = 'default',
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & { label: string; tone?: 'default' | 'danger' }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn('icon-btn', tone === 'danger' && 'hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950 dark:hover:text-rose-300', className)}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn('field min-h-28 resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('field', className)} {...props} />;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-[0.12em] text-stone-500 uppercase">{eyebrow}</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{title}</h2>
        {description && <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500 dark:text-stone-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ id: T; label: string; count?: number; alert?: boolean }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            className={cn('chip', active && 'chip-active')}
            aria-pressed={active}
            onClick={() => onChange(option.id)}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  'min-w-5 rounded-full px-1.5 text-center text-xs',
                  active
                    ? 'bg-white/20 dark:bg-stone-900/15'
                    : option.alert && option.count > 0
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function QuickAdd({
  placeholder,
  label,
  onAdd,
  buttonLabel = 'Add',
}: {
  placeholder: string;
  label: string;
  onAdd: (title: string) => Promise<void>;
  buttonLabel?: string;
}) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onAdd(trimmed);
      setTitle('');
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative">
        <Plus size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" aria-hidden />
        <input
          className="field min-h-12 pr-20 pl-10"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={placeholder}
          aria-label={label}
          enterKeyHint="done"
        />
        <Button
          variant="primary"
          type="submit"
          className="absolute top-1/2 right-1.5 min-h-9 -translate-y-1/2 px-3"
          disabled={busy || !title.trim()}
        >
          {busy ? 'Adding…' : buttonLabel}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300" role="alert">{error}</p>}
    </form>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 px-4 py-8 text-center dark:border-stone-700">
      <p className="font-medium text-stone-800 dark:text-stone-100">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-stone-500 dark:text-stone-400">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function SaveState({
  status,
  error,
  onRetry,
  restored,
}: {
  status: SaveStatus;
  error?: string | null;
  onRetry?: () => void;
  restored?: boolean;
}) {
  const label = status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? 'Save failed' : 'Edits save automatically';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" aria-live="polite">
      <span className={cn('inline-flex items-center gap-1.5', status === 'error' ? 'text-rose-700 dark:text-rose-300' : 'text-stone-500 dark:text-stone-400')}>
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            status === 'saving' && 'animate-pulse bg-amber-500 motion-reduce:animate-none',
            status === 'saved' && 'bg-emerald-500',
            status === 'error' && 'bg-rose-500',
            status === 'idle' && 'bg-stone-300 dark:bg-stone-600',
          )}
          aria-hidden
        />
        {label}
      </span>
      {restored && status !== 'saved' && <span className="text-stone-500">Unsaved text was restored in this tab.</span>}
      {status === 'error' && error && <span className="text-rose-700 dark:text-rose-300">{error}</span>}
      {status === 'error' && onRetry && (
        <Button className="min-h-8 px-2 py-1" onClick={onRetry}>Retry save</Button>
      )}
    </div>
  );
}

export function Toast({
  tone,
  children,
  onClose,
}: {
  tone: 'error' | 'success';
  children: ReactNode;
  onClose: () => void;
}) {
  const Icon = tone === 'error' ? CircleAlert : CircleCheck;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'animate-toast-in motion-reduce:animate-none pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-3 py-2.5 text-sm shadow-lg',
        tone === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100'
          : 'border-stone-800 bg-stone-900 text-white dark:border-stone-200 dark:bg-stone-100 dark:text-stone-900',
      )}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 leading-6">{children}</p>
      <button type="button" className="-m-1 rounded-lg p-1.5 opacity-70 hover:opacity-100" onClick={onClose} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}

export function Skeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-stone-200 motion-reduce:animate-none dark:bg-stone-800" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 animate-pulse rounded-2xl bg-stone-200 motion-reduce:animate-none dark:bg-stone-800" />
        <div className="h-20 animate-pulse rounded-2xl bg-stone-200 motion-reduce:animate-none dark:bg-stone-800" />
        <div className="h-20 animate-pulse rounded-2xl bg-stone-200 motion-reduce:animate-none dark:bg-stone-800" />
      </div>
      <div className="h-28 animate-pulse rounded-2xl bg-stone-200 motion-reduce:animate-none dark:bg-stone-800" />
      <div className="h-28 animate-pulse rounded-2xl bg-stone-200 motion-reduce:animate-none dark:bg-stone-800" />
    </div>
  );
}

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, BookOpenText, ClipboardList, Pencil, Target, Trash2 } from 'lucide-react';

import { cn, formatRelativeTime } from '../lib/utils';
import type { InboxItem, InboxItemType } from '../lib/types';
import type { WorkspaceController } from '../hooks/useWorkspace';
import { Button, EmptyState, FilterChips, IconButton, PageHeader, QuickAdd, TextArea } from '../components/ui';

const typeLabels: Record<InboxItemType, string> = {
  unsorted: 'Unsorted',
  task: 'Task',
  note: 'Note',
  goal: 'Goal',
};

export function InboxPage({
  workspace,
  notify,
  reportError,
  onOpenCapture,
}: {
  workspace: WorkspaceController;
  notify: (message: string) => void;
  reportError: (message: string) => void;
  onOpenCapture: () => void;
}) {
  const [tab, setTab] = useState<'inbox' | 'archived'>('inbox');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const showArchived = tab === 'archived';
  const archivedCount = useMemo(() => workspace.inbox.filter((item) => item.is_archived).length, [workspace.inbox]);
  const items = useMemo(
    () => workspace.inbox.filter((item) => item.is_archived === showArchived),
    [showArchived, workspace.inbox],
  );

  async function run(item: InboxItem, action: () => Promise<unknown>, success: string) {
    setBusyId(item.id);
    try {
      await action();
      notify(success);
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Could not update the capture.');
    } finally {
      setBusyId(null);
    }
  }

  async function capture(title: string) {
    await workspace.createInboxItem({ title, content: '', item_type: 'unsorted' });
    notify('Saved to your inbox.');
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Capture"
        title="Inbox"
        description="Get thoughts out of your head, then sort them when you have a minute."
        actions={<Button onClick={onOpenCapture} className="hidden sm:inline-flex">Detailed capture</Button>}
      />

      <QuickAdd label="Capture a thought" placeholder="Capture a thought…" buttonLabel="Save" onAdd={capture} />

      <FilterChips
        label="Inbox views"
        value={tab}
        onChange={(next) => { setTab(next); setEditingId(null); }}
        options={[
          { id: 'inbox', label: 'To sort', count: workspace.inbox.length - archivedCount },
          { id: 'archived', label: 'Archived', count: archivedCount },
        ]}
      />

      {items.length === 0 ? (
        <EmptyState
          title={showArchived ? 'No archived captures' : 'Inbox is clear'}
          description={showArchived ? 'Captures you convert or archive are kept here.' : 'Save a thought above, then turn it into a task, note, or goal when you are ready.'}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const busy = busyId === item.id;
            return (
              <article key={item.id} className={cn('surface p-4 transition', busy && 'opacity-60')}>
                {editingId === item.id ? (
                  <InboxEditor
                    item={item}
                    onCancel={() => setEditingId(null)}
                    onSave={async (patch) => {
                      setBusyId(item.id);
                      try {
                        await workspace.updateInboxItem(item.id, patch);
                        notify('Capture updated.');
                        setEditingId(null);
                      } catch (error) {
                        reportError(error instanceof Error ? error.message : 'Could not update the capture.');
                        throw error;
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  />
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium break-words">{item.title}</h3>
                        {item.content && <p className="mt-1.5 text-sm leading-6 break-words whitespace-pre-wrap text-stone-600 dark:text-stone-300">{item.content}</p>}
                        <p className="mt-2 flex items-center gap-2 text-xs text-stone-500">
                          <span className="badge bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">{typeLabels[item.item_type]}</span>
                          {formatRelativeTime(item.created_at)}
                        </p>
                      </div>
                      <div className="-mt-1 -mr-1 flex shrink-0">
                        <IconButton label={`Edit ${item.title}`} title="Edit" onClick={() => setEditingId(item.id)} disabled={busy}>
                          <Pencil size={16} />
                        </IconButton>
                        <IconButton
                          label={item.is_archived ? `Restore ${item.title}` : `Archive ${item.title}`}
                          title={item.is_archived ? 'Restore to inbox' : 'Archive'}
                          disabled={busy}
                          onClick={() => void run(item, () => workspace.updateInboxItem(item.id, { is_archived: !item.is_archived }), item.is_archived ? 'Restored to the inbox.' : 'Archived.')}
                        >
                          {item.is_archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                        </IconButton>
                        <IconButton
                          label={`Delete ${item.title}`}
                          title="Delete"
                          tone="danger"
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm(`Delete “${item.title}”?`)) return;
                            void run(item, () => workspace.deleteInboxItem(item.id), 'Capture deleted.');
                          }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                      <Button variant={item.item_type === 'task' ? 'primary' : 'default'} className="px-2" onClick={() => void run(item, () => workspace.convertInboxToTask(item), 'Moved into tasks. The original capture is archived.')} disabled={busy}>
                        <ClipboardList size={16} />Task
                      </Button>
                      <Button variant={item.item_type === 'note' ? 'primary' : 'default'} className="px-2" onClick={() => void run(item, () => workspace.convertInboxToNote(item), 'Moved into Notes › Unsorted. Give it a topic there. The original capture is archived.')} disabled={busy}>
                        <BookOpenText size={16} />Note
                      </Button>
                      <Button variant={item.item_type === 'goal' ? 'primary' : 'default'} className="px-2" onClick={() => void run(item, () => workspace.convertInboxToGoal(item), 'Moved into goals. The original capture is archived.')} disabled={busy}>
                        <Target size={16} />Goal
                      </Button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InboxEditor({
  item,
  onSave,
  onCancel,
}: {
  item: InboxItem;
  onSave: (patch: { title: string; content: string | null; item_type: InboxItemType }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content ?? '');
  const [itemType, setItemType] = useState<InboxItemType>(item.item_type);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSave({ title, content, item_type: itemType });
    } catch {
      // The page reports the database error and keeps this editor open.
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
      <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Capture title" autoFocus required />
      <TextArea value={content} onChange={(event) => setContent(event.target.value)} aria-label="Capture detail" placeholder="Optional detail" />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Capture type">
        {(Object.keys(typeLabels) as InboxItemType[]).map((type) => (
          <button key={type} type="button" className={cn('chip', itemType === type && 'chip-active')} aria-pressed={itemType === type} onClick={() => setItemType(type)}>
            {typeLabels[type]}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="primary" type="submit" className="flex-1 sm:flex-none" disabled={busy || !title.trim()}>{busy ? 'Saving…' : 'Save'}</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

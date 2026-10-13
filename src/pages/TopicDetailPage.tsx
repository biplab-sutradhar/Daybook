import type { FormEvent, KeyboardEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ClipboardList, FolderInput, History, ListChecks, Pencil, Pin, PinOff, SendHorizontal, Trash2, Type } from 'lucide-react';

import { formatDayLabel, formatTime, timestampToLocalDateKey } from '../lib/date';
import {
  checklistFromText,
  daysSince,
  entriesForTopic,
  entryPreview,
  groupEntriesByDay,
  latestEntry,
  makeId,
  RESUME_AFTER_DAYS,
  recentTopics,
  UNSORTED_ID,
} from '../lib/topics';
import type { ChecklistItem, EntryKind, Topic, TopicEntry, TopicStatus } from '../lib/types';
import { cn } from '../lib/utils';
import { useQueuedAutosave } from '../hooks/useQueuedAutosave';
import type { WorkspaceController } from '../hooks/useWorkspace';
import { Button, EmptyState, IconButton, SaveState, TextArea } from '../components/ui';

const PAGE_SIZE = 30;
const NEW_TOPIC = '__new_topic__';
const coarsePointer = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

export function TopicDetailPage({
  workspace,
  topicId,
  notify,
  reportError,
  onBack,
}: {
  workspace: WorkspaceController;
  topicId: string;
  notify: (message: string) => void;
  reportError: (message: string) => void;
  onBack: () => void;
}) {
  const isUnsorted = topicId === UNSORTED_ID;
  const topic = isUnsorted ? null : workspace.topics.find((item) => item.id === topicId) ?? null;
  const dbTopicId = isUnsorted ? null : topicId;
  const entries = useMemo(() => entriesForTopic(workspace.entries, dbTopicId), [dbTopicId, workspace.entries]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hiddenCount = Math.max(0, entries.length - visibleCount);
  const groups = groupEntriesByDay(entries.slice(hiddenCount));
  const moveTargets = recentTopics(workspace.topics, 50).filter((item) => item.id !== dbTopicId);

  const fail = (fallback: string) => (error: unknown) => reportError(error instanceof Error ? error.message : fallback);

  if (!isUnsorted && !topic) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="-ml-2" onClick={onBack}><ArrowLeft size={16} />All topics</Button>
        <EmptyState title="This topic no longer exists" description="It may have been deleted. Your other topics are still in Notes." actionLabel="Back to topics" onAction={onBack} />
      </div>
    );
  }

  async function addEntry(input: { kind: EntryKind; content: string; items: ChecklistItem[] }) {
    await workspace.createEntry({ topic_id: dbTopicId, ...input });
    window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
  }

  async function moveEntry(entry: TopicEntry, target: string) {
    try {
      let destination: string | null = target === UNSORTED_ID ? null : target;
      if (target === NEW_TOPIC) {
        const name = window.prompt('Name the new topic');
        if (!name?.trim()) return;
        const created = await workspace.createTopic({ title: name });
        destination = created.id;
      }
      await workspace.moveEntry(entry.id, destination);
      const destinationTitle = destination ? workspace.topics.find((item) => item.id === destination)?.title ?? 'the new topic' : 'Unsorted';
      notify(`Moved to ${destinationTitle}.`);
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Could not move the note.');
    }
  }

  return (
    <div className="space-y-4">
      <TopicHeader
        topic={topic}
        entryCount={entries.length}
        onBack={onBack}
        onRename={(title) => workspace.updateTopic(topicId, { title }).then(() => undefined)}
        onStatus={(status) => void workspace.updateTopic(topicId, { status }).then(() => notify(`Topic marked ${status}.`)).catch(fail('Could not update the topic.'))}
        onPin={() => topic && void workspace.updateTopic(topicId, { is_pinned: !topic.is_pinned }).catch(fail('Could not update the topic.'))}
        onDelete={() => {
          if (!topic) return;
          const message = entries.length
            ? `Delete “${topic.title}” and its ${entries.length} ${entries.length === 1 ? 'note' : 'notes'}? This cannot be undone.`
            : `Delete “${topic.title}”?`;
          if (!window.confirm(message)) return;
          void workspace.deleteTopic(topicId).then(() => { notify('Topic deleted.'); onBack(); }).catch(fail('Could not delete the topic.'));
        }}
      />

      {topic && <ResumeBanner topic={topic} latest={latestEntry(workspace.entries, topic.id)} />}

      {topic && (
        <LeftOffEditor
          key={topic.id}
          topic={topic}
          onSave={async (value) => { await workspace.updateTopic(topic.id, { left_off: value }); }}
        />
      )}

      <section aria-label="Timeline" className="space-y-4">
        {entries.length === 0 ? (
          <EmptyState
            title={isUnsorted ? 'Nothing unsorted' : 'No notes yet'}
            description={isUnsorted ? 'Every note has a topic. Nice.' : 'Write the first note below: what you started, what you learned, or a list.'}
          />
        ) : (
          <>
            {hiddenCount > 0 && (
              <div className="flex justify-center">
                <Button variant="ghost" onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}>
                  Show {Math.min(hiddenCount, PAGE_SIZE)} earlier {Math.min(hiddenCount, PAGE_SIZE) === 1 ? 'note' : 'notes'}
                </Button>
              </div>
            )}
            {groups.map((group) => (
              <div key={group.day}>
                <p className="mb-2 text-xs font-medium tracking-[0.08em] text-stone-500 uppercase">{formatDayLabel(group.day)}</p>
                <div className="space-y-2">
                  {group.entries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      isUnsorted={isUnsorted}
                      moveTargets={moveTargets}
                      onUpdate={(patch) => workspace.updateEntry(entry.id, patch).then(() => undefined)}
                      onMove={(target) => void moveEntry(entry, target)}
                      onMakeTask={() => void workspace.convertEntryToTask(entry).then(() => notify('To-do created. The note stays here.')).catch(fail('Could not create the to-do.'))}
                      onDelete={() => {
                        if (!window.confirm('Delete this note?')) return;
                        void workspace.deleteEntry(entry.id).then(() => notify('Note deleted.')).catch(fail('Could not delete the note.'));
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </section>

      <Composer
        placeholder={isUnsorted ? 'Write a quick note (move it to a topic later)…' : `Add to “${topic?.title ?? ''}”: what did you do or learn?`}
        onSubmit={addEntry}
      />
    </div>
  );
}

function TopicHeader({
  topic,
  entryCount,
  onBack,
  onRename,
  onStatus,
  onPin,
  onDelete,
}: {
  topic: Topic | null;
  entryCount: number;
  onBack: () => void;
  onRename: (title: string) => Promise<void>;
  onStatus: (status: TopicStatus) => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(topic?.title ?? '');
  const [error, setError] = useState<string | null>(null);

  async function save(event?: FormEvent) {
    event?.preventDefault();
    if (!topic) return;
    if (title.trim() === topic.title) {
      setEditing(false);
      return;
    }
    try {
      await onRename(title);
      setEditing(false);
      setError(null);
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Could not rename the topic.');
    }
  }

  return (
    <div className="space-y-3">
      <Button variant="ghost" className="-ml-2 min-h-9 px-2" onClick={onBack}><ArrowLeft size={16} />All topics</Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {topic && editing ? (
            <form onSubmit={save} className="flex gap-2">
              <input
                className="field text-lg font-semibold"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Escape') { setTitle(topic.title); setEditing(false); } }}
                aria-label="Topic title"
                autoFocus
              />
              <Button variant="primary" type="submit">Save</Button>
            </form>
          ) : (
            <div className="flex items-start gap-1">
              <h2 className="min-w-0 text-2xl font-semibold tracking-tight break-words sm:text-3xl">{topic ? topic.title : 'Unsorted'}</h2>
              {topic && (
                <IconButton label="Rename topic" onClick={() => { setTitle(topic.title); setEditing(true); }} className="mt-0.5">
                  <Pencil size={16} />
                </IconButton>
              )}
            </div>
          )}
          {error && <p className="mt-1 text-sm text-rose-700 dark:text-rose-300" role="alert">{error}</p>}
          <p className="mt-1 text-sm text-stone-500">
            {topic
              ? `${entryCount} ${entryCount === 1 ? 'note' : 'notes'} · started ${formatDayLabel(timestampToLocalDateKey(topic.created_at))}`
              : 'Notes written without a topic. Move each one under a topic so you can find it with its context later.'}
          </p>
        </div>
        {topic && (
          <div className="flex items-center gap-1">
            <div className="inline-flex rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-700 dark:bg-stone-900" role="group" aria-label="Topic status">
              {(['active', 'paused', 'done'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={topic.status === status}
                  onClick={() => topic.status !== status && onStatus(status)}
                  className={cn('min-h-8 rounded-lg px-2.5 text-xs font-medium capitalize transition', topic.status === status ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800')}
                >
                  {status}
                </button>
              ))}
            </div>
            <IconButton label={topic.is_pinned ? 'Unpin topic' : 'Pin topic to the top'} onClick={onPin} className={cn(topic.is_pinned && 'text-stone-900 dark:text-stone-100')}>
              {topic.is_pinned ? <PinOff size={16} /> : <Pin size={16} />}
            </IconButton>
            <IconButton label="Delete topic" tone="danger" onClick={onDelete}>
              <Trash2 size={16} />
            </IconButton>
          </div>
        )}
      </div>
    </div>
  );
}

function ResumeBanner({ topic, latest }: { topic: Topic; latest: TopicEntry | null }) {
  const days = daysSince(topic.last_activity_at);
  if (days < RESUME_AFTER_DAYS || (!topic.left_off.trim() && !latest)) return null;
  const when = formatDayLabel(timestampToLocalDateKey(topic.last_activity_at));

  return (
    <div className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-100">
      <History size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">Welcome back. Last time was {when} ({days} days ago).</p>
        {topic.left_off.trim() ? (
          <p className="mt-1 break-words whitespace-pre-wrap"><span className="font-medium">You left off at: </span>{topic.left_off}</p>
        ) : latest ? (
          <p className="mt-1 break-words"><span className="font-medium">Your last note: </span>{entryPreview(latest, 240)}</p>
        ) : null}
      </div>
    </div>
  );
}

function LeftOffEditor({ topic, onSave }: { topic: Topic; onSave: (value: string) => Promise<void> }) {
  const autosave = useQueuedAutosave({
    storageKey: `topic-left-off:${topic.id}`,
    initialValue: topic.left_off,
    save: onSave,
  });

  return (
    <section className="surface p-3 sm:p-4">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <label className="label mb-0" htmlFor={`left-off-${topic.id}`}>Where I left off / next step</label>
        <SaveState status={autosave.status} error={autosave.error} onRetry={autosave.retry} restored={autosave.wasRestored} />
      </div>
      <TextArea
        id={`left-off-${topic.id}`}
        className="min-h-16"
        rows={2}
        value={autosave.value}
        onChange={(event) => autosave.setValue(event.target.value)}
        placeholder="e.g. “Finished chapter 3. Next: try useEffect cleanup with a timer.”"
      />
    </section>
  );
}

function EntryCard({
  entry,
  isUnsorted,
  moveTargets,
  onUpdate,
  onMove,
  onMakeTask,
  onDelete,
}: {
  entry: TopicEntry;
  isUnsorted: boolean;
  moveTargets: Topic[];
  onUpdate: (patch: { content?: string; items?: ChecklistItem[] }) => Promise<void>;
  onMove: (target: string) => void;
  onMakeTask: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const doneCount = entry.items.filter((item) => item.done).length;

  function toggleItem(itemId: string) {
    const items = entry.items.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item));
    void onUpdate({ items }).catch(() => undefined);
  }

  const moveSelect = (
    <select
      className="field min-h-9 w-auto max-w-full py-1 text-sm"
      value=""
      aria-label="Move this note to a topic"
      onChange={(event) => {
        const target = event.target.value;
        setMoving(false);
        if (target) onMove(target);
      }}
    >
      <option value="">{isUnsorted ? 'Move to a topic…' : 'Move to…'}</option>
      {moveTargets.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
      {!isUnsorted && <option value={UNSORTED_ID}>Unsorted</option>}
      <option value={NEW_TOPIC}>+ New topic…</option>
    </select>
  );

  return (
    <article className="group rounded-2xl border border-stone-200 bg-white px-3 py-2.5 sm:px-4 dark:border-stone-800 dark:bg-stone-900">
      {editing ? (
        <EntryEditor entry={entry} onCancel={() => setEditing(false)} onSave={async (patch) => { await onUpdate(patch); setEditing(false); }} />
      ) : (
        <>
          {entry.content.trim() && (
            <p className={cn('text-[15px] leading-6 break-words whitespace-pre-wrap', entry.kind === 'checklist' && 'font-medium')}>{entry.content}</p>
          )}
          {entry.kind === 'checklist' && (
            <ul className={cn('space-y-0.5', entry.content.trim() && 'mt-1.5')}>
              {entry.items.map((item) => (
                <li key={item.id}>
                  <button type="button" className="-mx-1 flex w-full items-start gap-2.5 rounded-lg px-1 py-1 text-left hover:bg-stone-50 dark:hover:bg-stone-800/60" onClick={() => toggleItem(item.id)} aria-pressed={item.done}>
                    <span className={cn('mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-2', item.done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300 dark:border-stone-600')}>
                      {item.done && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className={cn('min-w-0 text-[15px] leading-6 break-words', item.done && 'text-stone-400 line-through')}>{item.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-stone-500">
              {formatTime(entry.created_at)}
              {entry.kind === 'checklist' && entry.items.length > 0 && ` · ${doneCount}/${entry.items.length} done`}
            </span>
            <div className="-mr-2 flex flex-wrap items-center gap-0.5">
              {(isUnsorted || moving) && moveSelect}
              {!isUnsorted && !moving && (
                <IconButton label="Move to another topic" title="Move" onClick={() => setMoving(true)} className="h-9 w-9">
                  <FolderInput size={16} />
                </IconButton>
              )}
              <IconButton label="Edit note" title="Edit" onClick={() => setEditing(true)} className="h-9 w-9">
                <Pencil size={16} />
              </IconButton>
              <IconButton label="Make a to-do from this note" title="Make to-do" onClick={onMakeTask} className="h-9 w-9">
                <ClipboardList size={16} />
              </IconButton>
              <IconButton label="Delete note" title="Delete" tone="danger" onClick={onDelete} className="h-9 w-9">
                <Trash2 size={16} />
              </IconButton>
            </div>
          </div>
        </>
      )}
    </article>
  );
}

function EntryEditor({
  entry,
  onSave,
  onCancel,
}: {
  entry: TopicEntry;
  onSave: (patch: { content: string; items?: ChecklistItem[] }) => Promise<void>;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(entry.content);
  const [itemsText, setItemsText] = useState(entry.items.map((item) => item.text).join('\n'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checklist = entry.kind === 'checklist';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (checklist) {
        const unused = [...entry.items];
        const items = itemsText.split('\n').map((line) => line.trim()).filter(Boolean).map((text) => {
          const index = unused.findIndex((item) => item.text === text);
          if (index >= 0) return unused.splice(index, 1)[0];
          return { id: makeId(), text, done: false };
        });
        await onSave({ content, items });
      } else {
        await onSave({ content });
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the note.');
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 py-1"
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); event.currentTarget.requestSubmit(); }
      }}
    >
      {checklist ? (
        <>
          <input className="field" value={content} onChange={(event) => setContent(event.target.value)} placeholder="List title (optional)" aria-label="List title" />
          <TextArea value={itemsText} onChange={(event) => setItemsText(event.target.value)} aria-label="Checklist items, one per line" placeholder="One item per line" autoFocus />
        </>
      ) : (
        <TextArea value={content} onChange={(event) => setContent(event.target.value)} aria-label="Note text" autoFocus />
      )}
      {error && <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">{error}</p>}
      <div className="flex gap-2">
        <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function Composer({
  placeholder,
  onSubmit,
}: {
  placeholder: string;
  onSubmit: (input: { kind: EntryKind; content: string; items: ChecklistItem[] }) => Promise<void>;
}) {
  const [mode, setMode] = useState<EntryKind>('text');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const enterSends = !coarsePointer && mode === 'text';

  async function submit() {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'checklist') {
        await onSubmit({ kind: 'checklist', content: '', items: checklistFromText(text) });
      } else {
        await onSubmit({ kind: 'text', content: text, items: [] });
      }
      setText('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.focus();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save the note.');
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter') return;
    if (event.metaKey || event.ctrlKey || (enterSends && !event.shiftKey)) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 md:bottom-4">
      <div className="surface p-2 shadow-lg shadow-stone-900/5">
        <div className="mb-1.5 flex items-center gap-1">
          <button type="button" className={cn('chip min-h-8 px-2.5 text-xs', mode === 'text' && 'chip-active')} aria-pressed={mode === 'text'} onClick={() => setMode('text')}>
            <Type size={13} />Note
          </button>
          <button type="button" className={cn('chip min-h-8 px-2.5 text-xs', mode === 'checklist' && 'chip-active')} aria-pressed={mode === 'checklist'} onClick={() => setMode('checklist')}>
            <ListChecks size={13} />Checklist
          </button>
          <span className="ml-auto hidden pr-1 text-xs text-stone-400 sm:inline">
            {mode === 'checklist' ? 'One item per line · Ctrl+Enter to add' : 'Enter to add · Shift+Enter for a new line'}
          </span>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            className="field max-h-60 min-h-11 resize-none"
            rows={mode === 'checklist' ? 3 : 1}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              const element = event.target;
              element.style.height = 'auto';
              element.style.height = `${Math.min(element.scrollHeight, 240)}px`;
            }}
            onKeyDown={onKeyDown}
            placeholder={mode === 'checklist' ? 'One item per line' : placeholder}
            aria-label={mode === 'checklist' ? 'New checklist, one item per line' : 'New note'}
          />
          <Button variant="primary" className="h-11 w-11 shrink-0 px-0" onClick={() => void submit()} disabled={busy || !text.trim()} aria-label="Add note">
            <SendHorizontal size={18} />
          </Button>
        </div>
        {error && <p className="mt-1.5 px-1 text-sm text-rose-700 dark:text-rose-300" role="alert">{error}</p>}
      </div>
    </div>
  );
}

import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ClipboardList, Inbox, ListChecks, Plus, StickyNote, Type, X } from 'lucide-react';

import { checklistFromText, recentTopics } from '../lib/topics';
import type { ChecklistItem, EntryKind, InboxItemType, Topic } from '../lib/types';
import { cn, modKeyLabel } from '../lib/utils';
import { Button, IconButton, TextArea } from './ui';

export type CaptureMode = 'todo' | 'note' | 'inbox';

const LAST_TOPIC_KEY = 'myspace-last-topic';
const NEW_TOPIC = '__new__';

const inboxTypes: Array<{ value: InboxItemType; label: string }> = [
  { value: 'unsorted', label: 'Unsorted' },
  { value: 'task', label: 'Task' },
  { value: 'note', label: 'Note' },
  { value: 'goal', label: 'Goal' },
];

const modes: Array<{ id: CaptureMode; label: string; icon: LucideIcon }> = [
  { id: 'todo', label: 'To-do', icon: ClipboardList },
  { id: 'note', label: 'Note', icon: StickyNote },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
];

function readLastTopic() {
  try {
    return localStorage.getItem(LAST_TOPIC_KEY) || null;
  } catch {
    return null;
  }
}

function writeLastTopic(topicId: string | null) {
  try {
    localStorage.setItem(LAST_TOPIC_KEY, topicId ?? '');
  } catch {
    // Remembering the last topic is a convenience; the note is already saved.
  }
}

export function QuickCaptureDialog({
  open,
  defaultMode,
  defaultTopicId,
  topics,
  onClose,
  onSaveTask,
  onSaveNote,
  onSaveInbox,
}: {
  open: boolean;
  defaultMode: CaptureMode;
  defaultTopicId: string | null;
  topics: Topic[];
  onClose: () => void;
  onSaveTask: (input: { title: string; detail: string; dueToday: boolean; high: boolean }) => Promise<void>;
  onSaveNote: (input: { topicId: string | null; newTopicTitle: string | null; kind: EntryKind; content: string; items: ChecklistItem[] }) => Promise<string | null>;
  onSaveInbox: (input: { title: string; content: string; item_type: InboxItemType }) => Promise<void>;
}) {
  const [mode, setMode] = useState<CaptureMode>(defaultMode);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [dueToday, setDueToday] = useState(false);
  const [high, setHigh] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteKind, setNoteKind] = useState<EntryKind>('text');
  const [topicChoice, setTopicChoice] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [itemType, setItemType] = useState<InboxItemType>('unsorted');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode(defaultMode);
    setError(null);
    const remembered = defaultTopicId ?? readLastTopic();
    setTopicChoice(remembered && topics.some((topic) => topic.id === remembered) ? remembered : null);
    // Only reset when the dialog opens, not when topics change while it is open.
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => (mode === 'note' ? noteRef.current : titleRef.current)?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, mode]);

  if (!open) return null;

  const suggested = recentTopics(topics, 5);
  const chosenTopic = topicChoice && topicChoice !== NEW_TOPIC ? topics.find((topic) => topic.id === topicChoice) ?? null : null;
  const chipTopics = chosenTopic && !suggested.some((topic) => topic.id === chosenTopic.id) ? [chosenTopic, ...suggested.slice(0, 4)] : suggested;

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    setError(null);

    try {
      if (mode === 'note') {
        if (!noteText.trim()) throw new Error('Write something before saving.');
        if (topicChoice === NEW_TOPIC && !newTopicTitle.trim()) throw new Error('Name the new topic, or pick another one.');
        setBusy(true);
        const savedTopicId = await onSaveNote({
          topicId: topicChoice === NEW_TOPIC ? null : topicChoice,
          newTopicTitle: topicChoice === NEW_TOPIC ? newTopicTitle : null,
          kind: noteKind,
          content: noteKind === 'text' ? noteText : '',
          items: noteKind === 'checklist' ? checklistFromText(noteText) : [],
        });
        writeLastTopic(savedTopicId);
        setNoteText('');
        setNewTopicTitle('');
      } else {
        if (!title.trim()) throw new Error('Write something before saving.');
        setBusy(true);
        if (mode === 'todo') {
          await onSaveTask({ title, detail, dueToday, high });
          setDueToday(false);
          setHigh(false);
        } else {
          await onSaveInbox({ title, content: detail, item_type: itemType });
          setItemType('unsorted');
        }
        setTitle('');
        setDetail('');
        setShowDetail(false);
      }
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-stone-950/40 sm:items-center sm:p-4" role="presentation" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-title"
        className="animate-sheet-in max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-stone-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl motion-reduce:animate-none sm:animate-toast-in sm:rounded-2xl sm:p-5 dark:border-stone-800 dark:bg-stone-900"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            void handleSubmit();
          }
        }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-300 sm:hidden dark:bg-stone-700" aria-hidden />
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="capture-title" className="text-lg font-semibold">Quick capture</h2>
          <IconButton label="Close" onClick={onClose} className="-mr-2">
            <X size={18} />
          </IconButton>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-950" role="tablist" aria-label="What are you capturing?">
          {modes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => { setMode(id); setError(null); }}
              className={cn('flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition', mode === id ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-white' : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200')}
            >
              <Icon size={15} />{label}
            </button>
          ))}
        </div>

        {mode === 'note' ? (
          <>
            <p className="label">Topic</p>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Topic">
              {chipTopics.map((topic) => (
                <button key={topic.id} type="button" className={cn('chip max-w-56', topicChoice === topic.id && 'chip-active')} aria-pressed={topicChoice === topic.id} onClick={() => setTopicChoice(topic.id)}>
                  <span className="truncate">{topic.title}</span>
                </button>
              ))}
              <button type="button" className={cn('chip', topicChoice === NEW_TOPIC && 'chip-active')} aria-pressed={topicChoice === NEW_TOPIC} onClick={() => setTopicChoice(NEW_TOPIC)}>
                <Plus size={14} />New topic
              </button>
              <button type="button" className={cn('chip', topicChoice === null && 'chip-active')} aria-pressed={topicChoice === null} onClick={() => setTopicChoice(null)}>
                Unsorted
              </button>
            </div>
            {topicChoice === NEW_TOPIC && (
              <input
                className="field mt-2"
                value={newTopicTitle}
                onChange={(event) => setNewTopicTitle(event.target.value)}
                placeholder="New topic name, e.g. “Learning Supabase”"
                aria-label="New topic name"
              />
            )}
            {topicChoice === null && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Saved to Unsorted. Notes are easier to find later under a topic.</p>
            )}

            <div className="mt-4 mb-2 flex gap-2">
              <button type="button" className={cn('chip min-h-8 px-2.5 text-xs', noteKind === 'text' && 'chip-active')} aria-pressed={noteKind === 'text'} onClick={() => setNoteKind('text')}>
                <Type size={13} />Note
              </button>
              <button type="button" className={cn('chip min-h-8 px-2.5 text-xs', noteKind === 'checklist' && 'chip-active')} aria-pressed={noteKind === 'checklist'} onClick={() => setNoteKind('checklist')}>
                <ListChecks size={13} />Checklist
              </button>
            </div>
            <TextArea
              ref={noteRef}
              className="min-h-28"
              value={noteText}
              onChange={(event) => { setNoteText(event.target.value); if (error) setError(null); }}
              placeholder={noteKind === 'checklist' ? 'One item per line' : 'What are you doing, learning, or thinking about?'}
              aria-label={noteKind === 'checklist' ? 'Checklist items, one per line' : 'Note'}
            />
          </>
        ) : (
          <>
            <label className="sr-only" htmlFor="capture-text">{mode === 'todo' ? 'To-do' : 'Thought'}</label>
            <input
              id="capture-text"
              ref={titleRef}
              className="field min-h-12 text-base"
              value={title}
              onChange={(event) => { setTitle(event.target.value); if (error) setError(null); }}
              placeholder={mode === 'todo' ? 'What needs doing?' : 'What just came to mind?'}
              enterKeyHint="done"
              autoComplete="off"
            />
            {showDetail ? (
              <TextArea className="mt-3 min-h-20" value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Details (optional)" aria-label="Details" />
            ) : (
              <button type="button" className="mt-2 rounded-lg px-1 py-1 text-sm font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200" onClick={() => setShowDetail(true)}>
                + Add detail
              </button>
            )}
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={mode === 'todo' ? 'To-do options' : 'Capture type'}>
              {mode === 'todo' ? (
                <>
                  <button type="button" className={cn('chip', dueToday && 'chip-active')} aria-pressed={dueToday} onClick={() => setDueToday((current) => !current)}>Due today</button>
                  <button type="button" className={cn('chip', high && 'chip-active')} aria-pressed={high} onClick={() => setHigh((current) => !current)}>High priority</button>
                </>
              ) : (
                inboxTypes.map((type) => (
                  <button key={type.value} type="button" className={cn('chip', itemType === type.value && 'chip-active')} aria-pressed={itemType === type.value} onClick={() => setItemType(type.value)}>
                    {type.label}
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {error && <p className="mt-3 text-sm text-rose-700 dark:text-rose-300" role="alert">{error}</p>}

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="hidden text-xs text-stone-500 sm:block">{modKeyLabel} + Enter to save</p>
          <Button variant="primary" type="submit" className="min-h-11 flex-1 sm:flex-none" disabled={busy}>
            {busy ? 'Saving…' : mode === 'todo' ? 'Add to-do' : mode === 'note' ? 'Save note' : 'Save to Inbox'}
          </Button>
        </div>
      </form>
    </div>
  );
}

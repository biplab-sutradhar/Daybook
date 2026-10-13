import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, Search, Star, Trash2 } from 'lucide-react';

import { cn, formatRelativeTime } from '../lib/utils';
import { parseNoteDraft, parseTags, serializeNoteDraft } from '../lib/notes';
import { useQueuedAutosave } from '../hooks/useQueuedAutosave';
import type { Note } from '../lib/types';
import type { WorkspaceController } from '../hooks/useWorkspace';
import { Button, EmptyState, IconButton, PageHeader, SaveState, TextArea } from '../components/ui';

export function NotesPage({
  workspace,
  notify,
  reportError,
}: {
  workspace: WorkspaceController;
  notify: (message: string) => void;
  reportError: (message: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(workspace.notes[0]?.id ?? null);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const tags = useMemo(() => [...new Set(workspace.notes.flatMap((note) => note.tags))].sort(), [workspace.notes]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return workspace.notes.filter((note) => {
      if (favoritesOnly && !note.is_favorite) return false;
      if (tag && !note.tags.includes(tag)) return false;
      if (!needle) return true;
      return `${note.title}\n${note.content}\n${note.tags.join(' ')}`.toLowerCase().includes(needle);
    }).sort((left, right) => Number(right.is_favorite) - Number(left.is_favorite) || right.updated_at.localeCompare(left.updated_at));
  }, [favoritesOnly, query, tag, workspace.notes]);
  const selected = visible.find((note) => note.id === selectedId) ?? visible[0] ?? null;

  function openNote(id: string) {
    setSelectedId(id);
    setMobileEditorOpen(true);
    window.scrollTo({ top: 0 });
  }

  async function createNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get('title') ?? '');
    const content = String(form.get('content') ?? '');
    const tagsValue = String(form.get('tags') ?? '');
    try {
      const note = await workspace.createNote({
        title,
        content,
        tags: parseTags(tagsValue),
        is_favorite: false,
      });
      formElement.reset();
      setCreating(false);
      setQuery('');
      setTag(null);
      setFavoritesOnly(false);
      openNote(note.id);
      notify('Note saved.');
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Could not create the note.');
    }
  }

  const showEditorOnMobile = mobileEditorOpen && selected !== null;

  return (
    <div className="space-y-4">
      <div className={cn(showEditorOnMobile && 'hidden lg:block')}>
        <PageHeader
          eyebrow="Library"
          title="Classic notes"
          description="Your original notes, still editable. Each one was also copied into Notes as a topic, so edits here do not change the topic."
          actions={<Button variant="primary" onClick={() => setCreating((current) => !current)}>{creating ? 'Close' : 'New note'}</Button>}
        />
      </div>

      {creating && (
        <form onSubmit={createNote} className={cn('surface space-y-3 p-4', showEditorOnMobile && 'hidden lg:block')}>
          <input name="title" className="field" placeholder="Title" aria-label="Note title" required autoFocus />
          <TextArea name="content" placeholder="Write the note" aria-label="Note content" />
          <input name="tags" className="field" placeholder="Tags, separated by commas" aria-label="Note tags" />
          <div className="flex gap-2">
            <Button variant="primary" type="submit" className="flex-1 sm:flex-none">Create note</Button>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className={cn('flex flex-col gap-3', showEditorOnMobile && 'hidden lg:flex')}>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" aria-hidden />
          <input type="search" className="field pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes and tags" aria-label="Search notes" />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          <button type="button" className={cn('chip', favoritesOnly && 'chip-active')} onClick={() => setFavoritesOnly((current) => !current)} aria-pressed={favoritesOnly}>
            <Star size={14} className={cn(favoritesOnly && 'fill-current')} />Favorites
          </button>
          <button type="button" className={cn('chip', tag === null && 'chip-active')} onClick={() => setTag(null)} aria-pressed={tag === null}>All tags</button>
          {tags.map((item) => (
            <button key={item} type="button" className={cn('chip', tag === item && 'chip-active')} onClick={() => setTag(tag === item ? null : item)} aria-pressed={tag === item}>#{item}</button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        workspace.notes.length === 0 ? (
          <EmptyState title="No notes yet" description="Notes stay separate from tasks. A title is enough to start." actionLabel="New note" onAction={() => setCreating(true)} />
        ) : (
          <EmptyState title="No notes match" description="Try another search, or clear the tag and favorite filters." actionLabel="Clear filters" onAction={() => { setQuery(''); setTag(null); setFavoritesOnly(false); }} />
        )
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className={cn('space-y-2 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto', showEditorOnMobile && 'hidden lg:block')}>
            {visible.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => openNote(note.id)}
                aria-current={selected?.id === note.id ? 'true' : undefined}
                className={cn(
                  'w-full rounded-2xl border px-3 py-3 text-left transition',
                  selected?.id === note.id
                    ? 'border-stone-200 bg-white lg:border-stone-900 dark:border-stone-800 dark:bg-stone-900 lg:dark:border-stone-100'
                    : 'border-stone-200/60 bg-white/70 hover:bg-white dark:border-stone-800/60 dark:bg-stone-900/60 dark:hover:bg-stone-900',
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0 font-medium break-words">{note.title}</span>
                  {note.is_favorite && <Star size={14} className="mt-1 shrink-0 fill-amber-400 text-amber-400" aria-label="Favorite" />}
                </span>
                {note.content.trim() && <span className="mt-1 line-clamp-2 block text-sm text-stone-500 dark:text-stone-400">{note.content}</span>}
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                  {formatRelativeTime(note.updated_at)}
                  {note.tags.slice(0, 3).map((item) => <span key={item} className="badge bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">#{item}</span>)}
                </span>
              </button>
            ))}
          </div>
          {selected && (
            <div className={cn(!showEditorOnMobile && 'hidden lg:block')}>
              <NoteEditor
                key={selected.id}
                note={selected}
                onBack={() => setMobileEditorOpen(false)}
                onSave={async (serialized) => {
                  const draft = parseNoteDraft(serialized);
                  await workspace.updateNote(selected.id, {
                    title: draft.title,
                    content: draft.content,
                    tags: parseTags(draft.tags),
                  });
                }}
                onFavorite={async () => {
                  try {
                    await workspace.updateNote(selected.id, { is_favorite: !selected.is_favorite });
                  } catch (error) {
                    reportError(error instanceof Error ? error.message : 'Could not update the note.');
                  }
                }}
                onDelete={async () => {
                  if (!window.confirm(`Delete “${selected.title}”?`)) return;
                  try {
                    await workspace.deleteNote(selected.id);
                    setMobileEditorOpen(false);
                    notify('Note deleted.');
                  } catch (error) {
                    reportError(error instanceof Error ? error.message : 'Could not delete the note.');
                  }
                }}
                onConvert={async () => {
                  try {
                    await workspace.convertNoteToTask(selected);
                    notify('Task created. The original note is still here.');
                  } catch (error) {
                    reportError(error instanceof Error ? error.message : 'Could not create the task.');
                  }
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NoteEditor({
  note,
  onBack,
  onSave,
  onFavorite,
  onDelete,
  onConvert,
}: {
  note: Note;
  onBack: () => void;
  onSave: (serialized: string) => Promise<void>;
  onFavorite: () => void;
  onDelete: () => void;
  onConvert: () => void;
}) {
  const autosave = useQueuedAutosave({
    storageKey: `note:${note.id}`,
    initialValue: serializeNoteDraft({ title: note.title, content: note.content, tags: note.tags.join(', ') }),
    save: onSave,
  });
  const draft = parseNoteDraft(autosave.value);

  function update(patch: Partial<typeof draft>) {
    autosave.setValue(serializeNoteDraft({ ...draft, ...patch }));
  }

  return (
    <section className="surface p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <IconButton label="Back to notes" onClick={onBack} className="-ml-2 lg:hidden">
            <ArrowLeft size={18} />
          </IconButton>
          <SaveState status={autosave.status} error={autosave.error} onRetry={autosave.retry} restored={autosave.wasRestored} />
        </div>
        <div className="flex shrink-0">
          <IconButton label={note.is_favorite ? 'Remove from favorites' : 'Add to favorites'} onClick={onFavorite} className={cn(note.is_favorite && 'text-amber-500 dark:text-amber-400')}>
            <Star size={18} className={cn(note.is_favorite && 'fill-current')} />
          </IconButton>
          <IconButton label="Make a task from this note" title="Make task" onClick={onConvert}>
            <ClipboardList size={18} />
          </IconButton>
          <IconButton label="Delete note" title="Delete" tone="danger" onClick={onDelete}>
            <Trash2 size={18} />
          </IconButton>
        </div>
      </div>
      <input className="w-full bg-transparent text-xl font-semibold outline-none sm:text-2xl" value={draft.title} onChange={(event) => update({ title: event.target.value })} aria-label="Note title" placeholder="Title" />
      <TextArea className="mt-3 min-h-[50vh] border-none bg-transparent px-0 text-base leading-7 shadow-none focus:ring-0 lg:min-h-72" value={draft.content} onChange={(event) => update({ content: event.target.value })} aria-label="Note content" placeholder="Write plainly." />
      <label className="label mt-4" htmlFor={`tags-${note.id}`}>Tags</label>
      <input id={`tags-${note.id}`} className="field" value={draft.tags} onChange={(event) => update({ tags: event.target.value })} placeholder="personal, ideas" />
    </section>
  );
}

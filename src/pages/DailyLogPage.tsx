import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { DAILY_PROMPTS } from '../lib/constants';
import { dateKeyToLocalDate, formatDate, shiftDateKey, toLocalDateKey } from '../lib/date';
import { insertPrompt } from '../lib/reviews';
import { useQueuedAutosave } from '../hooks/useQueuedAutosave';
import type { WorkspaceController } from '../hooks/useWorkspace';
import { MonthCalendar } from '../components/MonthCalendar';
import { Button, IconButton, PageHeader, SaveState, TextArea } from '../components/ui';

export function DailyLogPage({
  workspace,
  date,
  onDate,
}: {
  workspace: WorkspaceController;
  date: string;
  onDate: (date: string) => void;
}) {
  const [query, setQuery] = useState('');
  const log = workspace.logs.find((entry) => entry.entry_date === date) ?? null;
  const marked = new Set(workspace.logs.filter((entry) => entry.content.trim()).map((entry) => entry.entry_date));
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? workspace.logs.filter((entry) => entry.entry_date.includes(needle) || entry.content.toLowerCase().includes(needle))
    : [];

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader eyebrow="Journal" title="Daily log" description={`${marked.size} ${marked.size === 1 ? 'day' : 'days'} written so far.`} />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="min-w-0 xl:order-2">
          <LogEditor
            key={date}
            date={date}
            initialValue={log?.content ?? ''}
            onSave={(content) => workspace.saveDailyLog(date, content)}
            onDate={onDate}
          />
        </div>
        <aside className="surface h-fit min-w-0 p-4 xl:sticky xl:top-8 xl:order-1">
          <MonthCalendar selected={date} marked={marked} onSelect={onDate} />
          <label className="label mt-5" htmlFor="log-search">Search entries</label>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" aria-hidden />
            <input id="log-search" type="search" className="field pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search writing" />
          </div>
          {needle && (
            <div className="mt-3 space-y-1">
              {matches.length === 0 ? <p className="text-sm text-stone-500">No matching entries.</p> : matches.slice(0, 8).map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="block w-full rounded-xl px-2 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-800"
                  onClick={() => { onDate(entry.entry_date); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  <span className="font-medium">{formatDate(entry.entry_date)}</span>
                  <span className="mt-1 line-clamp-2 block text-xs text-stone-500">{entry.content}</span>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function LogEditor({
  date,
  initialValue,
  onSave,
  onDate,
}: {
  date: string;
  initialValue: string;
  onSave: (content: string) => Promise<void>;
  onDate: (date: string) => void;
}) {
  const autosave = useQueuedAutosave({
    storageKey: `log:${date}`,
    initialValue,
    save: onSave,
  });
  const today = toLocalDateKey();
  const isToday = date === today;
  const words = countWords(autosave.value);

  return (
    <section className="surface min-w-0 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <IconButton label="Previous day" onClick={() => onDate(shiftDateKey(date, -1))}>
          <ChevronLeft size={18} />
        </IconButton>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-xs text-stone-500">{isToday ? 'Today' : dateKeyToLocalDate(date).toLocaleDateString(undefined, { weekday: 'long' })}</p>
          <h3 className="truncate text-lg font-semibold">{formatDate(date)}</h3>
        </div>
        <IconButton label="Next day" onClick={() => onDate(shiftDateKey(date, 1))} disabled={date >= today}>
          <ChevronRight size={18} />
        </IconButton>
      </div>
      <TextArea
        value={autosave.value}
        onChange={(event) => autosave.setValue(event.target.value)}
        className="min-h-[40vh] min-w-0 border-stone-100 bg-stone-50 text-base leading-7 sm:min-h-[45vh] xl:min-h-80 dark:border-stone-800 dark:bg-stone-950"
        placeholder="Write freely. A few sentences is enough. Tap a prompt below if you want a starting point."
        aria-label="Daily log"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <SaveState status={autosave.status} error={autosave.error} onRetry={autosave.retry} restored={autosave.wasRestored} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 tabular-nums">{words} {words === 1 ? 'word' : 'words'}</span>
          {!isToday && <Button className="min-h-8 px-2.5 py-1" onClick={() => onDate(today)}>Jump to today</Button>}
        </div>
      </div>
      <p className="label mt-5">Prompts</p>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {DAILY_PROMPTS.map((prompt) => {
          const used = autosave.value.includes(prompt);
          return (
            <button key={prompt} type="button" className="chip disabled:opacity-50" disabled={used} onClick={() => autosave.setValue(insertPrompt(autosave.value, prompt))}>
              {prompt}
            </button>
          );
        })}
      </div>
    </section>
  );
}

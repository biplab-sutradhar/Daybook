import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { addDays, dateKeyToLocalDate, formatDate, getWeekStart, toLocalDateKey } from '../lib/date';
import { cn } from '../lib/utils';
import { Button } from './ui';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MonthCalendar({
  selected,
  marked,
  onSelect,
}: {
  selected: string;
  marked: Set<string>;
  onSelect: (dateKey: string) => void;
}) {
  const [monthDate, setMonthDate] = useState(() => {
    const date = dateKeyToLocalDate(selected);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const gridStart = getWeekStart(monthDate);
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const today = toLocalDateKey();

  useEffect(() => {
    const date = dateKeyToLocalDate(selected);
    setMonthDate(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [selected]);

  function shiftMonth(amount: number) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">{monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" className="min-h-9 px-2" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="ghost" className="min-h-9 px-2" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-stone-500">
        {weekdays.map((day) => <div key={day}>{day}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date) => {
          const key = toLocalDateKey(date);
          const inMonth = date.getMonth() === monthDate.getMonth();
          const isToday = key === today;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={cn(
                'relative min-h-10 rounded-lg text-sm tabular-nums',
                key === selected ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'hover:bg-stone-100 dark:hover:bg-stone-800',
                isToday && key !== selected && 'font-semibold ring-1 ring-stone-400 ring-inset dark:ring-stone-500',
                !inMonth && key !== selected && 'text-stone-400 dark:text-stone-600',
              )}
              aria-pressed={key === selected}
              aria-label={`${formatDate(key)}${isToday ? ', today' : ''}${marked.has(key) ? ', has an entry' : ''}`}
            >
              {date.getDate()}
              {marked.has(key) && <span className={cn('absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full', key === selected ? 'bg-white dark:bg-stone-900' : 'bg-stone-500')} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

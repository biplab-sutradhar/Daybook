export function toLocalDateKey(date: Date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function formatDate(dateValue: string | null | undefined, fallback = 'No date') {
  if (!dateValue) return fallback;

  const parsed = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return fallback;

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDueLabel(dateKey: string, today: string) {
  if (dateKey === today) return 'Today';
  if (dateKey === shiftDateKey(today, 1)) return 'Tomorrow';
  if (dateKey === shiftDateKey(today, -1)) return 'Yesterday';

  const date = dateKeyToLocalDate(dateKey);
  if (dateKey > today && dateKey <= shiftDateKey(today, 6)) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }

  const sameYear = dateKey.slice(0, 4) === today.slice(0, 4);
  return date.toLocaleDateString(undefined, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDayLabel(dateKey: string, today: string = toLocalDateKey()) {
  if (dateKey === today) return 'Today';
  if (dateKey === shiftDateKey(today, -1)) return 'Yesterday';
  const date = dateKeyToLocalDate(dateKey);
  const sameYear = dateKey.slice(0, 4) === today.slice(0, 4);
  return date.toLocaleDateString(undefined, sameYear
    ? { weekday: 'short', month: 'short', day: 'numeric' }
    : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function getWeekStart(date: Date = new Date()) {
  const cloned = new Date(date);
  const diff = (cloned.getDay() + 6) % 7;
  cloned.setHours(0, 0, 0, 0);
  cloned.setDate(cloned.getDate() - diff);
  return cloned;
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function toDateInputValue(date: Date = new Date()) {
  return toLocalDateKey(date);
}

export function timestampToLocalDateKey(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return toLocalDateKey(date);
}

export function dateKeyToLocalDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
}

export function shiftDateKey(dateKey: string, days: number) {
  const date = dateKeyToLocalDate(dateKey);
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
}

export function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function weekRange(date: Date = new Date()) {
  const start = getWeekStart(date);
  const end = addDays(start, 6);
  return {
    start: toLocalDateKey(start),
    end: toLocalDateKey(end),
  };
}

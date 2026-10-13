import type { DailyLog, ReviewDraft, ReviewEntry, ReviewType } from './types';

export function findReview(entries: ReviewEntry[], type: ReviewType, start: string, end: string) {
  return entries.find((entry) => entry.review_type === type && entry.period_start === start && entry.period_end === end) ?? null;
}

export function emptyReviewDraft(type: ReviewType, start: string, end: string): ReviewDraft {
  return {
    review_type: type,
    period_start: start,
    period_end: end,
    went_well: '',
    lessons_learned: '',
    improvements: '',
    next_focus: '',
  };
}

export function reviewToDraft(entry: ReviewEntry | null, fallback: ReviewDraft): ReviewDraft {
  if (!entry) return fallback;
  return {
    review_type: entry.review_type,
    period_start: entry.period_start,
    period_end: entry.period_end,
    went_well: entry.went_well ?? '',
    lessons_learned: entry.lessons_learned ?? '',
    improvements: entry.improvements ?? '',
    next_focus: entry.next_focus ?? '',
  };
}

export function logsBetween(logs: DailyLog[], start: string, end: string) {
  return logs
    .filter((log) => log.entry_date >= start && log.entry_date <= end)
    .sort((left, right) => left.entry_date.localeCompare(right.entry_date));
}

export function insertPrompt(content: string, prompt: string) {
  if (content.includes(prompt)) return content;
  const line = `${prompt}\n`;
  const trimmed = content.trim();
  return trimmed ? `${trimmed}\n\n${line}` : line;
}

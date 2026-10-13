import type { NotePatch } from './types';

export interface NoteDraft {
  title: string;
  content: string;
  tags: string;
}

export function normalizeTags(tags: string[]) {
  const unique = [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
  if (unique.length > 12) throw new Error('Use up to 12 tags.');
  if (unique.some((tag) => tag.length > 30)) throw new Error('Tags must be 30 characters or fewer.');
  return unique;
}

export function parseTags(value: string) {
  return normalizeTags(value.split(','));
}

export function serializeNoteDraft(draft: NoteDraft) {
  return JSON.stringify(draft);
}

export function parseNoteDraft(value: string): NoteDraft {
  try {
    const parsed = JSON.parse(value) as Partial<NoteDraft>;
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      content: typeof parsed.content === 'string' ? parsed.content : '',
      tags: typeof parsed.tags === 'string' ? parsed.tags : '',
    };
  } catch {
    return { title: '', content: value, tags: '' };
  }
}

export function noteUpdatePayload(patch: NotePatch) {
  const payload: Record<string, unknown> = {};

  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new Error('Note title is required.');
    payload.title = title;
  }

  if (patch.content !== undefined) payload.content = patch.content;
  if (patch.tags !== undefined) payload.tags = normalizeTags(patch.tags);
  if (patch.is_favorite !== undefined) payload.is_favorite = patch.is_favorite;
  payload.updated_at = new Date().toISOString();
  return payload;
}

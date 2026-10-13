function storage() {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage;
}

export function draftKey(key: string) {
  return `myspace-draft:${key}`;
}

export function readDraft(key: string) {
  try {
    return storage()?.getItem(draftKey(key)) ?? null;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: string) {
  try {
    storage()?.setItem(draftKey(key), value);
  } catch {
    // Session storage can be unavailable in private browsing. The editor still keeps the text in memory.
  }
}

export function clearDraft(key: string) {
  try {
    storage()?.removeItem(draftKey(key));
  } catch {
    // Ignore storage failures. The database remains the source of truth after a successful save.
  }
}

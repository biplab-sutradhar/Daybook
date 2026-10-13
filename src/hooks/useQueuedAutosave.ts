import { useEffect, useRef, useState } from 'react';

import { clearDraft, readDraft, writeDraft } from '../lib/drafts';
import { saveLatest } from '../lib/saveLatest';
import type { SaveStatus } from '../lib/types';

export function useQueuedAutosave(options: {
  storageKey: string;
  initialValue: string;
  save: (value: string) => Promise<void>;
  delayMs?: number;
}) {
  const restoredDraft = readDraft(options.storageKey);
  const restored = restoredDraft !== null && restoredDraft !== options.initialValue;
  const [value, setValue] = useState(restored ? restoredDraft : options.initialValue);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [wasRestored, setWasRestored] = useState(restored);
  const valueRef = useRef(value);
  const savedRef = useRef(options.initialValue);
  const saveRef = useRef(options.save);
  const keyRef = useRef(options.storageKey);
  const queueRef = useRef(Promise.resolve());
  const mountedRef = useRef(true);
  const delay = options.delayMs ?? 800;

  valueRef.current = value;
  saveRef.current = options.save;
  keyRef.current = options.storageKey;

  async function persist() {
    if (mountedRef.current) {
      setStatus('saving');
      setError(null);
    }

    try {
      await saveLatest(
        () => valueRef.current,
        async (next) => {
          await saveRef.current(next);
          savedRef.current = next;
          clearDraft(keyRef.current);
        },
        (left, right) => left === right,
      );

      if (mountedRef.current && valueRef.current === savedRef.current) {
        setStatus('saved');
        setError(null);
        setWasRestored(false);
      }
    } catch (saveError) {
      writeDraft(keyRef.current, valueRef.current);
      if (mountedRef.current) {
        setStatus('error');
        setError(saveError instanceof Error ? saveError.message : 'Save failed.');
      }
    }
  }

  useEffect(() => {
    if (value === savedRef.current) return undefined;

    const timer = window.setTimeout(() => {
      queueRef.current = queueRef.current.then(() => persist());
    }, delay);

    return () => window.clearTimeout(timer);
  }, [value, delay]);

  useEffect(() => {
    const onHide = (event: BeforeUnloadEvent) => {
      if (valueRef.current === savedRef.current) return;
      writeDraft(keyRef.current, valueRef.current);
      event.preventDefault();
      event.returnValue = '';
    };

    mountedRef.current = true;
    window.addEventListener('beforeunload', onHide);
    return () => {
      window.removeEventListener('beforeunload', onHide);
      const latest = valueRef.current;
      const dirty = latest !== savedRef.current;
      mountedRef.current = false;
      if (!dirty) return;
      writeDraft(keyRef.current, latest);
      void saveRef.current(latest).then(() => clearDraft(keyRef.current)).catch(() => writeDraft(keyRef.current, latest));
    };
  }, []);

  function retry() {
    queueRef.current = queueRef.current.then(() => persist());
  }

  return { value, setValue, status, error, retry, wasRestored };
}

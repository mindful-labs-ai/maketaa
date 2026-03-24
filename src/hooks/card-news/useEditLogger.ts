'use client';

import { useCallback, useRef, useEffect } from 'react';
import { recordEdit } from '@/lib/card-news/api';

interface PendingEdit {
  fieldPath: string;
  oldValue: string | null;
  newValue: string;
  reason?: string;
}

interface UseEditLoggerOptions {
  specId: string;
  debounceMs?: number;
}

export function useEditLogger({ specId, debounceMs = 500 }: UseEditLoggerOptions) {
  const pendingEditsRef = useRef<PendingEdit[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const oldValuesRef = useRef<Map<string, string | null>>(new Map());

  const captureOldValue = useCallback((fieldPath: string, value: string | null) => {
    oldValuesRef.current.set(fieldPath, value);
  }, []);

  const logEdit = useCallback(
    (fieldPath: string, newValue: string, reason?: string) => {
      const oldValue = oldValuesRef.current.get(fieldPath) || null;
      const existingIndex = pendingEditsRef.current.findIndex((e) => e.fieldPath === fieldPath);
      if (existingIndex !== -1) {
        pendingEditsRef.current[existingIndex] = {
          fieldPath, oldValue: pendingEditsRef.current[existingIndex].oldValue, newValue,
          reason: reason || pendingEditsRef.current[existingIndex].reason,
        };
      } else {
        pendingEditsRef.current.push({ fieldPath, oldValue, newValue, reason });
      }
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(async () => {
        const editsToFlush = [...pendingEditsRef.current];
        pendingEditsRef.current = [];
        for (const edit of editsToFlush) {
          try { await recordEdit(specId, edit.fieldPath, edit.oldValue, edit.newValue, edit.reason); }
          catch (error) { console.error('[useEditLogger] Failed:', error); }
        }
        debounceTimerRef.current = null;
      }, debounceMs);
    },
    [specId, debounceMs],
  );

  const flush = useCallback(async () => {
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    const editsToFlush = [...pendingEditsRef.current];
    pendingEditsRef.current = [];
    return Promise.allSettled(
      editsToFlush.map((edit) => recordEdit(specId, edit.fieldPath, edit.oldValue, edit.newValue, edit.reason)),
    );
  }, [specId]);

  useEffect(() => {
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); pendingEditsRef.current = []; };
  }, []);

  return { captureOldValue, logEdit, flush, pendingCount: pendingEditsRef.current.length };
}

export default useEditLogger;

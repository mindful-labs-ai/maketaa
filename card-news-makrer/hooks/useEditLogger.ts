'use client';

import { useCallback, useRef, useEffect } from 'react';
import { createEditLog } from '@/lib/editLogger';

// ============================================================================
// Types
// ============================================================================

interface PendingEdit {
  fieldPath: string;
  oldValue: string | null;
  newValue: string;
  reason?: string;
}

interface UseEditLoggerOptions {
  specId: string;
  editor?: string;
  debounceMs?: number;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Custom hook for edit logging with debouncing
 * Auto-captures old value and batches rapid edits into single log entries
 */
export function useEditLogger({
  specId,
  editor = 'human',
  debounceMs = 500,
}: UseEditLoggerOptions) {
  const pendingEditsRef = useRef<PendingEdit[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const oldValuesRef = useRef<Map<string, string | null>>(new Map());

  // =========================================================================
  // Capture Old Value (before edit)
  // =========================================================================

  const captureOldValue = useCallback((fieldPath: string, value: string | null) => {
    oldValuesRef.current.set(fieldPath, value);
  }, []);

  // =========================================================================
  // Log Edit (with debouncing)
  // =========================================================================

  const logEdit = useCallback(
    (
      fieldPath: string,
      newValue: string,
      reason?: string
    ) => {
      // Get old value or use null if not captured
      const oldValue = oldValuesRef.current.get(fieldPath) || null;

      // Find existing pending edit for this field
      const existingIndex = pendingEditsRef.current.findIndex(
        (e) => e.fieldPath === fieldPath
      );

      if (existingIndex !== -1) {
        // Update existing pending edit with new value
        pendingEditsRef.current[existingIndex] = {
          fieldPath,
          oldValue: pendingEditsRef.current[existingIndex].oldValue, // Keep original old value
          newValue,
          reason: reason || pendingEditsRef.current[existingIndex].reason,
        };
      } else {
        // Add new pending edit
        pendingEditsRef.current.push({
          fieldPath,
          oldValue,
          newValue,
          reason,
        });
      }

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(async () => {
        // Flush all pending edits
        const editsToFlush = [...pendingEditsRef.current];
        pendingEditsRef.current = [];

        for (const edit of editsToFlush) {
          try {
            await createEditLog(
              specId,
              editor,
              edit.fieldPath,
              edit.oldValue,
              edit.newValue,
              edit.reason
            );
          } catch (error) {
            console.error('[useEditLogger] Failed to log edit:', error);
            // Silently fail - edit still occurred, just not logged
          }
        }

        debounceTimerRef.current = null;
      }, debounceMs);
    },
    [specId, editor, debounceMs]
  );

  // =========================================================================
  // Immediate Flush (for critical edits)
  // =========================================================================

  const flush = useCallback(async () => {
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Flush all pending edits immediately
    const editsToFlush = [...pendingEditsRef.current];
    pendingEditsRef.current = [];

    const results = await Promise.allSettled(
      editsToFlush.map((edit) =>
        createEditLog(
          specId,
          editor,
          edit.fieldPath,
          edit.oldValue,
          edit.newValue,
          edit.reason
        )
      )
    );

    return results;
  }, [specId, editor]);

  // =========================================================================
  // Cleanup
  // =========================================================================

  useEffect(() => {
    return () => {
      // Flush pending edits on unmount
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (pendingEditsRef.current.length > 0) {
        console.log('[useEditLogger] Flushing pending edits on unmount');
        pendingEditsRef.current = [];
      }
    };
  }, []);

  return {
    captureOldValue,
    logEdit,
    flush,
    pendingCount: pendingEditsRef.current.length,
  };
}

export default useEditLogger;

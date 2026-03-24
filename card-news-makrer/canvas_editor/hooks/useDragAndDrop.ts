'use client';

import { useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Card } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface DragAndDropHookResult {
  sensors: ReturnType<typeof useSensors>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
  isDragging: boolean;
  draggedCardId: string | null;
}

interface UseDragAndDropOptions {
  cards: Card[];
  onReorder: (fromIndex: number, toIndex: number) => Promise<void>;
  onAutoScroll?: (direction: 'up' | 'down') => void;
  autoScrollThreshold?: number;
}

// ============================================================================
// Hook
// ============================================================================

export function useDragAndDrop({
  cards,
  onReorder,
  onAutoScroll,
  autoScrollThreshold = 50,
}: UseDragAndDropOptions): DragAndDropHookResult {
  const isDraggingRef = useRef(false);
  const draggedCardIdRef = useRef<string | null>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // =========================================================================
  // Sensor Configuration
  // =========================================================================

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // =========================================================================
  // Drag Start Handler
  // =========================================================================

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    isDraggingRef.current = true;
    draggedCardIdRef.current = active.id as string;
  }, []);

  // =========================================================================
  // Drag Over Handler (Auto-scroll)
  // =========================================================================

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      // Note: Actual auto-scroll implementation would need access to DOM
      // This is a placeholder for the hook's responsibility
      // In practice, auto-scroll would be handled by a portal or similar mechanism

      const scrollContainer = document.querySelector('[data-drag-scroll-container]');
      if (!scrollContainer || !onAutoScroll) return;

      const rect = scrollContainer.getBoundingClientRect();
      const { clientY } = event.delta;

      // Auto-scroll up
      if (clientY < rect.top + autoScrollThreshold) {
        onAutoScroll('up');
      }
      // Auto-scroll down
      else if (clientY > rect.bottom - autoScrollThreshold) {
        onAutoScroll('down');
      }
    },
    [onAutoScroll, autoScrollThreshold]
  );

  // =========================================================================
  // Drag End Handler (Reorder + Save)
  // =========================================================================

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      isDraggingRef.current = false;
      draggedCardIdRef.current = null;

      // Clear auto-scroll interval
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }

      // No-op if dropped on same card or no valid over target
      if (!over || active.id === over.id) return;

      // Find card indices
      const activeIndex = cards.findIndex((c) => `card-${c.index}` === active.id);
      const overIndex = cards.findIndex((c) => `card-${c.index}` === over.id);

      if (activeIndex === -1 || overIndex === -1) return;

      try {
        // Call the reorder callback
        await onReorder(activeIndex, overIndex);
      } catch (error) {
        console.error('[useDragAndDrop] Failed to reorder cards:', error);
        // Error will be handled by parent component via store
      }
    },
    [cards, onReorder]
  );

  // =========================================================================
  // Cleanup
  // =========================================================================

  // Ensure interval is cleared on unmount
  React.useEffect(() => {
    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, []);

  return {
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    isDragging: isDraggingRef.current,
    draggedCardId: draggedCardIdRef.current,
  };
}

export default useDragAndDrop;

'use client';

import React, { useCallback, useRef } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Card } from '@/lib/card-news/types';

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

export function useDragAndDrop({
  cards,
  onReorder,
  onAutoScroll,
  autoScrollThreshold = 50,
}: UseDragAndDropOptions): DragAndDropHookResult {
  const isDraggingRef = useRef(false);
  const draggedCardIdRef = useRef<string | null>(null);
  const autoScrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    isDraggingRef.current = true;
    draggedCardIdRef.current = event.active.id as string;
  }, []);

  const handleDragOver = useCallback(
    (_event: DragOverEvent) => {
      // Auto-scroll is handled by @dnd-kit internally
      // This hook is a no-op placeholder for custom scroll logic if needed
    },
    [onAutoScroll, autoScrollThreshold],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      isDraggingRef.current = false;
      draggedCardIdRef.current = null;
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
      if (!over || active.id === over.id) return;
      const activeIndex = cards.findIndex((c) => `card-${c.index}` === active.id);
      const overIndex = cards.findIndex((c) => `card-${c.index}` === over.id);
      if (activeIndex === -1 || overIndex === -1) return;
      try { await onReorder(activeIndex, overIndex); } catch (error) {
        console.error('[useDragAndDrop] Failed to reorder:', error);
      }
    },
    [cards, onReorder],
  );

  React.useEffect(() => {
    return () => { if (autoScrollIntervalRef.current) clearInterval(autoScrollIntervalRef.current); };
  }, []);

  return { sensors, handleDragStart, handleDragOver, handleDragEnd, isDragging: isDraggingRef.current, draggedCardId: draggedCardIdRef.current };
}

export default useDragAndDrop;

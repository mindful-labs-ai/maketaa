'use client';

/**
 * CardList Component - Sidebar with card thumbnails and drag-and-drop reordering
 */

import React, { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useCardStore, useAllCards } from '@/stores/card-news/useCardStore';
import { SortableCardItem } from './SortableCardItem';

// ============================================================================
// Component
// ============================================================================

export function CardList() {
  const cards = useAllCards();
  const selectedCardIndex = useCardStore((state) => state.selectedCardIndex);
  const selectCard = useCardStore((state) => state.selectCard);
  const reorderCards = useCardStore((state) => state.reorderCards);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const cardIds = useMemo(() => cards.map((c) => `card-${c.index}`), [cards]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIndex = cards.findIndex((c) => `card-${c.index}` === active.id);
    const overIndex = cards.findIndex((c) => `card-${c.index}` === over.id);

    if (activeIndex !== -1 && overIndex !== -1) {
      try {
        await reorderCards(activeIndex, overIndex);
      } catch (error) {
        console.error('[CardList] Failed to reorder cards:', error);
      }
    }
  };

  if (!cards || cards.length === 0) {
    return (
      <div className="w-56 bg-white border-r border-gray-200 p-4 flex items-center justify-center">
        <p className="text-xs text-gray-400 text-center">카드가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="w-56 bg-white border-r border-gray-200 flex flex-col">
      {/* Sticky header */}
      <div className="px-3 py-2.5 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xs text-gray-700 uppercase tracking-wide">카드</h2>
          <span className="text-xs font-medium text-gray-400 tabular-nums">{cards.length}장</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">드래그하여 순서 변경</p>
      </div>

      {/* Scrollable card list */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-0">
              {cards.map((card) => (
                <SortableCardItem
                  key={card.index}
                  card={card}
                  isSelected={selectedCardIndex === card.index - 1}
                  onClick={selectCard}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-gray-100 shrink-0">
        <p className="text-[10px] text-gray-400">← → 키로 이동</p>
      </div>
    </div>
  );
}

export default CardList;

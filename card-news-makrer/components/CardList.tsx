/**
 * Card List Component - Sidebar with card thumbnails and drag-and-drop
 *
 * Features:
 * - Thumbnail preview of each card
 * - Click to select card
 * - Drag-and-drop reordering (dnd-kit)
 * - Role badge styling
 * - Visual feedback for selected card
 */

'use client';

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
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCardStore, useAllCards } from '@/stores/useCardStore';
import type { Card, CardRole } from '@/types';

// ============================================================================
// Constants
// ============================================================================

const ROLE_COLORS: Record<CardRole, { bg: string; text: string; label: string }> =
  {
    cover: { bg: 'bg-blue-100', text: 'text-blue-700', label: '표지' },
    empathy: {
      bg: 'bg-pink-100',
      text: 'text-pink-700',
      label: '공감',
    },
    cause: { bg: 'bg-orange-100', text: 'text-orange-700', label: '원인' },
    insight: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      label: '인사이트',
    },
    solution: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      label: '해결법',
    },
    tip: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '팁' },
    closing: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      label: '마무리',
    },
    source: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      label: '출처',
    },
    cta: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'CTA' },
  };

// ============================================================================
// Sortable Card Item Component
// ============================================================================

interface SortableCardItemProps {
  card: Card;
  isSelected: boolean;
  onClick: (index: number) => void;
}

function SortableCardItem({
  card,
  isSelected,
  onClick,
}: SortableCardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `card-${card.index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const roleConfig = ROLE_COLORS[card.role];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card.index - 1)}
      className={`
        mb-2 p-3 rounded-lg border-2 cursor-move transition-all
        ${
          isSelected
            ? 'border-primary bg-primary/5 shadow-md'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {/* Card Number */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500">
          Card {card.index}
        </span>
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${roleConfig.bg} ${roleConfig.text}`}
        >
          {roleConfig.label}
        </span>
      </div>

      {/* Headline Preview */}
      <p className="text-sm font-semibold text-gray-800 truncate">
        {card.text?.headline || '(No headline)'}
      </p>

      {/* Body Preview */}
      {card.text?.body && (
        <p className="text-xs text-gray-600 truncate mt-1">
          {card.text.body}
        </p>
      )}

      {/* Background Type Indicator */}
      <div className="mt-2 flex items-center gap-1">
        <div
          className="h-3 w-3 rounded-full border border-gray-300"
          style={{
            backgroundColor:
              card.style?.color_palette?.primary || '#7B9EBD',
          }}
        />
        <span className="text-xs text-gray-500">
          {card.background?.type === 'image'
            ? '🖼️ Image'
            : card.background?.type === 'gradient'
            ? '📊 Gradient'
            : '⬜ Solid'}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Main CardList Component
// ============================================================================

export function CardList() {
  const cards = useAllCards();
  const selectedCardIndex = useCardStore((state) => state.selectedCardIndex);
  const selectCard = useCardStore((state) => state.selectCard);
  const reorderCards = useCardStore((state) => state.reorderCards);

  const sensors = useSensors(
    useSensor(PointerSensor),
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
      <div className="w-64 h-screen bg-gray-50 border-r border-gray-200 p-4 flex items-center justify-center">
        <p className="text-sm text-gray-500 text-center">
          No cards to display
        </p>
      </div>
    );
  }

  return (
    <div className="w-64 h-screen bg-gray-50 border-r border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <h2 className="font-semibold text-sm text-gray-900">
          Cards ({cards.length})
        </h2>
        <p className="text-xs text-gray-500 mt-1">Drag to reorder</p>
      </div>

      <div className="p-4 space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={cardIds}
            strategy={verticalListSortingStrategy}
          >
            {cards.map((card) => (
              <SortableCardItem
                key={card.index}
                card={card}
                isSelected={selectedCardIndex === card.index - 1}
                onClick={selectCard}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Info footer */}
      <div className="p-4 border-t border-gray-200 bg-white text-xs text-gray-500">
        <p>Click to select • Drag to reorder</p>
      </div>
    </div>
  );
}

export default CardList;

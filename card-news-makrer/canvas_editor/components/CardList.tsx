/**
 * Card List Component - Sidebar with card thumbnails and drag-and-drop
 *
 * Features:
 * - Visual mini-preview of each card (background color/image + headline)
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
    content: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '본문' },
    end: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: '마무리' },
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

  const roleConfig = ROLE_COLORS[card.role] || { bg: 'bg-gray-100', text: 'text-gray-700', label: card.role || '?' };
  const displayLabel = card.role === 'content' && card.content_layout === 'memo' ? '메모' : roleConfig.label;
  const memoStyle = card.content_layout === 'memo' ? { bg: 'bg-yellow-100', text: 'text-yellow-700' } : null;

  // Derive preview colors from card style
  const bgColor = card.style?.color_palette?.background || '#1a1a2e';
  const textColor = card.style?.color_palette?.text || '#ffffff';
  const hasImage =
    card.background?.type === 'image' && !!card.background?.src;
  const overlayOpacity = card.background?.overlay_opacity ?? 0.35;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card.index - 1)}
      className={`
        rounded-lg border cursor-move transition-all duration-150 overflow-hidden group
        ${
          isSelected
            ? 'border-gray-900 ring-2 ring-gray-900/20 shadow-md'
            : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm'
        }
        ${isDragging ? 'opacity-40 scale-95' : ''}
      `}
    >
      {/* ── Mini Card Preview ── */}
      <div className="relative w-full aspect-square overflow-hidden rounded-t-lg">
        {/* Background color layer */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: bgColor }}
        />

        {/* Background image layer */}
        {hasImage && (
          <img
            src={card.background.src!}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Overlay for image cards */}
        {hasImage && overlayOpacity > 0 && (
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: '#000000',
              opacity: overlayOpacity,
            }}
          />
        )}

        {/* Card number + role badge overlay (top) */}
        <div className="absolute top-1 left-1 right-1 flex items-center justify-between">
          <span className="text-[8px] font-bold text-white/90 bg-black/30 backdrop-blur-sm px-1 py-0.5 rounded-full leading-none tabular-nums">
            {card.index}
          </span>
          <span
            className={`text-[8px] font-semibold px-1 py-0.5 rounded-full leading-none ${memoStyle?.bg || roleConfig.bg} ${memoStyle?.text || roleConfig.text}`}
          >
            {displayLabel}
          </span>
        </div>

        {/* Headline text centered in preview */}
        <div className="absolute inset-0 flex items-center justify-center p-1.5">
          <p
            className="text-center font-bold leading-tight line-clamp-3"
            style={{
              color: textColor,
              fontSize: '9px',
              textShadow: hasImage ? '0 1px 2px rgba(0,0,0,0.7)' : 'none',
            }}
          >
            {card.text?.headline || '—'}
          </p>
        </div>

        {/* Selected indicator overlay */}
        {isSelected && (
          <div className="absolute inset-0 ring-2 ring-inset ring-gray-900/30 rounded-t-lg pointer-events-none" />
        )}
      </div>

      {/* ── Text Info Below Preview ── */}
      <div className="px-2 py-1.5 bg-white">
        <p className="text-[10px] font-semibold text-gray-800 truncate leading-tight">
          {card.text?.headline || '(제목 없음)'}
        </p>
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
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이상 이동해야 드래그 시작 — 클릭과 드래그 구분
      },
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
          <h2 className="font-semibold text-xs text-gray-700 uppercase tracking-wide">
            카드
          </h2>
          <span className="text-xs font-medium text-gray-400 tabular-nums">
            {cards.length}장
          </span>
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
          <SortableContext
            items={cardIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-1.5">
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

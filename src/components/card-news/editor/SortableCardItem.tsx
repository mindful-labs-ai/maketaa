'use client';

/**
 * SortableCardItem - Draggable card item for the card list sidebar
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { Card, CardRole } from '@/lib/card-news/types';

// ============================================================================
// Constants
// ============================================================================

const ROLE_COLORS: Record<CardRole, { bg: string; text: string; label: string }> = {
  cover:   { bg: 'bg-blue-100',    text: 'text-blue-700',    label: '표지' },
  content: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '본문' },
  end:     { bg: 'bg-indigo-100',  text: 'text-indigo-700',  label: '마무리' },
};

// ============================================================================
// Types
// ============================================================================

interface SortableCardItemProps {
  card: Card;
  isSelected: boolean;
  onClick: (index: number) => void;
}

// ============================================================================
// Component
// ============================================================================

export function SortableCardItem({ card, isSelected, onClick }: SortableCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: `card-${card.index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition:
      transition ||
      'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease-in-out',
    opacity: isDragging ? 0.5 : 1,
  };

  const roleConfig = ROLE_COLORS[card.role] || { bg: 'bg-gray-100', text: 'text-gray-700', label: card.role || '?' };
  const displayLabel =
    card.role === 'content' && card.content_layout === 'memo' ? '메모' : roleConfig.label;
  const memoStyle =
    card.content_layout === 'memo' ? { bg: 'bg-yellow-100', text: 'text-yellow-700' } : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onClick(card.index - 1)}
      className={`
        mb-2 p-3 rounded-lg border-2 cursor-pointer transition-all
        ${isSelected
          ? 'border-primary bg-primary/5 shadow-md'
          : isOver
            ? 'border-blue-400 bg-blue-50 shadow-sm'
            : 'border-[--border-subtle] bg-[--surface-1] hover:border-[--border-default]'}
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
      `}
    >
      {/* Drag Handle + Card Info Header */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-start gap-2 flex-1">
          <div
            {...attributes}
            {...listeners}
            className="pt-0.5 cursor-grab active:cursor-grabbing text-[--text-secondary] hover:text-[--text-primary] flex-shrink-0"
          >
            <GripVertical size={16} />
          </div>
          <span className="text-xs font-semibold text-[--text-secondary] flex-shrink-0 pt-0.5">
            Card {card.index}
          </span>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${memoStyle?.bg || roleConfig.bg} ${memoStyle?.text || roleConfig.text}`}
        >
          {displayLabel}
        </span>
      </div>

      {/* Headline Preview */}
      <p className="text-sm font-semibold text-[--text-primary] truncate ml-6">
        {card.text?.headline || '(No headline)'}
      </p>

      {/* Body Preview */}
      {card.text?.body && (
        <p className="text-xs text-[--text-secondary] truncate mt-1 ml-6">{card.text.body}</p>
      )}

      {/* Background Type Indicator */}
      <div className="mt-2 flex items-center gap-1 ml-6">
        <div
          className="h-3 w-3 rounded-full border border-[--border-subtle]"
          style={{ backgroundColor: card.style?.color_palette?.primary || '#7B9EBD' }}
        />
        <span className="text-xs text-[--text-secondary]">
          {card.background?.type === 'image'
            ? 'Image'
            : card.background?.type === 'gradient'
              ? 'Gradient'
              : 'Solid'}
        </span>
      </div>
    </div>
  );
}

export default SortableCardItem;

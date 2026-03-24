/**
 * StatusBadge Component - Visual status indicator with animations
 *
 * Displays approval workflow status with color coding:
 * - draft: gray
 * - review: yellow with pulse
 * - approved: green
 * - rejected: red
 * - published: blue
 */

'use client';

import React from 'react';

// ============================================================================
// Types
// ============================================================================

type CardStatus = 'draft' | 'review' | 'approved' | 'rejected' | 'published';

interface StatusBadgeProps {
  status: CardStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// Status Configuration
// ============================================================================

const STATUS_CONFIG: Record<
  CardStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    pulse?: boolean;
  }
> = {
  draft: {
    label: '작성중',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
  },
  review: {
    label: '검토중',
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    pulse: true,
  },
  approved: {
    label: '승인됨',
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  rejected: {
    label: '반려됨',
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
  },
  published: {
    label: '발행됨',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
};

const SIZE_CONFIG = {
  sm: {
    container: 'px-2 py-1',
    text: 'text-xs',
  },
  md: {
    container: 'px-3 py-1.5',
    text: 'text-sm',
  },
  lg: {
    container: 'px-4 py-2',
    text: 'text-base',
  },
};

// ============================================================================
// Component
// ============================================================================

export const StatusBadge = React.forwardRef<
  HTMLDivElement,
  StatusBadgeProps
>(({ status, className = '', size = 'md' }, ref) => {
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      ref={ref}
      className={`
        inline-flex items-center font-semibold rounded-full border
        ${sizeConfig.container}
        ${sizeConfig.text}
        ${config.bg}
        ${config.text}
        ${config.border}
        ${config.pulse ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      {/* Dot Indicator */}
      <span
        className={`
          w-2 h-2 rounded-full mr-2 inline-block
          ${config.bg === 'bg-gray-100' ? 'bg-gray-400' : ''}
          ${config.bg === 'bg-yellow-100' ? 'bg-yellow-400' : ''}
          ${config.bg === 'bg-green-100' ? 'bg-green-400' : ''}
          ${config.bg === 'bg-red-100' ? 'bg-red-400' : ''}
          ${config.bg === 'bg-blue-100' ? 'bg-blue-400' : ''}
        `}
      />
      {config.label}
    </div>
  );
});

StatusBadge.displayName = 'StatusBadge';

export default StatusBadge;

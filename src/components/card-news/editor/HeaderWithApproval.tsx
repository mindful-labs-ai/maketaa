'use client';

/**
 * HeaderWithApproval Component - Header with approval/rejection controls
 * NOTE: 승인/반려 기능은 현재 비활성화 상태 (추후 필요 시 주석 해제)
 */

import React from 'react';
import { useCardSpecMeta } from '@/stores/card-news/useCardStore';
// import { useState, useEffect } from 'react';
// import { useCardStore } from '@/stores/card-news/useCardStore';
// import { approveCardSpec, rejectCardSpec } from '@/lib/card-news/api';
// import { CheckCircle, XCircle, Clock } from 'lucide-react';
// import ApproveDialog from '@/components/card-news/shared/ApproveDialog';
// import RejectDialog from '@/components/card-news/shared/RejectDialog';

// ============================================================================
// Types
// ============================================================================

interface HeaderWithApprovalProps {
  specId: string;
}

// ============================================================================
// Component
// ============================================================================

export function HeaderWithApproval({ specId: _specId }: HeaderWithApprovalProps) {
  const meta = useCardSpecMeta();

  const statusColors = {
    draft:     { bg: 'bg-gray-100',   text: 'text-gray-700',   label: '작성중' },
    review:    { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '검토중' },
    approved:  { bg: 'bg-green-100',  text: 'text-green-700',  label: '발행대기중' },
    published: { bg: 'bg-blue-100',   text: 'text-blue-700',   label: '발행됨' },
  };

  const statusConfig = meta
    ? statusColors[meta.status as keyof typeof statusColors] ?? statusColors.draft
    : statusColors.draft;

  return (
    <header className="bg-[--surface-1] border-b border-[--border-subtle] px-8 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Title & Status */}
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-[--text-primary]">
              {meta?.topic || 'Card Editor'}
            </h1>
            {meta && (
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${statusConfig.bg} ${statusConfig.text}`}
              >
                {statusConfig.label}
              </span>
            )}
          </div>
          {meta?.angle && (
            <p className="text-sm text-[--text-secondary] mt-1">{meta.angle}</p>
          )}
        </div>

        {/* Right: Action Buttons - 승인/반려 기능 비활성화 */}
        {/*
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRejectDialog(true)}
            disabled={!canReject}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <XCircle size={16} />
            <span className="text-sm font-medium">반려</span>
          </button>
          <button
            onClick={() => { if (canApprove) setShowApproveDialog(true); }}
            disabled={!canApprove}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle size={16} />
            <span className="text-sm font-medium">승인 & 발행</span>
          </button>
        </div>
        */}
      </div>
    </header>
  );
}

export default HeaderWithApproval;

'use client';

/**
 * HeaderWithApproval Component - Header with approval/rejection controls
 */

import React, { useEffect, useState } from 'react';
import { useCardStore, useCardSpecMeta } from '@/stores/card-news/useCardStore';
import { approveCardSpec, rejectCardSpec } from '@/lib/card-news/api';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import ApproveDialog from '@/components/card-news/shared/ApproveDialog';
import RejectDialog from '@/components/card-news/shared/RejectDialog';

// ============================================================================
// Types
// ============================================================================

interface HeaderWithApprovalProps {
  specId: string;
}

// ============================================================================
// Component
// ============================================================================

export function HeaderWithApproval({ specId }: HeaderWithApprovalProps) {
  const meta = useCardSpecMeta();
  const setStatus = useCardStore((state) => state.setStatus);

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Keyboard shortcut: Ctrl+Shift+A to open approve dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (meta && ['draft', 'review'].includes(meta.status)) {
          setShowApproveDialog(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [meta]);

  const statusColors = {
    draft:     { bg: 'bg-gray-100',   text: 'text-gray-700',   label: '작성중' },
    review:    { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '검토중' },
    approved:  { bg: 'bg-green-100',  text: 'text-green-700',  label: '발행대기중' },
    published: { bg: 'bg-blue-100',   text: 'text-blue-700',   label: '발행됨' },
  };

  const statusConfig = meta
    ? statusColors[meta.status as keyof typeof statusColors] ?? statusColors.draft
    : statusColors.draft;

  const canApprove = meta && ['draft', 'review'].includes(meta.status);
  const canReject = meta && ['draft', 'review'].includes(meta.status);

  const handleApproveConfirm = async () => {
    try {
      await approveCardSpec(specId);
      await setStatus('approved');
      setShowApproveDialog(false);
    } catch (error) {
      console.error('[HeaderWithApproval] Approval failed:', error);
    }
  };

  const handleRejectConfirm = async () => {
    setShowRejectDialog(false);
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Title & Status */}
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {meta?.topic || 'Card Editor'}
              </h1>
              {meta && (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${statusConfig.bg} ${statusConfig.text}`}
                  >
                    {statusConfig.label}
                  </span>
                  {meta.status === 'approved' && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Clock size={12} />
                      발행 대기 중
                    </span>
                  )}
                </div>
              )}
            </div>
            {meta?.angle && (
              <p className="text-sm text-gray-600 mt-1">{meta.angle}</p>
            )}
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRejectDialog(true)}
              disabled={!canReject}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="반려 (Ctrl+Shift+R)"
            >
              <XCircle size={16} />
              <span className="text-sm font-medium">반려</span>
            </button>

            <button
              onClick={() => { if (canApprove) setShowApproveDialog(true); }}
              disabled={!canApprove}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="승인 (Ctrl+Shift+A)"
            >
              <CheckCircle size={16} />
              <span className="text-sm font-medium">승인 & 발행</span>
            </button>
          </div>
        </div>
      </header>

      <ApproveDialog
        isOpen={showApproveDialog}
        onClose={() => setShowApproveDialog(false)}
        onConfirm={handleApproveConfirm}
        specId={specId}
      />

      <RejectDialog
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onConfirm={handleRejectConfirm}
        specId={specId}
      />
    </>
  );
}

export default HeaderWithApproval;

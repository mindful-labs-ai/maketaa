/**
 * Header Component - Top navigation with spec info and action buttons
 */

'use client';

import React from 'react';
import { useCardStore, useCardSpecMeta } from '@/stores/useCardStore';
import { approveCardSpec, rejectCardSpec } from '@/lib/api';
import { CheckCircle, XCircle } from 'lucide-react';

// ============================================================================
// Component
// ============================================================================

export function Header({ specId }: { specId: string }) {
  const meta = useCardSpecMeta();
  const setStatus = useCardStore((state) => state.setStatus);
  const [isApproving, setIsApproving] = React.useState(false);
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');
  const [showRejectModal, setShowRejectModal] = React.useState(false);

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await approveCardSpec(specId);
      await setStatus('approved');
    } catch (error) {
      console.error('[Header] Approval error:', error);
      alert('Failed to approve card spec.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectSubmit = async () => {
    try {
      setIsRejecting(true);
      await rejectCardSpec(specId, rejectReason);
      await setStatus('draft');
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      console.error('[Header] Rejection error:', error);
      alert('Failed to reject card spec.');
    } finally {
      setIsRejecting(false);
    }
  };

  const statusColors = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: '작성중' },
    review: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '검토중' },
    approved: { bg: 'bg-green-100', text: 'text-green-700', label: '승인됨' },
    published: { bg: 'bg-blue-100', text: 'text-blue-700', label: '발행됨' },
  };

  const statusConfig = meta ? statusColors[meta.status] : statusColors.draft;

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Title & Status */}
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
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
            <p className="text-sm text-gray-600 mt-1">{meta.angle}</p>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={isRejecting || !meta || meta.status === 'draft'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <XCircle size={16} />
            <span className="text-sm font-medium">반려</span>
          </button>

          <button
            onClick={handleApprove}
            disabled={isApproving || !meta || meta.status !== 'draft'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle size={16} />
            <span className="text-sm font-medium">
              {isApproving ? '승인중...' : '✅ 승인 & 발행'}
            </span>
          </button>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">반려 사유 입력</h2>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="이 카드를 반려하는 이유를 입력해주세요..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-4 resize-none"
              rows={4}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={isRejecting || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRejecting ? '반려중...' : '반려'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;

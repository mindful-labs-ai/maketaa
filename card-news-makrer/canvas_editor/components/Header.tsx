/**
 * Header Component - Top navigation with spec info and action buttons
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCardStore, useCardSpecMeta } from '@/stores/useCardStore';
import { approveCardSpec, rejectCardSpec } from '@/lib/api';
import { ArrowLeft, CheckCircle, XCircle, Download } from 'lucide-react';

// ============================================================================
// Component
// ============================================================================

export function Header({
  specId,
  onExport,
  onExportAll,
}: {
  specId: string;
  onExport?: () => void;
  onExportAll?: (onProgress: (percent: number) => void) => Promise<void>;
}) {
  const router = useRouter();
  const meta = useCardSpecMeta();
  const setStatus = useCardStore((state) => state.setStatus);
  const unsavedChanges = useCardStore((state) => state.unsavedChanges);
  const [isApproving, setIsApproving] = React.useState(false);
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isExportingAll, setIsExportingAll] = React.useState(false);
  const [exportAllProgress, setExportAllProgress] = React.useState(0);
  const [rejectReason, setRejectReason] = React.useState('');
  const [showRejectModal, setShowRejectModal] = React.useState(false);

  const handleExport = async () => {
    if (!onExport) return;
    setIsExporting(true);
    try {
      onExport();
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = async () => {
    if (!onExportAll) return;
    setIsExportingAll(true);
    setExportAllProgress(0);
    try {
      await onExportAll((percent) => setExportAllProgress(percent));
    } finally {
      setIsExportingAll(false);
      setExportAllProgress(0);
    }
  };

  const handleBack = () => {
    if (unsavedChanges) {
      const confirmed = window.confirm(
        '저장하지 않은 변경사항이 있습니다. 나가시겠습니까?'
      );
      if (!confirmed) return;
    }
    router.push('/');
  };

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
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-0 shadow-sm h-14 flex items-center shrink-0">
      <div className="w-full flex items-center justify-between gap-4">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="목록으로 돌아가기"
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium hidden sm:inline">목록</span>
          </button>

          {/* Vertical divider */}
          <div className="w-px h-5 bg-gray-200 shrink-0" />

          <div className="min-w-0 flex items-center gap-2.5">
            <h1 className="text-sm font-semibold text-gray-900 truncate">
              {meta?.topic || 'Card Editor'}
            </h1>
            {meta && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusConfig.bg} ${statusConfig.text}`}
              >
                {statusConfig.label}
              </span>
            )}
          </div>
        </div>

        {/* Right: Action Buttons — grouped by function */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Export group */}
          <div className="flex items-center gap-1.5 pr-3 border-r border-gray-200">
            {onExport && (
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                title="현재 카드 PNG 내보내기"
              >
                <Download size={14} />
                <span className="hidden sm:inline">
                  {isExporting ? '처리 중...' : 'PNG'}
                </span>
              </button>
            )}

            {onExportAll && (
              <button
                onClick={handleExportAll}
                disabled={isExportingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                title="전체 카드 ZIP 내보내기"
              >
                <Download size={14} />
                <span className="hidden sm:inline">
                  {isExportingAll ? `${exportAllProgress}%` : 'ZIP'}
                </span>
              </button>
            )}
          </div>

          {/* Approval group */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={isRejecting || !meta || meta.status === 'draft'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
              title="반려"
            >
              <XCircle size={14} />
              <span className="hidden sm:inline">반려</span>
            </button>

            <button
              onClick={handleApprove}
              disabled={isApproving || !meta || meta.status !== 'draft'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
              title="승인 & 발행"
            >
              <CheckCircle size={14} />
              <span className="hidden sm:inline">
                {isApproving ? '처리 중...' : '승인'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6 border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">반려 사유 입력</h2>
            <p className="text-xs text-gray-500 mb-4">반려 이유를 간략히 작성해주세요.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="예: 헤드라인 문구 수정 필요..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400 mb-4 resize-none transition-colors"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={isRejecting || !rejectReason.trim()}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRejecting ? '처리 중...' : '반려 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;

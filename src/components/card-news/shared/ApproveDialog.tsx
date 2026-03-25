'use client';

/**
 * ApproveDialog Component - Approval workflow dialog with checklist
 */

import React, { useState } from 'react';
import { useCardStore, useCardSpecMeta } from '@/stores/card-news/useCardStore';
import { CheckCircle2, AlertCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ApproveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  specId?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const ApproveDialog = React.forwardRef<HTMLDivElement, ApproveDialogProps>(
  ({ isOpen, onClose, onConfirm, specId: _specId }, ref) => {
    const setStatus = useCardStore((state) => state.setStatus);
    const meta = useCardSpecMeta();
    const [isApproving, setIsApproving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checklist, setChecklist] = useState<ChecklistItem[]>([
      {
        id: 'review',
        label: '모든 카드 검토 완료',
        description: '각 카드의 텍스트와 레이아웃을 확인했습니다',
        checked: false,
      },
      {
        id: 'caption',
        label: 'SNS 캡션 확인',
        description: 'Instagram과 Threads 캡션을 검토했습니다',
        checked: false,
      },
      {
        id: 'safety',
        label: '안전성 검증',
        description: '부적절한 콘텐츠가 없는지 확인했습니다',
        checked: false,
      },
    ]);

    const toggleCheckbox = (id: string) => {
      setChecklist((prev) =>
        prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
      );
    };

    const isAllChecked = checklist.every((item) => item.checked);

    const handleApprove = async () => {
      if (!isAllChecked || !meta) return;
      try {
        setIsApproving(true);
        setError(null);
        await setStatus('approved');
        if (onConfirm) onConfirm();
        setTimeout(() => onClose(), 500);
      } catch (err) {
        const message = err instanceof Error ? err.message : '승인에 실패했습니다';
        setError(message);
        console.error('[ApproveDialog] Approval error:', err);
      } finally {
        setIsApproving(false);
      }
    };

    if (!isOpen) return null;

    return (
      <div ref={ref} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[--surface-1] rounded-lg shadow-2xl max-w-md w-full mx-4 p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 size={24} className="text-green-600" />
            <h2 className="text-xl font-bold text-[--text-primary]">승인하기</h2>
          </div>

          <p className="text-sm text-[--text-secondary] mb-6">카드 승인 전 아래 항목들을 확인해주세요.</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">오류 발생</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Checklist */}
          <div className="space-y-3 mb-8">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={`checkbox-${item.id}`}
                  checked={item.checked}
                  onChange={() => toggleCheckbox(item.id)}
                  className="w-4 h-4 mt-1 rounded border-[--border-default] text-green-600 focus:ring-green-500 cursor-pointer"
                />
                <label htmlFor={`checkbox-${item.id}`} className="cursor-pointer flex-1">
                  <p className="text-sm font-medium text-[--text-primary]">{item.label}</p>
                  {item.description && (
                    <p className="text-xs text-[--text-secondary] mt-1">{item.description}</p>
                  )}
                </label>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isApproving}
              className="px-4 py-2.5 border border-[--border-default] rounded-lg text-[--text-primary] font-medium hover:bg-[--surface-2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleApprove}
              disabled={!isAllChecked || isApproving}
              className="px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isApproving ? '승인중...' : '승인'}
            </button>
          </div>

          <p className="text-xs text-[--text-secondary] mt-6 text-center">
            승인 후 카드는 발행 대기 상태로 변경됩니다.
          </p>
        </div>
      </div>
    );
  }
);

ApproveDialog.displayName = 'ApproveDialog';

export default ApproveDialog;

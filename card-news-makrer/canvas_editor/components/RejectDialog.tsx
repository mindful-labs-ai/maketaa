/**
 * RejectDialog Component - Rejection workflow dialog
 *
 * Features:
 * - Textarea for rejection reason (required, min 10 chars)
 * - Triggers setStatus('rejected') + save reason to edit_logs
 * - Toast notification on success/failure
 */

'use client';

import React, { useState } from 'react';
import { useCardStore, useCardSpecMeta } from '@/stores/useCardStore';
import { XCircle, AlertCircle } from 'lucide-react';
import { recordEdit } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

interface RejectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  specId?: string;
}

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 500;

// ============================================================================
// Component
// ============================================================================

export const RejectDialog = React.forwardRef<
  HTMLDivElement,
  RejectDialogProps
>(({ isOpen, onClose, onConfirm, specId }, ref) => {
  const setStatus = useCardStore((state) => state.setStatus);
  const meta = useCardSpecMeta();
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  // =========================================================================
  // Validation
  // =========================================================================

  const reasonLength = reason.length;
  const isReasonValid =
    reasonLength >= MIN_REASON_LENGTH && reasonLength <= MAX_REASON_LENGTH;
  const isFormValid = isReasonValid && !isRejecting;

  // =========================================================================
  // Handlers
  // =========================================================================

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_REASON_LENGTH) {
      setReason(value);
    }
  };

  const handleReject = async () => {
    if (!isFormValid || !meta) return;

    try {
      setIsRejecting(true);
      setError(null);

      // Record rejection reason in edit logs
      await recordEdit(
        meta.id,
        'meta.status',
        meta.status,
        'rejected',
        `반려 사유: ${reason}`
      );

      // Set status to rejected (reverts to draft)
      await setStatus('rejected');

      // Call onConfirm callback if provided
      if (onConfirm) {
        onConfirm();
      }

      // Show success and close dialog
      console.log('[RejectDialog] Card rejected successfully:', meta.id);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : '반려에 실패했습니다';
      setError(message);
      console.error('[RejectDialog] Rejection error:', err);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setError(null);
    onClose();
  };

  // =========================================================================
  // Render
  // =========================================================================

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <XCircle size={24} className="text-red-600" />
          <h2 className="text-xl font-bold text-gray-900">카드 반려</h2>
        </div>

        {/* Subtitle */}
        <p className="text-sm text-gray-600 mb-6">
          이 카드를 반려하는 사유를 설명해주세요. 피드백은 작성자에게 전달됩니다.
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">오류 발생</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Reason Textarea */}
        <div className="mb-6">
          <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700 mb-2">
            반려 사유 <span className="text-red-600">*</span>
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={handleReasonChange}
            placeholder="예: 글자 수가 제한을 초과했습니다. 혹은 부적절한 표현이 있습니다."
            className={`
              w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 resize-none
              ${
                reason.length === 0
                  ? 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                  : isReasonValid
                    ? 'border-green-300 focus:ring-green-500 focus:border-transparent'
                    : 'border-red-300 focus:ring-red-500 focus:border-transparent'
              }
            `}
            rows={4}
            disabled={isRejecting}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              최소 {MIN_REASON_LENGTH}글자 이상 {MAX_REASON_LENGTH}글자 이하
            </p>
            <p
              className={`
                text-xs font-medium
                ${reasonLength === 0 ? 'text-gray-500' : ''}
                ${isReasonValid ? 'text-green-600' : 'text-red-600'}
              `}
            >
              {reasonLength}/{MAX_REASON_LENGTH}
            </p>
          </div>
        </div>

        {/* Validation Message */}
        {reasonLength > 0 && !isReasonValid && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-700">
              {reasonLength < MIN_REASON_LENGTH
                ? `최소 ${MIN_REASON_LENGTH - reasonLength}글자 더 입력해주세요.`
                : '너무 긴 입력입니다.'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleClose}
            disabled={isRejecting}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleReject}
            disabled={!isFormValid}
            className="px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRejecting ? '반려중...' : '반려하기'}
          </button>
        </div>

        {/* Footer Info */}
        <p className="text-xs text-gray-500 mt-6 text-center">
          반려된 카드는 작성 상태로 돌아갑니다.
        </p>
      </div>
    </div>
  );
});

RejectDialog.displayName = 'RejectDialog';

export default RejectDialog;

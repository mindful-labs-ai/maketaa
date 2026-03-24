/**
 * TextEditModal — inline text editing modal for canvas text fields
 * Triggered when a user clicks a text object on the canvas.
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';

// ============================================================================
// Constants
// ============================================================================

const FIELD_LABELS: Record<string, string> = {
  headline: '제목',
  body: '본문',
  sub_text: '부제',
  description: '설명',
  quote: '인용문',
};

const MAX_LENGTHS: Record<string, number | undefined> = {
  headline: 30,
  body: 150,
  sub_text: 100,
  description: 300,
  quote: 200,
};

// ============================================================================
// Types
// ============================================================================

interface TextEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldName: 'headline' | 'body' | 'sub_text' | 'description' | 'quote';
  currentValue: string;
  onSave: (fieldName: string, value: string) => void;
  maxLength?: number;
}

// ============================================================================
// Component
// ============================================================================

export default function TextEditModal({
  isOpen,
  onClose,
  fieldName,
  currentValue,
  onSave,
  maxLength,
}: TextEditModalProps) {
  const [value, setValue] = useState(currentValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resolvedMax = maxLength ?? MAX_LENGTHS[fieldName];
  const label = FIELD_LABELS[fieldName] ?? fieldName;
  const isOverLimit = resolvedMax !== undefined && value.length > resolvedMax;

  // Sync value when modal opens with a new field
  useEffect(() => {
    if (isOpen) {
      setValue(currentValue);
    }
  }, [isOpen, currentValue, fieldName]);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      // Small delay so the transition doesn't interfere with focus
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
        // Place cursor at end
        const len = textareaRef.current?.value.length ?? 0;
        textareaRef.current?.setSelectionRange(len, len);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Esc key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = () => {
    if (isOverLimit) return;
    onSave(fieldName, value);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-label={`${label} 편집`}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{label} 편집</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1L13 13M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={fieldName === 'description' ? 6 : fieldName === 'body' || fieldName === 'quote' ? 4 : 2}
            className={[
              'w-full resize-none rounded-lg border px-4 py-3 text-sm text-gray-900',
              'placeholder:text-gray-400 leading-relaxed',
              'focus:outline-none focus:ring-2 transition-shadow',
              isOverLimit
                ? 'border-red-400 focus:ring-red-300'
                : 'border-gray-300 focus:ring-blue-300 focus:border-blue-400',
            ].join(' ')}
            placeholder={`${label}을 입력하세요`}
            onKeyDown={(e) => {
              // Cmd/Ctrl + Enter saves
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSave();
              }
            }}
          />

          {/* Character counter */}
          <div className="flex justify-end mt-1.5">
            {resolvedMax !== undefined ? (
              <span
                className={[
                  'text-xs tabular-nums',
                  isOverLimit ? 'text-red-500 font-medium' : 'text-gray-400',
                ].join(' ')}
              >
                {value.length}/{resolvedMax}
              </span>
            ) : (
              <span className="text-xs text-gray-400 tabular-nums">
                {value.length}자
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isOverLimit}
            className={[
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              isOverLimit
                ? 'bg-blue-300 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700',
            ].join(' ')}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

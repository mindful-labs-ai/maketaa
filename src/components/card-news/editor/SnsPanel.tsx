'use client';

/**
 * SnsPanel Component - SNS caption editor
 * Supports Instagram (max 2200 chars) and Threads (max 500 chars)
 */

import React, { useMemo } from 'react';
import { useCardStore, useCardSpecMeta, useAutoSaveStatus } from '@/stores/card-news/useCardStore';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

// ============================================================================
// Constants
// ============================================================================

const INSTAGRAM_MAX = 2200;
const THREADS_MAX = 500;

// ============================================================================
// Types
// ============================================================================

interface SnsPanelProps {
  className?: string;
}

interface CaptionStats {
  charCount: number;
  hashtagCount: number;
  warningLevel: 'none' | 'warning' | 'error';
}

// ============================================================================
// Helpers
// ============================================================================

const calculateStats = (text: string, maxChars: number): CaptionStats => {
  const charCount = text.length;
  const hashtagCount = (text.match(/#[\w가-힣]+/g) || []).length;
  let warningLevel: 'none' | 'warning' | 'error' = 'none';
  if (charCount > maxChars) warningLevel = 'error';
  else if (charCount > maxChars * 0.9) warningLevel = 'warning';
  return { charCount, hashtagCount, warningLevel };
};

// ============================================================================
// Caption Editor Sub-component
// ============================================================================

const CaptionEditor: React.FC<{
  platform: 'instagram' | 'threads';
  caption: string;
  onChange: (value: string) => void;
  maxChars: number;
  disabled?: boolean;
}> = ({ platform, caption, onChange, maxChars, disabled = false }) => {
  const stats = useMemo(() => calculateStats(caption, maxChars), [caption, maxChars]);
  const platformLabel = platform === 'instagram' ? 'Instagram' : 'Threads';

  return (
    <div className={`space-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-900">{platformLabel} 캡션</label>
        <div className="flex items-center gap-2">
          {stats.charCount > 0 && (
            <>
              {stats.warningLevel === 'error' && <AlertCircle size={16} className="text-red-600" />}
              {stats.warningLevel === 'warning' && <AlertCircle size={16} className="text-yellow-600" />}
              {stats.warningLevel === 'none' && <CheckCircle2 size={16} className="text-green-600" />}
            </>
          )}
          <span className={`text-sm font-semibold ${
            stats.warningLevel === 'error' ? 'text-red-600' :
            stats.warningLevel === 'warning' ? 'text-yellow-600' : 'text-gray-600'
          }`}>
            {stats.charCount}/{maxChars}
          </span>
        </div>
      </div>

      <textarea
        value={caption}
        onChange={(e) => {
          const value = e.target.value;
          if (value.length <= maxChars) onChange(value);
        }}
        placeholder={`${platformLabel} 캡션을 입력해주세요...`}
        className={`
          w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 resize-none
          ${stats.warningLevel === 'error'
            ? 'border-red-300 focus:ring-red-500 focus:border-transparent'
            : stats.warningLevel === 'warning'
              ? 'border-yellow-300 focus:ring-yellow-500 focus:border-transparent'
              : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'}
        `}
        rows={platform === 'instagram' ? 6 : 4}
        disabled={disabled}
      />

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex gap-4">
          <span>총 글자: {stats.charCount}</span>
          <span>해시태그: {stats.hashtagCount}개</span>
        </div>
        {stats.warningLevel === 'error' && (
          <span className="text-red-600 font-medium">
            {Math.abs(maxChars - stats.charCount)}글자 초과
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Component
// ============================================================================

export const SnsPanel = React.forwardRef<HTMLDivElement, SnsPanelProps>(
  ({ className = '' }, ref) => {
    const meta = useCardSpecMeta();
    const sns = useCardStore((state) => state.cardSpec?.sns);
    const updateSnsCaption = useCardStore((state) => state.updateSnsCaption);
    const { status: autoSaveStatus } = useAutoSaveStatus();

    const [instagramCaption, setInstagramCaption] = React.useState(
      sns?.instagram?.caption || ''
    );
    const [threadsCaption, setThreadsCaption] = React.useState(
      sns?.threads?.text || ''
    );

    const [isUpdatingInstagram, setIsUpdatingInstagram] = React.useState(false);
    const [isUpdatingThreads, setIsUpdatingThreads] = React.useState(false);

    React.useEffect(() => {
      if (sns) {
        setInstagramCaption(sns.instagram?.caption || '');
        setThreadsCaption(sns.threads?.text || '');
      }
    }, [meta?.id]);

    const handleInstagramChange = async (value: string) => {
      setInstagramCaption(value);
      try {
        setIsUpdatingInstagram(true);
        await updateSnsCaption('instagram', value);
      } catch (error) {
        console.error('[SnsPanel] Failed to update Instagram caption:', error);
      } finally {
        setIsUpdatingInstagram(false);
      }
    };

    const handleThreadsChange = async (value: string) => {
      setThreadsCaption(value);
      try {
        setIsUpdatingThreads(true);
        await updateSnsCaption('threads', value);
      } catch (error) {
        console.error('[SnsPanel] Failed to update Threads caption:', error);
      } finally {
        setIsUpdatingThreads(false);
      }
    };

    const isDisabled = !meta;

    return (
      <div
        ref={ref}
        className={`w-full bg-white rounded-lg border border-gray-200 p-6 ${className}`}
      >
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900">SNS 캡션</h3>
          <p className="text-sm text-gray-600 mt-2">각 플랫폼에 맞게 캡션을 작성해주세요.</p>
          {autoSaveStatus === 'saving' && <p className="text-xs text-gray-500 mt-2">저장 중...</p>}
          {autoSaveStatus === 'saved' && <p className="text-xs text-green-600 mt-2">저장됨</p>}
        </div>

        {isDisabled ? (
          <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
            <p className="text-gray-500 text-sm">카드를 선택하면 SNS 캡션을 편집할 수 있습니다.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <CaptionEditor
              platform="instagram"
              caption={instagramCaption}
              onChange={handleInstagramChange}
              maxChars={INSTAGRAM_MAX}
              disabled={isUpdatingInstagram}
            />
            <hr className="border-gray-200" />
            <CaptionEditor
              platform="threads"
              caption={threadsCaption}
              onChange={handleThreadsChange}
              maxChars={THREADS_MAX}
              disabled={isUpdatingThreads}
            />
          </div>
        )}
      </div>
    );
  }
);

SnsPanel.displayName = 'SnsPanel';

export default SnsPanel;

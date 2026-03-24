/**
 * Footer Component - Auto-save status and metadata
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useAutoSaveStatus, useEditCount } from '@/stores/useCardStore';
import { getCardSpecById } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Check, AlertCircle, Clock } from 'lucide-react';

// ============================================================================
// Component
// ============================================================================

export function Footer({ specId }: { specId: string }) {
  const { status: autoSaveStatus, error } = useAutoSaveStatus();
  const editCount = useEditCount();
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [version, setVersion] = useState<string>('');

  // Fetch metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const record = await getCardSpecById(specId);
        setLastUpdated(record.updated_at);
        setVersion(record.spec.meta.id);
      } catch (error) {
        console.error('[Footer] Error fetching metadata:', error);
      }
    };

    const interval = setInterval(fetchMetadata, 10000); // Refresh every 10s
    fetchMetadata();

    return () => clearInterval(interval);
  }, [specId]);

  // Auto-save status rendering
  const getAutoSaveIcon = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return <Clock size={16} className="animate-spin text-blue-600" />;
      case 'saved':
        return <Check size={16} className="text-green-600" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return null;
    }
  };

  const getAutoSaveLabel = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return '저장 중...';
      case 'saved':
        return '저장됨';
      case 'error':
        return `저장 실패: ${error || 'Unknown error'}`;
      default:
        return '';
    }
  };

  return (
    <footer className="bg-white border-t border-gray-200 px-8 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
        {/* Left: Auto-save Status */}
        <div className="flex items-center gap-4">
          {autoSaveStatus && (
            <div className="flex items-center gap-2">
              {getAutoSaveIcon()}
              <span
                className={
                  autoSaveStatus === 'error'
                    ? 'text-red-600 font-medium'
                    : 'text-gray-600'
                }
              >
                {getAutoSaveLabel()}
              </span>
            </div>
          )}

          {lastUpdated && (
            <div className="flex items-center gap-2 text-gray-600 border-l border-gray-200 pl-4">
              <span>마지막 수정:</span>
              <time>{formatDate(lastUpdated)}</time>
            </div>
          )}
        </div>

        {/* Right: Metadata */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">편집:</span>
            <span className="font-semibold text-gray-900">{editCount}</span>
          </div>

          {version && (
            <div className="flex items-center gap-2 text-gray-600 border-l border-gray-200 pl-6">
              <span>버전:</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                {version}
              </code>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

export default Footer;

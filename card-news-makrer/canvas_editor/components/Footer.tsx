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
    <footer className="bg-white border-t border-gray-100 px-4 sm:px-6 h-9 flex items-center shrink-0">
      <div className="w-full flex items-center justify-between">
        {/* Left: Auto-save Status */}
        <div className="flex items-center gap-3">
          {autoSaveStatus && (
            <div className="flex items-center gap-1.5">
              {getAutoSaveIcon()}
              <span
                className={`text-xs ${
                  autoSaveStatus === 'error'
                    ? 'text-red-600 font-medium'
                    : 'text-gray-500'
                }`}
              >
                {getAutoSaveLabel()}
              </span>
            </div>
          )}

          {lastUpdated && autoSaveStatus !== 'saving' && (
            <span className="text-xs text-gray-400 hidden sm:inline">
              {formatDate(lastUpdated)}
            </span>
          )}
        </div>

        {/* Right: Minimal metadata */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {editCount > 0 && (
            <span>{editCount}회 편집</span>
          )}
          {version && (
            <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-400 hidden sm:inline">
              {version.slice(0, 8)}
            </code>
          )}
        </div>
      </div>
    </footer>
  );
}

export default Footer;

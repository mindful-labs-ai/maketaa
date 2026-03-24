'use client';

import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { getEditHistory, formatFieldPath, formatEditValue, groupEditsByCard } from '@/lib/editLogger';
import type { EditLogEntry } from '@/lib/editLogger';

// ============================================================================
// Types
// ============================================================================

interface EditHistoryProps {
  specId: string;
  isCollapsed?: boolean;
  itemsPerPage?: number;
}

// ============================================================================
// Component
// ============================================================================

export function EditHistory({
  specId,
  isCollapsed: initialCollapsed = true,
  itemsPerPage = 10,
}: EditHistoryProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<EditLogEntry[]>([]);
  const [displayCount, setDisplayCount] = useState(itemsPerPage);

  // =========================================================================
  // Load History
  // =========================================================================

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const history = await getEditHistory({
          specId,
          limit: 100,
          offset: 0,
        });
        setEdits(history);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load edit history';
        setError(message);
        console.error('[EditHistory] Error loading history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [specId]);

  // =========================================================================
  // Handlers
  // =========================================================================

  const handleShowMore = () => {
    setDisplayCount((prev) => prev + itemsPerPage);
  };

  const hasMore = displayCount < edits.length;
  const displayedEdits = edits.slice(0, displayCount);
  const groupedByCard = groupEditsByCard(displayedEdits);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="border-t border-gray-200 bg-gray-50 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Clock size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">편집 이력</h3>
          {edits.length > 0 && (
            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
              {edits.length}
            </span>
          )}
        </div>
        {isCollapsed ? (
          <ChevronDown size={18} className="text-gray-600" />
        ) : (
          <ChevronUp size={18} className="text-gray-600" />
        )}
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="border-t border-gray-200 px-4 py-4">
          {/* Loading */}
          {isLoading && (
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mb-2" />
              <p className="text-sm text-gray-600">Loading edit history...</p>
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && edits.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">No edits recorded yet</p>
            </div>
          )}

          {/* Edit History List */}
          {!isLoading && !error && displayedEdits.length > 0 && (
            <div className="space-y-6">
              {Array.from(groupedByCard.entries()).map(([cardIndex, cardEdits]) => (
                <div key={cardIndex}>
                  {/* Card Header */}
                  {cardIndex >= 0 && (
                    <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                      Card {cardIndex + 1}
                    </h4>
                  )}

                  {/* Edit Entries */}
                  <div className="space-y-2">
                    {cardEdits.map((edit) => (
                      <div
                        key={edit.id}
                        className="bg-white border border-gray-200 rounded p-3 hover:border-gray-300 transition-colors"
                      >
                        {/* Field & Time */}
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs font-medium text-gray-900">
                            {formatFieldPath(edit.fieldPath)}
                          </p>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {new Date(edit.createdAt).toLocaleTimeString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Editor */}
                        <p className="text-xs text-gray-600 mb-2">
                          <span className="font-medium">by</span> {edit.editor}
                        </p>

                        {/* Old → New Values */}
                        <div className="bg-gray-50 border border-gray-200 rounded p-2 space-y-1 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600">Before:</span>
                            <code className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-mono">
                              {formatEditValue(edit.oldValue, 50)}
                            </code>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600">After:</span>
                            <code className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-mono">
                              {formatEditValue(edit.newValue, 50)}
                            </code>
                          </div>
                        </div>

                        {/* Reason (if provided) */}
                        {edit.changeReason && (
                          <p className="text-xs text-gray-600 italic">
                            💬 {edit.changeReason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show More Button */}
          {hasMore && !isLoading && (
            <button
              onClick={handleShowMore}
              className="mt-4 w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Show {Math.min(itemsPerPage, edits.length - displayCount)} more edits
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EditHistory;

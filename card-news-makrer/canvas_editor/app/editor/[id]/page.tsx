/**
 * Canvas Editor Main Page
 * URL: /editor/[id]
 *
 * Layout: Header | CardList | CardCanvas | StylePanel | Footer
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCardSpecById } from '@/lib/api';
import { useCardStore, useSelectedCard, useAllCards } from '@/stores/useCardStore';
import { CardList } from '@/components/CardList';
import CardCanvas from '@/components/CardCanvas';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { StylePanel } from '@/components/StylePanel';
import TextEditModal from '@/components/TextEditModal';
import { canvasToDataURL, downloadDataURL, exportAllAsZip } from '@/lib/export-utils';

// ============================================================================
// Component
// ============================================================================

export default function EditorPage() {
  const params = useParams();
  const specId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'headline' | 'body' | 'sub_text' | 'description' | 'quote' | null>(null);

  const canvasRef = useRef<{ getCanvas: () => import('fabric').Canvas | null }>(null);

  const loadSpec = useCardStore((state) => state.loadSpec);
  const updateCardText = useCardStore((state) => state.updateCardText);
  const selectCard = useCardStore((state) => state.selectCard);
  const selectedCardIndex = useCardStore((state) => state.selectedCardIndex);
  const selectedCard = useSelectedCard();
  const cards = useAllCards();

  // Load card spec on mount
  useEffect(() => {
    const fetchAndLoad = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const record = await getCardSpecById(specId);
        loadSpec(record.spec);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load card spec. Please try again.';
        setError(message);
        console.error('[EditorPage] Error loading spec:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (specId) {
      fetchAndLoad();
    }
  }, [specId, loadSpec]);

  // Keyboard navigation between cards
  // Skip when user is typing in any input/textarea (including Fabric.js hidden textarea)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const storeCards = useCardStore.getState().cardSpec?.cards || [];
      const currentIndex = useCardStore.getState().selectedCardIndex;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) selectCard(currentIndex - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < storeCards.length - 1) selectCard(currentIndex + 1);
          break;
        case 'Escape':
          setEditingField(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectCard]);
  // Note: Fabric.js IText editing uses a hidden <textarea> element so the
  // TEXTAREA check above naturally prevents arrow-key conflicts during inline editing.

  // Export current card canvas as PNG
  const handleExport = useCallback(() => {
    const fabricCanvas = canvasRef.current?.getCanvas();
    if (!fabricCanvas) return;

    const activeObject = fabricCanvas.getActiveObject();
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();

    const topic = useCardStore.getState().cardSpec?.meta?.topic || 'card';
    const cardIndex = useCardStore.getState().selectedCardIndex;
    const filename = `${topic}_card_${cardIndex + 1}.png`;

    const dataUrl = canvasToDataURL(fabricCanvas);
    downloadDataURL(dataUrl, filename);

    // Restore previous selection
    if (activeObject) {
      fabricCanvas.setActiveObject(activeObject);
      fabricCanvas.renderAll();
    }
  }, []);

  // Export all cards as a ZIP file
  const handleExportAll = useCallback(async (onProgress: (percent: number) => void) => {
    const store = useCardStore.getState();
    const allCards = store.cardSpec?.cards || [];
    const topic = store.cardSpec?.meta?.topic || 'card';
    const originalIndex = store.selectedCardIndex;
    const cardCount = Math.min(allCards.length, 20);

    await exportAllAsZip(
      async (index: number) => {
        // Switch to the target card
        store.selectCard(index);
        // Wait for React to re-render and Fabric.js to render the new card content
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(resolve, 120);
            });
          });
        });

        const fabricCanvas = canvasRef.current?.getCanvas();
        if (!fabricCanvas) return '';

        // Deselect any active object before capturing
        fabricCanvas.discardActiveObject();
        fabricCanvas.renderAll();

        return canvasToDataURL(fabricCanvas);
      },
      cardCount,
      topic,
      onProgress
    );

    // Restore original card selection
    store.selectCard(originalIndex);
  }, []);

  // Close modal when switching cards
  useEffect(() => {
    setEditingField(null);
  }, [selectedCardIndex]);

  // Handle text click — opens the edit modal for the clicked field
  // Memoized to prevent Fabric.js canvas from being recreated on every render
  const handleTextClick = useCallback((fieldName: string) => {
    if (['headline', 'body', 'sub_text', 'description', 'quote'].includes(fieldName)) {
      setEditingField(fieldName as 'headline' | 'body' | 'sub_text' | 'description' | 'quote');
    }
  }, []);

  // Handle modal save — persists the updated text via Zustand store
  const handleModalSave = (fieldName: string, value: string) => {
    if (['headline', 'body', 'sub_text', 'description', 'quote'].includes(fieldName)) {
      updateCardText(selectedCardIndex, fieldName, value).catch((err) => {
        console.error('[EditorPage] Failed to update card text:', err);
      });
    }
  };

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#EBEBEB]">
        <div className="max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <span className="text-red-600 text-sm font-bold">!</span>
            </div>
            <h1 className="text-base font-semibold text-gray-900">로드 실패</h1>
          </div>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">{error}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← 목록으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#EBEBEB]">
        <div className="text-center space-y-4">
          {/* Skeleton card thumbnails */}
          <div className="flex gap-3 mb-6 justify-center">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-16 h-20 bg-white/70 rounded-lg animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <div className="inline-block w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">에디터 로드 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <Header specId={specId} onExport={handleExport} onExportAll={handleExportAll} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Card List */}
        <CardList />

        {/* Center - Canvas workspace */}
        <div className="flex-1 flex flex-col items-center bg-[#EBEBEB] overflow-hidden p-2">
          {selectedCard ? (
            <div className="flex flex-col items-center w-full h-full py-2 px-2">
              {/* Card navigation pill */}
              <div className="flex items-center gap-2 mb-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border border-white/60 shrink-0">
                <button
                  onClick={() => selectCard(Math.max(0, selectedCardIndex - 1))}
                  disabled={selectedCardIndex === 0}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors text-sm"
                  aria-label="이전 카드"
                >
                  ‹
                </button>
                <span className="text-xs font-medium text-gray-700 tabular-nums min-w-[3rem] text-center">
                  {selectedCardIndex + 1} / {cards.length}
                </span>
                <button
                  onClick={() => selectCard(Math.min(cards.length - 1, selectedCardIndex + 1))}
                  disabled={selectedCardIndex === cards.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors text-sm"
                  aria-label="다음 카드"
                >
                  ›
                </button>
              </div>

              {/* Canvas — centered, takes all remaining space */}
              <div className="flex-1 w-full min-h-0 flex items-center justify-center">
                <CardCanvas
                  ref={canvasRef}
                  card={selectedCard}
                  cardIndex={selectedCardIndex}
                  onTextClick={handleTextClick}
                />
              </div>

              {/* Compact stat row below canvas */}
              <div className="flex items-center gap-5 mt-2 shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">제목</span>
                  <span className="tabular-nums">{selectedCard.text?.headline?.length || 0}</span>
                  <span className="text-gray-400">자</span>
                </div>
                <div className="w-px h-3 bg-gray-300" />
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">본문</span>
                  <span className="tabular-nums">{selectedCard.text?.body?.length || 0}</span>
                  <span className="text-gray-400">자</span>
                </div>
                <div className="w-px h-3 bg-gray-300" />
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">레이아웃</span>
                  <span className="text-gray-600">{selectedCard.style?.layout || 'center'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="w-16 h-20 rounded-xl border-2 border-dashed border-gray-400 flex items-center justify-center">
                <span className="text-2xl text-gray-400">+</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">카드를 선택하여 편집을 시작하세요</p>
            </div>
          )}
        </div>

        {/* Right Sidebar - Style Panel */}
        <StylePanel />
      </div>

      {/* Footer */}
      <Footer specId={specId} />

      {/* Text Edit Modal */}
      {editingField && selectedCard && (
        <TextEditModal
          isOpen={editingField !== null}
          onClose={() => setEditingField(null)}
          fieldName={editingField}
          currentValue={selectedCard.text?.[editingField] ?? ''}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

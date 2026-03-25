'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCardSpecById } from '@/lib/card-news/api';
import { useCardStore, useSelectedCard, useAllCards } from '@/stores/card-news/useCardStore';
import { CardList } from '@/components/card-news/editor/CardList';
import CardCanvas from '@/components/card-news/editor/CardCanvas';
// HeaderWithApproval removed - 승인/반려 기능 비활성화, 제목은 TopNav에서 표시
import { Footer } from '@/components/card-news/shared/Footer';
import { StylePanel } from '@/components/card-news/editor/StylePanel';
import TextEditModal from '@/components/card-news/editor/TextEditModal';
import { canvasToDataURL, downloadDataURL, exportAllAsZip } from '@/lib/card-news/export-utils';

export default function EditorPage() {
  const params = useParams();
  const specId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<
    'headline' | 'body' | 'sub_text' | 'description' | 'quote' | null
  >(null);

  const canvasRef = useRef<{ getCanvas: () => import('fabric').Canvas | null }>(null);

  const loadSpec = useCardStore((state) => state.loadSpec);
  const updateCardText = useCardStore((state) => state.updateCardText);
  const selectCard = useCardStore((state) => state.selectCard);
  const selectedCardIndex = useCardStore((state) => state.selectedCardIndex);
  const selectedCard = useSelectedCard();
  const cards = useAllCards();

  useEffect(() => {
    const fetchAndLoad = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const record = await getCardSpecById(specId);
        loadSpec(record.spec);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '카드를 불러올 수 없습니다.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    if (specId) fetchAndLoad();
  }, [specId, loadSpec]);

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

    if (activeObject) {
      fabricCanvas.setActiveObject(activeObject);
      fabricCanvas.renderAll();
    }
  }, []);

  const handleExportAll = useCallback(
    async (onProgress: (percent: number) => void) => {
      const store = useCardStore.getState();
      const allCards = store.cardSpec?.cards || [];
      const topic = store.cardSpec?.meta?.topic || 'card';
      const originalIndex = store.selectedCardIndex;
      const cardCount = Math.min(allCards.length, 20);

      await exportAllAsZip(
        async (index: number) => {
          store.selectCard(index);
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setTimeout(resolve, 120);
              });
            });
          });

          const fabricCanvas = canvasRef.current?.getCanvas();
          if (!fabricCanvas) return '';

          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
          return canvasToDataURL(fabricCanvas);
        },
        cardCount,
        topic,
        onProgress,
      );

      store.selectCard(originalIndex);
    },
    [],
  );

  useEffect(() => {
    setEditingField(null);
  }, [selectedCardIndex]);

  const handleTextClick = useCallback((fieldName: string) => {
    if (['headline', 'body', 'sub_text', 'description', 'quote'].includes(fieldName)) {
      setEditingField(
        fieldName as 'headline' | 'body' | 'sub_text' | 'description' | 'quote',
      );
    }
  }, []);

  const handleModalSave = (fieldName: string, value: string) => {
    if (['headline', 'body', 'sub_text', 'description', 'quote'].includes(fieldName)) {
      updateCardText(selectedCardIndex, fieldName as 'headline' | 'body' | 'sub_text' | 'description' | 'quote', value).catch((err) => {
        console.error('[EditorPage] Failed to update card text:', err);
      });
    }
  };

  if (error) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='max-w-md p-8 bg-[--surface-1] rounded-xl shadow-lg border border-[--border-default]'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-8 h-8 rounded-full bg-[rgba(248,113,113,0.15)] flex items-center justify-center shrink-0'>
              <span className='text-[--error] text-sm font-bold'>!</span>
            </div>
            <h1 className='text-base font-semibold'>로드 실패</h1>
          </div>
          <p className='text-sm text-[--text-secondary] mb-6'>{error}</p>
          <a
            href='/card-news'
            className='inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90 transition-opacity'
          >
            ← 목록으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='text-center space-y-4'>
          <div className='flex gap-3 mb-6 justify-center'>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className='w-16 h-20 bg-[--surface-2] rounded-lg animate-pulse'
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <div className='inline-block w-5 h-5 border-2 border-[--surface-2] border-t-primary rounded-full animate-spin' />
          <p className='text-sm text-[--text-secondary] font-medium'>에디터 로드 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-[calc(100vh-3.5rem)] bg-[--surface-0] overflow-hidden'>
      <div className='flex-1 flex overflow-hidden'>
        <CardList />

        <div className='flex-1 flex flex-col items-center bg-[--surface-0] overflow-hidden p-2'>
          {selectedCard ? (
            <div className='flex flex-col items-center w-full h-full py-2 px-2'>
              <div className='flex items-center gap-2 mb-2 bg-[--surface-2] backdrop-blur-sm rounded-full px-3 py-1.5 border border-[--border-subtle] shrink-0'>
                <button
                  onClick={() => selectCard(Math.max(0, selectedCardIndex - 1))}
                  disabled={selectedCardIndex === 0}
                  className='w-6 h-6 flex items-center justify-center rounded-full text-[--text-secondary] hover:bg-[--surface-0] disabled:opacity-30 transition-colors text-sm'
                  aria-label='이전 카드'
                >
                  ‹
                </button>
                <span className='text-xs font-medium tabular-nums min-w-[3rem] text-center'>
                  {selectedCardIndex + 1} / {cards.length}
                </span>
                <button
                  onClick={() => selectCard(Math.min(cards.length - 1, selectedCardIndex + 1))}
                  disabled={selectedCardIndex === cards.length - 1}
                  className='w-6 h-6 flex items-center justify-center rounded-full text-[--text-secondary] hover:bg-[--surface-0] disabled:opacity-30 transition-colors text-sm'
                  aria-label='다음 카드'
                >
                  ›
                </button>
              </div>

              <div className='flex-1 w-full min-h-0 flex items-center justify-center'>
                <CardCanvas
                  ref={canvasRef}
                  card={selectedCard}
                  cardIndex={selectedCardIndex}
                  onTextClick={handleTextClick}
                />
              </div>

              <div className='flex items-center gap-5 mt-2 shrink-0'>
                <div className='flex items-center gap-1.5 text-xs text-[--text-secondary]'>
                  <span className='font-medium'>제목</span>
                  <span className='tabular-nums'>{selectedCard.text?.headline?.length || 0}</span>
                  <span>자</span>
                </div>
                <div className='w-px h-3 bg-[--border-default]' />
                <div className='flex items-center gap-1.5 text-xs text-[--text-secondary]'>
                  <span className='font-medium'>본문</span>
                  <span className='tabular-nums'>{selectedCard.text?.body?.length || 0}</span>
                  <span>자</span>
                </div>
                <div className='w-px h-3 bg-[--border-default]' />
                <div className='flex items-center gap-1.5 text-xs text-[--text-secondary]'>
                  <span className='font-medium'>레이아웃</span>
                  <span>{selectedCard.style?.layout || 'center'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center gap-3 py-16'>
              <div className='w-16 h-20 rounded-xl border-2 border-dashed border-[--border-subtle] flex items-center justify-center'>
                <span className='text-2xl text-[--text-secondary]'>+</span>
              </div>
              <p className='text-sm text-[--text-secondary] font-medium'>
                카드를 선택하여 편집을 시작하세요
              </p>
            </div>
          )}
        </div>

        <StylePanel />
      </div>

      <Footer specId={specId} />

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

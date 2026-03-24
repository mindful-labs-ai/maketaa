'use client';

/**
 * StylePanel - Right sidebar for style editing
 *
 * Features:
 * - Content editing (headline, body, sub_text, description, quote, bullet points)
 * - Canvas ratio selector
 * - Color palette (4 colors + presets)
 * - Layout selector
 * - Font family + size sliders
 * - Overlay opacity slider
 * - Background type + image upload + Unsplash search
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  useSelectedCard,
  useCardStore,
  useAutoSaveStatus,
} from '@/stores/card-news/useCardStore';
import {
  useCardPalette,
  useCardLayout,
  useCardFontSizes,
  useCardOverlay,
  useCardBackground,
  useUpdateCardStyle,
  useUpdateCardBackground,
} from '@/stores/card-news/useStyleSelectors';
import {
  LAYOUT_TYPES,
  BACKGROUND_TYPES,
  COLOR_PALETTES,
  CANVAS_RATIOS,
  FONT_OPTIONS,
  TEXT_LIMITS,
  type CanvasRatio,
} from '@/lib/card-news/constants';
import { ChevronDown, Upload, X } from 'lucide-react';
import {
  searchPhotos,
  hasUnsplashKey,
  suggestQuery,
  type UnsplashPhoto,
} from '@/lib/card-news/unsplash';
import { validateImageFile, resizeImage } from '@/lib/card-news/image-utils';

// ============================================================================
// Types
// ============================================================================

type SectionName = 'content' | 'ratio' | 'palette' | 'layout' | 'fonts' | 'overlay' | 'background';

interface StylePanelProps {
  className?: string;
}

// ============================================================================
// CollapsibleSection
// ============================================================================

const CollapsibleSection: React.FC<{
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ title, isOpen, onToggle, children, disabled = false }) => (
  <div className={`border-b border-gray-100 last:border-b-0 ${disabled ? 'opacity-40' : ''}`}>
    <button
      onClick={onToggle}
      disabled={disabled}
      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
    >
      <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
      <ChevronDown
        size={14}
        className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
    {isOpen && <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>}
  </div>
);

// ============================================================================
// Component
// ============================================================================

export const StylePanel = React.forwardRef<HTMLDivElement, StylePanelProps>(
  ({ className = '' }, ref) => {
    const selectedCard = useSelectedCard();
    const palette = useCardPalette();
    const layout = useCardLayout();
    const fontSizes = useCardFontSizes();
    const overlay = useCardOverlay();
    const background = useCardBackground();
    const updateCardStyle = useUpdateCardStyle();
    const updateCardBackground = useUpdateCardBackground();
    const { status: autoSaveStatus } = useAutoSaveStatus();

    const canvasRatio = useCardStore((s) => s.canvasRatio);
    const setCanvasRatio = useCardStore((s) => s.setCanvasRatio);

    const [openSections, setOpenSections] = useState<Record<SectionName, boolean>>({
      content: true, ratio: true, palette: true, layout: true,
      fonts: true, overlay: true, background: true,
    });

    const toggleSection = (section: SectionName) => {
      setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    const isDisabled = !selectedCard;

    // =========================================================================
    // Content editing state
    // =========================================================================

    const selectedCardIndex = useCardStore((s) => s.selectedCardIndex);
    const updateCardText = useCardStore((s) => s.updateCardText);
    const setCardTextField = useCardStore((s) => s.setCardTextField);
    const addBulletPoint = useCardStore((s) => s.addBulletPoint);
    const updateBulletPoint = useCardStore((s) => s.updateBulletPoint);
    const removeBulletPoint = useCardStore((s) => s.removeBulletPoint);

    const cardText = useCardStore((s) => {
      if (!s.cardSpec || s.selectedCardIndex >= s.cardSpec.cards.length) return null;
      return s.cardSpec.cards[s.selectedCardIndex].text;
    });

    const [localText, setLocalText] = useState<Record<string, string>>({});
    const contentDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    useEffect(() => {
      if (cardText) {
        setLocalText({
          headline: cardText.headline ?? '',
          body: cardText.body ?? '',
          sub_text: cardText.sub_text ?? '',
          description: cardText.description ?? '',
          quote: cardText.quote ?? '',
        });
      }
    }, [selectedCardIndex, cardText]);

    const handleContentInput = (
      field: 'headline' | 'body' | 'sub_text' | 'description' | 'quote',
      value: string
    ) => {
      setLocalText((prev) => ({ ...prev, [field]: value }));
      if (contentDebounceRef.current[field]) clearTimeout(contentDebounceRef.current[field]);
      contentDebounceRef.current[field] = setTimeout(() => {
        updateCardText(selectedCardIndex, field, value).catch((err) =>
          console.error('[StylePanel] updateCardText failed:', err)
        );
      }, 300);
    };

    const handleAddField = (field: 'body' | 'sub_text' | 'description' | 'quote') => {
      setCardTextField(selectedCardIndex, field, '').catch((err) =>
        console.error('[StylePanel] setCardTextField failed:', err)
      );
    };

    const handleRemoveField = (field: 'body' | 'sub_text' | 'description' | 'quote') => {
      setCardTextField(selectedCardIndex, field, undefined).catch((err) =>
        console.error('[StylePanel] setCardTextField failed:', err)
      );
    };

    const bulletPoints = useMemo(() => cardText?.bullet_points ?? [], [cardText]);
    const [localBullets, setLocalBullets] = useState<string[]>([]);
    const bulletDebounceRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

    useEffect(() => {
      setLocalBullets(bulletPoints);
    }, [selectedCardIndex, bulletPoints]);

    const handleBulletInput = (index: number, value: string) => {
      setLocalBullets((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
      if (bulletDebounceRef.current[index]) clearTimeout(bulletDebounceRef.current[index]);
      bulletDebounceRef.current[index] = setTimeout(() => {
        updateBulletPoint(selectedCardIndex, index, value).catch((err) =>
          console.error('[StylePanel] updateBulletPoint failed:', err)
        );
      }, 300);
    };

    // =========================================================================
    // Unsplash search state
    // =========================================================================

    const unsplashEnabled = hasUnsplashKey();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UnsplashPhoto[]>([]);
    const [searchPage, setSearchPage] = useState(1);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      if (selectedCard) {
        const suggested = suggestQuery((selectedCard as any).role ?? null);
        setSearchQuery(suggested);
        setSearchResults([]);
        setSearchPage(1);
        setSelectedPhotoId(null);
      }
    }, [(selectedCard as any)?.index]);

    const runSearch = useCallback(async (query: string, page: number) => {
      if (!query.trim() || !unsplashEnabled) return;
      setIsSearching(true);
      setSearchError(null);
      try {
        const results = await searchPhotos(query.trim(), page, 9);
        if (page === 1) setSearchResults(results);
        else setSearchResults((prev) => [...prev, ...results]);
      } catch (err) {
        setSearchError('이미지 검색 실패. 잠시 후 다시 시도해 주세요.');
        console.error('[StylePanel] Unsplash search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, [unsplashEnabled]);

    const handleSearchInputChange = (value: string) => {
      setSearchQuery(value);
      setSearchPage(1);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => runSearch(value, 1), 300);
    };

    const handleSearchSubmit = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      setSearchPage(1);
      runSearch(searchQuery, 1);
    };

    const handleLoadMore = () => {
      const nextPage = searchPage + 1;
      setSearchPage(nextPage);
      runSearch(searchQuery, nextPage);
    };

    const handlePhotoSelect = async (photo: UnsplashPhoto) => {
      if (isDisabled) return;
      setSelectedPhotoId(photo.id);
      try {
        await updateCardBackground({ type: 'image', src: photo.urls.regular });
      } catch (err) {
        console.error('[StylePanel] Failed to apply Unsplash image:', err);
      }
    };

    // =========================================================================
    // Image upload state
    // =========================================================================

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const processImageFile = useCallback(async (file: File) => {
      const validationError = validateImageFile(file);
      if (validationError) {
        setUploadStatus('error');
        setUploadError(validationError.message);
        return;
      }
      setUploadStatus('processing');
      setUploadError(null);
      try {
        const dataUrl = await resizeImage(file, 1920);
        setUploadPreview(dataUrl);
        await updateCardBackground({ type: 'image', src: dataUrl });
        setUploadStatus('done');
      } catch (err) {
        setUploadStatus('error');
        setUploadError('이미지 처리 중 오류가 발생했습니다.');
        console.error('[StylePanel] Image upload error:', err);
      }
    }, [updateCardBackground]);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processImageFile(file);
      e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processImageFile(file);
    };

    const handleClearUpload = async () => {
      setUploadPreview(null);
      setUploadStatus('idle');
      setUploadError(null);
      try {
        await updateCardBackground({ type: 'image', src: '' });
      } catch (err) {
        console.error('[StylePanel] Failed to clear image:', err);
      }
    };

    // =========================================================================
    // Style handlers
    // =========================================================================

    const handlePaletteColorClick = async (colorKey: string, value: string) => {
      if (isDisabled) return;
      try {
        await updateCardStyle({ color_palette: { ...palette, [colorKey]: value } });
      } catch (error) {
        console.error('[StylePanel] Failed to update palette:', error);
      }
    };

    const handleLayoutSelect = async (newLayout: string) => {
      if (isDisabled) return;
      try {
        await updateCardStyle({ layout: newLayout as any });
      } catch (error) {
        console.error('[StylePanel] Failed to update layout:', error);
      }
    };

    const handleFontSizeChange = async (fontType: 'headline_size' | 'body_size', value: number) => {
      if (isDisabled) return;
      try {
        await updateCardStyle({ font: { ...fontSizes, [fontType]: value } });
      } catch (error) {
        console.error('[StylePanel] Failed to update font size:', error);
      }
    };

    const handleFontFamilyChange = async (fontType: 'headline_family' | 'body_family', value: string) => {
      if (isDisabled) return;
      try {
        await updateCardStyle({ font: { ...fontSizes, [fontType]: value } });
      } catch (error) {
        console.error('[StylePanel] Failed to update font family:', error);
      }
    };

    const handleOverlayChange = async (value: number) => {
      if (isDisabled) return;
      try {
        await updateCardBackground({ overlay_opacity: parseFloat(value.toFixed(2)) });
      } catch (error) {
        console.error('[StylePanel] Failed to update overlay:', error);
      }
    };

    const handleBackgroundTypeChange = async (type: string) => {
      if (isDisabled) return;
      try {
        await updateCardBackground({ type: type as any });
      } catch (error) {
        console.error('[StylePanel] Failed to update background type:', error);
      }
    };

    // =========================================================================
    // Render
    // =========================================================================

    return (
      <div
        ref={ref}
        className={`w-64 bg-white border-l border-gray-200 overflow-y-auto flex flex-col scrollbar-thin ${className}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">스타일</h2>
          <div className="flex items-center gap-1.5 h-4">
            {autoSaveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <span className="inline-block w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                저장 중
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="text-[10px] text-green-600 font-medium">저장됨</span>
            )}
          </div>
        </div>

        {isDisabled && (
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <p className="text-[11px] text-gray-400 text-center">카드를 선택하면 편집할 수 있습니다</p>
          </div>
        )}

        <div className={isDisabled ? 'opacity-40 pointer-events-none' : ''}>

          {/* Content Section */}
          <CollapsibleSection
            title="콘텐츠"
            isOpen={openSections.content}
            onToggle={() => toggleSection('content')}
          >
            {cardText ? (
              <div className="space-y-3">
                {/* Headline */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wide">제목</label>
                    <span className="text-[10px] text-gray-400 tabular-nums">
                      {(localText.headline ?? '').length}/{TEXT_LIMITS.headline}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={localText.headline ?? ''}
                    maxLength={TEXT_LIMITS.headline}
                    onChange={(e) => handleContentInput('headline', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="제목을 입력하세요"
                  />
                </div>

                {/* Body */}
                {cardText.body !== undefined ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wide">본문</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 tabular-nums">
                          {(localText.body ?? '').length}/{TEXT_LIMITS.body}
                        </span>
                        <button onClick={() => handleRemoveField('body')} className="text-gray-300 hover:text-gray-500 transition-colors" title="본문 제거">
                          <span className="text-[12px] leading-none">&times;</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={3}
                      value={localText.body ?? ''}
                      maxLength={TEXT_LIMITS.body}
                      onChange={(e) => handleContentInput('body', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="본문을 입력하세요"
                    />
                  </div>
                ) : (
                  <button onClick={() => handleAddField('body')} className="w-full py-1.5 border border-dashed border-gray-300 rounded-md text-[11px] text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors">
                    + 본문 추가
                  </button>
                )}

                {/* Sub text */}
                {cardText.sub_text !== undefined ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wide">부제</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 tabular-nums">
                          {(localText.sub_text ?? '').length}/{TEXT_LIMITS.sub_text}
                        </span>
                        <button onClick={() => handleRemoveField('sub_text')} className="text-gray-300 hover:text-gray-500 transition-colors" title="부제 제거">
                          <span className="text-[12px] leading-none">&times;</span>
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={localText.sub_text ?? ''}
                      maxLength={TEXT_LIMITS.sub_text}
                      onChange={(e) => handleContentInput('sub_text', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="부제를 입력하세요"
                    />
                  </div>
                ) : (
                  <button onClick={() => handleAddField('sub_text')} className="w-full py-1.5 border border-dashed border-gray-300 rounded-md text-[11px] text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors">
                    + 부제 추가
                  </button>
                )}

                {/* Description */}
                {cardText.description !== undefined ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wide">설명</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 tabular-nums">
                          {(localText.description ?? '').length}/{TEXT_LIMITS.description}
                        </span>
                        <button onClick={() => handleRemoveField('description')} className="text-gray-300 hover:text-gray-500 transition-colors" title="설명 제거">
                          <span className="text-[12px] leading-none">&times;</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={5}
                      value={localText.description ?? ''}
                      maxLength={TEXT_LIMITS.description}
                      onChange={(e) => handleContentInput('description', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="설명을 입력하세요"
                    />
                  </div>
                ) : (
                  <button onClick={() => handleAddField('description')} className="w-full py-1.5 border border-dashed border-gray-300 rounded-md text-[11px] text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors">
                    + 설명 추가
                  </button>
                )}

                {/* Quote */}
                {cardText.quote !== undefined ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wide">인용문</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 tabular-nums">
                          {(localText.quote ?? '').length}/{TEXT_LIMITS.quote}
                        </span>
                        <button onClick={() => handleRemoveField('quote')} className="text-gray-300 hover:text-gray-500 transition-colors" title="인용문 제거">
                          <span className="text-[12px] leading-none">&times;</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={3}
                      value={localText.quote ?? ''}
                      maxLength={TEXT_LIMITS.quote}
                      onChange={(e) => handleContentInput('quote', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="인용문을 입력하세요"
                    />
                  </div>
                ) : (
                  <button onClick={() => handleAddField('quote')} className="w-full py-1.5 border border-dashed border-gray-300 rounded-md text-[11px] text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors">
                    + 인용문 추가
                  </button>
                )}

                {/* Bullet Points */}
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">목록 항목</label>
                  <div className="space-y-1.5">
                    {localBullets.map((bullet, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={bullet}
                          maxLength={TEXT_LIMITS.bullet_point}
                          onChange={(e) => handleBulletInput(i, e.target.value)}
                          className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`항목 ${i + 1}`}
                        />
                        <button
                          onClick={() =>
                            removeBulletPoint(selectedCardIndex, i).catch((err) =>
                              console.error('[StylePanel] removeBulletPoint failed:', err)
                            )
                          }
                          className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                          title="항목 삭제"
                        >
                          <span className="text-[14px] leading-none">&times;</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      addBulletPoint(selectedCardIndex).catch((err) =>
                        console.error('[StylePanel] addBulletPoint failed:', err)
                      )
                    }
                    className="mt-1.5 w-full py-1.5 border border-dashed border-gray-300 rounded-md text-[11px] text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors"
                  >
                    + 항목 추가
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400">카드를 선택하세요</p>
            )}
          </CollapsibleSection>

          {/* Canvas Ratio Section */}
          <CollapsibleSection
            title="비율"
            isOpen={openSections.ratio}
            onToggle={() => toggleSection('ratio')}
          >
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(CANVAS_RATIOS) as [CanvasRatio, typeof CANVAS_RATIOS[CanvasRatio]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setCanvasRatio(key)}
                  className={`
                    flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-md border text-[11px] font-medium transition-all
                    ${canvasRatio === key
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'}
                  `}
                >
                  <div
                    className={`border-2 rounded-sm ${canvasRatio === key ? 'border-white/70' : 'border-gray-400'}`}
                    style={{
                      width: key === '9:16' ? 14 : 18,
                      height: key === '1:1' ? 18 : key === '4:5' ? 22 : 28,
                    }}
                  />
                  <span>{config.label}</span>
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {/* Background Section */}
          <CollapsibleSection
            title="배경"
            isOpen={openSections.background}
            onToggle={() => toggleSection('background')}
          >
            {background && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-1.5">
                  {BACKGROUND_TYPES.map((bgType) => (
                    <button
                      key={bgType}
                      onClick={() => handleBackgroundTypeChange(bgType)}
                      className={`
                        py-1.5 rounded-md border text-[11px] font-medium transition-all
                        ${background.type === bgType
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'}
                      `}
                    >
                      {bgType === 'image' ? '이미지' : bgType === 'gradient' ? '그라데' : '단색'}
                    </button>
                  ))}
                </div>

                {background.type === 'image' && (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />

                    {uploadStatus === 'done' && uploadPreview ? (
                      <div className="relative w-full h-20 rounded-lg border border-gray-200 overflow-hidden group">
                        <img src={uploadPreview} alt="업로드된 이미지" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => fileInputRef.current?.click()} className="px-2 py-1 bg-white text-gray-800 rounded text-[11px] font-medium hover:bg-gray-100">변경</button>
                          <button onClick={handleClearUpload} className="p-1 bg-white text-gray-800 rounded hover:bg-gray-100"><X size={11} /></button>
                        </div>
                      </div>
                    ) : uploadStatus === 'processing' ? (
                      <div className="w-full h-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
                        <span className="text-[11px] text-gray-500">처리 중...</span>
                      </div>
                    ) : (
                      <div
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                          w-full h-16 rounded-lg border border-dashed cursor-pointer
                          flex items-center justify-center gap-2 transition-colors
                          ${isDragOver ? 'border-gray-700 bg-gray-50' : 'border-gray-300 bg-white hover:border-gray-500 hover:bg-gray-50'}
                        `}
                      >
                        <Upload size={13} className="text-gray-400" />
                        <span className="text-[11px] text-gray-500">업로드 또는 드래그</span>
                      </div>
                    )}

                    {uploadStatus === 'error' && uploadError && (
                      <p className="text-[11px] text-red-600">{uploadError}</p>
                    )}

                    {background.src && uploadStatus !== 'done' && (
                      <div className="w-full h-16 rounded-lg border border-gray-200 overflow-hidden">
                        <img src={background.src} alt="배경" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {!unsplashEnabled ? (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-[11px] text-amber-800">
                          Unsplash 키 미설정 —{' '}
                          <code className="font-mono bg-amber-100 px-0.5 rounded text-[10px]">
                            NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
                          </code>
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearchInputChange(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                            placeholder="Unsplash 검색..."
                            className="flex-1 px-2 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          />
                          <button
                            onClick={handleSearchSubmit}
                            disabled={isSearching || !searchQuery.trim()}
                            className="px-2.5 py-1.5 text-[11px] font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            검색
                          </button>
                        </div>

                        {isSearching && (
                          <div className="flex items-center justify-center py-3 gap-2">
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                            <span className="text-[11px] text-gray-400">검색 중...</span>
                          </div>
                        )}

                        {searchError && <p className="text-[11px] text-red-500">{searchError}</p>}

                        {!isSearching && !searchError && searchResults.length === 0 && searchQuery && (
                          <p className="text-[11px] text-gray-400 text-center py-2">결과가 없습니다</p>
                        )}

                        {searchResults.length > 0 && (
                          <div>
                            <div className="grid grid-cols-3 gap-1">
                              {searchResults.map((photo) => (
                                <button
                                  key={photo.id}
                                  onClick={() => handlePhotoSelect(photo)}
                                  className="relative aspect-square rounded-md overflow-hidden border-2 transition-all hover:scale-[1.02]"
                                  style={{ borderColor: selectedPhotoId === photo.id ? '#111827' : 'transparent' }}
                                  title={photo.alt_description ?? photo.user.name}
                                >
                                  <img src={photo.urls.small} alt={photo.alt_description ?? ''} className="w-full h-full object-cover" />
                                  {selectedPhotoId === photo.id && (
                                    <div className="absolute inset-0 bg-gray-900/30 flex items-center justify-center">
                                      <span className="text-white text-base font-bold drop-shadow">&#10003;</span>
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>

                            {selectedPhotoId && (() => {
                              const photo = searchResults.find((p) => p.id === selectedPhotoId);
                              return photo ? (
                                <p className="text-[10px] text-gray-400 mt-1.5">
                                  Photo by{' '}
                                  <a href={`${photo.user.links.html}?utm_source=card_news_maker&utm_medium=referral`} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
                                    {photo.user.name}
                                  </a>{' '}
                                  on{' '}
                                  <a href="https://unsplash.com?utm_source=card_news_maker&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
                                    Unsplash
                                  </a>
                                </p>
                              ) : null;
                            })()}

                            <button
                              onClick={handleLoadMore}
                              disabled={isSearching}
                              className="w-full mt-2 py-1.5 text-[11px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                              {isSearching ? '로딩 중...' : '더 보기'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {background.type === 'solid' && (
                  <p className="text-[11px] text-gray-400">아래 색상 팔레트에서 배경색을 설정하세요.</p>
                )}
                {background.type === 'gradient' && (
                  <p className="text-[11px] text-gray-400">아래 색상 팔레트의 주/보조색상이 그라데이션에 사용됩니다.</p>
                )}
              </div>
            )}
          </CollapsibleSection>

          {/* Color Palette Section */}
          <CollapsibleSection
            title="색상"
            isOpen={openSections.palette}
            onToggle={() => toggleSection('palette')}
          >
            {palette ? (
              <div className="space-y-2.5">
                {[
                  { key: 'primary', label: '주색상', fallback: '#7B9EBD' },
                  { key: 'secondary', label: '보조색상', fallback: '#B8D4E3' },
                  { key: 'text', label: '텍스트', fallback: '#FFFFFF' },
                  { key: 'background', label: '배경색', fallback: '#F0F4F8' },
                ].map(({ key, label, fallback }) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(palette as any)[key] || fallback}
                      onChange={(e) => handlePaletteColorClick(key, e.target.value)}
                      className="w-8 h-8 rounded-md border border-gray-200 cursor-pointer shrink-0 p-0.5"
                    />
                    <input
                      type="text"
                      value={(palette as any)[key] || ''}
                      onChange={(e) => handlePaletteColorClick(key, e.target.value)}
                      className="flex-1 px-2 py-1.5 text-[11px] bg-white border border-gray-200 rounded-md text-gray-600 font-mono focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      placeholder="#000000"
                    />
                    <span className="text-[10px] text-gray-400 shrink-0 w-12 text-right">{label}</span>
                  </div>
                ))}

                <div className="pt-1">
                  <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">프리셋</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Object.values(COLOR_PALETTES).map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() =>
                          updateCardStyle({
                            color_palette: {
                              primary: preset.primary,
                              secondary: preset.secondary,
                              text: palette.text || '#FFFFFF',
                              background: preset.background,
                            },
                          })
                        }
                        title={preset.name}
                        className="flex flex-col gap-0.5 p-1 rounded-md border border-gray-200 hover:border-gray-500 transition-all"
                      >
                        <div className="flex gap-0.5">
                          <div className="w-full h-2.5 rounded-sm" style={{ backgroundColor: preset.primary }} />
                          <div className="w-full h-2.5 rounded-sm" style={{ backgroundColor: preset.secondary }} />
                        </div>
                        <span className="text-[9px] text-gray-500 mt-0.5 truncate text-center">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400">팔레트 정보 없음</p>
            )}
          </CollapsibleSection>

          {/* Layout Section */}
          <CollapsibleSection
            title="레이아웃"
            isOpen={openSections.layout}
            onToggle={() => toggleSection('layout')}
          >
            <div className="grid grid-cols-3 gap-1.5">
              {LAYOUT_TYPES.map((layoutType) => (
                <button
                  key={layoutType}
                  onClick={() => handleLayoutSelect(layoutType)}
                  className={`
                    py-1.5 rounded-md border text-[11px] font-medium transition-all
                    ${layout === layoutType
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'}
                  `}
                >
                  {layoutType === 'center' ? '중앙'
                    : layoutType === 'top-left' ? '좌상'
                    : layoutType === 'top-right' ? '우상'
                    : layoutType === 'bottom-left' ? '좌하'
                    : layoutType === 'bottom-right' ? '우하'
                    : '분할'}
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {/* Font Section */}
          <CollapsibleSection
            title="글꼴"
            isOpen={openSections.fonts}
            onToggle={() => toggleSection('fonts')}
          >
            {fontSizes && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">제목 글꼴</label>
                  <select
                    value={fontSizes.headline_family}
                    onChange={(e) => handleFontFamilyChange('headline_family', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.family} value={font.family}>{font.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">본문 글꼴</label>
                  <select
                    value={fontSizes.body_family}
                    onChange={(e) => handleFontFamilyChange('body_family', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.family} value={font.family}>{font.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wide">제목 크기</label>
                    <span className="text-xs font-semibold text-gray-700 tabular-nums">{fontSizes.headline_size}px</span>
                  </div>
                  <input
                    type="range" min="32" max="64" step="2"
                    value={fontSizes.headline_size}
                    onChange={(e) => handleFontSizeChange('headline_size', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-900"
                  />
                  <div className="flex justify-between mt-1 text-[10px] text-gray-400"><span>32</span><span>64</span></div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wide">본문 크기</label>
                    <span className="text-xs font-semibold text-gray-700 tabular-nums">{fontSizes.body_size}px</span>
                  </div>
                  <input
                    type="range" min="20" max="40" step="2"
                    value={fontSizes.body_size}
                    onChange={(e) => handleFontSizeChange('body_size', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-900"
                  />
                  <div className="flex justify-between mt-1 text-[10px] text-gray-400"><span>20</span><span>40</span></div>
                </div>
              </div>
            )}
          </CollapsibleSection>

          {/* Overlay Opacity Section */}
          <CollapsibleSection
            title="오버레이"
            isOpen={openSections.overlay}
            onToggle={() => toggleSection('overlay')}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide">불투명도</label>
                <span className="text-xs font-semibold text-gray-700 tabular-nums">{(overlay * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.05"
                value={overlay}
                onChange={(e) => handleOverlayChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-900"
              />
              <div className="flex justify-between mt-1 text-[10px] text-gray-400"><span>0%</span><span>100%</span></div>
            </div>
          </CollapsibleSection>

        </div>
      </div>
    );
  }
);

StylePanel.displayName = 'StylePanel';

export default StylePanel;

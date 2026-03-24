/**
 * StylePanel Component - Right sidebar for style editing
 *
 * Features:
 * - Color Palette: 4 colors with click-to-apply
 * - Layout Selector: 6 layout types as chips
 * - Font Size: Two sliders (headline 32-64px, body 20-40px)
 * - Overlay Opacity: Single slider 0-1.0
 * - Background Controls: Toggle between gradient/solid/image
 * - Collapsible sections
 * - Disabled when no card selected
 *
 * Connected to Zustand store for state management
 */

'use client';

import React, { useState } from 'react';
import {
  useSelectedCard,
  useCardStore,
  useAutoSaveStatus,
} from '@/stores/useCardStore';
import {
  useCardPalette,
  useCardLayout,
  useCardFontSizes,
  useCardOverlay,
  useCardBackground,
  useUpdateCardStyle,
  useUpdateCardBackground,
} from '@/stores/useStyleSelectors';
import { LAYOUT_TYPES, BACKGROUND_TYPES, COLOR_PALETTES } from '@/lib/constants';
import { ChevronDown } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type SectionName = 'palette' | 'layout' | 'fonts' | 'overlay' | 'background';

interface StylePanelProps {
  className?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

const CollapsibleSection: React.FC<{
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ title, isOpen, onToggle, children, disabled = false }) => {
  return (
    <div className={`border-b border-gray-200 ${disabled ? 'opacity-50' : ''}`}>
      <button
        onClick={onToggle}
        disabled={disabled}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
      >
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-4 py-4 bg-gray-50 space-y-4">{children}</div>
      )}
    </div>
  );
};

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

    // State for collapsible sections
    const [openSections, setOpenSections] = useState<Record<SectionName, boolean>>(
      {
        palette: true,
        layout: true,
        fonts: true,
        overlay: true,
        background: true,
      }
    );

    const toggleSection = (section: SectionName) => {
      setOpenSections((prev) => ({
        ...prev,
        [section]: !prev[section],
      }));
    };

    const isDisabled = !selectedCard;

    // =========================================================================
    // Handlers
    // =========================================================================

    const handlePaletteColorClick = async (colorKey: string, value: string) => {
      if (isDisabled) return;
      try {
        await updateCardStyle({
          color_palette: {
            ...palette,
            [colorKey]: value,
          },
        });
      } catch (error) {
        console.error('[StylePanel] Failed to update palette:', error);
      }
    };

    const handleLayoutSelect = async (newLayout: string) => {
      if (isDisabled) return;
      try {
        await updateCardStyle({
          layout: newLayout as any,
        });
      } catch (error) {
        console.error('[StylePanel] Failed to update layout:', error);
      }
    };

    const handleFontSizeChange = async (
      fontType: 'headline_size' | 'body_size',
      value: number
    ) => {
      if (isDisabled) return;
      try {
        await updateCardStyle({
          font: {
            ...fontSizes,
            [fontType]: value,
          },
        });
      } catch (error) {
        console.error('[StylePanel] Failed to update font size:', error);
      }
    };

    const handleOverlayChange = async (value: number) => {
      if (isDisabled) return;
      try {
        await updateCardBackground({
          overlay_opacity: parseFloat(value.toFixed(2)),
        });
      } catch (error) {
        console.error('[StylePanel] Failed to update overlay:', error);
      }
    };

    const handleBackgroundTypeChange = async (type: string) => {
      if (isDisabled) return;
      try {
        await updateCardBackground({
          type: type as any,
        });
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
        className={`
          w-72 bg-white border-l border-gray-200 overflow-y-auto
          ${isDisabled ? 'opacity-60 pointer-events-none' : ''}
          ${className}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4">
          <h2 className="text-lg font-bold text-gray-900">스타일 편집</h2>
          {autoSaveStatus === 'saving' && (
            <p className="text-xs text-gray-500 mt-1">저장 중...</p>
          )}
          {autoSaveStatus === 'saved' && (
            <p className="text-xs text-green-600 mt-1">저장됨</p>
          )}
        </div>

        {/* Content */}
        <div>
          {/* Color Palette Section */}
          <CollapsibleSection
            title="🎨 색상 팔레트"
            isOpen={openSections.palette}
            onToggle={() => toggleSection('palette')}
            disabled={isDisabled}
          >
            {palette ? (
              <div className="space-y-3">
                {/* Primary Color */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    주색상 (Primary)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        handlePaletteColorClick('primary', palette.primary || '#7B9EBD')
                      }
                      className={`
                        w-12 h-12 rounded-lg border-2 transition-all
                        ${
                          true ? 'border-gray-400 ring-2 ring-blue-300' : 'border-gray-300'
                        }
                      `}
                      style={{
                        backgroundColor: palette.primary || '#7B9EBD',
                      }}
                      title={palette.primary || '#7B9EBD'}
                    />
                    <input
                      type="text"
                      value={palette.primary || ''}
                      readOnly
                      className="flex-1 px-3 py-2 text-xs bg-gray-100 border border-gray-300 rounded text-gray-600"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    보조색상 (Secondary)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        handlePaletteColorClick(
                          'secondary',
                          palette.secondary || '#B8D4E3'
                        )
                      }
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 transition-all hover:border-gray-400"
                      style={{
                        backgroundColor: palette.secondary || '#B8D4E3',
                      }}
                      title={palette.secondary || '#B8D4E3'}
                    />
                    <input
                      type="text"
                      value={palette.secondary || ''}
                      readOnly
                      className="flex-1 px-3 py-2 text-xs bg-gray-100 border border-gray-300 rounded text-gray-600"
                    />
                  </div>
                </div>

                {/* Text Color */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    텍스트 색상 (Text)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        handlePaletteColorClick('text', palette.text || '#FFFFFF')
                      }
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 transition-all hover:border-gray-400"
                      style={{
                        backgroundColor: palette.text || '#FFFFFF',
                      }}
                      title={palette.text || '#FFFFFF'}
                    />
                    <input
                      type="text"
                      value={palette.text || ''}
                      readOnly
                      className="flex-1 px-3 py-2 text-xs bg-gray-100 border border-gray-300 rounded text-gray-600"
                    />
                  </div>
                </div>

                {/* Background Color */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    배경색 (Background)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        handlePaletteColorClick(
                          'background',
                          palette.background || '#F0F4F8'
                        )
                      }
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 transition-all hover:border-gray-400"
                      style={{
                        backgroundColor: palette.background || '#F0F4F8',
                      }}
                      title={palette.background || '#F0F4F8'}
                    />
                    <input
                      type="text"
                      value={palette.background || ''}
                      readOnly
                      className="flex-1 px-3 py-2 text-xs bg-gray-100 border border-gray-300 rounded text-gray-600"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">팔레트 정보 없음</p>
            )}
          </CollapsibleSection>

          {/* Layout Section */}
          <CollapsibleSection
            title="📐 레이아웃"
            isOpen={openSections.layout}
            onToggle={() => toggleSection('layout')}
            disabled={isDisabled}
          >
            <div className="grid grid-cols-2 gap-2">
              {LAYOUT_TYPES.map((layoutType) => (
                <button
                  key={layoutType}
                  onClick={() => handleLayoutSelect(layoutType)}
                  className={`
                    px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all
                    ${
                      layout === layoutType
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {layoutType === 'center'
                    ? '중앙'
                    : layoutType === 'top-left'
                      ? '좌상'
                      : layoutType === 'top-right'
                        ? '우상'
                        : layoutType === 'bottom-left'
                          ? '좌하'
                          : layoutType === 'bottom-right'
                            ? '우하'
                            : '분할'}
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {/* Font Size Section */}
          <CollapsibleSection
            title="📝 글꼴 크기"
            isOpen={openSections.fonts}
            onToggle={() => toggleSection('fonts')}
            disabled={isDisabled}
          >
            {fontSizes && (
              <div className="space-y-4">
                {/* Headline Size */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-700">
                      제목 크기
                    </label>
                    <span className="text-sm font-bold text-gray-900">
                      {fontSizes.headline_size}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="32"
                    max="64"
                    step="2"
                    value={fontSizes.headline_size}
                    onChange={(e) =>
                      handleFontSizeChange(
                        'headline_size',
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>32px</span>
                    <span>64px</span>
                  </div>
                </div>

                {/* Body Size */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-700">
                      본문 크기
                    </label>
                    <span className="text-sm font-bold text-gray-900">
                      {fontSizes.body_size}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="40"
                    step="2"
                    value={fontSizes.body_size}
                    onChange={(e) =>
                      handleFontSizeChange('body_size', parseInt(e.target.value))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>20px</span>
                    <span>40px</span>
                  </div>
                </div>
              </div>
            )}
          </CollapsibleSection>

          {/* Overlay Opacity Section */}
          <CollapsibleSection
            title="🎯 오버레이 불투명도"
            isOpen={openSections.overlay}
            onToggle={() => toggleSection('overlay')}
            disabled={isDisabled}
          >
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700">
                    오버레이 강도
                  </label>
                  <span className="text-sm font-bold text-gray-900">
                    {(overlay * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={overlay}
                  onChange={(e) => handleOverlayChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>0% (투명)</span>
                  <span>100% (불투명)</span>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-3 p-3 bg-black rounded" style={{ opacity: overlay }}>
                <p className="text-white text-xs text-center">
                  오버레이 미리보기
                </p>
              </div>
            </div>
          </CollapsibleSection>

          {/* Background Controls Section */}
          <CollapsibleSection
            title="🖼️ 배경 설정"
            isOpen={openSections.background}
            onToggle={() => toggleSection('background')}
            disabled={isDisabled}
          >
            {background && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    배경 타입
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {BACKGROUND_TYPES.map((bgType) => (
                      <button
                        key={bgType}
                        onClick={() => handleBackgroundTypeChange(bgType)}
                        className={`
                          px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all
                          ${
                            background.type === bgType
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }
                        `}
                      >
                        {bgType === 'image'
                          ? '이미지'
                          : bgType === 'gradient'
                            ? '그래디언트'
                            : '단색'}
                      </button>
                    ))}
                  </div>
                </div>

                {background.type === 'image' && background.src && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      배경 이미지
                    </label>
                    <div className="w-full h-24 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={background.src}
                        alt="Background"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {background.type === 'solid' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      색상 (팔레트 사용)
                    </label>
                    <p className="text-xs text-gray-500">
                      위의 색상 팔레트에서 배경색을 선택하세요.
                    </p>
                  </div>
                )}

                {background.type === 'gradient' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      그래디언트
                    </label>
                    <p className="text-xs text-gray-500">
                      위의 색상 팔레트에서 시작/끝 색상을 선택하세요.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CollapsibleSection>
        </div>

        {/* Footer */}
        {isDisabled && (
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500 text-center">
              카드를 선택하면 스타일을 편집할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    );
  }
);

StylePanel.displayName = 'StylePanel';

export default StylePanel;

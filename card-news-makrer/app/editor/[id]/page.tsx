/**
 * Canvas Editor Main Page
 * URL: /editor/[id]
 *
 * Layout: Header | CardList | CardCanvas | StylePanel | Footer
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCardSpecById } from '@/lib/api';
import { useCardStore, useSelectedCard } from '@/stores/useCardStore';
import { CardList } from '@/components/CardList';
import CardCanvas from '@/components/CardCanvas';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ============================================================================
// Component
// ============================================================================

export default function EditorPage() {
  const params = useParams();
  const specId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  const loadSpec = useCardStore((state) => state.loadSpec);
  const selectedCard = useSelectedCard();

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

  // Handle text click
  const handleTextClick = (fieldName: string) => {
    setEditingField(fieldName);
  };

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="max-w-md p-8 bg-white rounded-lg shadow">
          <h1 className="text-xl font-semibold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <Header specId={specId} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Card List */}
        <CardList />

        {/* Center - Canvas */}
        <div className="flex-1 flex items-center justify-center overflow-auto bg-white">
          <div className="p-8 max-w-2xl w-full">
            {selectedCard ? (
              <div className="space-y-4">
                {/* Card Info */}
                <div className="text-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedCard.text?.headline || 'Untitled'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Card {selectedCard.index} • {selectedCard.role}
                  </p>
                </div>

                {/* Canvas */}
                <CardCanvas
                  card={selectedCard}
                  onTextClick={handleTextClick}
                />

                {/* Info */}
                <div className="grid grid-cols-3 gap-4 text-xs text-gray-600 text-center mt-6">
                  <div>
                    <p className="font-semibold">Headline</p>
                    <p>
                      {selectedCard.text?.headline?.length || 0}/15 chars
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">Body</p>
                    <p>
                      {selectedCard.text?.body?.length || 0}/50 chars
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">Layout</p>
                    <p>{selectedCard.style?.layout || 'center'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500">Select a card to begin editing</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Style Panel (Placeholder) */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Style Panel</h3>
            <div className="space-y-4">
              {selectedCard && (
                <>
                  {/* Color Palette */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase">
                      Color Palette
                    </label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded border border-gray-300"
                          style={{
                            backgroundColor:
                              selectedCard.style?.color_palette?.primary ||
                              '#7B9EBD',
                          }}
                        />
                        <span className="text-sm text-gray-600">Primary</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded border border-gray-300"
                          style={{
                            backgroundColor:
                              selectedCard.style?.color_palette?.secondary ||
                              '#B8D4E3',
                          }}
                        />
                        <span className="text-sm text-gray-600">Secondary</span>
                      </div>
                    </div>
                  </div>

                  {/* Font Sizes */}
                  <div className="pt-4 border-t border-gray-200">
                    <label className="text-xs font-semibold text-gray-700 uppercase">
                      Font Sizes
                    </label>
                    <div className="mt-2 space-y-2">
                      <div>
                        <span className="text-xs text-gray-600">Headline</span>
                        <p className="text-sm font-semibold">
                          {selectedCard.style?.font?.headline_size || 36}px
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">Body</span>
                        <p className="text-sm font-semibold">
                          {selectedCard.style?.font?.body_size || 18}px
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Layout */}
                  <div className="pt-4 border-t border-gray-200">
                    <label className="text-xs font-semibold text-gray-700 uppercase">
                      Layout
                    </label>
                    <p className="text-sm mt-2 capitalize">
                      {selectedCard.style?.layout || 'center'}
                    </p>
                  </div>

                  {/* Overlay Opacity */}
                  <div className="pt-4 border-t border-gray-200">
                    <label className="text-xs font-semibold text-gray-700 uppercase">
                      Overlay Opacity
                    </label>
                    <p className="text-sm mt-2">
                      {((selectedCard.background?.overlay_opacity || 0.3) * 100).toFixed(0)}%
                    </p>
                  </div>
                </>
              )}

              <div className="pt-6 border-t border-gray-200 text-xs text-gray-500">
                <p>Style panel is coming soon. More controls will be added.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer specId={specId} />
    </div>
  );
}

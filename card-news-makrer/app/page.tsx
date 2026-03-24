'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllCardSpecs } from '@/lib/api';
import { isAuthenticated } from '@/lib/supabase';
import {
  Plus,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
} from 'lucide-react';
import type { CardSpecRecord, CardSpecStatus } from '@/types';

// ============================================================================
// Types
// ============================================================================

type CardStatus = CardSpecStatus;

interface StatusConfig {
  badge: string;
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
  description: string;
}

// ============================================================================
// Component
// ============================================================================

export default function DashboardPage() {
  const router = useRouter();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specs, setSpecs] = useState<CardSpecRecord[]>([]);
  const [filter, setFilter] = useState<CardStatus | 'all'>('all');

  // =========================================================================
  // Auth Check & Load Specs
  // =========================================================================

  useEffect(() => {
    const initializePage = async () => {
      try {
        // Check authentication
        const authenticated = await isAuthenticated();
        if (!authenticated) {
          router.push('/login');
          return;
        }
        setIsAuthChecking(false);

        // Load card specs
        setIsLoading(true);
        const data = await getAllCardSpecs();
        setSpecs(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load card specs';
        setError(message);
        console.error('[DashboardPage] Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializePage();
  }, [router]);

  // =========================================================================
  // Status Configuration
  // =========================================================================

  const statusConfig: Record<CardStatus, StatusConfig> = {
    draft: {
      badge: '작성중',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      icon: <Clock size={16} />,
      description: '아직 편집 중입니다',
    },
    review: {
      badge: '검토중',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      icon: <AlertCircle size={16} />,
      description: '검토 대기 중입니다',
    },
    approved: {
      badge: '발행대기',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      icon: <CheckCircle size={16} />,
      description: '곧 발행될 예정입니다',
    },
    published: {
      badge: '발행됨',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      icon: <Zap size={16} />,
      description: '이미 발행되었습니다',
    },
  };

  // =========================================================================
  // Filtering & Sorting
  // =========================================================================

  const filteredSpecs =
    filter === 'all'
      ? specs
      : specs.filter((spec) => spec.status === filter);

  const sortedSpecs = [...filteredSpecs].sort((a, b) => {
    // Sort by created_at descending (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // =========================================================================
  // Handlers
  // =========================================================================

  const handleCreateNew = () => {
    // Placeholder: In production, create new spec via API
    alert('Create new spec feature coming soon');
  };

  const handleCardClick = (specId: string) => {
    router.push(`/editor/${specId}`);
  };

  // =========================================================================
  // Render
  // =========================================================================

  // Auth checking
  if (isAuthChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Canvas Editor
              </h1>
              <p className="text-gray-600 mt-1">
                Mental Health Card News - Card Spec 편집 및 승인
              </p>
            </div>

            {/* Create New Button */}
            <button
              onClick={handleCreateNew}
              disabled
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Coming soon"
            >
              <Plus size={20} />
              새 카드 만들기
            </button>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'draft', 'review', 'approved', 'published'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as CardStatus | 'all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {status === 'all'
                  ? '전체'
                  : statusConfig[status as CardStatus].badge}
                {status !== 'all' && (
                  <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                    {specs.filter((s) => s.status === status).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Loading */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4" />
            <p className="text-gray-600">카드 스펙 불러오는 중...</p>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">오류 발생</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && sortedSpecs.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block p-3 bg-gray-100 rounded-lg mb-4">
              <Clock size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'all'
                ? '카드 스펙이 없습니다'
                : '해당 상태의 카드 스펙이 없습니다'}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? '새 카드를 만들거나 생성된 카드를 기다리세요.'
                : '다른 필터를 선택해보세요.'}
            </p>
            <button
              onClick={() => setFilter('all')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              전체 보기
            </button>
          </div>
        )}

        {/* Card Grid */}
        {!isLoading && !error && sortedSpecs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedSpecs.map((spec) => {
              const status = spec.status as CardStatus;
              const config = statusConfig[status];

              return (
                <button
                  key={spec.id}
                  onClick={() => handleCardClick(spec.id)}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-left overflow-hidden border border-gray-200 hover:border-gray-300"
                >
                  {/* Status Badge */}
                  <div className={`${config.bgColor} ${config.textColor} px-4 py-3 flex items-center gap-2`}>
                    {config.icon}
                    <span className="font-semibold text-sm">{config.badge}</span>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Spec ID */}
                    <p className="text-xs text-gray-500 mb-2">{spec.id}</p>

                    {/* Topic */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">
                      {spec.topic}
                    </h3>

                    {/* Card Count */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <span>📇 {spec.spec.cards?.length || 0} cards</span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4">
                      {config.description}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <span className="text-xs text-gray-500">
                        {new Date(spec.created_at).toLocaleDateString('ko-KR')}
                      </span>
                      <ArrowRight
                        size={16}
                        className="text-gray-400 group-hover:text-gray-600 transition-colors"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

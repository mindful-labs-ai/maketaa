'use client';

import { User, Key, LogOut, Trash2, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/lib/shared/useAuthStore';

export default function SettingsPage() {
  const userEmail = useAuthStore(s => s.userEmail);

  return (
    <div>
      {/* Header */}
      <div className='px-6 pt-6 pb-4'>
        <h1 className='text-2xl font-bold text-[--text-primary]'>설정</h1>
        <p className='text-sm text-[--text-secondary] mt-1'>
          계정 정보 및 서비스 사용 현황을 관리하세요.
        </p>
      </div>

      <div className='px-6 pb-6 max-w-3xl'>
      {/* ------------------------------------------------------------------ */}
      {/* 프로필 섹션 */}
      {/* ------------------------------------------------------------------ */}
      <section className='mt-8'>
        <h2 className='text-sm font-semibold text-[--brand-primary] mb-4'>프로필</h2>

        {/* Avatar row */}
        <div className='flex items-center gap-4 mb-6'>
          <div className='flex items-center justify-center w-16 h-16 rounded-full bg-[--surface-2] flex-shrink-0'>
            <User className='w-8 h-8 text-[--text-secondary]' />
          </div>
          <div>
            <p className='text-sm font-medium text-[--text-primary]'>프로필 사진</p>
            <p className='text-xs text-[--text-secondary] mt-0.5'>
              PNG 또는 JPG 형식 (최대 2MB)
            </p>
          </div>
        </div>

        {/* 이름 */}
        <div className='mb-4'>
          <label className='block text-xs text-[--text-secondary] mb-1.5'>이름</label>
          <input
            type='text'
            readOnly
            placeholder='사용자'
            className='w-full px-3 py-2.5 text-sm rounded-lg bg-[--surface-1] border border-[--border-default] text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--brand-primary] transition-colors cursor-default'
          />
        </div>

        {/* 이메일 */}
        <div className='mb-6'>
          <label className='block text-xs text-[--text-secondary] mb-1.5'>이메일</label>
          <input
            type='email'
            readOnly
            value={userEmail}
            placeholder='user@maketaa.ai'
            className='w-full px-3 py-2.5 text-sm rounded-lg bg-[--surface-1] border border-[--border-default] text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--brand-primary] transition-colors cursor-default'
          />
        </div>

        {/* 저장 버튼 */}
        <div className='flex justify-end'>
          <button
            type='button'
            className='px-5 py-2 text-sm font-semibold text-white rounded-lg'
            style={{
              background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
            }}
          >
            저장
          </button>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 사용량 섹션 */}
      {/* ------------------------------------------------------------------ */}
      <section className='mt-10'>
        <h2 className='text-sm font-semibold text-[--brand-primary] mb-4'>사용량</h2>

        <div className='bg-[--surface-2] rounded-xl p-5 space-y-5'>
          {/* 이미지 생성 */}
          <div>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-sm text-[--text-primary]'>이번 달 이미지 생성</span>
              <span className='text-xs text-[--text-secondary]'>0 / 50회</span>
            </div>
            <div className='h-1.5 rounded-full bg-[--surface-3]'>
              <div className='h-1.5 rounded-full bg-[--brand-primary]' style={{ width: '0%' }} />
            </div>
          </div>

          {/* 비디오 생성 */}
          <div>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-sm text-[--text-primary]'>이번 달 비디오 생성</span>
              <span className='text-xs text-[--text-secondary]'>0 / 10회</span>
            </div>
            <div className='h-1.5 rounded-full bg-[--surface-3]'>
              <div className='h-1.5 rounded-full bg-[--brand-primary]' style={{ width: '0%' }} />
            </div>
          </div>

          {/* 저장 공간 */}
          <div>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-sm text-[--text-primary]'>저장 공간</span>
              <span className='text-xs text-[--text-secondary]'>0MB / 1GB</span>
            </div>
            <div className='h-1.5 rounded-full bg-[--surface-3]'>
              <div className='h-1.5 rounded-full bg-[--brand-primary]' style={{ width: '0%' }} />
            </div>
          </div>
        </div>

        {/* 업그레이드 버튼 */}
        <div className='flex justify-end mt-4'>
          <button
            type='button'
            className='px-5 py-2 text-sm font-semibold rounded-lg bg-[--accent-subtle] text-[--brand-primary]'
          >
            업그레이드
          </button>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 계정 섹션 */}
      {/* ------------------------------------------------------------------ */}
      <section className='mt-10'>
        <h2 className='text-sm font-semibold text-[--brand-primary] mb-4'>계정</h2>

        {/* 비밀번호 변경 */}
        <button
          type='button'
          className='w-full flex items-center justify-between px-4 py-3.5 rounded-lg bg-[--surface-1] border border-[--border-default] hover:bg-[--surface-2] transition-colors'
        >
          <div className='flex items-center gap-3'>
            <Key className='w-4 h-4 text-[--text-secondary]' />
            <span className='text-sm text-[--text-primary]'>비밀번호 변경</span>
          </div>
          <ChevronRight className='w-4 h-4 text-[--text-secondary]' />
        </button>

        {/* 로그아웃 */}
        <div className='flex items-center justify-between mt-3 px-4 py-3.5 rounded-lg bg-[--surface-1] border border-[--border-default]'>
          <div className='flex items-center gap-3'>
            <LogOut className='w-4 h-4 text-[--text-secondary]' />
            <div>
              <p className='text-sm text-[--text-primary]'>로그아웃</p>
              <p className='text-xs text-[--text-secondary] mt-0.5'>
                현재 장치에서 세션을 종료합니다.
              </p>
            </div>
          </div>
          <button
            type='button'
            className='px-4 py-1.5 text-sm font-medium rounded-lg border border-[--border-default] text-[--text-primary] hover:bg-[--surface-2] transition-colors'
          >
            로그아웃
          </button>
        </div>

        {/* 계정 삭제 - 위험 영역 */}
        <div className='mt-4 flex items-center justify-between px-4 py-3.5 rounded-lg bg-[--surface-2] border border-[--error]'>
          <div>
            <p className='text-sm font-medium text-[--text-primary]'>계정 삭제</p>
            <p className='text-xs text-[--text-secondary] mt-0.5'>
              삭제된 계정 데이터는 복구할 수 없습니다.
            </p>
          </div>
          <button
            type='button'
            className='flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg border border-[--error] text-[--error] hover:bg-[--error]/10 transition-colors'
          >
            <Trash2 className='w-3.5 h-3.5' />
            영구 삭제
          </button>
        </div>
      </section>
      </div>
    </div>
  );
}

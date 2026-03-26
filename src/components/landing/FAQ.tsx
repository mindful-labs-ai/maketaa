'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: '마케타는 어떤 서비스인가요?',
    a: '마케타는 AI 기반 마케팅 콘텐츠 제작 도구입니다. 웹사이트 URL만 입력하면 AI가 비즈니스를 분석하고, 맞춤 마케팅 전략을 설계한 후 숏폼 영상과 카드뉴스를 자동으로 제작해 드립니다.',
  },
  {
    q: '무료로 사용할 수 있나요?',
    a: '회원가입 시 30크레딧이 무료로 제공됩니다. 크레딧으로 AI 전략 분석, 숏폼 영상 제작, 카드뉴스 제작 등 모든 기능을 이용할 수 있습니다. 크레딧 소진 후에는 합리적인 가격의 충전 패키지를 통해 추가 이용이 가능합니다.',
  },
  {
    q: '어떤 유형의 비즈니스에 적합한가요?',
    a: '쇼핑몰, 블로그, 서비스 웹사이트, 프리랜서 포트폴리오 등 웹사이트가 있는 모든 비즈니스에 적합합니다. AI가 업종과 타겟 고객에 맞춰 전략을 자동으로 최적화합니다.',
  },
  {
    q: '콘텐츠 제작에 얼마나 걸리나요?',
    a: 'AI 전략 분석은 약 30초, 카드뉴스 제작은 1~2분, 숏폼 영상 제작은 2~5분 정도 소요됩니다. 디자이너나 영상 편집자 없이도 전문가 수준의 콘텐츠를 빠르게 만들 수 있습니다.',
  },
  {
    q: '만들어진 콘텐츠를 수정할 수 있나요?',
    a: '물론입니다. AI가 생성한 스크립트, 카드뉴스 텍스트, 이미지 배치 등을 자유롭게 편집할 수 있습니다. AI의 초안을 기반으로 원하는 방향으로 커스터마이징하세요.',
  },
  {
    q: 'SNS에 바로 활용할 수 있나요?',
    a: '네, 마케타에서 제작된 콘텐츠는 인스타그램, 유튜브 쇼츠, 틱톡 등 주요 SNS 플랫폼에 최적화된 사이즈로 제공됩니다. 다운로드 후 바로 업로드할 수 있습니다.',
  },
  {
    q: '내 데이터는 안전한가요?',
    a: '마케타는 입력된 URL의 공개 정보만 분석하며, 비공개 데이터에는 접근하지 않습니다. 모든 데이터는 암호화되어 전송·저장되며, 사용자의 동의 없이 제3자에게 공유되지 않습니다.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className='px-6 py-20 md:px-12' style={{ background: 'var(--surface-0)' }}>
      <div className='max-w-3xl mx-auto'>
        <div className='text-center mb-14'>
          <h2
            className='text-2xl md:text-3xl font-bold mb-3'
            style={{ color: 'var(--text-primary)' }}
          >
            자주 묻는 질문
          </h2>
          <p className='text-base' style={{ color: 'var(--text-secondary)' }}>
            마케타에 대해 궁금한 점을 확인하세요
          </p>
        </div>

        <div className='flex flex-col gap-3'>
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className='rounded-xl overflow-hidden transition-colors'
                style={{
                  background: isOpen ? 'var(--surface-2)' : 'var(--surface-1)',
                  border: `1px solid ${isOpen ? 'var(--border-default)' : 'var(--border-subtle)'}`,
                }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                  className='w-full flex items-center justify-between gap-4 px-5 py-4 text-left'
                >
                  <span
                    className='text-sm font-semibold'
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {item.q}
                  </span>
                  <ChevronDown
                    className='w-4 h-4 shrink-0 transition-transform duration-200'
                    style={{
                      color: 'var(--text-tertiary)',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>
                {isOpen && (
                  <div id={`faq-answer-${i}`} className='px-5 pb-4'>
                    <p
                      className='text-sm leading-relaxed'
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

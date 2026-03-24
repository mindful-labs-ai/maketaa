# Canvas Editor MVP

멘탈헬스 카드뉴스 시스템의 핵심 인터페이스 - 카드뉴스 스펙을 시각화하고 편집할 수 있는 Next.js 기반 웹 애플리케이션입니다.

## 🚀 빠른 시작

### 전제 조건

- Node.js 18+
- npm 또는 yarn
- Supabase 프로젝트

### 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.local.example .env.local
# .env.local을 편집하여 Supabase 자격증명 입력

# 데이터베이스 마이그레이션 실행
npm run db:migrate

# 개발 서버 시작
npm run dev
```

개발 서버가 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

## 📋 주요 기능

- **카드뉴스 미리보기**: 1080×1080 Fabric.js 캔버스에서 실시간 렌더링
- **텍스트 인라인 편집**: 클릭하여 헤드라인, 본문, 보조 텍스트 수정
- **카드 순서 변경**: 드래그앤드롭으로 카드 순서 재정렬
- **스타일 조정**: 색상 팔레트, 폰트 크기, 레이아웃, 오버레이 투명도 제어
- **자동 저장**: 1초 디바운스로 Supabase에 자동 저장
- **편집 이력**: 모든 변경사항이 edit_logs 테이블에 기록
- **승인/반려**: 카드뉴스를 승인하여 SNS 발행 트리거 또는 반려

## 📁 프로젝트 구조

자세한 구조는 [ARCHITECTURE.md](./ARCHITECTURE.md)를 참조하세요.

```
canvas_editor/
├── src/
│   ├── app/              # Next.js App Router 페이지
│   ├── components/       # React 컴포넌트
│   ├── lib/              # 유틸리티 및 API
│   └── stores/           # Zustand 상태 관리
├── supabase/             # 데이터베이스 마이그레이션
└── public/               # 정적 자산
```

## 🛠️ 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Canvas**: Fabric.js 6
- **Styling**: Tailwind CSS 3
- **State Management**: Zustand
- **Drag & Drop**: dnd-kit
- **Database**: Supabase (PostgreSQL)
- **UI Components**: shadcn/ui

## 📝 주요 파일

| 파일 | 설명 |
|------|------|
| `/lib/supabase.ts` | Supabase 클라이언트 및 타입 정의 |
| `/lib/api.ts` | CRUD 함수 및 API 레이어 |
| `/stores/useCardStore.ts` | Zustand 글로벌 상태 스토어 |
| `/components/CardCanvas.tsx` | 카드 렌더링 캔버스 |
| `/components/CardList.tsx` | 카드 리스트 사이드바 |
| `/app/editor/[id]/page.tsx` | 메인 에디터 페이지 |

## 🔧 환경 변수

필수 환경 변수:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 📚 개발 가이드

### 상태 관리

Zustand 스토어를 사용하여 전역 상태를 관리합니다:

```typescript
import { useCardStore } from '@/stores/useCardStore';

export function MyComponent() {
  const cardSpec = useCardStore((state) => state.cardSpec);
  const updateCardText = useCardStore((state) => state.updateCardText);

  return (
    <button onClick={() => updateCardText(0, 'headline', 'New text')}>
      Update
    </button>
  );
}
```

### API 호출

API 레이어는 Supabase 클라이언트를 감싸서 사용하기 쉽게 만듭니다:

```typescript
import { getCardSpecById, updateCardSpec } from '@/lib/api';

const spec = await getCardSpecById('2026-03-09-001');
await updateCardSpec('2026-03-09-001', { /* updates */ });
```

### 캔버스 렌더링

CardCanvas 컴포넌트는 Fabric.js를 사용하여 카드를 렌더링합니다:

```typescript
<CardCanvas
  card={card}
  onTextClick={(fieldName) => console.log('Edit:', fieldName)}
/>
```

## 🚢 배포

### Vercel에 배포

```bash
# GitHub에 푸시
git push origin main

# Vercel 자동 배포 (GitHub 연결 필요)
# 환경 변수 설정: Vercel Dashboard > Settings > Environment Variables
```

## 📊 성능 최적화

- **동적 import**: Fabric.js는 클라이언트 사이드에서만 로드
- **이미지 최적화**: Next.js Image 컴포넌트 사용
- **번들 크기**: Tree-shaking으로 불필요한 코드 제거
- **캐싱**: SWR/React Query로 API 캐싱

## 🐛 디버깅

```bash
# 타입 검사
npm run type-check

# 린트
npm run lint

# 포맷팅
npm run format
```

## 📖 추가 문서

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 상세 아키텍처 가이드
- [API.md](./docs/API.md) - API 엔드포인트 문서
- [STATE_MANAGEMENT.md](./docs/STATE_MANAGEMENT.md) - Zustand 스토어 가이드

## 🤝 기여

1. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
2. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
3. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
4. Pull Request 생성

## 📄 라이선스

Private project - All rights reserved

## 👥 팀

- **Product Engineer**: AGENT 0-E
- **Product Designer**: AGENT 0-D
- **Project Manager**: PM Agent

---

**마지막 업데이트**: 2026-03-09

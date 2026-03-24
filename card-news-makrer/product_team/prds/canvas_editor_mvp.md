# PRD: 캔버스 에디터 MVP

_작성자: PM Agent | 작성일: 2026-03-09_
_문서 ID: PRD-001 | 우선순위: P0_

---

## 배경 & 문제 정의

콘텐츠 제작 파이프라인(AGENT 1~7)이 생성하는 최종 산출물은 `card_spec.json`이다. 그러나 현재 이 JSON을 시각적으로 확인하고, 편집하고, 승인할 수 있는 도구가 없다.

운영자가 JSON 파일을 직접 열어 내용을 판단하는 것은 비현실적이며, 에이전트 개발 과정에서도 각 에이전트의 출력물이 실제 카드에서 어떻게 보이는지 검증할 방법이 필요하다.

캔버스 에디터는 전체 시스템의 **핵심 인터페이스**로서, 이것이 없으면 파이프라인 전체가 블랙박스 상태로 남게 된다.

---

## 목표

1. `card_spec.json`을 로드하여 카드뉴스를 시각적으로 미리보기할 수 있다
2. 운영자가 텍스트, 배경, 카드 순서를 직접 편집할 수 있다
3. 편집 완료 후 [승인] 버튼으로 발행 플로우를 트리거할 수 있다
4. 모든 편집 이력이 기록되어 에이전트 품질 개선에 활용된다

---

## 범위

### In Scope (MVP)

- card_spec.json 로드 및 1080×1080 카드 렌더링
- 카드 리스트(썸네일) 사이드바
- 텍스트 인라인 편집 (클릭 → 수정 → 저장)
- 배경 이미지 표시 (URL 기반)
- 배경 오버레이 투명도 조절
- 카드 순서 변경 (드래그앤드롭)
- 스타일 패널 (컬러, 폰트 크기 조절)
- 승인/반려 버튼
- card_spec.json 자동 저장 (Supabase)
- 편집 이력 로깅
- 반응형 레이아웃 (데스크톱 우선, 태블릿 대응)

### Out of Scope (추후)

- 이미지 직접 업로드 / 드래그앤드롭 교체
- 실시간 협업 (멀티 유저)
- 이미지 내 그래픽 요소 편집 (도형, 아이콘)
- SNS 미리보기 (인스타그램/스레드 시뮬레이션)
- 히스토리 기반 Undo/Redo (Ctrl+Z)
- 오프라인 모드
- PNG/JPG 최종 익스포트 (서버 사이드 렌더링으로 별도 구현)

---

## 기술 스택

| 영역 | 기술 | 선정 이유 |
|------|------|-----------|
| **Framework** | Next.js 14 (App Router) | React 기반, SSR/SSG 지원, API Routes 내장, 빠른 개발 |
| **Canvas** | Fabric.js 6 | 카드 위 텍스트/이미지 조작에 최적화, 풍부한 API |
| **스타일링** | Tailwind CSS 3 | 디자인 토큰과 연동 용이, 빠른 UI 구축 |
| **UI 컴포넌트** | shadcn/ui | 고품질 접근성 기반 컴포넌트, Tailwind 네이티브 |
| **상태관리** | Zustand | 가벼운 전역 상태, card_spec 데이터 관리에 적합 |
| **드래그앤드롭** | dnd-kit | 카드 순서 변경용, 접근성 지원 |
| **Backend / DB** | Supabase | PostgreSQL + Auth + Storage + Realtime 올인원 |
| **배포** | Vercel | Next.js 최적 배포, 프리뷰 환경 자동 생성 |
| **아이콘** | Lucide React | 경량, 일관된 디자인 |

### Supabase 테이블 설계

```sql
-- card_specs: 카드뉴스 스펙 저장
CREATE TABLE card_specs (
  id TEXT PRIMARY KEY,                    -- "2026-03-09-001"
  topic TEXT NOT NULL,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','review','approved','published')),
  spec JSONB NOT NULL,                    -- card_spec.json 전체
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- edit_logs: 편집 이력 (에이전트 품질 개선 데이터)
CREATE TABLE edit_logs (
  id BIGSERIAL PRIMARY KEY,
  spec_id TEXT REFERENCES card_specs(id),
  editor TEXT NOT NULL,                   -- "human" | agent_id
  field_path TEXT NOT NULL,               -- "cards[2].text.headline"
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- publish_reports: 발행 보고서
CREATE TABLE publish_reports (
  id BIGSERIAL PRIMARY KEY,
  spec_id TEXT REFERENCES card_specs(id),
  platform TEXT NOT NULL,                 -- "instagram" | "threads"
  post_url TEXT,
  post_id TEXT,
  status TEXT DEFAULT 'pending',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Supabase Storage 버킷

```
cardnews-assets/
  └── {spec_id}/
      ├── card_1_bg.png
      ├── card_2_bg.png
      └── ...
```

---

## 사용자 스토리

### 핵심 플로우

- **US-01**: AS A 운영자, I WANT TO 파이프라인이 생성한 카드뉴스를 시각적으로 미리보기, SO THAT JSON을 읽지 않고도 결과를 판단할 수 있다
- **US-02**: AS A 운영자, I WANT TO 카드의 텍스트를 직접 클릭하여 수정, SO THAT 에이전트의 카피를 빠르게 개선할 수 있다
- **US-03**: AS A 운영자, I WANT TO 카드 순서를 드래그로 변경, SO THAT 최적의 스토리 흐름을 만들 수 있다
- **US-04**: AS A 운영자, I WANT TO [승인] 버튼 한 번으로 SNS 발행을 트리거, SO THAT 최소한의 개입으로 콘텐츠를 발행할 수 있다
- **US-05**: AS A 운영자, I WANT TO 내가 수정한 내용이 자동 저장되고 이력이 남도록, SO THAT 에이전트 품질 개선에 피드백을 줄 수 있다

### 에이전트 연동

- **US-06**: AS A 오케스트레이터, I WANT TO card_spec.json을 API로 캔버스 에디터에 로드, SO THAT 파이프라인 완료 후 자동으로 편집 화면이 준비된다
- **US-07**: AS A QA 에디터, I WANT TO 검수 결과를 캔버스에 표시 (경고 배지), SO THAT 운영자가 문제 카드를 즉시 식별할 수 있다

---

## 화면 구성

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: 주제명  │  상태 배지(draft)  │  [반려]  [✅ 승인 & 발행] │
├──────────┬───────────────────────────────┬──────────────────────┤
│          │                               │                      │
│  카드    │                               │   스타일 패널         │
│  리스트  │     카드 캔버스 (1080×1080)    │                      │
│          │                               │   - 컬러 팔레트      │
│  [1] 표지│     ┌─────────────────┐      │   - 폰트 크기        │
│  [2] 공감│     │  헤드라인 텍스트  │      │   - 레이아웃         │
│  [3] 원인│     │                 │      │   - 오버레이 투명도   │
│  [4] ... │     │  본문 텍스트     │      │                      │
│          │     │                 │      │   SNS 캡션 편집       │
│  드래그  │     └─────────────────┘      │   - 인스타그램        │
│  정렬    │                               │   - 스레드            │
│          │     배경 이미지                │                      │
│          │                               │                      │
├──────────┴───────────────────────────────┴──────────────────────┤
│  Footer: 자동저장 상태  │  편집 횟수 표시  │  card_spec.json 버전  │
└─────────────────────────────────────────────────────────────────┘
```

### 레이아웃 비율

- 카드 리스트 사이드바: **200px** (고정)
- 카드 캔버스 (중앙): **flex-1** (가변, 최소 600px)
- 스타일 패널 (우측): **320px** (고정, 접기 가능)

---

## 인수 조건 (Acceptance Criteria)

### 필수 (MVP)

- [ ] **AC-01**: card_spec.json을 API로 로드하면 1080×1080 캔버스에 카드가 렌더링된다
- [ ] **AC-02**: 좌측 카드 리스트에서 카드를 클릭하면 캔버스에 해당 카드가 표시된다
- [ ] **AC-03**: 캔버스 위 텍스트(headline, body, sub_text)를 클릭하면 인라인 편집이 가능하다
- [ ] **AC-04**: 텍스트 수정 시 글자 수 제한이 실시간으로 표시된다 (headline 15자, body 50자)
- [ ] **AC-05**: 카드 리스트에서 드래그앤드롭으로 카드 순서를 변경할 수 있다
- [ ] **AC-06**: 우측 패널에서 컬러, 폰트 크기, 레이아웃, 오버레이 투명도를 변경할 수 있다
- [ ] **AC-07**: 모든 편집은 자동으로 Supabase에 저장된다 (디바운스 1초)
- [ ] **AC-08**: [승인] 버튼 클릭 시 status가 "approved"로 변경되고 발행 API가 호출된다
- [ ] **AC-09**: [반려] 버튼 클릭 시 반려 사유 입력 모달이 표시되고 status가 "draft"로 변경된다
- [ ] **AC-10**: 편집 이력(edit_logs)이 Supabase에 자동 기록된다

### 품질

- [ ] **AC-11**: 카드 렌더링이 실제 인스타그램 1080×1080 출력과 일치한다
- [ ] **AC-12**: 페이지 로드 시간 3초 이내 (card_spec 로드 + 첫 렌더링)
- [ ] **AC-13**: Lighthouse 접근성 점수 90점 이상

---

## 디자이너 요청 태스크

| ID | 태스크 | 산출물 | 우선순위 |
|----|--------|--------|----------|
| **T-D01** | 캔버스 에디터 전체 레이아웃 UX 플로우 설계 | UX 플로우 다이어그램 | P0 |
| **T-D02** | 카드 리스트 사이드바 컴포넌트 명세 | UI 명세서 | P0 |
| **T-D03** | 카드 캔버스 영역 렌더링 규칙 정의 | 레이아웃 가이드 | P0 |
| **T-D04** | 텍스트 인라인 편집 인터랙션 명세 | 인터랙션 가이드 | P0 |
| **T-D05** | 스타일 패널 컴포넌트 명세 | UI 명세서 | P1 |
| **T-D06** | 승인/반려 플로우 UX 설계 | UX 플로우 + 모달 명세 | P1 |
| **T-D07** | 반응형 브레이크포인트 정의 | 반응형 가이드 | P2 |

---

## 엔지니어 요청 태스크

| ID | 태스크 | 산출물 | 우선순위 |
|----|--------|--------|----------|
| **T-E01** | Next.js 프로젝트 초기 셋업 (App Router + Tailwind + shadcn) | 프로젝트 보일러플레이트 | P0 |
| **T-E02** | Supabase 프로젝트 생성 + 테이블/스토리지 셋업 | DB 스키마 + 마이그레이션 | P0 |
| **T-E03** | card_spec CRUD API 구현 (Supabase client) | API 레이어 | P0 |
| **T-E04** | Fabric.js 캔버스 컴포넌트 — card_spec 기반 렌더링 | CardCanvas.tsx | P0 |
| **T-E05** | 카드 리스트 사이드바 + 카드 선택 | CardList.tsx | P0 |
| **T-E06** | 텍스트 인라인 편집 (Fabric.js IText) | 편집 로직 | P0 |
| **T-E07** | Zustand 스토어 설계 (card_spec 상태 + 자동저장) | useCardStore.ts | P0 |
| **T-E08** | 스타일 패널 구현 (컬러/폰트/레이아웃/오버레이) | StylePanel.tsx | P1 |
| **T-E09** | dnd-kit 카드 순서 변경 | 드래그앤드롭 로직 | P1 |
| **T-E10** | 승인/반려 API + UI 연동 | ApprovalFlow.tsx | P1 |
| **T-E11** | 편집 이력 로깅 (edit_logs 테이블) | 로깅 미들웨어 | P1 |
| **T-E12** | Vercel 배포 + 환경변수 설정 | 배포 파이프라인 | P1 |

---

## 구현 순서 (스프린트 계획)

### Sprint 1 (Day 1~3): 기초 + 렌더링

```
T-E01 → T-E02 → T-E07 → T-E04 → T-E05
Next.js 셋업 → Supabase 셋업 → 상태관리 → 캔버스 렌더링 → 카드 리스트
```

**Sprint 1 완료 기준**: card_spec.json을 로드하여 카드를 시각적으로 볼 수 있다

### Sprint 2 (Day 4~6): 편집 기능

```
T-D01~D04 병행 → T-E06 → T-E03 → T-E08
디자인 명세 → 텍스트 편집 → API 연동 → 스타일 패널
```

**Sprint 2 완료 기준**: 텍스트 편집 + 스타일 변경이 동작하고 Supabase에 저장된다

### Sprint 3 (Day 7~9): 완성 + 배포

```
T-E09 → T-E10 → T-E11 → T-E12
카드 정렬 → 승인 플로우 → 편집 로깅 → 배포
```

**Sprint 3 완료 기준**: 전체 MVP가 동작하며 Vercel에 배포되어 접근 가능하다

---

## 리스크 & 대응

| 리스크 | 영향 | 대응 방안 |
|--------|------|-----------|
| Fabric.js와 Next.js SSR 충돌 | 렌더링 에러 | dynamic import로 클라이언트 전용 로드 |
| 1080×1080 캔버스 성능 이슈 | 느린 편집 | 캔버스를 CSS scale로 축소 표시, 내부는 원본 크기 유지 |
| Supabase 무료 티어 제한 | 스토리지 초과 | 이미지 최적화 + 오래된 에셋 자동 정리 |
| 폰트 로드 실패 (Pretendard) | 텍스트 깨짐 | 웹폰트 프리로드 + 시스템 폰트 폴백 |

---

## 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| 페이지 로드 시간 | 3초 이내 | Lighthouse, Vercel Analytics |
| 편집 → 저장 지연 | 2초 이내 | 자동저장 디바운스 로그 |
| 수정 없이 바로 승인률 | 50% 이상 | edit_logs 카운트 / 전체 승인 수 |
| 평균 편집 소요 시간 | 10분 이내 | approved_at - loaded_at |

---

## 참고 자료

- [card_spec.schema.json](/schemas/card_spec.schema.json)
- [디자인 시스템 토큰](/product_team/design_system/tokens.yaml)
- [프로젝트 문서 v3](/cardnews_agent_project_v3.md)
- [샘플 card_spec](/output/sample/card_spec.json)

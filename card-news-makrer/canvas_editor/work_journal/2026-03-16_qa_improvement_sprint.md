# QA & UX 개선 스프린트 계획서

> 날짜: 2026-03-16
> 목표: 카드뉴스 에디터의 핵심 UX 문제 해결 및 Canva 수준의 편집 경험 구현

---

## 1. 현황 분석

### 발견된 핵심 문제점

| # | 문제 | 심각도 | 영향 |
|---|------|--------|------|
| P1 | 에디터에서 StylePanel 컴포넌트 미사용 (인라인 읽기 전용 패널 하드코딩) | Critical | 스타일 편집 완전 불가 |
| P2 | 텍스트 편집 UI 미구현 (handleTextClick이 상태만 설정) | Critical | 카드 텍스트 수정 불가 |
| P3 | 캔버스 텍스트 selectable: false → 클릭 이벤트 미작동 | Critical | 텍스트 인터랙션 불가 |
| P4 | Fabric.js v6 API 불일치 (Image.fromURL이 Promise 기반) | Critical | 배경 이미지 로딩 실패 |
| P5 | 컬러 피커 미작동 (readOnly input, 실제 picker 없음) | High | 색상 변경 불가 |
| P6 | 카드 사이드바에 비주얼 미리보기 없음 (텍스트만 표시) | High | 카드 확인 어려움 |
| P7 | 캔버스 반응형 스케일링 미흡 | Medium | 레이아웃 깨짐 |
| P8 | 텍스트 줄바꿈/오버플로우 미처리 | Medium | 긴 텍스트 잘림 |

### 벤치마크 (Canva 참고 UX 패턴)

- **즉시 편집**: 캔버스 텍스트 더블클릭 → 인라인 편집
- **실시간 미리보기**: 사이드바에 카드 축소 미리보기
- **직관적 스타일링**: 컬러 피커, 슬라이더, 프리셋
- **카드 네비게이션**: 좌우 화살표 키, 카드 간 빠른 전환

---

## 2. 스프린트 태스크 (우선순위순)

### Phase A: Critical Bug Fix (기반 수정)

**Task 1: Fabric.js v6 API 호환성 수정** `[debugger]`
- `Image.fromURL` 콜백 → Promise 패턴 변환
- 캔버스 렌더링 안정화
- 파일: `components/CardCanvasClient.tsx`

**Task 2: 텍스트 인터랙션 활성화** `[executor]`
- `selectable: false` → `selectable: true` + 커서 스타일
- 텍스트 클릭/더블클릭 이벤트 바인딩
- 파일: `components/CardCanvasClient.tsx`

**Task 3: 에디터 레이아웃에 StylePanel 통합** `[executor]`
- 인라인 하드코딩된 스타일 패널 제거
- 기존 `StylePanel` 컴포넌트 import 및 연결
- 파일: `app/editor/[id]/page.tsx`

### Phase B: Core UX 구현

**Task 4: 텍스트 편집 모달/인라인 에디터 구현** `[designer]`
- 텍스트 클릭 시 편집 모달 표시
- 글자 수 제한 실시간 카운터
- 편집 완료 시 캔버스 즉시 반영
- 파일: `components/TextEditModal.tsx` (신규), `app/editor/[id]/page.tsx`

**Task 5: 컬러 피커 구현** `[designer]`
- readOnly input → 실제 `<input type="color">` + hex 입력
- 프리셋 팔레트 선택 기능
- 실시간 미리보기
- 파일: `components/StylePanel.tsx`

**Task 6: 카드 사이드바 미리보기 개선** `[designer]`
- 텍스트 리스트 → 미니 카드 비주얼 프리뷰
- 배경색/이미지 썸네일 표시
- 선택 카드 하이라이트 강화
- 파일: `components/CardList.tsx`

### Phase C: Polish & Enhancement

**Task 7: 캔버스 반응형 스케일링 및 레이아웃 최적화** `[executor]`
- CSS 기반 캔버스 비율 유지 스케일링
- 에디터 영역 최적 배분 (사이드바/캔버스/패널)
- 파일: `app/editor/[id]/page.tsx`, `components/CardCanvasClient.tsx`

**Task 8: 키보드 네비게이션 및 UX 편의기능** `[executor]`
- 좌/우 화살표 키로 카드 전환
- Esc로 편집 취소
- 자동 저장 상태 토스트 알림
- 파일: `app/editor/[id]/page.tsx`

### Phase D: 검증 및 문서화

**Task 9: 통합 QA 테스트** `[qa-tester]`
- 빌드 성공 확인
- 각 기능 동작 검증
- 크로스 브라우저/반응형 체크

**Task 10: 업무일지 및 문서 업데이트** `[writer]`
- 변경사항 업무일지 작성
- task_board.md 스프린트 기록 갱신
- ARCHITECTURE.md 업데이트

---

## 3. 에이전트 배정

| 에이전트 | 태스크 | 역할 |
|---------|--------|------|
| `debugger` | Task 1 | Fabric.js API 호환성 디버깅 |
| `executor` | Task 2, 3, 7, 8 | 코드 구현 실행 |
| `designer` | Task 4, 5, 6 | UI/UX 설계 및 구현 |
| `qa-tester` | Task 9 | 통합 QA 검증 |
| `writer` | Task 10 | 문서화 |

---

## 4. 실행 순서

```
Phase A (Critical) ─── Task 1 ──┐
                      Task 2 ──┼─→ Phase B (Core UX) ─── Task 4 ──┐
                      Task 3 ──┘                         Task 5 ──┼─→ Phase C ─→ Phase D
                                                         Task 6 ──┘
```

- Phase A: Task 1, 2, 3 병렬 실행
- Phase B: Task 4, 5, 6 병렬 실행 (Phase A 완료 후)
- Phase C: Task 7, 8 순차 실행
- Phase D: Task 9 → Task 10 순차 실행

---

## 5. 실행 결과

### 완료된 태스크

| # | 태스크 | 에이전트 | 상태 |
|---|--------|---------|------|
| 1 | Fabric.js v6 API 호환성 수정 (Image.fromURL Promise 패턴 변환, overlay z-order 수정) | debugger | ✅ 완료 |
| 2 | 텍스트 인터랙션 활성화 + TextEditModal 신규 구현 (selectable 활성화, 편집 모달, 글자수 카운터) | designer | ✅ 완료 |
| 3 | StylePanel 통합 + 컬러피커 개선 (인라인 패널 제거, 네이티브 color input, 프리셋 팔레트) | executor | ✅ 완료 |
| 4 | 카드 사이드바 비주얼 미리보기 (2열 그리드 썸네일, 배경색/이미지 프리뷰, 선택 하이라이트) | designer | ✅ 완료 |
| 5 | 캔버스 반응형 + 키보드 네비게이션 (ArrowLeft/Right 카드 전환, 카드 네비게이션 UI) | executor | ✅ 완료 |
| 6 | 통합 QA 빌드 테스트 + 문서화 | qa/writer | ✅ 완료 |

### 변경된 파일

| 파일 | 변경 유형 |
|------|----------|
| `components/CardCanvasClient.tsx` | 수정 - Fabric.js v6 API, 텍스트 인터랙션 |
| `components/TextEditModal.tsx` | 신규 - 텍스트 편집 모달 |
| `components/StylePanel.tsx` | 수정 - 컬러피커, 프리셋 팔레트 |
| `components/CardList.tsx` | 수정 - 비주얼 미리보기, 2열 그리드 |
| `app/editor/[id]/page.tsx` | 수정 - StylePanel 통합, 키보드 네비게이션, 카드 네비게이션 UI |

### 빌드 결과
- `npm run build`: ✅ 성공
- 타입 에러: 0
- 새로운 린트 경고: 0

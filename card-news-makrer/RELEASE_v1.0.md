# Release v1.0 — Mental Health Card News Maker

_릴리스 날짜: 2026-03-16_

## 개요

멘탈헬스 카드뉴스 자동 생성 시스템의 첫 번째 정식 버전입니다.
캔버스 에디터 MVP와 7개 AI 에이전트 파이프라인이 완성되었습니다.

---

## 포함된 스프린트 (S1~S7)

### Sprint 1 — 기초 셋업 + 캔버스 렌더링 (2026-03-09)
- Next.js + Supabase 프로젝트 초기 셋업
- Fabric.js 캔버스 렌더링 컴포넌트
- 카드 리스트 사이드바 + 카드 선택
- 텍스트 인라인 편집 (IText)
- Zustand 스토어 + 자동 저장
- UX 플로우/컴포넌트 설계 명세

### Sprint 2 — 편집 기능 (2026-03-09)
- 스타일 패널 (폰트, 컬러, 레이아웃)
- 승인/반려 플로우 UX 설계 및 구현
- SNS 편집기

### Sprint 3 — 완성 + 배포 (2026-03-09)
- 반응형 브레이크포인트
- dnd-kit 카드 순서 변경
- 승인/반려 API + UI 연동
- 편집 이력 로깅 (edit_logs)
- Vercel 배포 + 환경변수 설정

### Sprint 4 — 콘텐츠 에이전트 파이프라인 (2026-03-14)
- Claude API 유틸리티 모듈 (`lib/claude_client.py`)
- AGENT 1: ResearcherAgent — 주제 리서치 및 후보 생성
- AGENT 2: StrategistAgent — 주제 선정 + 카드 구성 기획
- AGENT 3: CopywriterAgent — 카드 텍스트 작성
- 오케스트레이터 에이전트 등록
- Phase 1 콘텐츠 파이프라인 PRD

### Sprint 5 — 비주얼 파이프라인 (2026-03-15)
- AGENT 4: DesignDirectorAgent — 디자인 방향 설정
- AGENT 5: ImageGeneratorAgent — 이미지 생성
- 시즌 정보 자동 생성 유틸리티 (`lib/season_utils.py`)
- Phase 2 통합 테스트 (dry-run + E2E)
- Phase 2 비주얼 파이프라인 PRD

### Sprint 6 — QA & 퍼블리싱 (2026-03-15)
- AGENT 6: QAEditorAgent — 품질 검수
- AGENT 7: PublisherAgent — 퍼블리싱
- 전체 파이프라인 구문 검증 (AGENT 1~7)
- Phase 3 통합 테스트 (dry-run 27/27, E2E 46/46)
- Phase 3 QA & 퍼블리싱 PRD

### Sprint 7 — Canvas Editor QA & 단위 테스트 (2026-03-16)
- Fabric.js v6 API 호환성 수정
- 텍스트 인터랙션 + 편집 모달 구현
- StylePanel 통합 + 컬러피커 개선
- 카드 사이드바 비주얼 미리보기
- 캔버스 반응형 + 키보드 네비게이션
- 통합 QA 빌드 테스트 + 문서화
- 에이전트 단위 테스트 (Researcher, Strategist, Copywriter) — 48/48 pass

---

## 완료 통계

| 항목 | 수치 |
|------|------|
| 총 태스크 | 51개 |
| 스프린트 | 7개 (S1~S7) |
| PRD | 4개 (Canvas Editor MVP, Phase 1/2/3) |
| AI 에이전트 | 7개 (Researcher → Publisher) |
| 단위 테스트 | 48개 (3개 에이전트) |
| 통합 테스트 | dry-run 27/27, E2E 46/46 |
| 캔버스 에디터 | Vercel 배포 완료 |

## 주요 산출물

### 캔버스 에디터 (`canvas_editor/`)
- Next.js 14 + Fabric.js v6 기반 카드뉴스 편집기
- Supabase 인증/DB/스토리지 연동
- 카드 CRUD, 스타일 편집, 승인/반려 워크플로우
- Vercel 배포

### AI 에이전트 파이프라인 (`agents/`)
| 순서 | 에이전트 | 역할 |
|------|----------|------|
| 1 | Researcher | 멘탈헬스 주제 리서치 + 후보 3~5개 생성 |
| 2 | Strategist | 최적 주제 선정 + 페르소나/카드 구성 기획 |
| 3 | Copywriter | 카드별 텍스트 작성 (headline/body/sub_text) |
| 4 | DesignDirector | 디자인 방향 설정 (컬러/폰트/레이아웃) |
| 5 | ImageGenerator | 배경 이미지 생성 |
| 6 | QAEditor | 텍스트/디자인 품질 검수 |
| 7 | Publisher | 최종 card_spec 완성 + 퍼블리싱 |

### 공통 라이브러리 (`lib/`)
- `base_agent.py` — BaseAgent, AgentCall, AgentResult, AgentRegistry
- `claude_client.py` — Claude API 클라이언트 (재시도, JSON 모드)
- `season_utils.py` — 날짜 기반 시즌/이벤트 정보 생성
- `spec_validator.py` — card_spec 스키마 검증
- `work_journal.py` — 업무 일지 자동 기록

### 테스트 (`tests/`)
- `test_agents_unit.py` — 에이전트 단위 테스트 (48 cases)
- `test_content_pipeline.py` — 파이프라인 통합 테스트 (dry-run / E2E / live)

---

## 다음 버전 (v2.0) 예정 사항

v1.0 이후 새로운 스프린트는 v2.0으로 관리됩니다.

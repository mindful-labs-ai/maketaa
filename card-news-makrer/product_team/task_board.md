# Task Board
_Last updated: 2026-03-16 by Engineer_
_관련 PRD: [canvas_editor_mvp.md](/product_team/prds/canvas_editor_mvp.md), [phase1_content_pipeline.md](/product_team/prds/phase1_content_pipeline.md), [phase2_visual_pipeline.md](/product_team/prds/phase2_visual_pipeline.md), [phase3_qa_publishing.md](/product_team/prds/phase3_qa_publishing.md)_

## Backlog

| ID | 제목 | 담당 | Sprint | 우선순위 | PRD |
|----|------|------|--------|----------|-----|
_없음 — v1.0 모든 태스크 완료_

---

## In Progress

| ID | 제목 | 담당 | Sprint | 우선순위 | PRD |
|----|------|------|--------|----------|-----|
_없음_

---

## Done

| ID | 제목 | 완료일 | Sprint |
|----|------|--------|--------|
| T-000 | 프로젝트 초기 설정 & 디렉토리 구조 생성 | 2026-03-09 | - |
| T-001 | card_spec.json 스키마 정의 | 2026-03-09 | - |
| PRD-001 | 캔버스 에디터 MVP PRD 작성 | 2026-03-09 | - |
| T-D01 | 캔버스 에디터 전체 레이아웃 UX 플로우 설계 | 2026-03-09 | S1 |
| T-D02 | 카드 리스트 사이드바 컴포넌트 명세 | 2026-03-09 | S1 |
| T-D03 | 카드 캔버스 영역 렌더링 규칙 정의 | 2026-03-09 | S1 |
| T-D04 | 텍스트 인라인 편집 인터랙션 명세 | 2026-03-09 | S1 |
| T-E01 | Next.js 프로젝트 초기 셋업 | 2026-03-09 | S1 |
| T-E02 | Supabase 프로젝트 생성 + 테이블/스토리지 | 2026-03-09 | S1 |
| T-E03 | card_spec CRUD API 구현 (Supabase client) | 2026-03-09 | S1 |
| T-E04 | Fabric.js 캔버스 컴포넌트 — 렌더링 | 2026-03-09 | S1 |
| T-E05 | 카드 리스트 사이드바 + 카드 선택 | 2026-03-09 | S1 |
| T-E06 | 텍스트 인라인 편집 (Fabric.js IText) | 2026-03-09 | S1 |
| T-E07 | Zustand 스토어 설계 + 자동저장 | 2026-03-09 | S1 |
| T-D05 | 스타일 패널 컴포넌트 명세 | 2026-03-09 | S2 |
| T-D06 | 승인/반려 플로우 UX 설계 | 2026-03-09 | S2 |
| T-E08 | 스타일 패널 + 승인플로우 + SNS편집기 구현 | 2026-03-09 | S2 |
| T-D07 | 반응형 브레이크포인트 정의 | 2026-03-09 | S3 |
| T-E09 | dnd-kit 카드 순서 변경 개선 | 2026-03-09 | S3 |
| T-E10 | 승인/반려 API + UI 연동 | 2026-03-09 | S3 |
| T-E11 | 편집 이력 로깅 (edit_logs) | 2026-03-09 | S3 |
| T-E12 | Vercel 배포 + 환경변수 설정 | 2026-03-09 | S3 |
| PRD-002 | Phase 1 콘텐츠 파이프라인 PRD 작성 | 2026-03-14 | S4 |
| T-E13 | Claude API 유틸리티 모듈 (`lib/claude_client.py`) | 2026-03-14 | S4 |
| T-E14 | ResearcherAgent 구현 (`agents/content_team/researcher.py`) | 2026-03-14 | S4 |
| T-E15 | StrategistAgent 구현 (`agents/content_team/strategist.py`) | 2026-03-14 | S4 |
| T-E16 | CopywriterAgent 구현 (`agents/content_team/copywriter.py`) | 2026-03-14 | S4 |
| T-E17 | 오케스트레이터 에이전트 등록 코드 추가 | 2026-03-14 | S4 |
| T-PM04 | Phase 2 비주얼 파이프라인 PRD 작성 | 2026-03-15 | S5 |
| T-PM05 | Task Board 업데이트 (Sprint 5 반영) | 2026-03-15 | S5 |
| T-E19 | 파이프라인 통합 테스트 (E2E) | 2026-03-15 | S5 |
| T-E20 | 시즌 정보 자동 생성 유틸리티 (`lib/season_utils.py`) | 2026-03-15 | S5 |
| T-E21 | DesignDirectorAgent 구현 (`agents/content_team/04_design_director.py`) | 2026-03-15 | S5 |
| T-E22 | ImageGeneratorAgent 구현 (`agents/content_team/05_image_generator.py`) | 2026-03-15 | S5 |
| T-E23 | 오케스트레이터 Phase 2 에이전트 등록 | 2026-03-15 | S5 |
| T-E24 | Phase 2 통합 테스트 (dry-run + E2E) | 2026-03-15 | S5 |
| T-PM06 | Phase 3 QA & 퍼블리싱 PRD 작성 | 2026-03-15 | S6 |
| T-PM07 | Task Board 업데이트 (Sprint 6 반영) | 2026-03-15 | S6 |
| T-E25 | QAEditorAgent 구현 (`agents/content_team/06_qa_editor.py`) | 2026-03-15 | S6 |
| T-E26 | PublisherAgent 구현 (`agents/content_team/07_publisher.py`) | 2026-03-15 | S6 |
| T-E27 | 오케스트레이터 Phase 3 에이전트 등록 | 2026-03-15 | S6 |
| T-E28 | Phase 3 통합 테스트 (dry-run 27/27, E2E 46/46) | 2026-03-15 | S6 |
| T-E29 | 전체 파이프라인 구문 검증 (AGENT 1→7) | 2026-03-15 | S6 |
| T-Q01 | Fabric.js v6 API 호환성 수정 | 2026-03-16 | S7 |
| T-Q02 | 텍스트 인터랙션 + 편집 모달 구현 | 2026-03-16 | S7 |
| T-Q03 | StylePanel 통합 + 컬러피커 개선 | 2026-03-16 | S7 |
| T-Q04 | 카드 사이드바 비주얼 미리보기 | 2026-03-16 | S7 |
| T-Q05 | 캔버스 반응형 + 키보드 네비게이션 | 2026-03-16 | S7 |
| T-Q06 | 통합 QA 빌드 테스트 + 문서화 | 2026-03-16 | S7 |
| T-E18 | 에이전트 단위 테스트 작성 (researcher, strategist, copywriter) — 48/48 pass | 2026-03-16 | S7 |

---

## Blocked

_없음_

---

## 완료 통계

| 구분 | 태스크 수 | 상태 |
|------|-----------|------|
| 사전 준비 | 3 | Done |
| Sprint 1 (기초 + 렌더링) | 11 | Done |
| Sprint 2 (편집 기능) | 3 | Done |
| Sprint 3 (완성 + 배포) | 5 | Done |
| Sprint 4 (콘텐츠 에이전트) | 6 | Done |
| Sprint 5 (비주얼 파이프라인) | 9 | Done |
| Sprint 6 (QA & 퍼블리싱) | 7 | Done |
| Sprint 7 (Canvas Editor QA & UX 개선 + 단위 테스트) | 7 | Done |
| **합계** | **51** | **All Done** |

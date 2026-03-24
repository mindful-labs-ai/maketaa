# AGENT.md - 에이전트 인덱스

## 시스템 개요

멘탈헬스 카드뉴스 자동 제작 시스템은 **11개 에이전트**가 **2개 팀 + 오케스트레이터**로 구성됩니다.
각 에이전트는 독립 파일로 정의되어 있으며, 태스크 유형에 따라 오케스트레이터가 자동으로 호출합니다.

**레지스트리:** `agents/agent_registry.yaml`

---

## 에이전트 맵

```
                    ┌─────────────────────┐
                    │   ORCHESTRATOR      │
                    │   agents/           │
                    │   orchestrator.md   │
                    └──────┬──────┬───────┘
                           │      │
          ┌────────────────┘      └────────────────┐
          ▼                                        ▼
┌─────────────────────┐              ┌──────────────────────────┐
│  콘텐츠 제작팀       │              │  프로덕트 팀              │
│  agents/content_team/│              │  agents/product_team/    │
│                     │              │                          │
│  01_researcher.md   │              │  pm.md       ← 팀 리드   │
│  02_strategist.md   │              │  designer.md             │
│  03_copywriter.md   │              │  engineer.md             │
│  04_design_director │              │                          │
│  05_image_generator │              └──────────────────────────┘
│  06_qa_editor.md    │
│  07_publisher.md    │
└─────────────────────┘
```

---

## 에이전트 목록

### 시스템

| Agent ID | 이름 | 파일 | 역할 |
|----------|------|------|------|
| `orchestrator` | 오케스트레이터 | [orchestrator.md](agents/orchestrator.md) | 전체 워크플로우 조율 |

### 프로덕트 팀

| Agent ID | 이름 | 파일 | 역할 |
|----------|------|------|------|
| `pm` | 프로덕트 매니저 | [pm.md](agents/product_team/pm.md) | 요구사항 분석, PRD, 태스크 관리 |
| `designer` | 프로덕트 디자이너 | [designer.md](agents/product_team/designer.md) | UX/UI 설계, 디자인 시스템 |
| `engineer` | 프로덕트 엔지니어 | [engineer.md](agents/product_team/engineer.md) | 코드 구현, 배포 |

### 콘텐츠 제작팀

| 순서 | Agent ID | 이름 | 파일 | 역할 |
|------|----------|------|------|------|
| 1 | `researcher` | 리서처 | [01_researcher.md](agents/content_team/01_researcher.md) | 주제 리서치 |
| 2 | `strategist` | 전략가 | [02_strategist.md](agents/content_team/02_strategist.md) | 콘텐츠 기획 |
| 3 | `copywriter` | 카피라이터 | [03_copywriter.md](agents/content_team/03_copywriter.md) | 텍스트 작성 |
| 4 | `design_director` | 디자인 디렉터 | [04_design_director.md](agents/content_team/04_design_director.md) | 비주얼 설계 |
| 5 | `image_generator` | 이미지 생성 | [05_image_generator.md](agents/content_team/05_image_generator.md) | 배경 이미지 생성 |
| 6 | `qa_editor` | QA 에디터 | [06_qa_editor.md](agents/content_team/06_qa_editor.md) | 품질 검수 |
| 7 | `publisher` | 퍼블리셔 | [07_publisher.md](agents/content_team/07_publisher.md) | SNS 발행 |

---

## 태스크 라우팅

오케스트레이터는 태스크 유형을 분석하여 적절한 에이전트(또는 파이프라인)를 호출합니다.

| 태스크 유형 | 진입 에이전트 | 파이프라인 |
|-------------|--------------|-----------|
| 카드뉴스 콘텐츠 생성 | `researcher` | content_pipeline (1→2→3→4→5→6→승인→7) |
| 새 기능 요청 | `pm` | product_task (PM→디자이너/엔지니어→PM검증) |
| 버그 리포트 | `pm` | product_task |
| 디자인 리뷰 | `designer` | 단일 호출 |
| 코드 수정 | `engineer` | 단일 호출 |
| 수동 발행 | `publisher` | 단일 호출 |
| 품질 검수 | `qa_editor` | 단일 호출 |

---

## 에이전트 호출 규격

모든 에이전트는 통일된 호출/응답 인터페이스를 따릅니다. 상세는 [orchestrator.md](agents/orchestrator.md) 참조.

```
호출: AgentCall { agent_id, task_type, input_data, context, config }
응답: AgentResult { agent_id, status, output_data, artifacts, logs, duration }
```

---

## 데이터 흐름

콘텐츠 파이프라인에서 에이전트 간 전달되는 핵심 데이터:

```
researcher  →  후보 주제 JSON
strategist  →  기획안 JSON (선정 주제 + 카드 구성)
copywriter  →  card_spec.json (텍스트 완성) + SNS 캡션
design_dir  →  card_spec.json (스타일 완성) + 이미지 프롬프트
image_gen   →  card_spec.json (최종) + 이미지 에셋
qa_editor   →  card_spec.json (검수 완료) + QA 보고서
[인간 승인]
publisher   →  게시 완료 보고서
```

---

*각 에이전트의 상세 System Prompt, Input/Output 스키마, 도구, 의존성은 개별 파일을 참조하세요.*

---

## 배포 가이드

Canvas Editor MVP 배포 시 반드시 아래 문서를 참조하세요:

| 문서 | 설명 |
|------|------|
| [VERCEL_DEPLOYMENT_GUIDE.md](canvas_editor/work_journal/VERCEL_DEPLOYMENT_GUIDE.md) | Vercel 배포 체크리스트, 에러 해결법 |
| [work_journal/](canvas_editor/work_journal/) | 배포 관련 업무일지 |

### 배포 전 필수 확인사항

1. **로컬 빌드 테스트**: `npm run build` 성공 확인
2. **환경 변수 설정**: `vercel env ls`로 확인
3. **vercel.json 검증**: 불필요한 속성 제거

### 자주 발생하는 문제

- TypeScript 미사용 변수 에러 → `tsconfig.json` 수정
- vercel.json 설정 오류 → 불필요한 속성 제거
- 환경 변수 누락 → `vercel env add` 명령 사용

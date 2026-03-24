# PRD: Phase 1 — 콘텐츠 파이프라인 에이전트 구현

_작성자: PM Agent | 작성일: 2026-03-14_

## 배경 & 문제 정의

Phase 0에서 캔버스 에디터 MVP, 오케스트레이터, BaseAgent, SpecValidator, card_spec.schema.json이 완성되었다.
그러나 콘텐츠 파이프라인의 핵심인 3개 에이전트(리서처, 전략가, 카피라이터)는 `.md` 정의만 존재하고 Python 구현체가 없다.
현재 `card_spec.json`의 텍스트 필드를 수동으로 채워야 하며, 주제 선정부터 카드 텍스트 완성까지 자동화가 불가능한 상태이다.

## 목표

1. AGENT 1(리서처) → AGENT 2(전략가) → AGENT 3(카피라이터) 파이프라인을 Python으로 구현하여, 주제 선정 → 카드 구성 기획 → 텍스트 완성을 자동화한다.
2. 각 에이전트가 Claude API(claude-sonnet-4-20250514)를 호출하여 실제 콘텐츠를 생성한다.
3. 에이전트 간 데이터 핸드오프가 정의된 JSON 스키마를 따르며, 오케스트레이터(`orchestrator/main.py`)에 등록하여 `run_content_pipeline()`으로 실행 가능하게 한다.
4. 파이프라인 완료 시 `card_spec.schema.json`을 준수하는 완성된 card_spec JSON을 출력한다.

## 범위

### In Scope

- Claude API(`anthropic` Python SDK) 연동 유틸리티 구현
- `agents/content_team/researcher.py` — BaseAgent 상속, 리서처 에이전트
- `agents/content_team/strategist.py` — BaseAgent 상속, 전략가 에이전트
- `agents/content_team/copywriter.py` — BaseAgent 상속, 카피라이터 에이전트
- 에이전트 간 Input/Output JSON 스키마 준수 및 검증
- 오케스트레이터에 3개 에이전트 인스턴스 등록
- 각 에이전트별 단위 테스트
- 파이프라인 통합 테스트 (3개 에이전트 순차 실행)

### Out of Scope

- AGENT 4(디자인 디렉터) 이후 에이전트 구현 (Phase 2)
- 이미지 생성, QA 검수, 퍼블리싱 기능
- 실제 웹 검색/뉴스 API 연동 (Phase 1에서는 Claude의 내재 지식 기반으로 리서치)
- 캔버스 에디터 UI 변경
- 스케줄러 자동 트리거 연동

## 사용자 스토리

- AS A 운영자, I WANT TO 주제 키워드 없이 파이프라인을 실행하면 자동으로 시의성 있는 멘탈헬스 주제가 선정되고 카드 텍스트가 완성되도록, SO THAT 콘텐츠 제작 시간을 대폭 단축할 수 있다.
- AS A 운영자, I WANT TO 특정 주제를 지정하여 파이프라인을 실행할 수 있도록, SO THAT 원하는 주제의 카드뉴스를 즉시 생성할 수 있다.
- AS A 개발자, I WANT TO 각 에이전트를 독립적으로 테스트할 수 있도록, SO THAT 디버깅과 개선이 용이하다.

## 에이전트별 Input/Output 스키마 및 인수 조건

---

### AGENT 1: 리서처 (Researcher)

**파일**: `agents/content_team/researcher.py`
**클래스**: `ResearcherAgent(BaseAgent)`
**모델**: `claude-sonnet-4-20250514`

#### Input Schema

```json
{
  "type": "object",
  "required": ["trigger", "date"],
  "properties": {
    "trigger": {
      "type": "string",
      "enum": ["scheduled", "manual"]
    },
    "date": {
      "type": "string",
      "format": "date",
      "description": "실행 날짜 (YYYY-MM-DD)"
    },
    "season_info": {
      "type": "object",
      "properties": {
        "month": { "type": "integer", "minimum": 1, "maximum": 12 },
        "season": { "type": "string", "enum": ["봄", "여름", "가을", "겨울"] },
        "events": {
          "type": "array",
          "items": { "type": "string" },
          "description": "해당 시기의 관련 이벤트"
        }
      }
    },
    "recent_topics": {
      "type": "array",
      "items": { "type": "string" },
      "description": "최근 발행 주제 목록 (중복 방지용)"
    }
  }
}
```

#### Output Schema

```json
{
  "type": "object",
  "required": ["agent_id", "timestamp", "candidates"],
  "properties": {
    "agent_id": {
      "type": "string",
      "const": "researcher"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "candidates": {
      "type": "array",
      "minItems": 3,
      "maxItems": 5,
      "items": {
        "type": "object",
        "required": ["id", "topic", "angle", "trend_score", "sources", "season_relevance", "target_keywords", "rationale"],
        "properties": {
          "id": { "type": "string", "pattern": "^topic_[0-9]{3}$" },
          "topic": { "type": "string", "minLength": 2 },
          "angle": { "type": "string", "minLength": 5 },
          "trend_score": { "type": "number", "minimum": 0, "maximum": 1 },
          "sources": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "required": ["url", "title", "type"],
              "properties": {
                "url": { "type": "string", "format": "uri" },
                "title": { "type": "string" },
                "type": { "type": "string", "enum": ["news", "paper", "sns", "report"] }
              }
            }
          },
          "season_relevance": { "type": "string" },
          "target_keywords": {
            "type": "array",
            "minItems": 2,
            "items": { "type": "string" }
          },
          "rationale": { "type": "string", "minLength": 10 }
        }
      }
    }
  }
}
```

#### Acceptance Criteria

- [ ] AC-R01: `BaseAgent`를 상속하고 `execute(call: AgentCall) -> AgentResult`를 구현한다.
- [ ] AC-R02: `.md` 정의 파일에서 System Prompt를 자동 로드한다 (`spec_path` 설정).
- [ ] AC-R03: Claude API를 호출하여 3~5개의 후보 주제(`candidates`)를 생성한다.
- [ ] AC-R04: 출력 JSON이 위 Output Schema를 100% 준수한다 (필수 필드 누락 없음).
- [ ] AC-R05: `season_info`가 입력에 포함된 경우, `season_relevance` 필드가 해당 시즌 정보를 반영한다.
- [ ] AC-R06: `recent_topics`가 입력에 포함된 경우, 후보 주제가 기존 주제와 중복되지 않는다.
- [ ] AC-R07: 각 후보의 `trend_score`가 0~1 사이의 float 값이다.
- [ ] AC-R08: Claude API 호출 실패 시 `AgentResult(status="failure")`를 반환하고 에러 메시지를 포함한다.
- [ ] AC-R09: `orchestrator.register_agent("researcher", agent)`로 등록 후 `run_content_pipeline()`에서 정상 호출된다.

---

### AGENT 2: 전략가 (Strategist)

**파일**: `agents/content_team/strategist.py`
**클래스**: `StrategistAgent(BaseAgent)`
**모델**: `claude-sonnet-4-20250514`

#### Input Schema

```json
{
  "type": "object",
  "required": ["candidates"],
  "properties": {
    "candidates": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "topic", "angle", "trend_score"],
        "properties": {
          "id": { "type": "string" },
          "topic": { "type": "string" },
          "angle": { "type": "string" },
          "trend_score": { "type": "number" },
          "sources": { "type": "array" },
          "season_relevance": { "type": "string" }
        }
      },
      "description": "리서처가 제안한 후보 주제 목록"
    },
    "recent_topics": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

#### Output Schema

```json
{
  "type": "object",
  "required": ["agent_id", "selected_topic", "persona", "card_plan", "hashtags", "total_cards"],
  "properties": {
    "agent_id": {
      "type": "string",
      "const": "strategist"
    },
    "selected_topic": {
      "type": "object",
      "required": ["id", "topic", "angle", "selection_reason"],
      "properties": {
        "id": { "type": "string" },
        "topic": { "type": "string" },
        "angle": { "type": "string" },
        "selection_reason": { "type": "string", "minLength": 10 }
      }
    },
    "persona": {
      "type": "object",
      "required": ["age_range", "description", "pain_points", "tone_preference"],
      "properties": {
        "age_range": { "type": "string", "pattern": "^[0-9]+-[0-9]+$" },
        "description": { "type": "string", "minLength": 10 },
        "pain_points": {
          "type": "array",
          "minItems": 1,
          "items": { "type": "string" }
        },
        "tone_preference": { "type": "string" }
      }
    },
    "card_plan": {
      "type": "array",
      "minItems": 6,
      "maxItems": 10,
      "items": {
        "type": "object",
        "required": ["card_number", "role", "title_direction", "content_direction"],
        "properties": {
          "card_number": { "type": "integer", "minimum": 1 },
          "role": {
            "type": "string",
            "enum": ["cover", "empathy", "cause", "insight", "solution", "tip", "closing", "source", "cta"]
          },
          "title_direction": { "type": "string" },
          "content_direction": { "type": "string", "minLength": 5 }
        }
      }
    },
    "hashtags": {
      "type": "object",
      "required": ["primary", "secondary"],
      "properties": {
        "primary": {
          "type": "array",
          "minItems": 2,
          "items": { "type": "string", "pattern": "^#" }
        },
        "secondary": {
          "type": "array",
          "items": { "type": "string", "pattern": "^#" }
        },
        "trending": {
          "type": "array",
          "items": { "type": "string", "pattern": "^#" }
        }
      }
    },
    "total_cards": {
      "type": "integer",
      "minimum": 6,
      "maximum": 10
    }
  }
}
```

#### Acceptance Criteria

- [ ] AC-S01: `BaseAgent`를 상속하고 `execute(call: AgentCall) -> AgentResult`를 구현한다.
- [ ] AC-S02: 리서처 Output의 `candidates` 배열을 입력으로 받아 최적의 1개 주제를 선정한다.
- [ ] AC-S03: `selected_topic.selection_reason`에 선정 근거를 명시한다 (트렌드 점수, 시즌 적합도, 중복 여부 등).
- [ ] AC-S04: `persona` 객체에 타겟 페르소나가 정의되며, `age_range`는 "25-35" 형식이다.
- [ ] AC-S05: `card_plan` 배열이 6~10개이며, 각 항목의 `role`이 card_spec.schema.json의 enum과 일치한다.
- [ ] AC-S06: `card_plan[0].role`이 반드시 `"cover"`이다.
- [ ] AC-S07: `hashtags.primary`에 최소 2개의 해시태그가 포함된다 (각각 `#`으로 시작).
- [ ] AC-S08: `total_cards`와 `card_plan` 배열의 길이가 일치한다.
- [ ] AC-S09: 출력 JSON이 위 Output Schema를 100% 준수한다.
- [ ] AC-S10: Claude API 호출 실패 시 `AgentResult(status="failure")`를 반환한다.

---

### AGENT 3: 카피라이터 (Copywriter)

**파일**: `agents/content_team/copywriter.py`
**클래스**: `CopywriterAgent(BaseAgent)`
**모델**: `claude-sonnet-4-20250514`

#### Input Schema

```json
{
  "type": "object",
  "required": ["selected_topic", "persona", "card_plan", "hashtags", "total_cards"],
  "properties": {
    "selected_topic": {
      "type": "object",
      "required": ["topic", "angle"],
      "properties": {
        "topic": { "type": "string" },
        "angle": { "type": "string" }
      }
    },
    "persona": {
      "type": "object",
      "required": ["description", "tone_preference"],
      "properties": {
        "description": { "type": "string" },
        "tone_preference": { "type": "string" }
      }
    },
    "card_plan": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["card_number", "role", "content_direction"],
        "properties": {
          "card_number": { "type": "integer" },
          "role": { "type": "string" },
          "content_direction": { "type": "string" }
        }
      }
    },
    "hashtags": {
      "type": "object",
      "properties": {
        "primary": { "type": "array", "items": { "type": "string" } },
        "secondary": { "type": "array", "items": { "type": "string" } },
        "trending": { "type": "array", "items": { "type": "string" } }
      }
    },
    "total_cards": { "type": "integer" }
  }
}
```

#### Output Schema

```json
{
  "type": "object",
  "required": ["agent_id", "card_spec", "sns_caption"],
  "properties": {
    "agent_id": {
      "type": "string",
      "const": "copywriter"
    },
    "card_spec": {
      "type": "object",
      "required": ["meta", "cards"],
      "properties": {
        "meta": {
          "type": "object",
          "required": ["topic", "created_at", "total_cards"],
          "properties": {
            "topic": { "type": "string" },
            "created_at": { "type": "string", "format": "date" },
            "total_cards": { "type": "integer", "minimum": 6, "maximum": 10 }
          }
        },
        "cards": {
          "type": "array",
          "minItems": 6,
          "maxItems": 10,
          "items": {
            "type": "object",
            "required": ["card_number", "role", "texts"],
            "properties": {
              "card_number": { "type": "integer", "minimum": 1 },
              "role": {
                "type": "string",
                "enum": ["cover", "empathy", "cause", "insight", "solution", "tip", "closing", "source", "cta"]
              },
              "texts": {
                "type": "object",
                "required": ["headline", "body"],
                "properties": {
                  "headline": { "type": "string", "maxLength": 15 },
                  "body": { "type": "string", "maxLength": 50 },
                  "sub_text": { "type": "string", "maxLength": 30 }
                }
              }
            }
          }
        }
      }
    },
    "sns_caption": {
      "type": "object",
      "required": ["instagram", "threads"],
      "properties": {
        "instagram": { "type": "string", "minLength": 20 },
        "threads": { "type": "string", "minLength": 10 }
      }
    }
  }
}
```

#### Acceptance Criteria

- [ ] AC-C01: `BaseAgent`를 상속하고 `execute(call: AgentCall) -> AgentResult`를 구현한다.
- [ ] AC-C02: 전략가 Output의 `card_plan`을 기반으로 각 카드의 텍스트(`headline`, `body`, `sub_text`)를 생성한다.
- [ ] AC-C03: `headline`이 15자(공백 포함) 이내이다.
- [ ] AC-C04: `body`가 50자(공백 포함) 이내이다.
- [ ] AC-C05: `sub_text`가 30자(공백 포함) 이내이다 (선택 필드).
- [ ] AC-C06: 출력의 `card_spec.cards` 배열 길이가 입력의 `total_cards`와 일치한다.
- [ ] AC-C07: 출력의 `card_spec.cards[*].role`이 card_spec.schema.json의 enum 값과 일치한다.
- [ ] AC-C08: 톤 가이드를 준수한다 — 진단적 표현, 단정적 어조, 자극적/공포/비하적 표현이 없다.
- [ ] AC-C09: `sns_caption.instagram`에 해시태그가 포함된다.
- [ ] AC-C10: `sns_caption.threads`는 대화체로 작성되며 해시태그를 최소화한다.
- [ ] AC-C11: 출력 JSON이 위 Output Schema를 100% 준수한다.
- [ ] AC-C12: 출력의 `card_spec`이 `schemas/card_spec.schema.json`의 `cards[*].text` 구조와 호환된다.
- [ ] AC-C13: Claude API 호출 실패 시 `AgentResult(status="failure")`를 반환한다.

---

## 파이프라인 데이터 흐름

```
[Orchestrator]
     │
     │  trigger: "manual" | "scheduled"
     │  context: { date, session_id, season_info, recent_topics }
     ▼
[AGENT 1: Researcher]
     │  Input:  { trigger, date, season_info, recent_topics }
     │  Output: { agent_id, timestamp, candidates[3~5] }
     ▼
[AGENT 2: Strategist]
     │  Input:  { candidates, recent_topics }
     │  Output: { agent_id, selected_topic, persona, card_plan[6~10], hashtags, total_cards }
     ▼
[AGENT 3: Copywriter]
     │  Input:  { selected_topic, persona, card_plan, hashtags, total_cards }
     │  Output: { agent_id, card_spec { meta, cards[6~10] }, sns_caption }
     ▼
[card_spec.json 저장] → Phase 2에서 Design Director로 전달
```

## 공통 인수 조건

- [ ] AC-G01: 3개 에이전트 모두 `lib/base_agent.py`의 `BaseAgent`를 상속한다.
- [ ] AC-G02: 각 에이전트의 `__init__`에서 `spec_path`를 해당 `.md` 파일로 설정하여 System Prompt를 자동 로드한다.
- [ ] AC-G03: Claude API 호출에 `anthropic` Python SDK를 사용하며, API 키는 환경변수 `ANTHROPIC_API_KEY`에서 읽는다.
- [ ] AC-G04: 에이전트 간 데이터 핸드오프 시, 이전 에이전트의 `output_data`가 다음 에이전트의 `input_data`로 그대로 전달된다 (오케스트레이터가 처리).
- [ ] AC-G05: 모든 에이전트가 `WorkJournal`에 시작/완료/에러를 자동 기록한다 (`BaseAgent.run()` 내장 기능 활용).
- [ ] AC-G06: `SpecValidator`로 최종 card_spec 검증 시 error 레벨의 이슈가 0건이다.
- [ ] AC-G07: `orchestrator.register_agent()`로 3개 에이전트를 등록한 후 `run_content_pipeline()`을 호출하면 researcher → strategist → copywriter 순서로 정상 실행된다.
- [ ] AC-G08: 파이프라인 통합 테스트 1회 통과 — 입력 없이 실행하여 유효한 card_spec JSON이 생성된다.

## 엔지니어 요청 태스크

| ID | 태스크 | 설명 | 우선순위 |
|----|--------|------|----------|
| T-E13 | Claude API 유틸리티 | `lib/claude_client.py` — API 호출, 재시도, JSON 파싱 공통 모듈 | P0 |
| T-E14 | ResearcherAgent 구현 | `agents/content_team/researcher.py` | P0 |
| T-E15 | StrategistAgent 구현 | `agents/content_team/strategist.py` | P0 |
| T-E16 | CopywriterAgent 구현 | `agents/content_team/copywriter.py` | P0 |
| T-E17 | 오케스트레이터 에이전트 등록 | `orchestrator/main.py`에 3개 에이전트 등록 코드 추가 | P0 |
| T-E18 | 단위 테스트 작성 | 각 에이전트별 pytest 테스트 | P1 |
| T-E19 | 통합 테스트 작성 | 파이프라인 E2E 테스트 | P1 |
| T-E20 | 시즌 정보 자동 생성 | 날짜 기반 `season_info` 유틸리티 | P2 |

## 디자이너 요청 태스크

- 해당 없음 (Phase 1은 백엔드 에이전트 구현만 포함)

## 우선순위

P0

## 예상 완료

Sprint 4 완료: 2026-03-21 (1주)

## 참고 자료

- 에이전트 정의: `agents/content_team/01_researcher.md`, `02_strategist.md`, `03_copywriter.md`
- 스키마: `schemas/card_spec.schema.json`
- 기반 클래스: `lib/base_agent.py`
- 오케스트레이터: `orchestrator/main.py`
- 에이전트 레지스트리: `agents/agent_registry.yaml`

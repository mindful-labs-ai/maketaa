# PRD: Phase 3 — QA & 퍼블리싱 에이전트 구현

_작성자: PM Agent | 작성일: 2026-03-15_

## 배경 & 문제 정의

Phase 1에서 콘텐츠 파이프라인(리서처 → 전략가 → 카피라이터), Phase 2에서 비주얼 파이프라인(디자인 디렉터 → 이미지 제너레이터)이 완성되어, 주제 선정부터 배경 이미지 생성까지 자동화되었다.
그러나 현재 파이프라인에는 두 가지 핵심 단계가 빠져 있다:

1. **품질 검수(QA)**: 생성된 콘텐츠의 안전성 필터링, 팩트체크, 텍스트 검증이 수동으로 이루어지고 있어, 위험 표현이나 사실 오류가 발행 전에 누락될 수 있다.
2. **SNS 발행**: 인간 승인 후 Instagram/Threads에 수동 업로드해야 하므로, 최적 발행 시간을 놓치거나 플랫폼별 규격 불일치가 발생할 수 있다.

이 두 단계를 자동화하면 AGENT 1(리서처)부터 AGENT 7(퍼블리셔)까지 전체 파이프라인이 완성되어, 주제 선정 → 콘텐츠 생성 → 비주얼 디자인 → 품질 검수 → SNS 발행까지 end-to-end 자동화가 달성된다.

## 목표

1. AGENT 6(QA 에디터) → AGENT 7(퍼블리셔) 파이프라인을 Python으로 구현하여, 비주얼 파이프라인 완료 후 → 품질 검수 → SNS 발행을 자동화한다.
2. QA 에디터가 콘텐츠 안전성 필터링(자해/자살 표현, 비전문가적 진단 표현), 팩트체크, 텍스트 검증(글자 수, 맞춤법), 자동 수정을 수행하고 QA 보고서를 생성한다.
3. 퍼블리셔가 Instagram Graph API로 Carousel 업로드, Threads API로 게시를 수행하고 발행 보고서를 생성한다.
4. QA 에디터 → 인간 승인 → 퍼블리셔 흐름에서 인간 승인 단계를 오케스트레이터가 관리한다.
5. Phase 1 + Phase 2 + Phase 3를 연결하여 AGENT 1→7 전체 파이프라인 E2E dry-run이 가능하게 한다.

## 범위

### In Scope

- `agents/content_team/qa_editor.py` — BaseAgent 상속, QA 에디터 에이전트
- `agents/content_team/publisher.py` — BaseAgent 상속, 퍼블리셔 에이전트
- SNS API 유틸리티 (`lib/sns_client.py`) — Instagram Graph API / Threads API 래퍼
- 에이전트 간 Input/Output JSON 스키마 준수 및 검증
- 오케스트레이터에 2개 에이전트 인스턴스 등록 (`run_qa_publishing_pipeline()`)
- 안전성 키워드 필터링 (`config/settings.yaml`의 `qa.safety_keywords` 참조)
- QA 보고서 및 발행 보고서 저장 (`output/{YYYY-MM-DD}/reports/`)
- Phase 3 통합 테스트 (dry-run)
- AGENT 1→7 전체 파이프라인 E2E 테스트 (dry-run)

### Out of Scope

- 캔버스 에디터 UI에서의 QA 보고서 표시
- Pillow 기반 텍스트 합성 렌더링 (별도 Sprint에서 처리)
- 스케줄러 자동 트리거 연동 (발행 시간 최적화 로직은 포함하되, 스케줄러 연동은 제외)
- SNS 분석/인사이트 수집 (게시 후 성과 추적)
- 추가 SNS 플랫폼 지원 (Facebook, Twitter 등)
- 이미지 저작권/라이선스 검증

## 사용자 스토리

- AS A 운영자, I WANT TO 카드뉴스가 발행 전에 자해/자살 관련 위험 표현, 비전문가적 진단 표현이 자동으로 감지·수정되도록, SO THAT 정신건강 콘텐츠의 안전성을 보장할 수 있다.
- AS A 운영자, I WANT TO 통계/수치의 출처가 자동으로 검증되도록, SO THAT 잘못된 정보가 발행되는 것을 방지할 수 있다.
- AS A 운영자, I WANT TO 글자 수 초과, 맞춤법 오류가 자동 수정되고 수정 내역이 보고서로 남도록, SO THAT 별도의 교정 작업 없이 품질을 유지할 수 있다.
- AS A 운영자, I WANT TO 인간 승인 후 Instagram과 Threads에 자동으로 업로드되도록, SO THAT 수동 업로드 없이 최적 시간에 발행할 수 있다.
- AS A 운영자, I WANT TO 발행 완료 보고서(게시 URL, 발행 시간, 에러 로그)를 자동으로 받도록, SO THAT 발행 결과를 즉시 확인할 수 있다.
- AS A 개발자, I WANT TO QA 에디터와 퍼블리셔를 독립적으로 테스트할 수 있도록, SO THAT 디버깅과 개선이 용이하다.

## 에이전트별 Input/Output 스키마 및 인수 조건

---

### AGENT 6: QA 에디터 (Quality Assurance Editor)

**파일**: `agents/content_team/qa_editor.py`
**클래스**: `QAEditorAgent(BaseAgent)`
**모델**: `claude-sonnet-4-20250514`
**에이전트 정의**: `agents/content_team/06_qa_editor.md`

#### Input Schema

```json
{
  "type": "object",
  "required": ["card_spec", "assets", "sns_caption"],
  "properties": {
    "card_spec": {
      "type": "object",
      "required": ["meta", "style", "cards"],
      "properties": {
        "meta": {
          "type": "object",
          "required": ["topic", "total_cards"],
          "properties": {
            "topic": { "type": "string" },
            "angle": { "type": "string" },
            "created_at": { "type": "string", "format": "date" },
            "total_cards": { "type": "integer", "minimum": 6, "maximum": 10 },
            "sources": {
              "type": "array",
              "items": { "type": "string" },
              "description": "참고 자료 URL 목록"
            }
          }
        },
        "style": {
          "type": "object",
          "required": ["palette", "font", "card_size"],
          "properties": {
            "palette": { "type": "object" },
            "font": { "type": "object" },
            "card_size": {
              "type": "object",
              "properties": {
                "width": { "type": "integer", "const": 1080 },
                "height": { "type": "integer", "const": 1080 }
              }
            }
          }
        },
        "cards": {
          "type": "array",
          "minItems": 6,
          "maxItems": 10,
          "items": {
            "type": "object",
            "required": ["card_number", "role", "texts", "layout", "background"],
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
              },
              "layout": { "type": "object" },
              "background": {
                "type": "object",
                "required": ["type", "src"],
                "properties": {
                  "type": { "type": "string", "enum": ["generated", "gradient", "solid"] },
                  "src": { "type": "string", "description": "배경 이미지 파일 경로" },
                  "overlay_opacity": { "type": "number", "minimum": 0, "maximum": 1 }
                }
              }
            }
          }
        }
      }
    },
    "assets": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["card_number", "bg_path", "preview_path"],
        "properties": {
          "card_number": { "type": "integer", "minimum": 1 },
          "bg_path": { "type": "string", "description": "배경 이미지 경로" },
          "preview_path": { "type": "string", "description": "미리보기 이미지 경로" }
        }
      }
    },
    "sns_caption": {
      "type": "object",
      "required": ["instagram", "threads"],
      "properties": {
        "instagram": { "type": "string", "maxLength": 2200, "description": "인스타그램 캡션" },
        "threads": { "type": "string", "description": "스레드 텍스트" }
      }
    }
  }
}
```

#### Output Schema

```json
{
  "type": "object",
  "required": ["agent_id", "card_spec", "sns_caption", "qa_report"],
  "properties": {
    "agent_id": {
      "type": "string",
      "const": "qa_editor"
    },
    "card_spec": {
      "type": "object",
      "description": "QA 검수 후 수정된 card_spec (문제 없으면 원본 유지)",
      "required": ["meta", "style", "cards"]
    },
    "sns_caption": {
      "type": "object",
      "description": "QA 검수 후 수정된 SNS 캡션 (문제 없으면 원본 유지)",
      "required": ["instagram", "threads"],
      "properties": {
        "instagram": { "type": "string", "maxLength": 2200 },
        "threads": { "type": "string" }
      }
    },
    "qa_report": {
      "type": "object",
      "required": ["overall_status", "critical_issues", "minor_issues", "checklist", "total_fixes", "reviewed_at"],
      "properties": {
        "overall_status": {
          "type": "string",
          "enum": ["pass", "fail", "pass_with_fixes"],
          "description": "pass: 문제 없음, fail: 중대 결함 수정 불가, pass_with_fixes: 자동 수정 후 통과"
        },
        "critical_issues": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["card_number", "field", "issue", "severity", "auto_fixed"],
            "properties": {
              "card_number": { "type": "integer" },
              "field": { "type": "string", "description": "문제 발생 필드 (예: texts.headline, sns_caption.instagram)" },
              "issue": { "type": "string", "description": "문제 상세 설명" },
              "severity": { "type": "string", "const": "critical" },
              "auto_fixed": { "type": "boolean" },
              "before": { "type": "string", "description": "수정 전 텍스트" },
              "after": { "type": ["string", "null"], "description": "수정 후 텍스트 (auto_fixed가 true인 경우)" }
            }
          }
        },
        "minor_issues": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["card_number", "field", "issue", "severity", "auto_fixed"],
            "properties": {
              "card_number": { "type": "integer" },
              "field": { "type": "string" },
              "issue": { "type": "string" },
              "severity": { "type": "string", "const": "minor" },
              "auto_fixed": { "type": "boolean" },
              "before": { "type": "string" },
              "after": { "type": ["string", "null"] }
            }
          }
        },
        "checklist": {
          "type": "object",
          "required": [
            "sources_cited",
            "crisis_expression_clean",
            "no_diagnostic_language",
            "brand_tone_match",
            "readability_ok",
            "char_count_ok",
            "hashtags_ok",
            "cta_included",
            "grammar_ok",
            "factcheck_ok"
          ],
          "properties": {
            "sources_cited": { "type": "boolean", "description": "통계/수치에 출처가 명시되어 있는지" },
            "crisis_expression_clean": { "type": "boolean", "description": "자해/자살 관련 위험 표현이 없는지" },
            "no_diagnostic_language": { "type": "boolean", "description": "비전문가적 진단 표현이 없는지" },
            "brand_tone_match": { "type": "boolean", "description": "브랜드 톤(따뜻함, 공감, 비판단적)과 일치하는지" },
            "readability_ok": { "type": "boolean", "description": "배경-텍스트 명암 대비가 적절한지" },
            "char_count_ok": { "type": "boolean", "description": "글자 수 규칙(헤드라인 15자, 본문 50자)을 준수하는지" },
            "hashtags_ok": { "type": "boolean", "description": "금지 해시태그가 포함되지 않았는지" },
            "cta_included": { "type": "boolean", "description": "마지막 카드에 CTA가 포함되어 있는지" },
            "grammar_ok": { "type": "boolean", "description": "맞춤법/문법이 올바른지" },
            "factcheck_ok": { "type": "boolean", "description": "통계/수치가 출처와 일치하는지" }
          }
        },
        "total_fixes": { "type": "integer", "minimum": 0, "description": "자동 수정된 총 건수" },
        "reviewed_at": { "type": "string", "format": "date-time", "description": "검수 완료 시각" }
      }
    }
  }
}
```

#### Acceptance Criteria

- [ ] AC-QA01: `BaseAgent`를 상속하고 `execute(call: AgentCall) -> AgentResult`를 구현한다.
- [ ] AC-QA02: `.md` 정의 파일에서 System Prompt를 자동 로드한다 (`spec_path = agents/content_team/06_qa_editor.md`).
- [ ] AC-QA03: `config/settings.yaml`의 `qa.safety_keywords.block` 키워드(`자해`, `자살`, `극단적 선택`)가 텍스트에 포함되면 즉시 감지하고 대체 표현으로 자동 수정한다.
- [ ] AC-QA04: `qa.safety_keywords.warn` 키워드(`우울증 진단`, `약물 처방`, `치료 방법`)가 포함되면 경고 플래그를 설정하고 QA 보고서에 기록한다.
- [ ] AC-QA05: "당신은 ~증입니다", "~로 진단됩니다" 등 비전문가적 진단 표현을 감지하고 자동 수정한다.
- [ ] AC-QA06: 통계/수치가 포함된 텍스트에 출처(`meta.sources`)가 명시되어 있는지 확인한다.
- [ ] AC-QA07: `web_search` 도구를 사용하여 출처 URL의 접근 가능 여부를 확인한다.
- [ ] AC-QA08: 헤드라인이 15자를 초과하면 자동으로 축약하고, 본문이 50자를 초과하면 자동으로 축약한다.
- [ ] AC-QA09: 맞춤법/문법 오류를 Claude API를 통해 감지하고 자동 수정한다.
- [ ] AC-QA10: 마지막 카드(`role: "cta"` 또는 `role: "closing"`)에 행동 유도 요소(CTA)가 포함되어 있는지 확인한다.
- [ ] AC-QA11: SNS 캡션(`instagram`, `threads`)에도 동일한 안전성 필터링을 적용한다.
- [ ] AC-QA12: Instagram 캡션이 2200자를 초과하면 자동 축약한다.
- [ ] AC-QA13: 해시태그에 금지 키워드가 포함되어 있으면 대체 해시태그를 제안한다.
- [ ] AC-QA14: QA 보고서의 `overall_status`가 `pass`, `fail`, `pass_with_fixes` 중 하나이다.
- [ ] AC-QA15: 중대 결함(`critical_issues`)이 자동 수정 불가능한 경우 `overall_status`를 `fail`로 설정하고 파이프라인을 중단한다.
- [ ] AC-QA16: QA 보고서를 `output/{YYYY-MM-DD}/reports/qa_report.json`에 저장한다.
- [ ] AC-QA17: 출력 JSON이 위 Output Schema를 100% 준수한다.
- [ ] AC-QA18: Claude API 호출 실패 시 `AgentResult(status="failure")`를 반환하고 에러 메시지를 포함한다.

---

### AGENT 7: 퍼블리셔 (Publisher)

**파일**: `agents/content_team/publisher.py`
**클래스**: `PublisherAgent(BaseAgent)`
**모델**: `claude-sonnet-4-20250514`
**에이전트 정의**: `agents/content_team/07_publisher.md`

#### Input Schema

```json
{
  "type": "object",
  "required": ["approved", "card_spec", "final_cards", "sns_caption", "hashtags"],
  "properties": {
    "approved": {
      "type": "boolean",
      "const": true,
      "description": "인간 승인 완료 여부 (true여야만 발행 진행)"
    },
    "card_spec": {
      "type": "object",
      "required": ["meta", "style", "cards"],
      "properties": {
        "meta": {
          "type": "object",
          "required": ["topic", "total_cards"],
          "properties": {
            "topic": { "type": "string" },
            "created_at": { "type": "string", "format": "date" },
            "total_cards": { "type": "integer", "minimum": 6, "maximum": 10 }
          }
        },
        "style": { "type": "object" },
        "cards": {
          "type": "array",
          "minItems": 6,
          "maxItems": 10
        }
      }
    },
    "final_cards": {
      "type": "array",
      "minItems": 6,
      "maxItems": 10,
      "items": {
        "type": "object",
        "required": ["card_number", "path"],
        "properties": {
          "card_number": { "type": "integer", "minimum": 1 },
          "path": {
            "type": "string",
            "pattern": "^output/.+/cards/card_[0-9]+_final\\.png$",
            "description": "최종 렌더링된 카드 이미지 경로 (1080x1080 PNG)"
          }
        }
      }
    },
    "sns_caption": {
      "type": "object",
      "required": ["instagram", "threads"],
      "properties": {
        "instagram": { "type": "string", "maxLength": 2200, "description": "인스타그램 캡션 전문" },
        "threads": { "type": "string", "description": "스레드 게시 텍스트" }
      }
    },
    "hashtags": {
      "type": "array",
      "items": { "type": "string", "pattern": "^#" },
      "maxItems": 30,
      "description": "해시태그 목록 (최대 30개)"
    }
  }
}
```

#### Output Schema

```json
{
  "type": "object",
  "required": ["agent_id", "publish_report"],
  "properties": {
    "agent_id": {
      "type": "string",
      "const": "publisher"
    },
    "publish_report": {
      "type": "object",
      "required": ["session_date", "topic", "platforms", "total_retries", "errors"],
      "properties": {
        "session_date": {
          "type": "string",
          "format": "date",
          "description": "발행 세션 날짜"
        },
        "topic": {
          "type": "string",
          "description": "발행된 카드뉴스 주제"
        },
        "platforms": {
          "type": "object",
          "required": ["instagram", "threads"],
          "properties": {
            "instagram": {
              "type": "object",
              "required": ["status", "published_at", "card_count"],
              "properties": {
                "status": {
                  "type": "string",
                  "enum": ["success", "failed", "skipped"],
                  "description": "발행 상태"
                },
                "post_url": {
                  "type": ["string", "null"],
                  "description": "게시물 URL (성공 시)"
                },
                "post_id": {
                  "type": ["string", "null"],
                  "description": "게시물 ID (성공 시)"
                },
                "published_at": {
                  "type": ["string", "null"],
                  "format": "date-time",
                  "description": "실제 발행 시각"
                },
                "card_count": {
                  "type": "integer",
                  "minimum": 0,
                  "description": "업로드된 카드 수"
                }
              }
            },
            "threads": {
              "type": "object",
              "required": ["status", "published_at"],
              "properties": {
                "status": {
                  "type": "string",
                  "enum": ["success", "failed", "skipped"]
                },
                "post_url": { "type": ["string", "null"] },
                "post_id": { "type": ["string", "null"] },
                "published_at": { "type": ["string", "null"], "format": "date-time" }
              }
            }
          }
        },
        "total_retries": {
          "type": "integer",
          "minimum": 0,
          "description": "총 재시도 횟수"
        },
        "errors": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["platform", "error_code", "message", "timestamp"],
            "properties": {
              "platform": { "type": "string", "enum": ["instagram", "threads"] },
              "error_code": { "type": "string" },
              "message": { "type": "string" },
              "timestamp": { "type": "string", "format": "date-time" },
              "retry_count": { "type": "integer", "minimum": 0 }
            }
          }
        }
      }
    }
  }
}
```

#### Acceptance Criteria

- [ ] AC-PB01: `BaseAgent`를 상속하고 `execute(call: AgentCall) -> AgentResult`를 구현한다.
- [ ] AC-PB02: `.md` 정의 파일에서 System Prompt를 자동 로드한다 (`spec_path = agents/content_team/07_publisher.md`).
- [ ] AC-PB03: `approved`가 `true`가 아니면 발행을 거부하고 `AgentResult(status="failure")`를 반환한다.
- [ ] AC-PB04: `config/settings.yaml`의 `sns.instagram.enabled` 설정에 따라 Instagram 발행 여부를 결정한다.
- [ ] AC-PB05: `config/settings.yaml`의 `sns.threads.enabled` 설정에 따라 Threads 발행 여부를 결정한다.
- [ ] AC-PB06: Instagram Graph API v19.0을 사용하여 Carousel 포스트를 업로드한다.
- [ ] AC-PB07: Carousel 업로드 순서: (1) 각 카드 이미지를 개별 컨테이너로 업로드, (2) Carousel 컨테이너 생성, (3) 게시물 발행.
- [ ] AC-PB08: Instagram 캡션에 해시태그를 포함하며, 총 30개를 초과하지 않는다.
- [ ] AC-PB09: Threads API를 사용하여 텍스트 + 표지 이미지(card_1)를 게시한다.
- [ ] AC-PB10: API 에러 발생 시 최대 3회 재시도하며, 재시도 간격은 5분이다.
- [ ] AC-PB11: 이미지 업로드 실패 시 이미지 최적화(리사이즈, 압축) 후 재시도한다.
- [ ] AC-PB12: 모든 플랫폼 발행 실패 시 `notify` 도구를 통해 운영자에게 알림을 전송한다.
- [ ] AC-PB13: 발행 보고서를 `output/{YYYY-MM-DD}/reports/publish_report.json`에 저장한다.
- [ ] AC-PB14: 발행 보고서의 `platforms.instagram.status`와 `platforms.threads.status`가 각각 `success`, `failed`, `skipped` 중 하나이다.
- [ ] AC-PB15: 발행 완료 후 `card_spec.meta.status`를 `"published"`로 업데이트한다.
- [ ] AC-PB16: API 키는 환경변수 `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ID` (Instagram) 및 `THREADS_ACCESS_TOKEN` (Threads)에서 읽는다.
- [ ] AC-PB17: 출력 JSON이 위 Output Schema를 100% 준수한다.
- [ ] AC-PB18: dry-run 모드에서 실제 API 호출 없이 mock 응답을 반환한다.

---

## 파이프라인 데이터 흐름

```
[Phase 2 완료]
     │
     │  card_spec: { meta, style, cards[{ texts, layout, background }] }
     │  assets: [{ card_number, bg_path, preview_path }]
     │  sns_caption: { instagram, threads }
     ▼
[AGENT 6: QA Editor]
     │  Input:  { card_spec, assets, sns_caption }
     │  Output: { agent_id, card_spec(수정됨), sns_caption(수정됨), qa_report }
     │
     │  ── qa_report.overall_status == "fail" → 파이프라인 중단, 운영자 알림
     │  ── qa_report.overall_status == "pass" | "pass_with_fixes" → 다음 단계
     ▼
[캔버스 에디터 로드 → 인간 승인 대기]
     │
     │  승인(approved: true) → 다음 단계
     │  반려 → 파이프라인 중단
     ▼
[AGENT 7: Publisher]
     │  Input:  { approved, card_spec, final_cards, sns_caption, hashtags }
     │  Output: { agent_id, publish_report }
     ▼
[output/{YYYY-MM-DD}/]
  ├── card_spec.json            # 최종 스펙 (status: "published")
  ├── assets/
  │   └── card_*_bg.png         # 배경 이미지
  ├── cards/
  │   └── card_*_final.png      # 최종 렌더링 카드
  └── reports/
      ├── qa_report.json        # QA 검수 보고서
      └── publish_report.json   # 발행 보고서
```

## SNS API 유틸리티

### `lib/sns_client.py`

| 기능 | 설명 |
|------|------|
| `upload_instagram_carousel(images, caption, hashtags)` | Instagram Graph API Carousel 업로드 |
| `create_instagram_container(image_url)` | 개별 이미지 컨테이너 생성 |
| `publish_instagram_carousel(container_ids, caption)` | Carousel 게시물 발행 |
| `post_to_threads(text, image_path)` | Threads API 게시 |
| `optimize_image(path, max_size_mb)` | 업로드 실패 시 이미지 최적화 |
| `get_optimal_publish_time()` | 현재 시간 기반 최적 발행 시간 판단 |

**지원 API:**

| 플랫폼 | API | 환경변수 | 비고 |
|--------|-----|----------|------|
| Instagram | Graph API v19.0 | `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ID` | Carousel 지원 |
| Threads | Threads API | `THREADS_ACCESS_TOKEN` | 텍스트 + 이미지 1장 |

## 공통 인수 조건

- [ ] AC-P301: 2개 에이전트 모두 `lib/base_agent.py`의 `BaseAgent`를 상속한다.
- [ ] AC-P302: 각 에이전트의 `__init__`에서 `spec_path`를 해당 `.md` 파일로 설정하여 System Prompt를 자동 로드한다.
- [ ] AC-P303: QA 에디터는 `anthropic` Python SDK로 Claude API를 호출하며, 퍼블리셔는 `lib/sns_client.py`를 통해 SNS API를 호출한다.
- [ ] AC-P304: 에이전트 간 데이터 핸드오프 시, QA 에디터의 `output_data`(`card_spec` + `sns_caption` + `qa_report`)가 오케스트레이터를 통해 인간 승인 단계로 전달된다.
- [ ] AC-P305: 인간 승인 완료 후, 오케스트레이터가 퍼블리셔의 `input_data`를 구성하여 전달한다 (`approved: true` + `final_cards` + `sns_caption` + `hashtags`).
- [ ] AC-P306: 모든 에이전트가 `WorkJournal`에 시작/완료/에러를 자동 기록한다 (`BaseAgent.run()` 내장 기능 활용).
- [ ] AC-P307: `SpecValidator`로 QA 에디터 출력의 card_spec 검증 시 error 레벨의 이슈가 0건이다.
- [ ] AC-P308: `orchestrator.register_agent()`로 2개 에이전트를 등록한 후 `run_qa_publishing_pipeline()`을 호출하면 qa_editor → (인간 승인) → publisher 순서로 정상 실행된다.
- [ ] AC-P309: Phase 1 + Phase 2 + Phase 3 연결 테스트 — `run_content_pipeline()` → `run_visual_pipeline()` → `run_qa_publishing_pipeline()` 순차 실행하여 AGENT 1→7 전체 파이프라인이 정상 동작한다.
- [ ] AC-P310: dry-run 모드에서 실제 API 호출(Claude, SNS) 없이 mock 데이터로 파이프라인이 정상 동작한다.

## 안전성 필터링 규칙

`config/settings.yaml` 기반:

| 분류 | 키워드 | 처리 방식 |
|------|--------|-----------|
| **차단 (block)** | `자해`, `자살`, `극단적 선택` | 즉시 감지 → 대체 표현으로 자동 수정 → `critical_issues`에 기록 |
| **경고 (warn)** | `우울증 진단`, `약물 처방`, `치료 방법` | 경고 플래그 설정 → `minor_issues`에 기록 → 전문가 상담 권유 문구 추가 |
| **진단 표현** | `당신은 ~증입니다`, `~로 진단됩니다` | 패턴 매칭 → 비판단적 표현으로 자동 수정 |

## 엔지니어 요청 태스크

| ID | 태스크 | 설명 | 우선순위 |
|----|--------|------|----------|
| T-E25 | QAEditorAgent 구현 | `agents/content_team/qa_editor.py` — 안전성 필터링, 팩트체크, 텍스트 검증, 자동 수정, QA 보고서 | P0 |
| T-E26 | PublisherAgent 구현 | `agents/content_team/publisher.py` — Instagram Carousel 업로드, Threads 게시, 발행 보고서 | P0 |
| T-E27 | 오케스트레이터 Phase 3 에이전트 등록 | `orchestrator/main.py`에 2개 에이전트 등록 + `run_qa_publishing_pipeline()` + 인간 승인 흐름 | P0 |
| T-E28 | Phase 3 통합 테스트 | mock 데이터로 QA 에디터 → 퍼블리셔 파이프라인 dry-run 테스트 | P1 |
| T-E29 | 전체 파이프라인 E2E 테스트 | AGENT 1→7 전체 파이프라인 dry-run 테스트 (mock 데이터) | P1 |

## 디자이너 요청 태스크

- 해당 없음 (Phase 3는 백엔드 에이전트 구현만 포함)

## 우선순위

P0

## 예상 완료

Sprint 6 완료: 2026-03-29 (2주)

## 참고 자료

- 에이전트 정의: `agents/content_team/06_qa_editor.md`, `07_publisher.md`
- 스키마: `schemas/card_spec.schema.json`
- 기반 클래스: `lib/base_agent.py`
- 오케스트레이터: `orchestrator/main.py`
- 에이전트 레지스트리: `agents/agent_registry.yaml`
- 설정 파일: `config/settings.yaml` (안전성 키워드, SNS 설정)
- Phase 1 PRD: `product_team/prds/phase1_content_pipeline.md`
- Phase 2 PRD: `product_team/prds/phase2_visual_pipeline.md`

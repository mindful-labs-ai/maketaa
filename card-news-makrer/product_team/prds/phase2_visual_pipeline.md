# PRD: Phase 2 — 비주얼 파이프라인 에이전트 구현

_작성자: PM Agent | 작성일: 2026-03-15_

## 배경 & 문제 정의

Phase 1에서 콘텐츠 파이프라인(리서처 → 전략가 → 카피라이터)이 완성되어, 주제 선정부터 카드 텍스트 생성까지 자동화되었다.
그러나 카피라이터의 출력에는 텍스트(`headline`, `body`, `sub_text`)만 포함되어 있으며, `card_spec.schema.json`의 `style` 필드(컬러 팔레트, 폰트, 레이아웃)와 `background` 필드(배경 이미지)가 비어 있다.
현재 디자인과 이미지 생성을 수동으로 처리해야 하므로, 콘텐츠 제작 자동화가 텍스트 단계에서 멈춘 상태이다.

## 목표

1. AGENT 4(디자인 디렉터) → AGENT 5(이미지 제너레이터) 비주얼 파이프라인을 Python으로 구현하여, 텍스트 완성 후 → 비주얼 디자인 → 배경 이미지 생성을 자동화한다.
2. 디자인 디렉터가 Claude API를 호출하여 주제에 맞는 컬러 팔레트, 레이아웃, 이미지 프롬프트를 생성한다.
3. 이미지 제너레이터가 DALL-E 또는 Flux API를 호출하여 1080x1080 배경 이미지를 생성하고 에셋을 관리한다.
4. 파이프라인 완료 시 `card_spec.schema.json`을 완전히 준수하는 card_spec JSON(텍스트 + 스타일 + 배경 이미지)을 출력한다.
5. Phase 1 파이프라인과 연결하여 `run_content_pipeline()` → `run_visual_pipeline()` 순차 실행이 가능하게 한다.

## 범위

### In Scope

- `agents/content_team/design_director.py` — BaseAgent 상속, 디자인 디렉터 에이전트
- `agents/content_team/image_generator.py` — BaseAgent 상속, 이미지 제너레이터 에이전트
- 이미지 생성 API 연동 유틸리티 (`lib/image_client.py`) — DALL-E / Flux API 래퍼
- 에이전트 간 Input/Output JSON 스키마 준수 및 검증
- 오케스트레이터에 2개 에이전트 인스턴스 등록 (`run_visual_pipeline()`)
- 이미지 에셋 저장 및 경로 관리 (`output/{YYYY-MM-DD}/assets/`)
- Phase 2 통합 테스트 (dry-run)

### Out of Scope

- AGENT 6(QA 에디터) 이후 에이전트 구현 (Phase 3)
- 캔버스 에디터 UI 변경
- 실시간 이미지 편집/재생성 UI
- Pillow 기반 텍스트 합성 렌더링 (Phase 3에서 처리)
- 스케줄러 자동 트리거 연동
- 이미지 저작권/라이선스 검증

## 사용자 스토리

- AS A 운영자, I WANT TO Phase 1 파이프라인으로 텍스트가 완성되면 자동으로 비주얼 디자인과 배경 이미지가 생성되도록, SO THAT 디자인 작업 없이 완성된 카드뉴스를 얻을 수 있다.
- AS A 운영자, I WANT TO 생성된 컬러 팔레트와 레이아웃이 멘탈헬스 톤에 맞도록, SO THAT 별도의 디자인 검수 없이 바로 사용할 수 있다.
- AS A 운영자, I WANT TO 각 카드의 배경 이미지가 텍스트 가독성을 고려하여 생성되도록, SO THAT 텍스트와 배경의 조화로운 카드뉴스를 얻을 수 있다.
- AS A 개발자, I WANT TO 디자인 디렉터와 이미지 제너레이터를 독립적으로 테스트할 수 있도록, SO THAT 디버깅과 개선이 용이하다.

## 에이전트별 Input/Output 스키마 및 인수 조건

---

### AGENT 4: 디자인 디렉터 (Design Director)

**파일**: `agents/content_team/design_director.py`
**클래스**: `DesignDirectorAgent(BaseAgent)`
**모델**: `claude-sonnet-4-20250514`
**에이전트 정의**: `agents/content_team/04_design_director.md`

#### Input Schema

```json
{
  "type": "object",
  "required": ["card_spec"],
  "properties": {
    "card_spec": {
      "type": "object",
      "required": ["meta", "cards"],
      "properties": {
        "meta": {
          "type": "object",
          "required": ["topic", "total_cards"],
          "properties": {
            "topic": { "type": "string" },
            "angle": { "type": "string" },
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
    "style_override": {
      "type": "object",
      "description": "운영자가 수동으로 지정하는 스타일 오버라이드 (선택)",
      "properties": {
        "palette_name": {
          "type": "string",
          "enum": ["calm", "warm", "nature", "soft"],
          "description": "tokens.yaml 기반 팔레트 지정"
        },
        "font_override": {
          "type": "object",
          "properties": {
            "headline": { "type": "string" },
            "body": { "type": "string" }
          }
        }
      }
    }
  }
}
```

#### Output Schema

```json
{
  "type": "object",
  "required": ["agent_id", "card_spec", "image_prompts"],
  "properties": {
    "agent_id": {
      "type": "string",
      "const": "design_director"
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
            "angle": { "type": "string" },
            "created_at": { "type": "string", "format": "date" },
            "total_cards": { "type": "integer", "minimum": 6, "maximum": 10 }
          }
        },
        "style": {
          "type": "object",
          "required": ["palette", "font", "card_size"],
          "properties": {
            "palette": {
              "type": "object",
              "required": ["name", "primary", "secondary", "accent", "background", "text_color"],
              "properties": {
                "name": { "type": "string", "enum": ["calm", "warm", "nature", "soft"] },
                "primary": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
                "secondary": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
                "accent": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
                "background": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
                "text_color": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" }
              }
            },
            "font": {
              "type": "object",
              "required": ["headline", "body"],
              "properties": {
                "headline": { "type": "string", "default": "Pretendard Bold" },
                "body": { "type": "string", "default": "Pretendard Regular" }
              }
            },
            "card_size": {
              "type": "object",
              "required": ["width", "height"],
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
              "layout": {
                "type": "object",
                "required": ["type", "text_area", "text_align"],
                "properties": {
                  "type": {
                    "type": "string",
                    "enum": ["center_text", "top_text", "bottom_text", "left_text", "right_text", "split"],
                    "description": "텍스트 배치 유형"
                  },
                  "text_area": {
                    "type": "object",
                    "required": ["x", "y", "width", "height"],
                    "properties": {
                      "x": { "type": "integer", "minimum": 0, "maximum": 1080 },
                      "y": { "type": "integer", "minimum": 0, "maximum": 1080 },
                      "width": { "type": "integer", "minimum": 100, "maximum": 1080 },
                      "height": { "type": "integer", "minimum": 100, "maximum": 1080 }
                    }
                  },
                  "text_align": {
                    "type": "string",
                    "enum": ["left", "center", "right"]
                  }
                }
              },
              "background": {
                "type": "object",
                "required": ["type", "prompt"],
                "properties": {
                  "type": {
                    "type": "string",
                    "enum": ["generated", "gradient", "solid"]
                  },
                  "prompt": {
                    "type": ["string", "null"],
                    "description": "이미지 생성 프롬프트 (type이 generated인 경우)"
                  },
                  "src": {
                    "type": ["string", "null"],
                    "default": null,
                    "description": "이미지 경로 (생성 전에는 null)"
                  },
                  "overlay_opacity": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                    "default": 0.3,
                    "description": "텍스트 가독성을 위한 오버레이 투명도"
                  }
                }
              }
            }
          }
        }
      }
    },
    "image_prompts": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["card_number", "prompt", "negative_prompt", "style"],
        "properties": {
          "card_number": { "type": "integer", "minimum": 1 },
          "prompt": {
            "type": "string",
            "minLength": 20,
            "description": "이미지 생성 AI용 영문 프롬프트"
          },
          "negative_prompt": {
            "type": "string",
            "description": "생성 금지 요소 (예: dark, scary, text, letters)"
          },
          "style": {
            "type": "string",
            "enum": ["watercolor_soft", "flat_illustration", "minimal_gradient", "photo_abstract", "paper_texture"],
            "description": "이미지 스타일 프리셋"
          }
        }
      }
    }
  }
}
```

#### Acceptance Criteria

- [ ] AC-DD01: `BaseAgent`를 상속하고 `execute(call: AgentCall) -> AgentResult`를 구현한다.
- [ ] AC-DD02: `.md` 정의 파일에서 System Prompt를 자동 로드한다 (`spec_path = agents/content_team/04_design_director.md`).
- [ ] AC-DD03: Claude API를 호출하여 주제에 적합한 컬러 팔레트를 선정한다 (`calm`, `warm`, `nature`, `soft` 중 택 1).
- [ ] AC-DD04: `style.palette`의 모든 색상 값이 유효한 hex 코드(`#RRGGBB`)이다.
- [ ] AC-DD05: `style.palette.text_color`와 `style.palette.background` 사이의 WCAG AA 대비율(4.5:1 이상)을 충족한다.
- [ ] AC-DD06: `cards` 배열의 각 항목에 `layout` 객체가 포함되며, `text_area` 좌표가 1080x1080 범위 내이다.
- [ ] AC-DD07: `cards[0].role`이 `"cover"`이며 `layout.type`이 `"center_text"`이다.
- [ ] AC-DD08: 각 카드의 `background.prompt`에 이미지 생성 프롬프트가 포함된다 (영문, 20자 이상).
- [ ] AC-DD09: `background.prompt`에 텍스트/글자 관련 요소가 포함되지 않는다 (이미지 내 텍스트 렌더링 방지).
- [ ] AC-DD10: `image_prompts` 배열의 `negative_prompt`에 "text", "letters", "words" 중 하나 이상이 포함된다.
- [ ] AC-DD11: 같은 세트 내 모든 카드가 동일한 `style.palette`를 공유하여 시각적 통일감을 유지한다.
- [ ] AC-DD12: `style_override`가 입력에 포함된 경우, 해당 값이 자동 선정 결과를 오버라이드한다.
- [ ] AC-DD13: 출력 JSON이 위 Output Schema를 100% 준수한다.
- [ ] AC-DD14: Claude API 호출 실패 시 `AgentResult(status="failure")`를 반환하고 에러 메시지를 포함한다.

---

### AGENT 5: 이미지 제너레이터 (Image Generator)

**파일**: `agents/content_team/image_generator.py`
**클래스**: `ImageGeneratorAgent(BaseAgent)`
**모델**: `claude-sonnet-4-20250514` (오케스트레이션용) + DALL-E 3 / Flux (이미지 생성용)
**에이전트 정의**: `agents/content_team/05_image_generator.md`

#### Input Schema

```json
{
  "type": "object",
  "required": ["card_spec", "image_prompts"],
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
            "created_at": { "type": "string", "format": "date" },
            "total_cards": { "type": "integer", "minimum": 6, "maximum": 10 }
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
            "required": ["card_number", "texts", "layout", "background"],
            "properties": {
              "card_number": { "type": "integer", "minimum": 1 },
              "texts": { "type": "object" },
              "layout": { "type": "object" },
              "background": {
                "type": "object",
                "required": ["type", "prompt"],
                "properties": {
                  "type": { "type": "string", "enum": ["generated", "gradient", "solid"] },
                  "prompt": { "type": ["string", "null"] },
                  "src": { "type": ["string", "null"] }
                }
              }
            }
          }
        }
      }
    },
    "image_prompts": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["card_number", "prompt", "negative_prompt", "style"],
        "properties": {
          "card_number": { "type": "integer" },
          "prompt": { "type": "string" },
          "negative_prompt": { "type": "string" },
          "style": { "type": "string" }
        }
      }
    },
    "output_dir": {
      "type": "string",
      "description": "에셋 저장 디렉토리 (기본값: output/{YYYY-MM-DD})",
      "default": null
    }
  }
}
```

#### Output Schema

```json
{
  "type": "object",
  "required": ["agent_id", "card_spec", "assets", "generation_log"],
  "properties": {
    "agent_id": {
      "type": "string",
      "const": "image_generator"
    },
    "card_spec": {
      "type": "object",
      "required": ["meta", "style", "cards"],
      "properties": {
        "meta": { "type": "object" },
        "style": { "type": "object" },
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
              "texts": { "type": "object" },
              "layout": { "type": "object" },
              "background": {
                "type": "object",
                "required": ["type", "src", "prompt_used"],
                "properties": {
                  "type": { "type": "string", "enum": ["generated", "gradient", "solid"] },
                  "src": {
                    "type": "string",
                    "pattern": "^output/.+\\.png$",
                    "description": "생성된 이미지 파일 경로"
                  },
                  "prompt_used": {
                    "type": "string",
                    "description": "실제 사용된 프롬프트"
                  },
                  "overlay_opacity": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1
                  }
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
          "bg_path": {
            "type": "string",
            "pattern": "^output/.+/assets/card_[0-9]+_bg\\.png$",
            "description": "배경 이미지 경로"
          },
          "preview_path": {
            "type": "string",
            "pattern": "^output/.+/cards/card_[0-9]+_preview\\.png$",
            "description": "미리보기 이미지 경로"
          }
        }
      }
    },
    "generation_log": {
      "type": "object",
      "required": ["total_images", "success", "failed", "retries"],
      "properties": {
        "total_images": { "type": "integer", "minimum": 1 },
        "success": { "type": "integer", "minimum": 0 },
        "failed": { "type": "integer", "minimum": 0 },
        "retries": { "type": "integer", "minimum": 0 }
      }
    }
  }
}
```

#### Acceptance Criteria

- [ ] AC-IG01: `BaseAgent`를 상속하고 `execute(call: AgentCall) -> AgentResult`를 구현한다.
- [ ] AC-IG02: `.md` 정의 파일에서 System Prompt를 자동 로드한다 (`spec_path = agents/content_team/05_image_generator.md`).
- [ ] AC-IG03: `lib/image_client.py`를 통해 DALL-E 3 또는 Flux API를 호출하여 이미지를 생성한다.
- [ ] AC-IG04: 생성된 이미지 크기가 1080x1080px이다.
- [ ] AC-IG05: 배경 이미지 저장 경로가 `output/{YYYY-MM-DD}/assets/card_{N}_bg.png` 형식을 따른다.
- [ ] AC-IG06: 미리보기 이미지 저장 경로가 `output/{YYYY-MM-DD}/cards/card_{N}_preview.png` 형식을 따른다.
- [ ] AC-IG07: 출력의 `card_spec.cards[*].background.src`가 생성된 이미지 파일의 실제 경로를 가리킨다.
- [ ] AC-IG08: `generation_log.total_images`가 입력의 `card_spec.meta.total_cards`와 일치한다.
- [ ] AC-IG09: `generation_log.success + generation_log.failed`가 `generation_log.total_images`와 일치한다.
- [ ] AC-IG10: 이미지 생성 실패 시 최대 2회 재시도하며, 재시도 횟수를 `generation_log.retries`에 기록한다.
- [ ] AC-IG11: 모든 이미지 생성 실패 시에도 `AgentResult(status="partial")`를 반환하고, 실패한 카드의 `background.src`를 null로 설정한다.
- [ ] AC-IG12: API 키는 환경변수 `OPENAI_API_KEY` (DALL-E) 또는 `FLUX_API_KEY` (Flux)에서 읽는다.
- [ ] AC-IG13: 출력 JSON이 위 Output Schema를 100% 준수한다.
- [ ] AC-IG14: 출력의 `card_spec`이 `schemas/card_spec.schema.json`의 `cards[*].style` 및 `cards[*].background` 구조와 호환된다.

---

## 파이프라인 데이터 흐름

```
[Phase 1 완료]
     │
     │  card_spec: { meta, cards[{ texts }] }  (텍스트만 포함)
     ▼
[AGENT 4: Design Director]
     │  Input:  { card_spec: { meta, cards[{ texts }] }, style_override? }
     │  Output: { agent_id, card_spec: { meta, style, cards[{ texts, layout, background }] }, image_prompts[] }
     ▼
[AGENT 5: Image Generator]
     │  Input:  { card_spec: { meta, style, cards[{ texts, layout, background }] }, image_prompts[] }
     │  Output: { agent_id, card_spec: { 완성본 }, assets[], generation_log }
     ▼
[card_spec.json 저장] → Phase 3에서 QA Editor로 전달
     │
     ▼
[output/{YYYY-MM-DD}/]
  ├── card_spec.json          # 완성된 스펙
  ├── assets/
  │   ├── card_1_bg.png       # 배경 이미지
  │   ├── card_2_bg.png
  │   └── ...
  └── cards/
      ├── card_1_preview.png  # 미리보기
      ├── card_2_preview.png
      └── ...
```

## 공통 인수 조건

- [ ] AC-V01: 2개 에이전트 모두 `lib/base_agent.py`의 `BaseAgent`를 상속한다.
- [ ] AC-V02: 각 에이전트의 `__init__`에서 `spec_path`를 해당 `.md` 파일로 설정하여 System Prompt를 자동 로드한다.
- [ ] AC-V03: 디자인 디렉터는 `anthropic` Python SDK로 Claude API를 호출하며, 이미지 제너레이터는 `openai` Python SDK (또는 Flux API 클라이언트)로 이미지 생성 API를 호출한다.
- [ ] AC-V04: 에이전트 간 데이터 핸드오프 시, 디자인 디렉터의 `output_data`(`card_spec` + `image_prompts`)가 이미지 제너레이터의 `input_data`로 그대로 전달된다 (오케스트레이터가 처리).
- [ ] AC-V05: 모든 에이전트가 `WorkJournal`에 시작/완료/에러를 자동 기록한다 (`BaseAgent.run()` 내장 기능 활용).
- [ ] AC-V06: `SpecValidator`로 최종 card_spec 검증 시 error 레벨의 이슈가 0건이다.
- [ ] AC-V07: `orchestrator.register_agent()`로 2개 에이전트를 등록한 후 `run_visual_pipeline()`을 호출하면 design_director → image_generator 순서로 정상 실행된다.
- [ ] AC-V08: Phase 1 + Phase 2 연결 테스트 — `run_content_pipeline()` 완료 후 `run_visual_pipeline()`을 순차 실행하여 완성된 card_spec JSON + 이미지 에셋이 생성된다.
- [ ] AC-V09: dry-run 모드에서 실제 API 호출 없이 mock 데이터로 파이프라인이 정상 동작한다.

## 이미지 생성 API 유틸리티

### `lib/image_client.py`

| 기능 | 설명 |
|------|------|
| `generate_image(prompt, negative_prompt, size, style)` | 이미지 생성 API 호출 래퍼 |
| `save_image(image_data, path)` | 생성된 이미지를 로컬 파일로 저장 |
| `resize_image(path, width, height)` | 이미지 크기 조정 (1080x1080 보장) |
| `get_provider()` | 환경변수 기반 API 제공자 자동 감지 (DALL-E / Flux) |

**지원 API 제공자:**

| 제공자 | 환경변수 | 모델 | 비고 |
|--------|----------|------|------|
| DALL-E 3 | `OPENAI_API_KEY` | dall-e-3 | 기본 제공자 |
| Flux | `FLUX_API_KEY` | flux-pro | 대안 제공자 |

## 엔지니어 요청 태스크

| ID | 태스크 | 설명 | 우선순위 |
|----|--------|------|----------|
| T-E21 | DesignDirectorAgent 구현 | `agents/content_team/design_director.py` — 컬러 팔레트, 레이아웃, 이미지 프롬프트 생성 | P0 |
| T-E22 | ImageGeneratorAgent 구현 | `agents/content_team/image_generator.py` — 이미지 생성 API 연동 + 에셋 관리 | P0 |
| T-E23 | 오케스트레이터 Phase 2 에이전트 등록 | `orchestrator/main.py`에 2개 에이전트 등록 + `run_visual_pipeline()` 추가 | P0 |
| T-E24 | Phase 2 통합 테스트 (dry-run) | mock 데이터로 디자인 디렉터 → 이미지 제너레이터 파이프라인 테스트 | P1 |

## 디자이너 요청 태스크

- 해당 없음 (Phase 2는 백엔드 에이전트 구현만 포함)

## 우선순위

P0

## 예상 완료

Sprint 5 완료: 2026-03-28 (1주)

## 참고 자료

- 에이전트 정의: `agents/content_team/04_design_director.md`, `05_image_generator.md`
- 스키마: `schemas/card_spec.schema.json`
- 기반 클래스: `lib/base_agent.py`
- 오케스트레이터: `orchestrator/main.py`
- 에이전트 레지스트리: `agents/agent_registry.yaml`
- Phase 1 PRD: `product_team/prds/phase1_content_pipeline.md`

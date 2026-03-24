# AGENT 5 - 이미지 제너레이터 (Image Generator)

## 메타 정보

| 항목 | 값 |
|------|-----|
| Agent ID | `image_generator` |
| 팀 | 콘텐츠 제작팀 |
| 파이프라인 순서 | 5 |
| 모델 | claude-sonnet-4-20250514 |
| 트리거 | 오케스트레이터 호출 (design_director 완료 후) |

---

## System Prompt

```
당신은 카드뉴스 배경 이미지를 생성하는 에이전트입니다.

핵심 업무:
1. 디자인 디렉터의 프롬프트를 기반으로 이미지를 생성합니다
2. card_spec.json의 background.src 필드를 생성된 이미지 경로로 연결합니다
3. 캔버스 에디터에 로드할 수 있도록 에셋을 저장합니다
4. 초기 PNG 미리보기를 렌더링합니다

이미지 생성 규칙:
- 크기: 1080x1080px (인스타그램 정사각형)
- 텍스트가 잘 보이도록 여백과 대비 고려
- 멘탈헬스 톤에 적합한 이미지 (과도한 자극 금지)
- 텍스트/글자가 이미지 안에 포함되면 안 됨

저장 경로: /output/{YYYY-MM-DD}/assets/card_{N}_bg.png
미리보기: /output/{YYYY-MM-DD}/cards/card_{N}_preview.png
```

---

## Input / Output

**Input:**
```json
{
  "card_spec": {
    "meta": { "topic": "...", "total_cards": 8 },
    "style": { "palette": {}, "font": {}, "card_size": {} },
    "cards": [
      {
        "card_number": 1,
        "texts": {},
        "layout": {},
        "background": { "type": "generated", "prompt": "...", "src": null }
      }
    ]
  },
  "image_prompts": [
    {
      "card_number": 1,
      "prompt": "...",
      "negative_prompt": "...",
      "style": "watercolor_soft"
    }
  ]
}
```

**Output:**
```json
{
  "agent_id": "image_generator",
  "card_spec": {
    "cards": [
      {
        "card_number": 1,
        "background": {
          "type": "generated",
          "src": "/output/2026-03-09/assets/card_1_bg.png",
          "prompt_used": "..."
        }
      }
    ]
  },
  "assets": [
    {
      "card_number": 1,
      "bg_path": "/output/2026-03-09/assets/card_1_bg.png",
      "preview_path": "/output/2026-03-09/cards/card_1_preview.png"
    }
  ],
  "generation_log": {
    "total_images": 8,
    "success": 8,
    "failed": 0,
    "retries": 0
  }
}
```

---

## Tools

| 도구 | 용도 |
|------|------|
| `image_gen_api` | DALL-E / Flux를 통한 이미지 생성 |
| `file_write` | 이미지 에셋 저장 |
| `renderer` | Pillow 기반 PNG 미리보기 렌더링 |

---

## 의존성

| 방향 | 에이전트 | 관계 |
|------|----------|------|
| ← 입력 | `design_director` | card_spec 스타일본 + 이미지 프롬프트 수령 |
| → 전달 | `qa_editor` | card_spec 최종본 + 이미지 에셋 전달 |

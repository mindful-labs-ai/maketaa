"""
DesignDirectorAgent — 카드뉴스 디자인 디렉터 에이전트

카피라이터가 완성한 card_spec을 기반으로 시각적 방향을 설계합니다.
- 카드별 레이아웃, 컬러 팔레트, 폰트 스타일 결정
- 배경 타입 및 이미지 생성 프롬프트 작성
- image_prompts 배열 생성 (DALL-E/Flux용)
"""

import json
import logging
import re
import sys
from pathlib import Path
from typing import Any

# 프로젝트 루트를 sys.path에 추가
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from lib.base_agent import BaseAgent, AgentCall, AgentResult
from lib.claude_client import ClaudeClient

logger = logging.getLogger(__name__)

# ── 스키마 기반 유효값 ──

VALID_LAYOUTS = [
    "center", "top-left", "top-right",
    "bottom-left", "bottom-right", "split",
]

VALID_BACKGROUND_TYPES = ["image", "gradient", "solid"]

VALID_IMAGE_STYLES = ["watercolor", "flat", "photographic", "abstract"]

HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")


class DesignDirectorAgent(BaseAgent):
    """
    디자인 디렉터 에이전트

    카피라이터의 card_spec(텍스트 완성본)을 받아
    각 카드의 스타일, 배경, 이미지 프롬프트를 생성합니다.
    """

    def __init__(self, config: dict | None = None):
        spec_path = Path(__file__).resolve().parent / "04_design_director.md"
        super().__init__(
            agent_id="design_director",
            spec_path=spec_path,
            config=config or {},
        )
        self.client = ClaudeClient(
            max_tokens=self.config.get("max_tokens", 4096),
            temperature=self.config.get("temperature", 0.5),
        )

    # ── 메인 실행 ──

    def execute(self, call: AgentCall) -> AgentResult:
        """
        디자인 디렉팅 실행

        Args:
            call: AgentCall — input_data에 카피라이터 출력(card_spec)이 담겨 있음

        Returns:
            AgentResult — output_data에 스타일 완성된 card_spec + image_prompts 포함
        """
        logs: list[str] = []
        input_data = call.input_data

        # 1. 입력 데이터 검증
        card_spec = input_data.get("card_spec")
        if not card_spec:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error="필수 입력 데이터 누락: card_spec",
                logs=["입력 검증 실패 — card_spec이 없습니다"],
            )

        cards = card_spec.get("cards", [])
        if not cards:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error="card_spec에 cards 배열이 비어있습니다",
                logs=["입력 검증 실패 — cards 배열이 비어있습니다"],
            )

        meta = card_spec.get("meta", {})
        total_cards = len(cards)
        logs.append(f"입력 수신 — 주제: {meta.get('topic', '?')}, 카드 수: {total_cards}")

        # 2. Claude API를 통해 디자인 방향 생성
        try:
            raw_result = self._generate_design(card_spec, meta, cards)
            logs.append("Claude API 호출 성공 — 디자인 방향 생성 완료")
        except Exception as e:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error=f"디자인 생성 실패: {e}",
                logs=[f"Claude API 호출 에러: {e}"],
            )

        # 3. 응답 검증 및 card_spec에 병합
        try:
            styled_cards = self._merge_styles(cards, raw_result.get("cards", []), logs)
            image_prompts = self._validate_image_prompts(
                raw_result.get("image_prompts", []), total_cards, logs,
            )
        except Exception as e:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error=f"디자인 결과 병합/검증 실패: {e}",
                logs=[f"병합/검증 에러: {e}"],
            )

        # 4. 최종 card_spec 조립
        styled_card_spec = {
            **card_spec,
            "cards": styled_cards,
        }

        logs.append(
            f"card_spec 스타일 완성 — 카드 {len(styled_cards)}장, "
            f"이미지 프롬프트 {len(image_prompts)}개"
        )

        return AgentResult(
            agent_id=self.agent_id,
            status="success",
            output_data={
                "card_spec": styled_card_spec,
                "image_prompts": image_prompts,
            },
            logs=logs,
        )

    # ── Claude API 호출 ──

    def _generate_design(
        self,
        card_spec: dict,
        meta: dict,
        cards: list[dict],
    ) -> dict:
        """Claude API로 디자인 방향을 일괄 생성"""

        user_message = self._build_user_message(card_spec, meta, cards)

        response_schema = {
            "cards": [
                {
                    "card_number": 1,
                    "style": {
                        "layout": "center",
                        "color_palette": {
                            "primary": "#7B68EE",
                            "secondary": "#F8F7FF",
                            "accent": "#9B8FFF",
                            "background": "#2D2D2D",
                            "text": "#FFFFFF",
                        },
                        "font": {
                            "headline_family": "Pretendard Bold",
                            "body_family": "Pretendard Regular",
                            "headline_size": 36,
                            "body_size": 18,
                        },
                    },
                    "background": {
                        "type": "image",
                        "prompt": "이미지 생성 프롬프트 (영문)",
                        "overlay_opacity": 0.3,
                    },
                }
            ],
            "image_prompts": [
                {
                    "card_number": 1,
                    "prompt": "Soft watercolor illustration of...",
                    "style": "watercolor",
                    "mood": "calm",
                }
            ],
        }

        result: dict = self.client.chat_with_retry(
            system_prompt=self.system_prompt,
            user_message=user_message,
            json_mode=True,
            response_schema=response_schema,
            max_retries=3,
        )

        return result

    def _build_user_message(
        self,
        card_spec: dict,
        meta: dict,
        cards: list[dict],
    ) -> str:
        """Claude에게 전달할 사용자 메시지 구성"""

        # 카드 정보 정리
        cards_summary = []
        for card in cards:
            idx = card.get("index", card.get("card_number", "?"))
            role = card.get("role", "?")
            text = card.get("text", card.get("texts", {}))
            headline = text.get("headline", "")
            body = text.get("body", "")
            cards_summary.append(
                f"  - 카드 {idx} ({role}): headline=\"{headline}\", body=\"{body}\""
            )
        cards_text = "\n".join(cards_summary)

        message = f"""다음 카드뉴스의 비주얼 디자인 방향을 설계해주세요.

## 주제 정보
- 토픽: {meta.get('topic', '')}
- 앵글: {meta.get('angle', '')}
- 타겟: {meta.get('target_persona', '')}

## 카드 목록 (총 {len(cards)}장)
{cards_text}

## 디자인 요구사항

각 카드에 대해 다음을 결정해주세요:

1. **style.layout**: 다음 중 하나 — {', '.join(VALID_LAYOUTS)}
2. **style.color_palette**: 5가지 hex 색상 (#XXXXXX 형식)
   - primary, secondary, accent, background, text
   - 세트 전체에서 통일감 있는 팔레트 사용
   - 멘탈헬스 주제에 맞는 부드럽고 안정감 있는 색상
3. **style.font**: headline_family, body_family, headline_size(px), body_size(px)
4. **background.type**: 다음 중 하나 — {', '.join(VALID_BACKGROUND_TYPES)}
5. **background.prompt**: 영문 이미지 생성 프롬프트 (DALL-E/Flux용)
   - 텍스트 가독성을 해치지 않는 배경 이미지
   - 과도한 자극이나 어두운 이미지 금지
6. **background.overlay_opacity**: 0~1 사이 값 (텍스트 가독성 확보용)

또한 **image_prompts** 배열도 생성해주세요:
- card_number: 카드 번호
- prompt: 영문 이미지 생성 프롬프트
- style: 다음 중 하나 — {', '.join(VALID_IMAGE_STYLES)}
- mood: 이미지의 분위기 (calm, warm, hopeful, serene, gentle 등)

## 주의사항
- 모든 색상 값은 반드시 #XXXXXX 형식 (6자리 hex)
- 커버(cover)와 마지막 카드(closing/cta)는 특히 시각적으로 차별화
- 같은 세트 내에서 시각적 통일감 유지
- 배경 이미지 프롬프트에 텍스트나 글자 생성 지시 금지
- 카드 수({len(cards)}장)에 맞게 정확히 생성"""

        return message

    # ── 결과 병합 및 검증 ──

    def _merge_styles(
        self,
        original_cards: list[dict],
        design_cards: list[dict],
        logs: list[str],
    ) -> list[dict]:
        """
        Claude 응답의 디자인 정보를 원본 카드에 병합합니다.
        """
        # design_cards를 card_number 기준 dict로 변환
        design_map: dict[int, dict] = {}
        for dc in design_cards:
            cn = dc.get("card_number")
            if cn is not None:
                design_map[cn] = dc

        styled_cards: list[dict] = []

        for card in original_cards:
            card_num = card.get("index", card.get("card_number", 0))
            design = design_map.get(card_num, {})

            # 스타일 병합
            design_style = design.get("style", {})
            merged_style = self._validate_style(design_style, card_num, logs)

            # 배경 병합
            design_bg = design.get("background", {})
            merged_bg = self._validate_background(design_bg, card_num, logs)

            styled_card = {
                **card,
                "style": merged_style,
                "background": merged_bg,
            }
            styled_cards.append(styled_card)

        return styled_cards

    def _validate_style(
        self,
        style: dict,
        card_number: int,
        logs: list[str],
    ) -> dict:
        """스타일 필드를 검증하고 기본값으로 보완"""

        # layout 검증
        layout = style.get("layout", "center")
        if layout not in VALID_LAYOUTS:
            logs.append(
                f"[경고] 카드 {card_number} layout '{layout}' 유효하지 않음 → 'center'로 대체"
            )
            layout = "center"

        # color_palette 검증
        palette = style.get("color_palette", {})
        validated_palette: dict[str, str] = {}
        default_colors = {
            "primary": "#7B68EE",
            "secondary": "#F8F7FF",
            "accent": "#9B8FFF",
            "background": "#2D2D2D",
            "text": "#FFFFFF",
        }
        for color_key, default_val in default_colors.items():
            color_val = palette.get(color_key, default_val)
            if not self._is_valid_hex_color(color_val):
                logs.append(
                    f"[경고] 카드 {card_number} {color_key} 색상 '{color_val}' "
                    f"유효하지 않음 → '{default_val}'로 대체"
                )
                color_val = default_val
            validated_palette[color_key] = color_val

        # font 검증
        font = style.get("font", {})
        validated_font = {
            "headline_family": font.get("headline_family", "Pretendard Bold"),
            "body_family": font.get("body_family", "Pretendard Regular"),
            "headline_size": self._ensure_int(font.get("headline_size", 36), 36),
            "body_size": self._ensure_int(font.get("body_size", 18), 18),
        }

        return {
            "layout": layout,
            "color_palette": validated_palette,
            "font": validated_font,
        }

    def _validate_background(
        self,
        background: dict,
        card_number: int,
        logs: list[str],
    ) -> dict:
        """배경 필드를 검증하고 기본값으로 보완"""

        bg_type = background.get("type", "image")
        if bg_type not in VALID_BACKGROUND_TYPES:
            logs.append(
                f"[경고] 카드 {card_number} background.type '{bg_type}' "
                f"유효하지 않음 → 'image'로 대체"
            )
            bg_type = "image"

        prompt = background.get("prompt") or None
        src = background.get("src") or None

        overlay_opacity = background.get("overlay_opacity", 0.3)
        if not isinstance(overlay_opacity, (int, float)):
            overlay_opacity = 0.3
        overlay_opacity = max(0.0, min(1.0, float(overlay_opacity)))

        return {
            "type": bg_type,
            "src": src,
            "prompt": prompt,
            "overlay_opacity": overlay_opacity,
        }

    def _validate_image_prompts(
        self,
        image_prompts: list[dict],
        total_cards: int,
        logs: list[str],
    ) -> list[dict]:
        """image_prompts 배열을 검증"""

        validated: list[dict] = []

        for ip in image_prompts:
            card_number = ip.get("card_number")
            if card_number is None:
                continue

            prompt = ip.get("prompt", "")
            if not prompt:
                logs.append(f"[경고] image_prompts 카드 {card_number} prompt가 비어있음 — 건너뜀")
                continue

            style = ip.get("style", "watercolor")
            if style not in VALID_IMAGE_STYLES:
                logs.append(
                    f"[경고] image_prompts 카드 {card_number} style '{style}' "
                    f"유효하지 않음 → 'watercolor'로 대체"
                )
                style = "watercolor"

            mood = ip.get("mood", "calm")

            validated.append({
                "card_number": card_number,
                "prompt": prompt,
                "style": style,
                "mood": mood,
            })

        if len(validated) != total_cards:
            logs.append(
                f"[경고] image_prompts 수({len(validated)})가 "
                f"카드 수({total_cards})와 불일치"
            )

        return validated

    # ── 유틸리티 ──

    @staticmethod
    def _is_valid_hex_color(value: Any) -> bool:
        """#XXXXXX 형식의 유효한 hex 색상인지 확인"""
        if not isinstance(value, str):
            return False
        return bool(HEX_COLOR_PATTERN.match(value))

    @staticmethod
    def _ensure_int(value: Any, default: int) -> int:
        """값을 int로 변환, 실패 시 기본값 반환"""
        try:
            return int(value)
        except (TypeError, ValueError):
            return default


# ── 테스트 코드 ──

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    print("=" * 60)
    print("DesignDirectorAgent 테스트")
    print("=" * 60)

    # 테스트용 입력 데이터 (카피라이터 출력 모사)
    test_input = {
        "card_spec": {
            "meta": {
                "id": "2026-03-15-001",
                "topic": "봄철 무기력감 극복",
                "angle": "계절 변화가 감정에 미치는 영향과 실천적 대처법",
                "target_persona": "20~30대 직장인, 최근 의욕 저하를 겪고 있는 사람",
                "created_at": "2026-03-15T09:00:00+09:00",
                "status": "draft",
                "sources": [],
            },
            "cards": [
                {
                    "index": i + 1,
                    "role": role,
                    "text": {
                        "headline": headline,
                        "body": body,
                        "sub_text": "",
                    },
                    "style": {
                        "layout": "center",
                        "color_palette": {
                            "primary": "#7B68EE",
                            "secondary": "#F8F7FF",
                            "text": "#FFFFFF",
                            "background": "#2D2D2D",
                        },
                        "font": {
                            "headline_family": "Pretendard Bold",
                            "headline_size": 36,
                            "body_family": "Pretendard Regular",
                            "body_size": 18,
                        },
                    },
                    "background": {
                        "type": "image",
                        "src": None,
                        "prompt": None,
                        "overlay_opacity": 0.3,
                    },
                }
                for i, (role, headline, body) in enumerate([
                    ("cover", "봄인데 왜 힘들까?", "계절이 바뀌면 마음도 흔들립니다"),
                    ("empathy", "당신만 그런 게 아니에요", "봄이면 더 무기력한 건 자연스러운 현상"),
                    ("cause", "몸이 보내는 신호", "일조량과 호르몬 변화가 원인입니다"),
                    ("insight", "무기력은 적신호", "몸과 마음이 쉬고 싶다는 뜻이에요"),
                    ("solution", "작은 루틴부터", "매일 5분, 작은 변화가 큰 차이를 만듭니다"),
                    ("tip", "오늘 해볼 것", "5분 산책, 채소 한 접시, 물 한 잔"),
                    ("tip", "셀프 체크리스트", "나를 돌보는 7가지 질문"),
                    ("closing", "괜찮아, 천천히", "완벽하지 않아도 충분합니다"),
                ])
            ],
            "sns": {
                "instagram": {
                    "caption": "봄이 와도 마음은 겨울인 당신에게...",
                    "hashtags": ["#멘탈헬스", "#봄철무기력", "#자기돌봄"],
                },
                "threads": {
                    "text": "봄인데 왜 이렇게 힘들까? 당신만 그런 게 아닙니다.",
                },
            },
        }
    }

    test_call = AgentCall(
        agent_id="design_director",
        task_type="card_news_design",
        input_data=test_input,
        context={"date": "2026-03-15", "session_id": "test-session-001"},
    )

    # 에이전트 생성 및 실행
    try:
        agent = DesignDirectorAgent()
        print(f"\n시스템 프롬프트 로드 완료 ({len(agent.system_prompt)}자)")
        print(f"시스템 프롬프트 미리보기:\n{agent.system_prompt[:200]}...\n")

        result = agent.execute(test_call)

        print(f"\n실행 결과 상태: {result.status}")
        print(f"소요 시간: {result.duration_ms}ms")
        print(f"로그 ({len(result.logs)}건):")
        for log_msg in result.logs:
            print(f"  - {log_msg}")

        if result.is_success():
            output_json = json.dumps(result.output_data, ensure_ascii=False, indent=2)
            print(f"\n출력 데이터:\n{output_json}")
        else:
            print(f"\n에러: {result.error}")

    except ValueError as e:
        print(f"\n초기화 실패 (API 키 미설정 등): {e}")
        print("ANTHROPIC_API_KEY 환경변수를 설정한 후 다시 시도하세요.")

        # API 없이 구조 확인용 더미 출력
        print("\n--- 구조 검증용 더미 출력 ---")
        dummy_output = {
            "card_spec": {
                "meta": test_input["card_spec"]["meta"],
                "cards": [
                    {
                        "index": 1,
                        "role": "cover",
                        "text": {"headline": "봄인데 왜 힘들까?", "body": "계절이 바뀌면 마음도 흔들립니다", "sub_text": ""},
                        "style": {
                            "layout": "center",
                            "color_palette": {
                                "primary": "#7B9EBD",
                                "secondary": "#B8D4E3",
                                "accent": "#4A7C9B",
                                "background": "#F0F4F8",
                                "text": "#2D2D2D",
                            },
                            "font": {
                                "headline_family": "Pretendard Bold",
                                "body_family": "Pretendard Regular",
                                "headline_size": 36,
                                "body_size": 18,
                            },
                        },
                        "background": {
                            "type": "image",
                            "src": None,
                            "prompt": "Soft pastel spring landscape with cherry blossoms, gentle morning light, minimalist composition",
                            "overlay_opacity": 0.35,
                        },
                    }
                ],
                "sns": test_input["card_spec"]["sns"],
            },
            "image_prompts": [
                {
                    "card_number": 1,
                    "prompt": "Soft watercolor illustration of spring morning with gentle sunlight filtering through cherry blossom petals, pastel blue and pink tones, peaceful atmosphere",
                    "style": "watercolor",
                    "mood": "calm",
                }
            ],
        }
        print(json.dumps(dummy_output, ensure_ascii=False, indent=2))

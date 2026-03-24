"""
CopywriterAgent — 카드뉴스 카피라이터 에이전트

전략가(strategist)의 기획안을 기반으로 각 카드의 텍스트를 작성하고,
card_spec.json 스키마에 맞는 구조를 완성합니다.
- 카드별 headline / body / sub_text / description / quote / bullet_points 작성
- 역할별 최적 콘텐츠 블록 선택 (cover→headline, empathy→quote, cause/solution/tip→bullet_points 등)
- 텍스트 길이 규칙 자동 검증 및 절단
- SNS 캡션(Instagram, Threads) 생성
"""

import json
import logging
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

# 프로젝트 루트를 sys.path에 추가
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from lib.base_agent import BaseAgent, AgentCall, AgentResult
from lib.claude_client import ClaudeClient

logger = logging.getLogger(__name__)

# 한국 표준시
KST = timezone(timedelta(hours=9))

# ── 텍스트 길이 제한 ──
TEXT_LIMITS: dict[str, int] = {
    "headline": 30,
    "body": 150,
    "sub_text": 100,
    "description": 300,
    "quote": 200,
    "bullet_points": 100,  # 각 항목 최대 100자
}

# ── 기본 스타일/배경 (디자인 디렉터가 후속 완성) ──
DEFAULT_STYLE: dict[str, Any] = {
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
}

DEFAULT_BACKGROUND: dict[str, Any] = {
    "type": "image",
    "src": None,
    "prompt": None,
    "overlay_opacity": 0.3,
}


class CopywriterAgent(BaseAgent):
    """
    카피라이터 에이전트

    전략가의 기획안(card_plan)을 받아 각 카드의 텍스트를 작성하고,
    card_spec.json 스키마에 부합하는 전체 출력을 생성합니다.
    """

    def __init__(self, config: dict | None = None):
        spec_path = Path(__file__).resolve().parent / "03_copywriter.md"
        super().__init__(
            agent_id="copywriter",
            spec_path=spec_path,
            config=config or {},
        )
        self.client = ClaudeClient(
            max_tokens=self.config.get("max_tokens", 4096),
            temperature=self.config.get("temperature", 0.7),
        )

    # ── 메인 실행 ──

    def execute(self, call: AgentCall) -> AgentResult:
        """
        카피라이팅 실행

        Args:
            call: AgentCall — input_data에 전략가 출력이 담겨 있음

        Returns:
            AgentResult — output_data에 card_spec 구조 포함
        """
        logs: list[str] = []
        input_data = call.input_data

        # 1. 입력 데이터 검증
        required_keys = ["selected_topic", "card_plan", "total_cards"]
        missing = [k for k in required_keys if k not in input_data]
        if missing:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error=f"필수 입력 데이터 누락: {', '.join(missing)}",
                logs=[f"입력 검증 실패 — 누락 키: {missing}"],
            )

        selected_topic = input_data["selected_topic"]
        persona = input_data.get("persona", {})
        card_plan = input_data["card_plan"]
        hashtags = input_data.get("hashtags", {})
        total_cards = input_data["total_cards"]

        logs.append(f"입력 수신 — 주제: {selected_topic.get('topic', '?')}, 카드 수: {total_cards}")

        # 2. Claude API를 통해 카드 텍스트 + SNS 캡션 일괄 생성
        try:
            raw_result = self._generate_texts(
                selected_topic=selected_topic,
                persona=persona,
                card_plan=card_plan,
                hashtags=hashtags,
                total_cards=total_cards,
            )
            logs.append("Claude API 호출 성공 — 텍스트 생성 완료")
        except Exception as e:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error=f"텍스트 생성 실패: {e}",
                logs=[f"Claude API 호출 에러: {e}"],
            )

        # 3. 응답에서 카드 텍스트와 SNS 캡션 추출
        generated_cards = raw_result.get("cards", [])
        sns_data = raw_result.get("sns", {})

        # 4. card_spec 구조 조립
        date_str = call.context.get("date", datetime.now(KST).strftime("%Y-%m-%d"))
        meta = self._build_meta(selected_topic, persona, date_str)
        cards = self._build_cards(generated_cards, card_plan, logs)
        sns = self._build_sns(sns_data, hashtags, logs)

        card_spec = {
            "meta": meta,
            "cards": cards,
            "sns": sns,
        }

        logs.append(f"card_spec 조립 완료 — 카드 {len(cards)}장, meta.id={meta['id']}")

        return AgentResult(
            agent_id=self.agent_id,
            status="success",
            output_data={"card_spec": card_spec},
            logs=logs,
        )

    # ── Claude API 호출 ──

    def _generate_texts(
        self,
        selected_topic: dict,
        persona: dict,
        card_plan: list[dict],
        hashtags: dict,
        total_cards: int,
    ) -> dict:
        """Claude API로 카드 텍스트 및 SNS 캡션을 일괄 생성"""

        # 사용자 메시지 구성
        user_message = self._build_user_message(
            selected_topic, persona, card_plan, hashtags, total_cards,
        )

        # 기대 응답 스키마 (Claude에게 구조를 안내)
        response_schema = {
            "cards": [
                {
                    "card_number": 1,
                    "role": "cover",
                    "headline": "30자 이내 헤드라인",
                    "body": "150자 이내 본문 (선택)",
                    "sub_text": "100자 이내 보조 텍스트 (선택)",
                    "description": "300자 이내 긴 설명 (선택 — insight, source 역할에 권장)",
                    "quote": "200자 이내 인용문 (선택 — empathy 역할에 권장)",
                    "bullet_points": ["항목1 (100자 이내)", "항목2"],
                }
            ],
            "sns": {
                "instagram": {
                    "caption": "인스타그램 캡션 (2200자 이내, 해시태그 포함)",
                    "hashtags": ["#해시태그1", "#해시태그2"],
                },
                "threads": {
                    "text": "스레드 텍스트 (500자 이내)",
                },
            },
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
        selected_topic: dict,
        persona: dict,
        card_plan: list[dict],
        hashtags: dict,
        total_cards: int,
    ) -> str:
        """Claude에게 전달할 사용자 메시지 구성"""

        # 카드 플랜 정리
        plan_text = "\n".join(
            f"  - 카드 {cp.get('card_number', i+1)} ({cp.get('role', '?')}): {cp.get('content_direction', '')}"
            for i, cp in enumerate(card_plan)
        )

        # 해시태그 정리
        all_tags = (
            hashtags.get("primary", [])
            + hashtags.get("secondary", [])
            + hashtags.get("trending", [])
        )
        hashtags_text = ", ".join(all_tags) if all_tags else "(없음)"

        message = f"""다음 기획안을 바탕으로 카드뉴스 텍스트를 작성해주세요.

## 주제
- 토픽: {selected_topic.get('topic', '')}
- 앵글: {selected_topic.get('angle', '')}

## 타겟 페르소나
- 설명: {persona.get('description', '일반 독자')}
- 톤 선호: {persona.get('tone_preference', '따뜻하고 공감적')}

## 카드 플랜 (총 {total_cards}장)
{plan_text}

## 해시태그 후보
{hashtags_text}

## 텍스트 필드 길이 제한
- headline: 30자 이내 (공백 포함) — 필수
- body: 150자 이내 (공백 포함) — 선택
- sub_text: 100자 이내 — 선택
- description: 300자 이내 — 선택 (긴 설명이 필요한 카드)
- quote: 200자 이내 — 선택 (인용문)
- bullet_points: 배열, 각 항목 100자 이내 — 선택 (목록형)

## 역할별 권장 콘텐츠 블록
- cover: headline(임팩트 있는 30자) + body(부제)
- empathy: headline + quote(공감 인용문 활용)
- cause: headline + bullet_points(원인 목록 3~5개)
- insight: headline + description(깊은 통찰 설명)
- solution: headline + bullet_points(해결책 단계 3~5개)
- tip: headline + bullet_points(구체적 팁 목록)
- closing: headline + body
- source: headline + description(출처 및 근거 설명)
- cta: headline + sub_text(행동 유도 문구)

새 필드(description, quote, bullet_points)는 역할에 맞는 경우에만 포함하세요.

각 카드의 card_number, role과 적합한 텍스트 필드, sns 캡션을 JSON으로 작성해주세요."""

        return message

    # ── card_spec 조립 헬퍼 ──

    def _build_meta(self, selected_topic: dict, persona: dict, date_str: str) -> dict:
        """card_spec.meta 구성"""
        now_kst = datetime.now(KST)
        created_at = now_kst.isoformat()

        # ID 생성: YYYY-MM-DD-001 형식
        meta_id = f"{date_str}-001"

        return {
            "id": meta_id,
            "topic": selected_topic.get("topic", ""),
            "angle": selected_topic.get("angle", ""),
            "target_persona": persona.get("description", ""),
            "created_at": created_at,
            "status": "draft",
            "sources": [],
        }

    def _build_cards(
        self,
        generated_cards: list[dict],
        card_plan: list[dict],
        logs: list[str],
    ) -> list[dict]:
        """
        Claude 응답의 카드 텍스트와 card_plan을 병합하여
        card_spec.cards 배열을 구성합니다.
        """
        # card_plan을 card_number 기준 dict로 변환
        plan_map: dict[int, dict] = {
            cp.get("card_number", i + 1): cp
            for i, cp in enumerate(card_plan)
        }

        # generated_cards를 card_number 기준 dict로 변환
        gen_map: dict[int, dict] = {
            gc.get("card_number", i + 1): gc
            for i, gc in enumerate(generated_cards)
        }

        cards: list[dict] = []

        # card_plan 기준으로 순회 (plan에 있는 카드는 모두 포함)
        all_numbers = sorted(set(list(plan_map.keys()) + list(gen_map.keys())))

        for card_num in all_numbers:
            plan = plan_map.get(card_num, {})
            gen = gen_map.get(card_num, {})

            role = gen.get("role") or plan.get("role", "tip")

            # 텍스트 추출 및 길이 검증 — 기존 필드
            headline = self._truncate_text(
                gen.get("headline", ""), "headline", card_num, logs,
            )
            body = self._truncate_text(
                gen.get("body", ""), "body", card_num, logs,
            )
            sub_text = self._truncate_text(
                gen.get("sub_text", ""), "sub_text", card_num, logs,
            )

            # 새 선택 필드 추출 및 길이 검증
            description = self._truncate_text(
                gen.get("description", ""), "description", card_num, logs,
            )
            quote = self._truncate_text(
                gen.get("quote", ""), "quote", card_num, logs,
            )
            raw_bullets = gen.get("bullet_points") or []
            bullet_points = [
                self._truncate_text(item, "bullet_points", card_num, logs)
                for item in raw_bullets
                if isinstance(item, str)
            ]

            # 기본 text 구조
            text_block: dict[str, Any] = {
                "headline": headline,
                "body": body,
                "sub_text": sub_text,
            }
            # 선택 필드는 값이 있을 때만 포함
            if description:
                text_block["description"] = description
            if quote:
                text_block["quote"] = quote
            if bullet_points:
                text_block["bullet_points"] = bullet_points

            card_entry: dict[str, Any] = {
                "index": card_num,
                "role": role,
                "text": text_block,
                "style": DEFAULT_STYLE.copy(),
                "background": DEFAULT_BACKGROUND.copy(),
            }
            cards.append(card_entry)

        return cards

    def _truncate_text(
        self,
        text: str,
        field_name: str,
        card_number: int,
        logs: list[str],
    ) -> str:
        """
        텍스트 길이 검증 및 자동 절단

        제한을 초과하면 잘라내고 경고 로그를 남깁니다.
        """
        if not text:
            return text

        limit = TEXT_LIMITS.get(field_name)
        if limit is None:
            return text

        if len(text) > limit:
            original_len = len(text)
            truncated = text[:limit]
            warning_msg = (
                f"카드 {card_number} {field_name} 길이 초과 — "
                f"{original_len}자 → {limit}자로 절단: "
                f"'{text}' → '{truncated}'"
            )
            logger.warning(warning_msg)
            logs.append(f"[경고] {warning_msg}")
            return truncated

        return text

    def _build_sns(
        self,
        sns_data: dict,
        hashtags: dict,
        logs: list[str],
    ) -> dict:
        """card_spec.sns 구성"""
        # Instagram 캡션
        ig_data = sns_data.get("instagram", {})
        ig_caption = ig_data.get("caption", "")
        ig_hashtags = ig_data.get("hashtags", [])

        # 해시태그가 비어있으면 입력 해시태그에서 보충
        if not ig_hashtags:
            all_tags = (
                hashtags.get("primary", [])
                + hashtags.get("secondary", [])
                + hashtags.get("trending", [])
            )
            ig_hashtags = [
                tag if tag.startswith("#") else f"#{tag}"
                for tag in all_tags
            ]

        # Instagram 캡션 길이 검증 (2200자)
        if len(ig_caption) > 2200:
            logger.warning(
                "Instagram 캡션 길이 초과: %d자 → 2200자로 절단", len(ig_caption),
            )
            logs.append(f"[경고] Instagram 캡션 {len(ig_caption)}자 → 2200자로 절단")
            ig_caption = ig_caption[:2200]

        # Threads 텍스트
        threads_data = sns_data.get("threads", {})
        threads_text = threads_data.get("text", "")

        # Threads 길이 검증 (500자)
        if len(threads_text) > 500:
            logger.warning(
                "Threads 텍스트 길이 초과: %d자 → 500자로 절단", len(threads_text),
            )
            logs.append(f"[경고] Threads 텍스트 {len(threads_text)}자 → 500자로 절단")
            threads_text = threads_text[:500]

        return {
            "instagram": {
                "caption": ig_caption,
                "hashtags": ig_hashtags,
            },
            "threads": {
                "text": threads_text,
            },
        }


# ── 테스트 코드 ──

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    print("=" * 60)
    print("CopywriterAgent 테스트")
    print("=" * 60)

    # 테스트용 입력 데이터 (전략가 출력 모사)
    test_input = {
        "selected_topic": {
            "topic": "봄철 무기력감 극복",
            "angle": "계절 변화가 감정에 미치는 영향과 실천적 대처법",
        },
        "persona": {
            "description": "20~30대 직장인, 최근 의욕 저하를 겪고 있는 사람",
            "tone_preference": "따뜻하고 공감적인 톤",
        },
        "card_plan": [
            {"card_number": 1, "role": "cover", "content_direction": "봄인데 왜 이렇게 힘들까? — 공감 유발 질문"},
            {"card_number": 2, "role": "empathy", "content_direction": "봄이면 더 무기력해지는 건 자연스러운 현상"},
            {"card_number": 3, "role": "cause", "content_direction": "일조량, 호르몬 변화 등 과학적 원인 설명"},
            {"card_number": 4, "role": "insight", "content_direction": "무기력감은 몸이 보내는 신호"},
            {"card_number": 5, "role": "solution", "content_direction": "작은 루틴으로 시작하기"},
            {"card_number": 6, "role": "tip", "content_direction": "5분 산책, 채소 한 접시 등 구체적 팁"},
            {"card_number": 7, "role": "tip", "content_direction": "자기 돌봄 체크리스트"},
            {"card_number": 8, "role": "closing", "content_direction": "완벽하지 않아도 괜찮다는 메시지"},
        ],
        "hashtags": {
            "primary": ["#멘탈헬스", "#봄철무기력", "#자기돌봄"],
            "secondary": ["#마음건강", "#힐링", "#직장인건강"],
            "trending": ["#봄", "#봄우울"],
        },
        "total_cards": 8,
    }

    test_call = AgentCall(
        agent_id="copywriter",
        task_type="card_news_text",
        input_data=test_input,
        context={"date": "2026-03-14", "session_id": "test-session-001"},
    )

    # 에이전트 생성 및 실행
    try:
        agent = CopywriterAgent()
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
        # API 키가 없는 경우 등
        print(f"\n초기화 실패 (API 키 미설정 등): {e}")
        print("ANTHROPIC_API_KEY 환경변수를 설정한 후 다시 시도하세요.")

        # API 없이 구조 확인용 더미 테스트
        print("\n--- 구조 검증용 더미 출력 ---")
        dummy_spec = {
            "card_spec": {
                "meta": {
                    "id": "2026-03-14-001",
                    "topic": "봄철 무기력감 극복",
                    "angle": "계절 변화가 감정에 미치는 영향과 실천적 대처법",
                    "target_persona": "20~30대 직장인",
                    "created_at": "2026-03-14T09:00:00+09:00",
                    "status": "draft",
                    "sources": [],
                },
                "cards": [
                    {
                        "index": i + 1,
                        "role": role,
                        "text": {
                            "headline": f"헤드라인 {i+1}",
                            "body": f"카드 {i+1} 본문 텍스트입니다.",
                            "sub_text": "",
                        },
                        "style": DEFAULT_STYLE,
                        "background": DEFAULT_BACKGROUND,
                    }
                    for i, role in enumerate([
                        "cover", "empathy", "cause", "insight",
                        "solution", "tip", "tip", "closing",
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
        print(json.dumps(dummy_spec, ensure_ascii=False, indent=2))

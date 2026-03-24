"""
StrategistAgent — 콘텐츠 전략가 (AGENT 2)

리서처가 제안한 후보 주제 중 최적 1개를 선정하고,
6~10장 카드 구성 기획, 페르소나 정의, 해시태그 전략을 수립합니다.
"""

import json
import logging
from pathlib import Path

from lib.base_agent import BaseAgent, AgentCall, AgentResult
from lib.claude_client import ClaudeClient

logger = logging.getLogger(__name__)

# 프로젝트 루트 경로
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# 카드 역할(role)에 허용되는 값
VALID_CARD_ROLES = frozenset({
    "cover", "empathy", "cause", "insight",
    "solution", "tip", "closing", "source", "cta",
})

# 카드 수 허용 범위
MIN_CARDS = 6
MAX_CARDS = 10

# Claude에게 전달할 응답 스키마 예시
_RESPONSE_SCHEMA = {
    "selected_topic": {
        "id": "topic_001",
        "topic": "선정된 주제명",
        "angle": "접근 각도",
        "selection_reason": "선정 이유",
    },
    "persona": {
        "age_range": "25-35",
        "description": "타겟 페르소나 설명",
        "pain_points": ["고충1", "고충2"],
        "tone_preference": "톤 선호도",
    },
    "card_plan": [
        {
            "card_number": 1,
            "role": "cover | empathy | cause | insight | solution | tip | closing | source | cta",
            "title_direction": "제목 방향성",
            "content_direction": "이 카드에서 다룰 내용",
        }
    ],
    "hashtags": {
        "primary": ["#멘탈헬스"],
        "secondary": ["#자기돌봄"],
        "trending": ["#트렌드태그"],
    },
    "total_cards": 8,
}


class StrategistAgent(BaseAgent):
    """
    콘텐츠 전략가 에이전트

    리서처 출력(후보 주제 리스트)을 받아 최적 주제를 선정하고,
    카드 구성 기획안을 생성합니다.
    """

    def __init__(self, config: dict | None = None):
        spec_path = _PROJECT_ROOT / "agents" / "content_team" / "02_strategist.md"
        super().__init__(
            agent_id="strategist",
            spec_path=spec_path,
            config=config,
        )
        self.client = ClaudeClient()

    def execute(self, call: AgentCall) -> AgentResult:
        """
        전략가 에이전트 실행

        Args:
            call: AgentCall — input_data에 candidates 리스트 포함

        Returns:
            AgentResult — 선정 주제, 페르소나, 카드 기획, 해시태그
        """
        logs: list[str] = []

        # ── 1. 입력 검증 ──
        candidates = call.input_data.get("candidates", [])
        if not candidates:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error="입력 데이터에 candidates가 비어있습니다.",
                logs=["후보 주제가 없어 전략 수립을 중단합니다."],
            )

        logs.append(f"후보 주제 {len(candidates)}건 수신")

        # ── 2. 사용자 메시지 구성 ──
        user_message = self._build_user_message(call.input_data)

        # ── 3. Claude API 호출 (JSON 모드, 재시도 포함) ──
        try:
            response: dict = self.client.chat_with_retry(
                system_prompt=self.system_prompt,
                user_message=user_message,
                json_mode=True,
                response_schema=_RESPONSE_SCHEMA,
                max_retries=3,
            )
            logs.append("Claude API 호출 성공")
        except RuntimeError as e:
            logger.error("Claude API 호출 실패: %s", e)
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error=f"Claude API 호출 실패: {e}",
                logs=logs + [f"API 호출 실패: {e}"],
            )

        # ── 4. 응답 검증 및 보정 ──
        try:
            output_data = self._validate_and_fix(response, logs)
        except ValueError as e:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error=str(e),
                logs=logs + [f"응답 검증 실패: {e}"],
            )

        logs.append(
            f"최종 기획: 주제='{output_data['selected_topic']['topic']}', "
            f"카드 {output_data['total_cards']}장"
        )

        return AgentResult(
            agent_id=self.agent_id,
            status="success",
            output_data=output_data,
            logs=logs,
        )

    # ── 내부 헬퍼 메서드 ──

    def _build_user_message(self, input_data: dict) -> str:
        """Claude에게 전달할 사용자 메시지 구성"""
        candidates_json = json.dumps(
            input_data["candidates"], ensure_ascii=False, indent=2
        )

        parts = [
            "아래 후보 주제 중 최적의 1개를 선정하고 카드뉴스 기획안을 작성해주세요.",
            "",
            "## 후보 주제 목록",
            candidates_json,
        ]

        # 최근 발행 주제가 있으면 중복 방지를 위해 전달
        recent_topics = input_data.get("recent_topics", [])
        if recent_topics:
            parts.extend([
                "",
                "## 최근 발행 주제 (중복 방지)",
                json.dumps(recent_topics, ensure_ascii=False),
            ])

        parts.extend([
            "",
            "## 요구사항",
            "1. 후보 중 가장 적합한 주제 1개를 선정하고 선정 이유를 설명하세요.",
            "2. 타겟 페르소나를 구체적으로 정의하세요.",
            "3. 6~10장의 카드 구성 기획안을 작성하세요.",
            f"4. 각 카드의 role은 다음 중 하나여야 합니다: {', '.join(sorted(VALID_CARD_ROLES))}",
            "5. 해시태그를 primary, secondary, trending으로 분류하세요.",
        ])

        return "\n".join(parts)

    def _validate_and_fix(self, response: dict, logs: list[str]) -> dict:
        """
        Claude 응답을 검증하고, 보정 가능한 부분은 자동 보정

        Args:
            response: Claude로부터 받은 JSON dict
            logs: 로그 리스트 (검증 과정 기록)

        Returns:
            검증 및 보정된 output_data dict

        Raises:
            ValueError: 필수 필드가 누락되어 복구 불가능한 경우
        """
        # ── 필수 최상위 필드 확인 ──
        required_keys = ["selected_topic", "persona", "card_plan", "hashtags"]
        missing = [k for k in required_keys if k not in response]
        if missing:
            raise ValueError(f"필수 필드 누락: {', '.join(missing)}")

        # ── selected_topic 검증 ──
        topic = response["selected_topic"]
        for field in ("id", "topic", "angle", "selection_reason"):
            if field not in topic:
                raise ValueError(f"selected_topic에 '{field}' 필드가 누락되었습니다.")

        # ── persona 검증 ──
        persona = response["persona"]
        for field in ("age_range", "description", "pain_points", "tone_preference"):
            if field not in persona:
                raise ValueError(f"persona에 '{field}' 필드가 누락되었습니다.")

        # ── card_plan 검증 ──
        card_plan = response.get("card_plan", [])
        if not isinstance(card_plan, list) or len(card_plan) == 0:
            raise ValueError("card_plan이 비어있거나 리스트가 아닙니다.")

        # 각 카드의 role 유효성 검증
        for i, card in enumerate(card_plan):
            role = card.get("role", "")
            if role not in VALID_CARD_ROLES:
                logs.append(
                    f"카드 {i + 1}의 role '{role}'이 유효하지 않습니다. "
                    f"허용 값: {', '.join(sorted(VALID_CARD_ROLES))}"
                )
                raise ValueError(
                    f"card_plan[{i}]의 role '{role}'이 유효하지 않습니다. "
                    f"허용 값: {', '.join(sorted(VALID_CARD_ROLES))}"
                )

            # card_number 보정 (누락되거나 불일치 시)
            if card.get("card_number") != i + 1:
                logs.append(f"카드 {i + 1}의 card_number를 {i + 1}로 보정")
                card["card_number"] = i + 1

        # ── total_cards 검증 및 보정 ──
        total_cards = response.get("total_cards", len(card_plan))

        # card_plan 길이와 total_cards 불일치 시 card_plan 기준으로 보정
        if total_cards != len(card_plan):
            logs.append(
                f"total_cards({total_cards})와 card_plan 길이({len(card_plan)}) 불일치 → "
                f"card_plan 기준({len(card_plan)})으로 보정"
            )
            total_cards = len(card_plan)

        # 카드 수 범위 검증 (6~10장)
        if not (MIN_CARDS <= total_cards <= MAX_CARDS):
            raise ValueError(
                f"total_cards({total_cards})가 허용 범위({MIN_CARDS}~{MAX_CARDS})를 벗어납니다."
            )

        # ── hashtags 검증 ──
        hashtags = response.get("hashtags", {})
        for tag_type in ("primary", "secondary", "trending"):
            if tag_type not in hashtags:
                logs.append(f"hashtags에 '{tag_type}'이 누락되어 빈 리스트로 보정")
                hashtags[tag_type] = []

        # ── 최종 출력 구성 ──
        output_data = {
            "selected_topic": topic,
            "persona": persona,
            "card_plan": card_plan,
            "hashtags": hashtags,
            "total_cards": total_cards,
        }

        logs.append("응답 검증 완료")
        return output_data


# ── 테스트 코드 ──

if __name__ == "__main__":
    import sys

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    # 테스트용 입력 데이터 (리서처 출력 시뮬레이션)
    test_input = {
        "candidates": [
            {
                "id": "topic_001",
                "topic": "봄철 무기력감 극복법",
                "angle": "계절성 우울과 일상 루틴의 관계",
                "trend_score": 0.85,
                "sources": [
                    {
                        "url": "https://example.com/spring-fatigue",
                        "title": "봄철 무기력감의 과학적 원인",
                        "type": "news",
                    }
                ],
                "season_relevance": "봄철 우울감",
                "target_keywords": ["봄우울", "무기력", "계절성우울"],
                "rationale": "봄철 시기 적합성 높음, 검색량 증가 추세",
            },
            {
                "id": "topic_002",
                "topic": "직장인 번아웃 자가진단",
                "angle": "번아웃 5단계와 단계별 대처법",
                "trend_score": 0.78,
                "sources": [
                    {
                        "url": "https://example.com/burnout",
                        "title": "WHO 번아웃 진단 기준",
                        "type": "research",
                    }
                ],
                "season_relevance": "연중 상시",
                "target_keywords": ["번아웃", "직장스트레스", "자가진단"],
                "rationale": "꾸준한 관심 주제, 실용적 콘텐츠 가능",
            },
            {
                "id": "topic_003",
                "topic": "수면 위생 개선 가이드",
                "angle": "잠 못 드는 밤을 위한 과학적 수면 루틴",
                "trend_score": 0.72,
                "sources": [
                    {
                        "url": "https://example.com/sleep-hygiene",
                        "title": "수면 전문가가 말하는 숙면 비결",
                        "type": "expert",
                    }
                ],
                "season_relevance": "연중 상시",
                "target_keywords": ["수면", "불면증", "수면위생"],
                "rationale": "실용적 팁 제공 가능, 넓은 타겟층",
            },
        ],
        "recent_topics": ["SNS 디톡스", "감정일기 쓰는 법"],
    }

    # 에이전트 생성
    agent = StrategistAgent()

    # System Prompt 확인
    print("=" * 60)
    print("[System Prompt 로드 확인]")
    print(agent.system_prompt[:100] + "...")
    print("=" * 60)

    # AgentCall 구성
    call = AgentCall(
        agent_id="strategist",
        task_type="content_strategy",
        input_data=test_input,
        context={"date": "2026-03-14", "session_id": "test-session-001"},
    )

    # 실행
    print("\n[전략가 에이전트 실행 시작]")
    result = agent.execute(call)

    # 결과 출력
    print(f"\n[실행 결과]")
    print(f"  상태: {result.status}")
    print(f"  에러: {result.error or '없음'}")
    print(f"  소요시간: {result.duration_ms}ms")

    print(f"\n[실행 로그]")
    for log in result.logs:
        print(f"  - {log}")

    if result.is_success():
        print(f"\n[출력 데이터]")
        print(json.dumps(result.output_data, ensure_ascii=False, indent=2))
    else:
        print(f"\n[실패] {result.error}")
        sys.exit(1)

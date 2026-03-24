"""
T-E18: 에이전트 단위 테스트 (Researcher, Strategist, Copywriter)

Claude API를 모킹하여 각 에이전트의 로직을 독립적으로 검증합니다.
- BaseAgent 상속 확인
- execute() 메서드 동작 검증
- 입력 검증 및 에러 처리
- 출력 스키마 준수 확인

실행:
  pytest tests/test_agents_unit.py -v
"""

import importlib
import json
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch

import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from lib.base_agent import BaseAgent, AgentCall, AgentResult


# ── 테스트용 픽스처 ──


@pytest.fixture
def mock_claude_client():
    """ClaudeClient를 모킹하여 API 키 없이 테스트"""
    client = MagicMock()
    client.chat_with_retry = MagicMock()
    return client


@pytest.fixture
def researcher_agent(mock_claude_client):
    """ResearcherAgent 인스턴스 (Claude API 모킹)"""
    mod = importlib.import_module("agents.content_team.01_researcher")
    return mod.ResearcherAgent(claude_client=mock_claude_client)


@pytest.fixture
def strategist_agent(mock_claude_client):
    """StrategistAgent 인스턴스 (Claude API 모킹)"""
    mod = importlib.import_module("agents.content_team.02_strategist")
    original_cls = mod.ClaudeClient
    mod.ClaudeClient = lambda **kwargs: mock_claude_client
    agent = mod.StrategistAgent()
    agent.client = mock_claude_client
    mod.ClaudeClient = original_cls
    return agent


@pytest.fixture
def copywriter_agent(mock_claude_client):
    """CopywriterAgent 인스턴스 (Claude API 모킹)"""
    mod = importlib.import_module("agents.content_team.03_copywriter")
    original_cls = mod.ClaudeClient
    mod.ClaudeClient = lambda **kwargs: mock_claude_client
    agent = mod.CopywriterAgent()
    agent.client = mock_claude_client
    mod.ClaudeClient = original_cls
    return agent


# ── 더미 데이터 ──


DUMMY_RESEARCHER_INPUT = {
    "trigger": "manual",
    "date": "2026-03-16",
    "season_info": {
        "month": 3,
        "season": "봄",
        "events": ["개학 시즌", "봄철 우울감"],
    },
    "recent_topics": ["수면 위생 관리법", "직장인 번아웃 예방"],
}

DUMMY_RESEARCHER_API_RESPONSE = {
    "candidates": [
        {
            "id": "topic_001",
            "topic": "봄철 무기력감 극복법",
            "angle": "계절성 우울과 일상 루틴의 관계",
            "trend_score": 0.85,
            "sources": [
                {"url": "https://example.com/spring", "title": "봄 피로 연구", "type": "news"}
            ],
            "season_relevance": "봄철 우울감",
            "target_keywords": ["봄우울", "무기력"],
            "rationale": "봄철 시기 적합성 높음, 검색량 증가 추세",
        },
        {
            "id": "topic_002",
            "topic": "직장인 번아웃 자가진단",
            "angle": "번아웃 5단계와 단계별 대처법",
            "trend_score": 0.78,
            "sources": [],
            "season_relevance": "연중 상시",
            "target_keywords": ["번아웃", "직장스트레스"],
            "rationale": "꾸준한 관심 주제, 실용적 콘텐츠 가능",
        },
        {
            "id": "topic_003",
            "topic": "수면 개선 가이드",
            "angle": "잠 못 드는 밤을 위한 과학적 수면 루틴",
            "trend_score": 0.72,
            "sources": [],
            "season_relevance": "연중 상시",
            "target_keywords": ["수면", "불면증"],
            "rationale": "실용적 팁 제공 가능, 넓은 타겟층",
        },
    ]
}

DUMMY_STRATEGIST_INPUT = {
    "candidates": DUMMY_RESEARCHER_API_RESPONSE["candidates"],
    "recent_topics": ["수면 위생 관리법"],
}

DUMMY_STRATEGIST_API_RESPONSE = {
    "selected_topic": {
        "id": "topic_001",
        "topic": "봄철 무기력감 극복법",
        "angle": "계절성 우울과 일상 루틴의 관계",
        "selection_reason": "봄 시즌 시기 적합성과 트렌드 점수 모두 높음",
    },
    "persona": {
        "age_range": "25-35",
        "description": "20~30대 직장인, 봄철 무기력감을 느끼는 사람",
        "pain_points": ["아침에 일어나기 힘듦", "의욕 저하"],
        "tone_preference": "따뜻하고 공감적인 톤",
    },
    "card_plan": [
        {"card_number": 1, "role": "cover", "title_direction": "봄인데 왜 힘들까?", "content_direction": "공감 유발 질문"},
        {"card_number": 2, "role": "empathy", "title_direction": "당신만 그런 게 아닙니다", "content_direction": "자연스러운 현상임을 설명"},
        {"card_number": 3, "role": "cause", "title_direction": "봄 피로의 과학", "content_direction": "일조량, 호르몬 변화"},
        {"card_number": 4, "role": "insight", "title_direction": "몸이 보내는 신호", "content_direction": "무기력감의 의미"},
        {"card_number": 5, "role": "solution", "title_direction": "작은 루틴의 힘", "content_direction": "습관 변화"},
        {"card_number": 6, "role": "tip", "title_direction": "5분 실천법", "content_direction": "구체적 팁"},
        {"card_number": 7, "role": "tip", "title_direction": "자기돌봄 체크리스트", "content_direction": "체크리스트"},
        {"card_number": 8, "role": "closing", "title_direction": "괜찮아, 천천히", "content_direction": "응원 메시지"},
    ],
    "hashtags": {
        "primary": ["#멘탈헬스", "#봄철무기력"],
        "secondary": ["#자기돌봄"],
        "trending": ["#봄우울"],
    },
    "total_cards": 8,
}

DUMMY_COPYWRITER_INPUT = {
    "selected_topic": DUMMY_STRATEGIST_API_RESPONSE["selected_topic"],
    "persona": DUMMY_STRATEGIST_API_RESPONSE["persona"],
    "card_plan": DUMMY_STRATEGIST_API_RESPONSE["card_plan"],
    "hashtags": DUMMY_STRATEGIST_API_RESPONSE["hashtags"],
    "total_cards": 8,
}

DUMMY_COPYWRITER_API_RESPONSE = {
    "cards": [
        {"card_number": 1, "role": "cover", "headline": "봄인데 왜 힘들까?", "body": "당신만 느끼는 게 아닙니다", "sub_text": ""},
        {"card_number": 2, "role": "empathy", "headline": "저도 그랬어요", "body": "봄이면 더 무기력해지는 건 자연스러운 현상이에요", "sub_text": ""},
        {"card_number": 3, "role": "cause", "headline": "봄 피로의 과학", "body": "일조량 변화가 세로토닌 분비에 영향을 줍니다", "sub_text": ""},
        {"card_number": 4, "role": "insight", "headline": "몸이 보내는 신호", "body": "무기력감은 쉬라는 몸의 메시지입니다", "sub_text": ""},
        {"card_number": 5, "role": "solution", "headline": "작은 루틴의 힘", "body": "아주 작은 변화가 큰 차이를 만듭니다", "sub_text": ""},
        {"card_number": 6, "role": "tip", "headline": "5분 실천법", "body": "점심시간 5분 산책만으로도 달라질 수 있어요", "sub_text": ""},
        {"card_number": 7, "role": "tip", "headline": "오늘의 자기돌봄", "body": "체크리스트로 나를 돌보는 시간을 가져보세요", "sub_text": ""},
        {"card_number": 8, "role": "closing", "headline": "괜찮아, 천천히", "body": "완벽하지 않아도 괜찮습니다", "sub_text": ""},
    ],
    "sns": {
        "instagram": {
            "caption": "봄이 와도 마음은 겨울인 당신에게. #멘탈헬스 #봄철무기력",
            "hashtags": ["#멘탈헬스", "#봄철무기력", "#자기돌봄"],
        },
        "threads": {
            "text": "봄인데 왜 이렇게 힘들까? 나만 그런 거 아니었어.",
        },
    },
}


# ══════════════════════════════════════════════════════════════
#  공통 테스트 — BaseAgent 상속 확인
# ══════════════════════════════════════════════════════════════


class TestBaseAgentInheritance:
    """AC-R01, AC-S01, AC-C01: BaseAgent 상속 및 execute() 구현 확인"""

    def test_researcher_inherits_base_agent(self, researcher_agent):
        assert isinstance(researcher_agent, BaseAgent)

    def test_strategist_inherits_base_agent(self, strategist_agent):
        assert isinstance(strategist_agent, BaseAgent)

    def test_copywriter_inherits_base_agent(self, copywriter_agent):
        assert isinstance(copywriter_agent, BaseAgent)

    def test_researcher_has_execute(self, researcher_agent):
        assert callable(getattr(researcher_agent, "execute", None))

    def test_strategist_has_execute(self, strategist_agent):
        assert callable(getattr(strategist_agent, "execute", None))

    def test_copywriter_has_execute(self, copywriter_agent):
        assert callable(getattr(copywriter_agent, "execute", None))

    def test_researcher_agent_id(self, researcher_agent):
        assert researcher_agent.agent_id == "researcher"

    def test_strategist_agent_id(self, strategist_agent):
        assert strategist_agent.agent_id == "strategist"

    def test_copywriter_agent_id(self, copywriter_agent):
        assert copywriter_agent.agent_id == "copywriter"


# ══════════════════════════════════════════════════════════════
#  공통 테스트 — System Prompt 로드
# ══════════════════════════════════════════════════════════════


class TestSystemPromptLoading:
    """AC-R02, AC-S02: spec_path에서 System Prompt 자동 로드"""

    def test_researcher_prompt_loaded(self, researcher_agent):
        prompt = researcher_agent.system_prompt
        assert prompt and len(prompt.strip()) > 0
        assert not prompt.startswith("You are the")

    def test_strategist_prompt_loaded(self, strategist_agent):
        prompt = strategist_agent.system_prompt
        assert prompt and len(prompt.strip()) > 0
        assert not prompt.startswith("You are the")

    def test_copywriter_prompt_loaded(self, copywriter_agent):
        prompt = copywriter_agent.system_prompt
        assert prompt and len(prompt.strip()) > 0
        assert not prompt.startswith("You are the")


# ══════════════════════════════════════════════════════════════
#  ResearcherAgent 단위 테스트
# ══════════════════════════════════════════════════════════════


class TestResearcherAgent:
    """ResearcherAgent 핵심 로직 검증"""

    def test_success_generates_candidates(self, researcher_agent, mock_claude_client):
        """AC-R03: Claude API 호출하여 3~5개 후보 주제 생성"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_RESEARCHER_API_RESPONSE

        call = AgentCall(
            agent_id="researcher",
            task_type="research",
            input_data=DUMMY_RESEARCHER_INPUT,
        )
        result = researcher_agent.execute(call)

        assert result.is_success()
        candidates = result.output_data.get("candidates", [])
        assert 3 <= len(candidates) <= 5

    def test_output_schema_compliance(self, researcher_agent, mock_claude_client):
        """AC-R04: 출력 JSON이 Output Schema를 준수"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_RESEARCHER_API_RESPONSE

        call = AgentCall(
            agent_id="researcher",
            task_type="research",
            input_data=DUMMY_RESEARCHER_INPUT,
        )
        result = researcher_agent.execute(call)

        assert result.agent_id == "researcher"
        candidates = result.output_data["candidates"]
        for c in candidates:
            assert "id" in c
            assert "topic" in c and len(c["topic"]) >= 2
            assert "angle" in c and len(c["angle"]) >= 5
            assert "trend_score" in c
            assert "sources" in c and isinstance(c["sources"], list)
            assert "season_relevance" in c
            assert "target_keywords" in c and isinstance(c["target_keywords"], list)
            assert "rationale" in c and len(c["rationale"]) >= 10

    def test_trend_score_range(self, researcher_agent, mock_claude_client):
        """AC-R07: trend_score가 0~1 사이"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_RESEARCHER_API_RESPONSE

        call = AgentCall(
            agent_id="researcher",
            task_type="research",
            input_data=DUMMY_RESEARCHER_INPUT,
        )
        result = researcher_agent.execute(call)

        for c in result.output_data["candidates"]:
            assert 0.0 <= c["trend_score"] <= 1.0

    def test_trend_score_clamped_when_out_of_range(self, researcher_agent, mock_claude_client):
        """trend_score가 범위를 벗어나면 0~1로 클램핑"""
        bad_response = {
            "candidates": [
                {
                    "id": "topic_001",
                    "topic": "테스트 주제",
                    "angle": "테스트 접근 각도",
                    "trend_score": 1.5,
                    "sources": [],
                    "season_relevance": "봄",
                    "target_keywords": ["테스트"],
                    "rationale": "클램핑 테스트를 위한 더미 데이터",
                }
            ]
        }
        mock_claude_client.chat_with_retry.return_value = bad_response

        call = AgentCall(
            agent_id="researcher",
            task_type="research",
            input_data=DUMMY_RESEARCHER_INPUT,
        )
        result = researcher_agent.execute(call)

        assert result.output_data["candidates"][0]["trend_score"] <= 1.0

    def test_season_info_reflected(self, researcher_agent, mock_claude_client):
        """AC-R05: season_info 입력 시 사용자 메시지에 반영"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_RESEARCHER_API_RESPONSE

        call = AgentCall(
            agent_id="researcher",
            task_type="research",
            input_data=DUMMY_RESEARCHER_INPUT,
        )
        researcher_agent.execute(call)

        # Claude에 전달된 user_message에 시즌 정보 포함 확인
        call_args = mock_claude_client.chat_with_retry.call_args
        user_message = call_args.kwargs.get("user_message", "")
        assert "봄" in user_message
        assert "개학 시즌" in user_message or "봄철 우울감" in user_message

    def test_recent_topics_in_message(self, researcher_agent, mock_claude_client):
        """AC-R06: recent_topics가 사용자 메시지에 포함"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_RESEARCHER_API_RESPONSE

        call = AgentCall(
            agent_id="researcher",
            task_type="research",
            input_data=DUMMY_RESEARCHER_INPUT,
        )
        researcher_agent.execute(call)

        call_args = mock_claude_client.chat_with_retry.call_args
        user_message = call_args.kwargs.get("user_message", "")
        assert "수면 위생 관리법" in user_message
        assert "직장인 번아웃 예방" in user_message

    def test_api_failure_returns_failure(self, researcher_agent, mock_claude_client):
        """AC-R08: Claude API 호출 실패 시 failure 반환"""
        mock_claude_client.chat_with_retry.side_effect = RuntimeError("API 연결 실패")

        call = AgentCall(
            agent_id="researcher",
            task_type="research",
            input_data=DUMMY_RESEARCHER_INPUT,
        )
        result = researcher_agent.execute(call)

        assert result.status == "failure"
        assert result.error
        assert "API" in result.error

    def test_empty_candidates_returns_failure(self, researcher_agent, mock_claude_client):
        """후보가 비어있으면 failure 반환"""
        mock_claude_client.chat_with_retry.return_value = {"candidates": []}

        call = AgentCall(
            agent_id="researcher",
            task_type="research",
            input_data=DUMMY_RESEARCHER_INPUT,
        )
        result = researcher_agent.execute(call)

        assert result.status == "failure"

    def test_missing_required_fields_skipped(self, researcher_agent, mock_claude_client):
        """필수 필드 누락 후보는 건너뜀"""
        bad_response = {
            "candidates": [
                {"id": "topic_001", "topic": "정상 주제", "angle": "정상 각도", "rationale": "정상 이유입니다 10자 이상"},
                {"id": "topic_002"},  # topic, angle, rationale 누락
            ]
        }
        mock_claude_client.chat_with_retry.return_value = bad_response

        call = AgentCall(
            agent_id="researcher",
            task_type="research",
            input_data=DUMMY_RESEARCHER_INPUT,
        )
        result = researcher_agent.execute(call)

        assert result.is_success()
        assert len(result.output_data["candidates"]) == 1

    def test_build_user_message_without_season(self, researcher_agent, mock_claude_client):
        """시즌 정보 없이도 동작"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_RESEARCHER_API_RESPONSE

        call = AgentCall(
            agent_id="researcher",
            task_type="research",
            input_data={"trigger": "manual", "date": "2026-03-16"},
        )
        result = researcher_agent.execute(call)
        assert result.is_success()


# ══════════════════════════════════════════════════════════════
#  StrategistAgent 단위 테스트
# ══════════════════════════════════════════════════════════════


class TestStrategistAgent:
    """StrategistAgent 핵심 로직 검증"""

    def test_success_selects_topic(self, strategist_agent, mock_claude_client):
        """AC-S02: 후보 중 최적 1개 주제 선정"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_STRATEGIST_API_RESPONSE

        call = AgentCall(
            agent_id="strategist",
            task_type="content_strategy",
            input_data=DUMMY_STRATEGIST_INPUT,
        )
        result = strategist_agent.execute(call)

        assert result.is_success()
        assert "selected_topic" in result.output_data
        topic = result.output_data["selected_topic"]
        assert topic["id"]
        assert topic["topic"]

    def test_selection_reason_present(self, strategist_agent, mock_claude_client):
        """AC-S03: selection_reason 명시"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_STRATEGIST_API_RESPONSE

        call = AgentCall(
            agent_id="strategist",
            task_type="content_strategy",
            input_data=DUMMY_STRATEGIST_INPUT,
        )
        result = strategist_agent.execute(call)

        reason = result.output_data["selected_topic"]["selection_reason"]
        assert len(reason) >= 10

    def test_persona_defined(self, strategist_agent, mock_claude_client):
        """AC-S04: persona 객체 정의, age_range 형식 확인"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_STRATEGIST_API_RESPONSE

        call = AgentCall(
            agent_id="strategist",
            task_type="content_strategy",
            input_data=DUMMY_STRATEGIST_INPUT,
        )
        result = strategist_agent.execute(call)

        persona = result.output_data["persona"]
        assert "age_range" in persona
        assert "description" in persona and len(persona["description"]) >= 10
        assert "pain_points" in persona and len(persona["pain_points"]) >= 1
        assert "tone_preference" in persona
        # age_range 형식: "25-35"
        import re
        assert re.match(r"^\d+-\d+$", persona["age_range"])

    def test_card_plan_count(self, strategist_agent, mock_claude_client):
        """AC-S05: card_plan 6~10개"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_STRATEGIST_API_RESPONSE

        call = AgentCall(
            agent_id="strategist",
            task_type="content_strategy",
            input_data=DUMMY_STRATEGIST_INPUT,
        )
        result = strategist_agent.execute(call)

        card_plan = result.output_data["card_plan"]
        assert 6 <= len(card_plan) <= 10

    def test_card_plan_valid_roles(self, strategist_agent, mock_claude_client):
        """AC-S05: card_plan의 role이 유효한 enum 값"""
        valid_roles = {"cover", "empathy", "cause", "insight", "solution", "tip", "closing", "source", "cta"}
        mock_claude_client.chat_with_retry.return_value = DUMMY_STRATEGIST_API_RESPONSE

        call = AgentCall(
            agent_id="strategist",
            task_type="content_strategy",
            input_data=DUMMY_STRATEGIST_INPUT,
        )
        result = strategist_agent.execute(call)

        for card in result.output_data["card_plan"]:
            assert card["role"] in valid_roles, f"Invalid role: {card['role']}"

    def test_first_card_is_cover(self, strategist_agent, mock_claude_client):
        """AC-S06: card_plan[0].role == 'cover'"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_STRATEGIST_API_RESPONSE

        call = AgentCall(
            agent_id="strategist",
            task_type="content_strategy",
            input_data=DUMMY_STRATEGIST_INPUT,
        )
        result = strategist_agent.execute(call)

        assert result.output_data["card_plan"][0]["role"] == "cover"

    def test_hashtags_primary_minimum(self, strategist_agent, mock_claude_client):
        """AC-S07: hashtags.primary에 최소 2개, # 시작"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_STRATEGIST_API_RESPONSE

        call = AgentCall(
            agent_id="strategist",
            task_type="content_strategy",
            input_data=DUMMY_STRATEGIST_INPUT,
        )
        result = strategist_agent.execute(call)

        primary = result.output_data["hashtags"]["primary"]
        assert len(primary) >= 2
        for tag in primary:
            assert tag.startswith("#")

    def test_total_cards_matches_plan_length(self, strategist_agent, mock_claude_client):
        """AC-S08: total_cards와 card_plan 길이 일치"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_STRATEGIST_API_RESPONSE

        call = AgentCall(
            agent_id="strategist",
            task_type="content_strategy",
            input_data=DUMMY_STRATEGIST_INPUT,
        )
        result = strategist_agent.execute(call)

        assert result.output_data["total_cards"] == len(result.output_data["card_plan"])

    def test_total_cards_auto_corrected(self, strategist_agent, mock_claude_client):
        """total_cards가 card_plan과 불일치하면 card_plan 기준으로 보정"""
        response = {**DUMMY_STRATEGIST_API_RESPONSE, "total_cards": 99}
        mock_claude_client.chat_with_retry.return_value = response

        call = AgentCall(
            agent_id="strategist",
            task_type="content_strategy",
            input_data=DUMMY_STRATEGIST_INPUT,
        )
        result = strategist_agent.execute(call)

        assert result.output_data["total_cards"] == len(result.output_data["card_plan"])

    def test_empty_candidates_returns_failure(self, strategist_agent, mock_claude_client):
        """빈 candidates 입력 시 failure 반환"""
        call = AgentCall(
            agent_id="strategist",
            task_type="content_strategy",
            input_data={"candidates": []},
        )
        result = strategist_agent.execute(call)

        assert result.status == "failure"
        assert "candidates" in result.error.lower() or "비어" in result.error

    def test_api_failure_returns_failure(self, strategist_agent, mock_claude_client):
        """AC-S10: Claude API 호출 실패 시 failure 반환"""
        mock_claude_client.chat_with_retry.side_effect = RuntimeError("API 호출 실패")

        call = AgentCall(
            agent_id="strategist",
            task_type="content_strategy",
            input_data=DUMMY_STRATEGIST_INPUT,
        )
        result = strategist_agent.execute(call)

        assert result.status == "failure"
        assert result.error

    def test_missing_required_field_raises(self, strategist_agent, mock_claude_client):
        """필수 필드 누락 시 failure"""
        incomplete = {"selected_topic": DUMMY_STRATEGIST_API_RESPONSE["selected_topic"]}
        mock_claude_client.chat_with_retry.return_value = incomplete

        call = AgentCall(
            agent_id="strategist",
            task_type="content_strategy",
            input_data=DUMMY_STRATEGIST_INPUT,
        )
        result = strategist_agent.execute(call)

        assert result.status == "failure"

    def test_invalid_card_role_raises(self, strategist_agent, mock_claude_client):
        """유효하지 않은 role이면 failure"""
        bad_response = {
            **DUMMY_STRATEGIST_API_RESPONSE,
            "card_plan": [
                {"card_number": 1, "role": "invalid_role", "title_direction": "제목", "content_direction": "내용"},
            ] * 6,
        }
        mock_claude_client.chat_with_retry.return_value = bad_response

        call = AgentCall(
            agent_id="strategist",
            task_type="content_strategy",
            input_data=DUMMY_STRATEGIST_INPUT,
        )
        result = strategist_agent.execute(call)

        assert result.status == "failure"


# ══════════════════════════════════════════════════════════════
#  CopywriterAgent 단위 테스트
# ══════════════════════════════════════════════════════════════


class TestCopywriterAgent:
    """CopywriterAgent 핵심 로직 검증"""

    def test_success_generates_card_spec(self, copywriter_agent, mock_claude_client):
        """AC-C02: card_plan 기반 텍스트 생성 성공"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_COPYWRITER_API_RESPONSE

        call = AgentCall(
            agent_id="copywriter",
            task_type="card_news_text",
            input_data=DUMMY_COPYWRITER_INPUT,
            context={"date": "2026-03-16", "session_id": "test"},
        )
        result = copywriter_agent.execute(call)

        assert result.is_success()
        assert "card_spec" in result.output_data

    def test_headline_length_limit(self, copywriter_agent, mock_claude_client):
        """AC-C03: headline 15자 이내"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_COPYWRITER_API_RESPONSE

        call = AgentCall(
            agent_id="copywriter",
            task_type="card_news_text",
            input_data=DUMMY_COPYWRITER_INPUT,
            context={"date": "2026-03-16"},
        )
        result = copywriter_agent.execute(call)

        for card in result.output_data["card_spec"]["cards"]:
            assert len(card["text"]["headline"]) <= 15

    def test_body_length_limit(self, copywriter_agent, mock_claude_client):
        """AC-C04: body 50자 이내"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_COPYWRITER_API_RESPONSE

        call = AgentCall(
            agent_id="copywriter",
            task_type="card_news_text",
            input_data=DUMMY_COPYWRITER_INPUT,
            context={"date": "2026-03-16"},
        )
        result = copywriter_agent.execute(call)

        for card in result.output_data["card_spec"]["cards"]:
            assert len(card["text"]["body"]) <= 50

    def test_sub_text_length_limit(self, copywriter_agent, mock_claude_client):
        """AC-C05: sub_text 30자 이내"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_COPYWRITER_API_RESPONSE

        call = AgentCall(
            agent_id="copywriter",
            task_type="card_news_text",
            input_data=DUMMY_COPYWRITER_INPUT,
            context={"date": "2026-03-16"},
        )
        result = copywriter_agent.execute(call)

        for card in result.output_data["card_spec"]["cards"]:
            sub = card["text"].get("sub_text", "")
            assert len(sub) <= 30

    def test_text_truncation_on_overflow(self, copywriter_agent, mock_claude_client):
        """길이 초과 텍스트가 자동으로 절단"""
        overflow_response = {
            "cards": [
                {
                    "card_number": i + 1,
                    "role": role,
                    "headline": "이것은 15자를 초과하는 매우 긴 헤드라인입니다",
                    "body": "이것은 50자를 초과하는 매우 매우 매우 매우 매우 매우 매우 매우 매우 매우 긴 본문 텍스트입니다 자동 절단 테스트",
                    "sub_text": "이것도 30자를 초과하는 보조 텍스트입니다 절단 테스트 중",
                }
                for i, role in enumerate(["cover", "empathy", "cause", "insight", "solution", "tip", "tip", "closing"])
            ],
            "sns": {
                "instagram": {"caption": "테스트", "hashtags": ["#테스트"]},
                "threads": {"text": "테스트"},
            },
        }
        mock_claude_client.chat_with_retry.return_value = overflow_response

        call = AgentCall(
            agent_id="copywriter",
            task_type="card_news_text",
            input_data=DUMMY_COPYWRITER_INPUT,
            context={"date": "2026-03-16"},
        )
        result = copywriter_agent.execute(call)

        assert result.is_success()
        for card in result.output_data["card_spec"]["cards"]:
            assert len(card["text"]["headline"]) <= 15
            assert len(card["text"]["body"]) <= 50
            if card["text"].get("sub_text"):
                assert len(card["text"]["sub_text"]) <= 30

    def test_card_count_matches_total(self, copywriter_agent, mock_claude_client):
        """AC-C06: cards 수가 total_cards와 일치"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_COPYWRITER_API_RESPONSE

        call = AgentCall(
            agent_id="copywriter",
            task_type="card_news_text",
            input_data=DUMMY_COPYWRITER_INPUT,
            context={"date": "2026-03-16"},
        )
        result = copywriter_agent.execute(call)

        assert len(result.output_data["card_spec"]["cards"]) == DUMMY_COPYWRITER_INPUT["total_cards"]

    def test_card_roles_match_schema(self, copywriter_agent, mock_claude_client):
        """AC-C07: card role이 유효한 enum 값"""
        valid_roles = {"cover", "empathy", "cause", "insight", "solution", "tip", "closing", "source", "cta"}
        mock_claude_client.chat_with_retry.return_value = DUMMY_COPYWRITER_API_RESPONSE

        call = AgentCall(
            agent_id="copywriter",
            task_type="card_news_text",
            input_data=DUMMY_COPYWRITER_INPUT,
            context={"date": "2026-03-16"},
        )
        result = copywriter_agent.execute(call)

        for card in result.output_data["card_spec"]["cards"]:
            assert card["role"] in valid_roles

    def test_sns_instagram_has_hashtags(self, copywriter_agent, mock_claude_client):
        """AC-C09: instagram 캡션에 해시태그 포함"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_COPYWRITER_API_RESPONSE

        call = AgentCall(
            agent_id="copywriter",
            task_type="card_news_text",
            input_data=DUMMY_COPYWRITER_INPUT,
            context={"date": "2026-03-16"},
        )
        result = copywriter_agent.execute(call)

        sns = result.output_data["card_spec"]["sns"]
        ig = sns["instagram"]
        assert ig.get("hashtags") and len(ig["hashtags"]) > 0

    def test_sns_threads_present(self, copywriter_agent, mock_claude_client):
        """AC-C10: threads 텍스트 존재"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_COPYWRITER_API_RESPONSE

        call = AgentCall(
            agent_id="copywriter",
            task_type="card_news_text",
            input_data=DUMMY_COPYWRITER_INPUT,
            context={"date": "2026-03-16"},
        )
        result = copywriter_agent.execute(call)

        threads = result.output_data["card_spec"]["sns"]["threads"]
        assert threads.get("text")

    def test_card_spec_meta_structure(self, copywriter_agent, mock_claude_client):
        """AC-C11: card_spec.meta 구조 검증"""
        mock_claude_client.chat_with_retry.return_value = DUMMY_COPYWRITER_API_RESPONSE

        call = AgentCall(
            agent_id="copywriter",
            task_type="card_news_text",
            input_data=DUMMY_COPYWRITER_INPUT,
            context={"date": "2026-03-16"},
        )
        result = copywriter_agent.execute(call)

        meta = result.output_data["card_spec"]["meta"]
        assert "id" in meta
        assert "topic" in meta
        assert "created_at" in meta
        assert meta["status"] == "draft"

    def test_missing_input_returns_failure(self, copywriter_agent, mock_claude_client):
        """필수 입력 누락 시 failure"""
        call = AgentCall(
            agent_id="copywriter",
            task_type="card_news_text",
            input_data={"selected_topic": {"topic": "테스트"}},  # card_plan, total_cards 누락
            context={"date": "2026-03-16"},
        )
        result = copywriter_agent.execute(call)

        assert result.status == "failure"
        assert "누락" in result.error or "missing" in result.error.lower()

    def test_api_failure_returns_failure(self, copywriter_agent, mock_claude_client):
        """AC-C13: Claude API 호출 실패 시 failure 반환"""
        mock_claude_client.chat_with_retry.side_effect = RuntimeError("API 연결 실패")

        call = AgentCall(
            agent_id="copywriter",
            task_type="card_news_text",
            input_data=DUMMY_COPYWRITER_INPUT,
            context={"date": "2026-03-16"},
        )
        result = copywriter_agent.execute(call)

        assert result.status == "failure"
        assert result.error

    def test_hashtags_fallback_from_input(self, copywriter_agent, mock_claude_client):
        """SNS 해시태그가 비어있으면 입력 해시태그로 보충"""
        response_no_hashtags = {
            **DUMMY_COPYWRITER_API_RESPONSE,
            "sns": {
                "instagram": {"caption": "테스트 캡션", "hashtags": []},
                "threads": {"text": "테스트"},
            },
        }
        mock_claude_client.chat_with_retry.return_value = response_no_hashtags

        call = AgentCall(
            agent_id="copywriter",
            task_type="card_news_text",
            input_data=DUMMY_COPYWRITER_INPUT,
            context={"date": "2026-03-16"},
        )
        result = copywriter_agent.execute(call)

        ig_hashtags = result.output_data["card_spec"]["sns"]["instagram"]["hashtags"]
        assert len(ig_hashtags) > 0

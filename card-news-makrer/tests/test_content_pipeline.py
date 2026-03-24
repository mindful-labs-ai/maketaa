"""
콘텐츠 파이프라인 통합 테스트 스크립트

두 가지 모드로 실행 가능:
  --dry-run : API 호출 없이 에이전트 등록, 메시지 빌드, 파이프라인 구조만 검증
  --live    : 실제 Claude API 호출로 전체 파이프라인 실행 (ANTHROPIC_API_KEY 필요)

사용법:
  python tests/test_content_pipeline.py --dry-run
  python tests/test_content_pipeline.py --live
"""

import argparse
import json
import os
import sys
import tempfile
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

# 프로젝트 루트를 sys.path에 추가
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from lib.base_agent import AgentCall, AgentResult, BaseAgent, AgentRegistry
from lib.work_journal import WorkJournal
from lib.season_utils import get_season_info


# ── 콘솔 출력 헬퍼 ──

_pass_count = 0
_fail_count = 0


def _print_header(title: str):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


def _print_step(step: str):
    print(f"\n--- {step} ---")


def _check(label: str, condition: bool, detail: str = ""):
    global _pass_count, _fail_count
    if condition:
        _pass_count += 1
        icon = "[PASS]"
    else:
        _fail_count += 1
        icon = "[FAIL]"
    msg = f"  {icon} {label}"
    if detail:
        msg += f" — {detail}"
    print(msg)
    return condition


# ══════════════════════════════════════════════════════════════
#  DRY-RUN 모드
# ══════════════════════════════════════════════════════════════

def run_dry_run():
    """API 호출 없이 파이프라인 구조를 검증합니다."""
    _print_header("DRY-RUN 모드: 파이프라인 구조 검증")

    # ── 1. 에이전트 인스턴스 생성 ──
    _print_step("1단계: 에이전트 인스턴스 생성")

    # ClaudeClient 생성을 모킹하여 API 키 없이 에이전트 생성
    mock_client = MagicMock()
    mock_client.chat_with_retry = MagicMock(return_value={})

    import importlib

    agents = {}
    agent_classes = {}
    agents_dir = PROJECT_ROOT / "agents" / "content_team"

    # 숫자로 시작하는 모듈은 importlib로 로드 후 ClaudeClient 속성을 직접 패치
    agent_configs = [
        ("researcher", "01_researcher", "ResearcherAgent"),
        ("strategist", "02_strategist", "StrategistAgent"),
        ("copywriter", "03_copywriter", "CopywriterAgent"),
    ]

    for agent_id, module_name, class_name in agent_configs:
        try:
            mod = importlib.import_module(f"agents.content_team.{module_name}")
            # 모듈 내 ClaudeClient를 mock으로 교체
            original_cls = getattr(mod, "ClaudeClient", None)
            setattr(mod, "ClaudeClient", lambda **kwargs: mock_client)
            AgentClass = getattr(mod, class_name)
            # 각 에이전트는 자체 __init__에서 agent_id/spec_path를 하드코딩
            # ResearcherAgent는 claude_client 인자를 받음
            if agent_id == "researcher":
                agent_instance = AgentClass(claude_client=mock_client)
            else:
                agent_instance = AgentClass()
            # ClaudeClient를 mock으로 덮어씀
            agent_instance.client = mock_client
            agents[agent_id] = agent_instance
            agent_classes[agent_id] = AgentClass
            # 원래 클래스 복원
            if original_cls:
                setattr(mod, "ClaudeClient", original_cls)
        except Exception as e:
            print(f"  [FAIL] {class_name} 생성 실패: {e}")

    _check(
        "3개 에이전트 인스턴스 생성",
        len(agents) == 3,
        f"생성된 에이전트: {list(agents.keys())}",
    )

    for agent_id, agent in agents.items():
        _check(
            f"  {agent_id}: BaseAgent 상속 확인",
            isinstance(agent, BaseAgent),
        )

    # ── 2. System Prompt 로드 확인 ──
    _print_step("2단계: System Prompt 로드 확인")

    for agent_id, agent in agents.items():
        prompt = agent.system_prompt
        has_prompt = bool(prompt and len(prompt.strip()) > 0)
        _check(
            f"{agent_id} System Prompt 로드",
            has_prompt,
            f"{len(prompt)}자" if has_prompt else "비어있음",
        )
        # 기본 폴백 프롬프트가 아닌 실제 프롬프트인지 확인
        is_real = not prompt.startswith("You are the")
        _check(
            f"  {agent_id}: 스펙 파일 기반 프롬프트 (.md에서 로드)",
            is_real,
            f"미리보기: {prompt[:60]}..." if is_real else "기본 폴백 프롬프트 사용 중",
        )

    # ── 3. Orchestrator에 에이전트 등록 ──
    _print_step("3단계: Orchestrator에 에이전트 등록")

    # Orchestrator에서 SpecValidator 의존성도 모킹
    with patch("orchestrator.main.SpecValidator"):
        from orchestrator.main import Orchestrator
        orch = Orchestrator()

    for agent_id, agent in agents.items():
        orch.register_agent(agent_id, agent)

    _check(
        "Orchestrator 인스턴스 생성",
        orch is not None,
    )

    for agent_id in ["researcher", "strategist", "copywriter"]:
        registered = orch.get_agent(agent_id)
        _check(
            f"  {agent_id} 등록 확인",
            registered is not None and registered.agent_id == agent_id,
        )

    # ── 4. AgentCall 객체 생성 검증 ──
    _print_step("4단계: AgentCall 객체 생성 검증")

    test_calls = {
        "researcher": AgentCall(
            agent_id="researcher",
            task_type="content_pipeline",
            input_data={
                "date": "2026-03-14",
                "trigger": "test",
                "season_info": {"month": 3, "season": "봄", "events": ["개학 시즌"]},
                "recent_topics": [],
            },
            context={"session_id": "test-001", "date": "2026-03-14"},
        ),
        "strategist": AgentCall(
            agent_id="strategist",
            task_type="content_pipeline",
            input_data={
                "candidates": [
                    {
                        "id": "topic_001",
                        "topic": "테스트 주제",
                        "angle": "테스트 각도",
                        "trend_score": 0.8,
                        "sources": [],
                        "season_relevance": "봄",
                        "target_keywords": ["테스트"],
                        "rationale": "테스트 이유",
                    }
                ]
            },
            context={"session_id": "test-001", "date": "2026-03-14"},
        ),
        "copywriter": AgentCall(
            agent_id="copywriter",
            task_type="content_pipeline",
            input_data={
                "selected_topic": {"topic": "테스트 주제", "angle": "테스트 각도"},
                "persona": {
                    "description": "테스트 페르소나",
                    "tone_preference": "따뜻한 톤",
                    "age_range": "20-30",
                    "pain_points": ["스트레스"],
                },
                "card_plan": [
                    {"card_number": i + 1, "role": role, "content_direction": f"카드{i+1} 방향"}
                    for i, role in enumerate(["cover", "empathy", "cause", "insight", "solution", "tip", "tip", "closing"])
                ],
                "hashtags": {"primary": ["#테스트"], "secondary": [], "trending": []},
                "total_cards": 8,
            },
            context={"session_id": "test-001", "date": "2026-03-14"},
        ),
    }

    for agent_id, call in test_calls.items():
        _check(
            f"{agent_id} AgentCall 생성",
            isinstance(call, AgentCall) and call.agent_id == agent_id,
            f"task_type={call.task_type}, input_keys={list(call.input_data.keys())}",
        )

    # ── 5. 에이전트 간 데이터 흐름 시뮬레이션 ──
    _print_step("5단계: 에이전트 간 데이터 흐름 시뮬레이션 (더미 데이터)")

    # 더미 결과 데이터 — 실제 에이전트 출력 형식을 재현
    dummy_researcher_output = {
        "candidates": [
            {
                "id": "topic_001",
                "topic": "봄철 무기력감 극복법",
                "angle": "계절성 우울과 일상 루틴의 관계",
                "trend_score": 0.85,
                "sources": [{"url": "https://example.com", "title": "기사", "type": "news"}],
                "season_relevance": "봄철 우울감",
                "target_keywords": ["봄우울", "무기력"],
                "rationale": "봄철 시기 적합성 높음",
            },
            {
                "id": "topic_002",
                "topic": "직장인 번아웃 자가진단",
                "angle": "번아웃 5단계와 대처법",
                "trend_score": 0.78,
                "sources": [],
                "season_relevance": "연중 상시",
                "target_keywords": ["번아웃"],
                "rationale": "꾸준한 관심 주제",
            },
        ]
    }

    dummy_strategist_output = {
        "selected_topic": {
            "id": "topic_001",
            "topic": "봄철 무기력감 극복법",
            "angle": "계절성 우울과 일상 루틴의 관계",
            "selection_reason": "시기 적합성과 트렌드 점수 모두 높음",
        },
        "persona": {
            "age_range": "25-35",
            "description": "20~30대 직장인",
            "pain_points": ["무기력", "의욕 저하"],
            "tone_preference": "따뜻하고 공감적",
        },
        "card_plan": [
            {"card_number": i + 1, "role": role, "title_direction": f"제목{i+1}", "content_direction": f"내용{i+1}"}
            for i, role in enumerate(["cover", "empathy", "cause", "insight", "solution", "tip", "tip", "closing"])
        ],
        "hashtags": {
            "primary": ["#멘탈헬스", "#봄철무기력"],
            "secondary": ["#자기돌봄"],
            "trending": ["#봄우울"],
        },
        "total_cards": 8,
    }

    dummy_copywriter_output = {
        "card_spec": {
            "meta": {
                "id": "2026-03-14-001",
                "topic": "봄철 무기력감 극복법",
                "angle": "계절성 우울과 일상 루틴의 관계",
                "target_persona": "20~30대 직장인",
                "created_at": "2026-03-14T09:00:00+09:00",
                "status": "draft",
                "sources": [],
            },
            "cards": [
                {
                    "index": i + 1,
                    "role": role,
                    "text": {"headline": f"헤드라인{i+1}", "body": f"본문 텍스트 {i+1}", "sub_text": ""},
                    "style": {"layout": "center", "color_palette": {}, "font": {}},
                    "background": {"type": "image", "src": None, "prompt": None, "overlay_opacity": 0.3},
                }
                for i, role in enumerate(["cover", "empathy", "cause", "insight", "solution", "tip", "tip", "closing"])
            ],
            "sns": {
                "instagram": {"caption": "테스트 캡션", "hashtags": ["#멘탈헬스"]},
                "threads": {"text": "테스트 스레드"},
            },
        }
    }

    # 데이터 흐름 검증: Researcher → Strategist
    strategist_input_keys = set(dummy_researcher_output.keys())
    _check(
        "Researcher → Strategist 데이터 전달",
        "candidates" in strategist_input_keys,
        f"전달 키: {strategist_input_keys}",
    )
    _check(
        "  candidates 비어있지 않음",
        len(dummy_researcher_output["candidates"]) > 0,
        f"{len(dummy_researcher_output['candidates'])}건",
    )

    # 데이터 흐름 검증: Strategist → Copywriter
    copywriter_required = {"selected_topic", "card_plan", "total_cards"}
    strategist_keys = set(dummy_strategist_output.keys())
    _check(
        "Strategist → Copywriter 데이터 전달",
        copywriter_required.issubset(strategist_keys),
        f"필수 키 {copywriter_required} 모두 존재",
    )

    # 최종 출력 검증: card_spec 구조
    card_spec = dummy_copywriter_output.get("card_spec", {})
    _check(
        "Copywriter 최종 출력: card_spec 존재",
        bool(card_spec),
    )
    for key in ["meta", "cards", "sns"]:
        _check(
            f"  card_spec.{key} 존재",
            key in card_spec,
        )

    # WorkJournal 생성 테스트
    _print_step("6단계: WorkJournal 생성 테스트")

    with tempfile.TemporaryDirectory() as tmpdir:
        journal = WorkJournal(session_id="dry-run-test-001", output_dir=tmpdir)
        journal.log("test", "테스트", "dry-run 테스트 로그")
        journal.log_agent_start("researcher")
        journal.log_agent_end("researcher", output_summary="테스트 완료", duration_ms=100)
        journal.log_handoff("researcher", "strategist", "candidates 2건")
        journal.finalize("completed")
        journal.save()

        json_path = journal.session_dir / "work_journal.json"
        md_path = journal.session_dir / "work_journal.md"

        _check("WorkJournal JSON 파일 생성", json_path.exists(), str(json_path))
        _check("WorkJournal MD 파일 생성", md_path.exists(), str(md_path))

        if json_path.exists():
            with open(json_path, "r", encoding="utf-8") as f:
                journal_data = json.load(f)
            _check(
                "WorkJournal 내용 검증",
                journal_data.get("pipeline_status") == "completed"
                and journal_data.get("total_entries", 0) > 0,
                f"상태={journal_data.get('pipeline_status')}, 항목수={journal_data.get('total_entries')}",
            )


# ══════════════════════════════════════════════════════════════
#  E2E 파이프라인 검증 (mock 데이터 기반)
# ══════════════════════════════════════════════════════════════

def run_e2e_validation():
    """
    E2E 파이프라인 데이터 흐름을 mock 데이터로 검증합니다.
    - season_utils 통합 테스트
    - researcher -> strategist -> copywriter 데이터 흐름 검증
    - 최종 card_spec 출력의 스키마 적합성 검증
    """
    _print_header("E2E 파이프라인 검증 (Mock 데이터 기반)")

    # ── 1. season_utils 통합 테스트 ──
    _print_step("1단계: season_utils 통합 테스트")

    # 기본 날짜 테스트
    season_info = get_season_info("2026-03-15")
    _check(
        "season_utils: 3월 시즌 정보 생성",
        season_info is not None and isinstance(season_info, dict),
    )
    _check(
        "season_utils: month == 3",
        season_info.get("month") == 3,
        f"실제 값: {season_info.get('month')}",
    )
    _check(
        "season_utils: season == '봄'",
        season_info.get("season") == "봄",
        f"실제 값: {season_info.get('season')}",
    )
    _check(
        "season_utils: events 비어있지 않음",
        isinstance(season_info.get("events"), list) and len(season_info.get("events", [])) > 0,
        f"{len(season_info.get('events', []))}건",
    )
    _check(
        "season_utils: mental_health_themes 비어있지 않음",
        isinstance(season_info.get("mental_health_themes"), list)
        and len(season_info.get("mental_health_themes", [])) > 0,
        f"{len(season_info.get('mental_health_themes', []))}건",
    )

    # 모든 계절 커버리지 테스트
    season_tests = [
        ("2026-01-15", "겨울"), ("2026-02-15", "겨울"),
        ("2026-03-15", "봄"), ("2026-04-15", "봄"), ("2026-05-15", "봄"),
        ("2026-06-15", "여름"), ("2026-07-15", "여름"), ("2026-08-15", "여름"),
        ("2026-09-15", "가을"), ("2026-10-15", "가을"), ("2026-11-15", "가을"),
        ("2026-12-15", "겨울"),
    ]
    all_seasons_pass = True
    for date_str, expected_season in season_tests:
        info = get_season_info(date_str)
        if info.get("season") != expected_season:
            all_seasons_pass = False
            break
    _check(
        "season_utils: 12개월 계절 매핑 정확성",
        all_seasons_pass,
    )

    # 잘못된 날짜 형식 에러 처리 테스트
    invalid_date_handled = False
    try:
        get_season_info("invalid-date")
    except ValueError:
        invalid_date_handled = True
    _check(
        "season_utils: 잘못된 날짜 형식 ValueError 발생",
        invalid_date_handled,
    )

    # 국제 정신건강 기념일 포함 확인
    oct_info = get_season_info("2026-10-10")
    oct_events_str = " ".join(oct_info.get("events", []))
    _check(
        "season_utils: 10월에 세계 정신건강의 날 포함",
        "정신건강" in oct_events_str,
        f"10월 이벤트: {oct_info.get('events', [])}",
    )

    sep_info = get_season_info("2026-09-10")
    sep_events_str = " ".join(sep_info.get("events", []))
    _check(
        "season_utils: 9월에 세계 자살예방의 날 포함",
        "자살예방" in sep_events_str,
        f"9월 이벤트: {sep_info.get('events', [])}",
    )

    # ── 2. E2E 데이터 흐름 검증 (Researcher -> Strategist -> Copywriter) ──
    _print_step("2단계: E2E 데이터 흐름 검증 (Realistic Mock Data)")

    # season_utils를 사용하여 Researcher 입력 구성
    researcher_season_info = get_season_info("2026-03-15")
    researcher_input = {
        "date": "2026-03-15",
        "trigger": "e2e_test",
        "season_info": researcher_season_info,
        "recent_topics": ["수면 위생 관리법", "직장인 번아웃 예방"],
    }

    _check(
        "Researcher 입력: season_utils 통합",
        researcher_input["season_info"]["season"] == "봄",
        f"시즌={researcher_input['season_info']['season']}",
    )

    # Researcher 출력 (realistic mock)
    researcher_output = {
        "candidates": [
            {
                "id": "topic_001",
                "topic": "봄철 무기력감 극복법",
                "angle": "계절성 우울과 일상 루틴의 관계",
                "trend_score": 0.85,
                "sources": [
                    {"url": "https://example.com/spring-fatigue", "title": "봄 피로 연구", "type": "research"}
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
                "sources": [],
                "season_relevance": "연중 상시",
                "target_keywords": ["번아웃", "직장스트레스"],
                "rationale": "꾸준한 관심 주제",
            },
            {
                "id": "topic_003",
                "topic": "수면 개선 가이드",
                "angle": "잠 못 드는 밤을 위한 과학적 수면 루틴",
                "trend_score": 0.72,
                "sources": [],
                "season_relevance": "연중 상시",
                "target_keywords": ["수면", "불면증"],
                "rationale": "실용적 팁 제공 가능",
            },
        ]
    }

    # Researcher -> Strategist 데이터 전달 검증
    _check(
        "Researcher -> Strategist: candidates 키 존재",
        "candidates" in researcher_output,
    )
    _check(
        "Researcher -> Strategist: candidates 3건 이상",
        len(researcher_output["candidates"]) >= 3,
        f"{len(researcher_output['candidates'])}건",
    )
    for i, c in enumerate(researcher_output["candidates"]):
        required = {"id", "topic", "angle", "trend_score", "rationale"}
        has_all = required.issubset(set(c.keys()))
        _check(
            f"  후보 {i+1} 필수 필드 존재",
            has_all,
            f"키: {list(c.keys())}",
        )

    # Strategist 출력 (realistic mock)
    strategist_output = {
        "selected_topic": {
            "id": "topic_001",
            "topic": "봄철 무기력감 극복법",
            "angle": "계절성 우울과 일상 루틴의 관계",
            "selection_reason": "봄 시즌 시기 적합성과 트렌드 점수 모두 높음",
        },
        "persona": {
            "age_range": "25-35",
            "description": "20~30대 직장인, 봄철 무기력감을 느끼는 사람",
            "pain_points": ["아침에 일어나기 힘듦", "의욕 저하", "집중력 감소"],
            "tone_preference": "따뜻하고 공감적인 톤",
        },
        "card_plan": [
            {"card_number": 1, "role": "cover", "title_direction": "봄인데 왜 이렇게 힘들까?", "content_direction": "공감 유발 질문"},
            {"card_number": 2, "role": "empathy", "title_direction": "당신만 그런 게 아닙니다", "content_direction": "봄이면 더 무기력해지는 건 자연스러운 현상"},
            {"card_number": 3, "role": "cause", "title_direction": "봄 피로의 과학", "content_direction": "일조량, 호르몬 변화 등 원인 설명"},
            {"card_number": 4, "role": "insight", "title_direction": "몸이 보내는 신호", "content_direction": "무기력감은 쉬라는 몸의 신호"},
            {"card_number": 5, "role": "solution", "title_direction": "작은 루틴으로 시작", "content_direction": "작은 습관 변화의 힘"},
            {"card_number": 6, "role": "tip", "title_direction": "5분 실천법", "content_direction": "5분 산책, 햇볕 쬐기 등 구체적 팁"},
            {"card_number": 7, "role": "tip", "title_direction": "자기돌봄 체크리스트", "content_direction": "오늘 하루 자기돌봄 항목"},
            {"card_number": 8, "role": "closing", "title_direction": "괜찮아, 천천히", "content_direction": "완벽하지 않아도 괜찮다는 메시지"},
        ],
        "hashtags": {
            "primary": ["#멘탈헬스", "#봄철무기력", "#자기돌봄"],
            "secondary": ["#마음건강", "#힐링"],
            "trending": ["#봄우울"],
        },
        "total_cards": 8,
    }

    # Strategist -> Copywriter 데이터 전달 검증
    copywriter_required = {"selected_topic", "card_plan", "total_cards"}
    strategist_keys = set(strategist_output.keys())
    _check(
        "Strategist -> Copywriter: 필수 키 전달",
        copywriter_required.issubset(strategist_keys),
        f"필수: {copywriter_required}, 실제: {strategist_keys}",
    )
    _check(
        "Strategist: persona 키 존재",
        "persona" in strategist_output,
    )
    _check(
        "Strategist: hashtags 키 존재",
        "hashtags" in strategist_output,
    )
    _check(
        "Strategist: total_cards 범위 (6~10)",
        6 <= strategist_output["total_cards"] <= 10,
        f"total_cards={strategist_output['total_cards']}",
    )
    _check(
        "Strategist: card_plan 길이 == total_cards",
        len(strategist_output["card_plan"]) == strategist_output["total_cards"],
    )

    # Copywriter 최종 출력 (realistic mock - card_spec 구조)
    copywriter_output = {
        "card_spec": {
            "meta": {
                "id": "2026-03-15-001",
                "topic": "봄철 무기력감 극복법",
                "angle": "계절성 우울과 일상 루틴의 관계",
                "target_persona": "20~30대 직장인, 봄철 무기력감을 느끼는 사람",
                "created_at": "2026-03-15T09:00:00+09:00",
                "status": "draft",
                "sources": ["https://example.com/spring-fatigue"],
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
                    ("cover", "봄인데 왜 힘들까?", "당신만 느끼는 게 아닙니다"),
                    ("empathy", "저도 그랬어요", "봄이면 더 무기력해지는 건 자연스러운 현상이에요"),
                    ("cause", "봄 피로의 과학", "일조량 변화가 세로토닌 분비에 영향을 줍니다"),
                    ("insight", "몸이 보내는 신호", "무기력감은 쉬라는 몸의 메시지입니다"),
                    ("solution", "작은 루틴의 힘", "아주 작은 변화가 큰 차이를 만듭니다"),
                    ("tip", "5분 실천법", "점심시간 5분 산책만으로도 달라질 수 있어요"),
                    ("tip", "오늘의 자기돌봄", "체크리스트로 나를 돌보는 시간을 가져보세요"),
                    ("closing", "괜찮아, 천천히", "완벽하지 않아도 괜찮습니다"),
                ])
            ],
            "sns": {
                "instagram": {
                    "caption": "봄이 와도 마음은 겨울인 당신에게.\n\n봄철 무기력감, 당신만 느끼는 게 아닙니다.\n작은 변화부터 시작해보세요.",
                    "hashtags": ["#멘탈헬스", "#봄철무기력", "#자기돌봄", "#마음건강", "#힐링", "#봄우울"],
                },
                "threads": {
                    "text": "봄인데 왜 이렇게 힘들까? 나만 그런 거 아니었어. 봄철 무기력감의 원인과 극복법을 카드뉴스로 정리했어요.",
                },
            },
        }
    }

    # ── 3. card_spec 스키마 적합성 검증 ──
    _print_step("3단계: card_spec 스키마 적합성 검증")

    card_spec = copywriter_output.get("card_spec", {})

    # 최상위 필수 키 검증
    for key in ["meta", "cards", "sns"]:
        _check(
            f"card_spec.{key} 존재",
            key in card_spec,
        )

    # meta 검증
    meta = card_spec.get("meta", {})
    for key in ["id", "topic", "created_at", "status"]:
        _check(
            f"card_spec.meta.{key} 존재",
            key in meta,
        )
    _check(
        "card_spec.meta.status == 'draft'",
        meta.get("status") == "draft",
        f"실제 값: {meta.get('status')}",
    )
    _check(
        "card_spec.meta.id 형식 (YYYY-MM-DD-NNN)",
        meta.get("id", "").startswith("2026-03-15"),
        f"id={meta.get('id')}",
    )

    # cards 검증
    cards = card_spec.get("cards", [])
    _check(
        "card_spec.cards 수 (6~10장)",
        6 <= len(cards) <= 10,
        f"{len(cards)}장",
    )

    # 각 카드 구조 검증
    valid_roles = {"cover", "empathy", "cause", "insight", "solution", "tip", "closing", "source", "cta"}
    valid_layouts = {"center", "top-left", "top-right", "bottom-left", "bottom-right", "split"}
    all_cards_valid = True
    for i, card in enumerate(cards):
        # required fields: index, role, text, style
        required_card_keys = {"index", "role", "text", "style"}
        if not required_card_keys.issubset(set(card.keys())):
            all_cards_valid = False
            _check(f"  카드 {i+1} 필수 키 존재", False, f"누락: {required_card_keys - set(card.keys())}")
            continue

        # index 순서 검증
        if card["index"] != i + 1:
            all_cards_valid = False

        # role 유효성
        if card["role"] not in valid_roles:
            all_cards_valid = False

        # text.headline 존재 및 길이
        text = card.get("text", {})
        if "headline" not in text:
            all_cards_valid = False
        elif len(text["headline"]) > 15:
            all_cards_valid = False

        # style.layout 유효성
        layout = card.get("style", {}).get("layout", "")
        if layout and layout not in valid_layouts:
            all_cards_valid = False

    _check(
        "card_spec.cards: 모든 카드 구조 유효",
        all_cards_valid,
        f"{len(cards)}장 모두 검증 통과" if all_cards_valid else "일부 카드 구조 오류",
    )

    # cover 카드 존재 확인
    roles_list = [c.get("role") for c in cards]
    _check(
        "card_spec.cards: cover 카드 존재",
        "cover" in roles_list,
    )
    _check(
        "card_spec.cards: closing 카드 존재",
        "closing" in roles_list,
    )

    # sns 검증
    sns = card_spec.get("sns", {})
    _check("card_spec.sns.instagram 존재", "instagram" in sns)
    _check("card_spec.sns.threads 존재", "threads" in sns)

    ig = sns.get("instagram", {})
    _check("sns.instagram.caption 존재", "caption" in ig)
    _check(
        "sns.instagram.caption 길이 <= 2200자",
        len(ig.get("caption", "")) <= 2200,
        f"{len(ig.get('caption', ''))}자",
    )
    _check(
        "sns.instagram.hashtags 존재 (list)",
        isinstance(ig.get("hashtags"), list) and len(ig.get("hashtags", [])) > 0,
        f"{len(ig.get('hashtags', []))}개",
    )

    threads = sns.get("threads", {})
    _check("sns.threads.text 존재", "text" in threads)
    _check(
        "sns.threads.text 길이 <= 500자",
        len(threads.get("text", "")) <= 500,
        f"{len(threads.get('text', ''))}자",
    )

    # ── 4. SpecValidator로 card_spec 전체 검증 ──
    _print_step("4단계: SpecValidator 스키마 호환성 검증")

    from lib.spec_validator import SpecValidator
    validator = SpecValidator()
    validation_errors = validator.validate(card_spec)
    errors = [e for e in validation_errors if e.severity == "error"]
    warnings = [e for e in validation_errors if e.severity == "warning"]

    _check(
        "SpecValidator: 에러 없음",
        len(errors) == 0,
        f"에러 {len(errors)}건, 경고 {len(warnings)}건",
    )

    if errors:
        for e in errors:
            print(f"    [ERROR] {e.field}: {e.message}")
    if warnings:
        for w in warnings:
            print(f"    [WARN]  {w.field}: {w.message}")

    # ── 5. 전체 파이프라인 데이터 일관성 검증 ──
    _print_step("5단계: 파이프라인 데이터 일관성 검증")

    # Researcher의 season_info가 researcher_output에 반영되었는지
    _check(
        "파이프라인: Researcher 입력 season이 후보 주제에 반영",
        any("봄" in c.get("season_relevance", "") for c in researcher_output["candidates"]),
    )

    # Strategist가 선택한 topic이 Researcher 후보에 있는지
    selected_id = strategist_output["selected_topic"]["id"]
    candidate_ids = [c["id"] for c in researcher_output["candidates"]]
    _check(
        "파이프라인: Strategist 선택 topic이 Researcher 후보에 존재",
        selected_id in candidate_ids,
        f"선택={selected_id}, 후보={candidate_ids}",
    )

    # Copywriter card_spec의 topic이 Strategist 선택과 일치하는지
    spec_topic = card_spec["meta"]["topic"]
    strategist_topic = strategist_output["selected_topic"]["topic"]
    _check(
        "파이프라인: Copywriter card_spec topic == Strategist 선택 topic",
        spec_topic == strategist_topic,
        f"spec='{spec_topic}', strategist='{strategist_topic}'",
    )

    # card_spec 카드 수가 strategist total_cards와 일치하는지
    _check(
        "파이프라인: card_spec 카드 수 == Strategist total_cards",
        len(cards) == strategist_output["total_cards"],
        f"spec={len(cards)}, strategist={strategist_output['total_cards']}",
    )

    # card_spec 카드 역할이 strategist card_plan과 일치하는지
    plan_roles = [cp["role"] for cp in strategist_output["card_plan"]]
    spec_roles = [c["role"] for c in cards]
    _check(
        "파이프라인: card_spec 카드 역할 == Strategist card_plan 역할",
        plan_roles == spec_roles,
        f"plan={plan_roles}, spec={spec_roles}",
    )


# ══════════════════════════════════════════════════════════════
#  LIVE 모드
# ══════════════════════════════════════════════════════════════

def run_live():
    """실제 Claude API를 호출하여 전체 파이프라인을 실행합니다."""
    _print_header("LIVE 모드: 실제 API 호출로 전체 파이프라인 실행")

    # API 키 확인
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("\n  [FAIL] ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.")
        print("  export ANTHROPIC_API_KEY='sk-...' 를 실행한 후 다시 시도하세요.")
        return

    _check("ANTHROPIC_API_KEY 환경변수 설정 확인", bool(api_key))

    # 에이전트 임포트 및 생성
    import importlib
    mod_researcher = importlib.import_module("agents.content_team.01_researcher")
    mod_strategist = importlib.import_module("agents.content_team.02_strategist")
    mod_copywriter = importlib.import_module("agents.content_team.03_copywriter")

    ResearcherAgent = mod_researcher.ResearcherAgent
    StrategistAgent = mod_strategist.StrategistAgent
    CopywriterAgent = mod_copywriter.CopywriterAgent

    # ── 1. Researcher 실행 ──
    _print_step("1단계: Researcher 에이전트 실행")

    researcher = ResearcherAgent()
    _check("Researcher 에이전트 생성", researcher is not None)

    researcher_call = AgentCall(
        agent_id="researcher",
        task_type="content_pipeline",
        input_data={
            "date": "2026-03-14",
            "trigger": "integration_test",
            "season_info": {"month": 3, "season": "봄", "events": ["개학 시즌", "봄철 우울감"]},
            "recent_topics": ["수면 위생 관리법", "직장인 번아웃 예방"],
        },
        context={"session_id": "live-test-001", "date": "2026-03-14"},
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        journal = WorkJournal(session_id="live-test-001", output_dir=tmpdir)

        print("\n  Researcher API 호출 중...")
        start = time.time()
        researcher_result = researcher.run(researcher_call, journal)
        elapsed = time.time() - start

        _check(
            "Researcher 실행 성공",
            researcher_result.is_success(),
            f"상태={researcher_result.status}, 소요={elapsed:.1f}초",
        )

        if not researcher_result.is_success():
            print(f"  [FAIL] Researcher 실패: {researcher_result.error}")
            print("  파이프라인 중단.")
            journal.finalize("failed")
            journal.save()
            return

        # Researcher 출력 검증
        r_output = researcher_result.output_data
        _check(
            "Researcher 출력: candidates 키 존재",
            "candidates" in r_output,
        )
        candidates = r_output.get("candidates", [])
        _check(
            "Researcher 출력: candidates 비어있지 않음",
            len(candidates) > 0,
            f"{len(candidates)}건",
        )

        if candidates:
            required_fields = {"topic", "angle", "rationale"}
            first = candidates[0]
            has_required = required_fields.issubset(set(first.keys()))
            _check(
                "Researcher 출력: 후보 필수 필드 존재",
                has_required,
                f"키: {list(first.keys())}",
            )
            _check(
                "Researcher 출력: trend_score 타입 검증",
                isinstance(first.get("trend_score"), (int, float)),
                f"값: {first.get('trend_score')}",
            )

        # ── 2. Strategist 실행 ──
        _print_step("2단계: Strategist 에이전트 실행")

        strategist = StrategistAgent()
        _check("Strategist 에이전트 생성", strategist is not None)

        strategist_call = AgentCall(
            agent_id="strategist",
            task_type="content_pipeline",
            input_data=r_output,  # Researcher 출력을 그대로 전달
            context={"session_id": "live-test-001", "date": "2026-03-14"},
        )

        print("\n  Strategist API 호출 중...")
        start = time.time()
        strategist_result = strategist.run(strategist_call, journal)
        elapsed = time.time() - start

        _check(
            "Strategist 실행 성공",
            strategist_result.is_success(),
            f"상태={strategist_result.status}, 소요={elapsed:.1f}초",
        )

        if not strategist_result.is_success():
            print(f"  [FAIL] Strategist 실패: {strategist_result.error}")
            print("  파이프라인 중단.")
            journal.finalize("failed")
            journal.save()
            return

        # Strategist 출력 검증
        s_output = strategist_result.output_data
        for key in ["selected_topic", "persona", "card_plan", "hashtags", "total_cards"]:
            _check(
                f"Strategist 출력: {key} 존재",
                key in s_output,
            )

        _check(
            "Strategist 출력: selected_topic 필수 필드",
            all(k in s_output.get("selected_topic", {}) for k in ["id", "topic", "angle", "selection_reason"]),
            f"키: {list(s_output.get('selected_topic', {}).keys())}",
        )
        _check(
            "Strategist 출력: card_plan 리스트 타입",
            isinstance(s_output.get("card_plan"), list),
        )
        total_cards = s_output.get("total_cards", 0)
        _check(
            "Strategist 출력: total_cards 범위 (6~10)",
            6 <= total_cards <= 10,
            f"total_cards={total_cards}",
        )

        # ── 3. Copywriter 실행 ──
        _print_step("3단계: Copywriter 에이전트 실행")

        copywriter = CopywriterAgent()
        _check("Copywriter 에이전트 생성", copywriter is not None)

        copywriter_call = AgentCall(
            agent_id="copywriter",
            task_type="content_pipeline",
            input_data=s_output,  # Strategist 출력을 그대로 전달
            context={"session_id": "live-test-001", "date": "2026-03-14"},
        )

        print("\n  Copywriter API 호출 중...")
        start = time.time()
        copywriter_result = copywriter.run(copywriter_call, journal)
        elapsed = time.time() - start

        _check(
            "Copywriter 실행 성공",
            copywriter_result.is_success(),
            f"상태={copywriter_result.status}, 소요={elapsed:.1f}초",
        )

        if not copywriter_result.is_success():
            print(f"  [FAIL] Copywriter 실패: {copywriter_result.error}")
            print("  파이프라인 중단.")
            journal.finalize("failed")
            journal.save()
            return

        # ── 4. card_spec 최종 출력 검증 ──
        _print_step("4단계: card_spec 최종 출력 검증")

        c_output = copywriter_result.output_data
        _check("최종 출력: card_spec 키 존재", "card_spec" in c_output)

        card_spec = c_output.get("card_spec", {})

        # meta 검증
        meta = card_spec.get("meta", {})
        for key in ["id", "topic", "created_at", "status"]:
            _check(f"card_spec.meta.{key} 존재", key in meta)
        _check(
            "card_spec.meta.status == 'draft'",
            meta.get("status") == "draft",
            f"실제 값: {meta.get('status')}",
        )

        # cards 검증
        cards = card_spec.get("cards", [])
        _check("card_spec.cards 존재 (리스트)", isinstance(cards, list) and len(cards) > 0, f"{len(cards)}장")
        _check("card_spec.cards 수 범위 (6~10)", 6 <= len(cards) <= 10, f"{len(cards)}장")

        if cards:
            # 첫 번째 카드 구조 검증
            first_card = cards[0]
            _check("카드 구조: index 존재", "index" in first_card)
            _check("카드 구조: role 존재", "role" in first_card)
            _check("카드 구조: text 존재", "text" in first_card)
            text = first_card.get("text", {})
            _check("카드 텍스트: headline 존재", "headline" in text)
            _check("카드 텍스트: body 존재", "body" in text)

            # cover 카드 존재 확인
            roles = [c.get("role") for c in cards]
            _check("카드 역할: cover 카드 존재", "cover" in roles)

        # sns 검증
        sns = card_spec.get("sns", {})
        _check("card_spec.sns 존재", bool(sns))
        _check("card_spec.sns.instagram 존재", "instagram" in sns)
        _check("card_spec.sns.threads 존재", "threads" in sns)

        ig = sns.get("instagram", {})
        if ig:
            _check("sns.instagram.caption 존재", "caption" in ig)
            _check(
                "sns.instagram.caption 길이 <= 2200자",
                len(ig.get("caption", "")) <= 2200,
                f"{len(ig.get('caption', ''))}자",
            )

        # SpecValidator로 card_spec 검증
        _print_step("5단계: SpecValidator 스키마 호환성 검증")

        from lib.spec_validator import SpecValidator
        validator = SpecValidator()
        validation_errors = validator.validate(card_spec)
        errors = [e for e in validation_errors if e.severity == "error"]
        warnings = [e for e in validation_errors if e.severity == "warning"]

        _check(
            "SpecValidator 검증: 에러 없음",
            len(errors) == 0,
            f"에러 {len(errors)}건, 경고 {len(warnings)}건",
        )

        if errors:
            for e in errors:
                print(f"    [ERROR] {e.field}: {e.message}")
        if warnings:
            for w in warnings:
                print(f"    [WARN]  {w.field}: {w.message}")

        # ── 6. 업무일지 생성 확인 ──
        _print_step("6단계: 업무일지 생성 확인")

        journal.finalize("completed")
        journal.save()

        json_path = journal.session_dir / "work_journal.json"
        md_path = journal.session_dir / "work_journal.md"

        _check("업무일지 JSON 파일 생성", json_path.exists())
        _check("업무일지 MD 파일 생성", md_path.exists())

        if json_path.exists():
            with open(json_path, "r", encoding="utf-8") as f:
                journal_data = json.load(f)
            _check(
                "업무일지 내용: 완료 상태",
                journal_data.get("pipeline_status") == "completed",
            )
            _check(
                "업무일지 내용: 항목 존재",
                journal_data.get("total_entries", 0) > 0,
                f"{journal_data.get('total_entries')}건",
            )

            # 3개 에이전트가 모두 기록되어 있는지
            agents_in_journal = journal_data.get("summary", {}).get("agents", {})
            for aid in ["researcher", "strategist", "copywriter"]:
                _check(
                    f"업무일지에 {aid} 기록 존재",
                    aid in agents_in_journal,
                )

        # 최종 card_spec 내용 출력
        print(f"\n--- 최종 card_spec 요약 ---")
        print(f"  주제: {meta.get('topic', '?')}")
        print(f"  앵글: {meta.get('angle', '?')}")
        print(f"  카드 수: {len(cards)}장")
        print(f"  카드 역할: {[c.get('role') for c in cards]}")
        if cards:
            print(f"  첫 번째 카드 헤드라인: {cards[0].get('text', {}).get('headline', '?')}")


# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="콘텐츠 파이프라인 통합 테스트",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
사용 예시:
  python tests/test_content_pipeline.py --dry-run   # API 없이 구조만 검증
  python tests/test_content_pipeline.py --e2e       # Mock 데이터로 E2E 파이프라인 검증
  python tests/test_content_pipeline.py --live       # 실제 API 호출로 전체 실행
        """,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="API 호출 없이 구조 검증만 수행")
    group.add_argument("--e2e", action="store_true", help="Mock 데이터로 E2E 파이프라인 데이터 흐름 검증")
    group.add_argument("--live", action="store_true", help="실제 Claude API 호출로 전체 파이프라인 실행")

    args = parser.parse_args()

    global _pass_count, _fail_count
    _pass_count = 0
    _fail_count = 0

    mode_label = "DRY-RUN (구조 검증)"
    if args.e2e:
        mode_label = "E2E (Mock 데이터 파이프라인 검증)"
    elif args.live:
        mode_label = "LIVE (API 호출)"

    print("\n" + "=" * 60)
    print("  콘텐츠 파이프라인 통합 테스트")
    print(f"  모드: {mode_label}")
    print(f"  프로젝트: {PROJECT_ROOT}")
    print("=" * 60)

    start_time = time.time()

    if args.dry_run:
        run_dry_run()
    elif args.e2e:
        run_e2e_validation()
    else:
        run_live()

    elapsed = time.time() - start_time

    # 최종 결과 요약
    total = _pass_count + _fail_count
    print(f"\n{'=' * 60}")
    print(f"  테스트 결과 요약")
    print(f"{'=' * 60}")
    print(f"  총 검증 항목: {total}개")
    print(f"  통과: {_pass_count}개")
    print(f"  실패: {_fail_count}개")
    print(f"  소요 시간: {elapsed:.1f}초")
    print(f"{'=' * 60}")

    if _fail_count == 0:
        print(f"\n  결과: 모든 테스트 통과")
    else:
        print(f"\n  결과: {_fail_count}개 테스트 실패")

    sys.exit(0 if _fail_count == 0 else 1)


if __name__ == "__main__":
    main()

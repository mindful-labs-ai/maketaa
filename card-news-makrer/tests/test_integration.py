"""
통합 테스트 — 전체 시스템 드라이런

샘플 데이터로 파이프라인 전체를 시뮬레이션하여
모든 컴포넌트(검증기, 업무일지, BaseAgent, Orchestrator)가 정상 동작하는지 확인합니다.
"""

import sys
import json
from pathlib import Path

# 프로젝트 루트를 path에 추가
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from lib.spec_validator import SpecValidator
from lib.work_journal import WorkJournal
from lib.base_agent import BaseAgent, AgentCall, AgentResult, AgentRegistry
from orchestrator.main import Orchestrator


# ──────────────────────────────────────────
# 1. 테스트용 Mock 에이전트 (실제 AI 호출 없이 시뮬레이션)
# ──────────────────────────────────────────

class MockResearcher(BaseAgent):
    def execute(self, call: AgentCall) -> AgentResult:
        return AgentResult(
            agent_id=self.agent_id,
            status="success",
            output_data={
                "candidates": [
                    {
                        "id": "topic_001",
                        "topic": "봄철 무기력감 극복하기",
                        "angle": "계절성 정서 변화를 자연스러운 현상으로 인정",
                        "trend_score": 0.92,
                        "sources": ["https://example.com/spring-fatigue"],
                        "season_relevance": "봄철 우울감",
                    },
                    {
                        "id": "topic_002",
                        "topic": "직장인 번아웃 자가진단",
                        "angle": "번아웃 초기 신호 인식하기",
                        "trend_score": 0.78,
                        "sources": ["https://example.com/burnout"],
                        "season_relevance": "연초 업무 과부하",
                    },
                ]
            },
            logs=[
                "뉴스 검색 완료: 23건 수집",
                "SNS 키워드 분석: '봄피로' 급상승 (+340%)",
                "후보 주제 2개 선정",
            ],
        )


class MockStrategist(BaseAgent):
    def execute(self, call: AgentCall) -> AgentResult:
        candidates = call.input_data.get("candidates", [])
        selected = candidates[0] if candidates else {"topic": "기본 주제"}
        return AgentResult(
            agent_id=self.agent_id,
            status="success",
            output_data={
                "selected_topic": selected,
                "persona": {
                    "age_range": "25-35",
                    "description": "직장 스트레스로 지친 밀레니얼 직장인",
                },
                "card_plan": [
                    {"card_number": i, "role": role}
                    for i, role in enumerate(
                        ["cover", "empathy", "cause", "insight",
                         "solution", "solution", "tip", "closing", "source", "cta"],
                        start=1,
                    )
                ],
                "total_cards": 10,
                "hashtags": {"primary": ["#멘탈헬스"], "secondary": ["#봄피로"]},
            },
            logs=[
                f"주제 선정: '{selected.get('topic', '?')}' (트렌드 {selected.get('trend_score', 0)})",
                "카드 10장 구성 기획 완료",
            ],
        )


class MockCopywriter(BaseAgent):
    def execute(self, call: AgentCall) -> AgentResult:
        # 샘플 card_spec.json 로드
        sample_path = PROJECT_ROOT / "output" / "sample" / "card_spec.json"
        with open(sample_path, "r", encoding="utf-8") as f:
            card_spec = json.load(f)
        return AgentResult(
            agent_id=self.agent_id,
            status="success",
            output_data={
                "card_spec": card_spec,
                "sns_caption": card_spec.get("sns", {}),
            },
            logs=[
                "카드 10장 텍스트 작성 완료",
                "인스타그램 캡션 작성 완료",
                "스레드 텍스트 작성 완료",
            ],
        )


class MockDesignDirector(BaseAgent):
    def execute(self, call: AgentCall) -> AgentResult:
        card_spec = call.input_data.get("card_spec", {})
        return AgentResult(
            agent_id=self.agent_id,
            status="success",
            output_data={
                "card_spec": card_spec,  # 스타일 이미 샘플에 포함
                "image_prompts": [
                    {"card_number": c["index"], "prompt": c.get("background", {}).get("prompt", "")}
                    for c in card_spec.get("cards", [])
                ],
            },
            logs=[
                "컬러 팔레트 선정: calm (차분한 블루)",
                "카드 10장 레이아웃 설계 완료",
                "이미지 프롬프트 10개 작성",
            ],
        )


class MockImageGenerator(BaseAgent):
    def execute(self, call: AgentCall) -> AgentResult:
        card_spec = call.input_data.get("card_spec", {})
        # 이미지 경로 시뮬레이션
        assets = []
        for card in card_spec.get("cards", []):
            idx = card["index"]
            card["background"]["src"] = f"/output/2026-03-09/assets/card_{idx}_bg.png"
            assets.append(f"card_{idx}_bg.png")
        return AgentResult(
            agent_id=self.agent_id,
            status="success",
            output_data={"card_spec": card_spec},
            artifacts=[f"/output/2026-03-09/assets/{a}" for a in assets],
            logs=[
                f"이미지 {len(assets)}장 생성 완료 (시뮬레이션)",
                "에셋 경로 card_spec에 연결 완료",
            ],
        )


class MockQAEditor(BaseAgent):
    def execute(self, call: AgentCall) -> AgentResult:
        card_spec = call.input_data.get("card_spec", {})
        return AgentResult(
            agent_id=self.agent_id,
            status="success",
            output_data={
                "card_spec": card_spec,
                "qa_report": {
                    "overall_status": "pass",
                    "critical_issues": [],
                    "minor_issues": [],
                    "checklist": {
                        "sources_cited": True,
                        "crisis_expression_clean": True,
                        "brand_tone_match": True,
                        "readability_ok": True,
                    },
                },
            },
            logs=[
                "안전 키워드 스캔: 문제 없음",
                "팩트체크: 출처 확인 완료",
                "맞춤법 검사: 수정 0건",
                "전체 검수 통과",
            ],
        )


class MockPublisher(BaseAgent):
    def execute(self, call: AgentCall) -> AgentResult:
        return AgentResult(
            agent_id=self.agent_id,
            status="success",
            output_data={
                "publish_report": {
                    "instagram": {"status": "success", "post_url": "https://instagram.com/p/sample123"},
                    "threads": {"status": "success", "post_url": "https://threads.net/@sample/post/456"},
                },
            },
            logs=[
                "인스타그램 Carousel 업로드 완료 (시뮬레이션)",
                "스레드 게시 완료 (시뮬레이션)",
                "게시 보고서 작성",
            ],
        )


# ──────────────────────────────────────────
# 2. 테스트 실행
# ──────────────────────────────────────────

def test_spec_validator():
    """card_spec.json 검증기 테스트"""
    print("=" * 60)
    print("TEST 1: card_spec.json 검증기")
    print("=" * 60)

    validator = SpecValidator()
    sample_path = PROJECT_ROOT / "output" / "sample" / "card_spec.json"
    errors = validator.validate_file(sample_path)

    error_count = sum(1 for e in errors if e.severity == "error")
    warn_count = sum(1 for e in errors if e.severity == "warning")

    for e in errors:
        print(f"  {'❌' if e.severity == 'error' else '⚠️'} {e}")

    if error_count == 0:
        print(f"  ✅ 검증 통과 (경고 {warn_count}건)")
    else:
        print(f"  ❌ 검증 실패: 에러 {error_count}건")

    print()
    return error_count == 0


def test_work_journal():
    """업무일지 시스템 테스트"""
    print("=" * 60)
    print("TEST 2: 업무일지 시스템")
    print("=" * 60)

    journal = WorkJournal(session_id="test-journal", output_dir=PROJECT_ROOT / "output")

    journal.log("orchestrator", "테스트 시작", "업무일지 시스템 테스트")
    journal.log_agent_start("researcher", input_summary="테스트 입력")
    journal.log("researcher", "검색", "뉴스 23건 수집")
    journal.log_agent_end("researcher", output_summary="후보 2개", duration_ms=500, success=True)
    journal.log_handoff("researcher", "strategist", "후보 주제 2개 JSON")
    journal.log_validation("qa_editor", [], [{"field": "test", "message": "테스트 경고"}])
    journal.finalize("completed")
    journal.save()

    # 파일 존재 확인
    json_exists = (journal.session_dir / "work_journal.json").exists()
    md_exists = (journal.session_dir / "work_journal.md").exists()

    print(f"  JSON 파일: {'✅' if json_exists else '❌'}")
    print(f"  MD 파일: {'✅' if md_exists else '❌'}")
    print()
    return json_exists and md_exists


def test_agent_registry():
    """에이전트 레지스트리 테스트"""
    print("=" * 60)
    print("TEST 3: 에이전트 레지스트리")
    print("=" * 60)

    registry = AgentRegistry(PROJECT_ROOT / "agents" / "agent_registry.yaml")

    # 에이전트 조회
    agents = registry.get_all()
    print(f"  등록된 에이전트: {len(agents)}개")
    for aid in agents:
        if isinstance(agents[aid], dict):
            print(f"    - {aid}: {agents[aid].get('name', '?')}")

    # 파이프라인 조회
    steps = registry.get_pipeline_steps("content_pipeline")
    print(f"  콘텐츠 파이프라인: {' → '.join(steps)}")

    # 태스크 라우팅 조회
    routing = registry.get_task_routing("content_creation")
    print(f"  content_creation 라우팅: {routing}")

    print()
    return len(agents) > 0 and len(steps) > 0


def test_base_agent_prompt_loading():
    """BaseAgent의 System Prompt 로드 테스트"""
    print("=" * 60)
    print("TEST 4: System Prompt 로드")
    print("=" * 60)

    spec_path = PROJECT_ROOT / "agents" / "content_team" / "01_researcher.md"
    agent = MockResearcher(agent_id="researcher", spec_path=spec_path)

    prompt = agent.system_prompt
    has_prompt = len(prompt) > 50  # 의미있는 길이 확인
    print(f"  spec 파일: {spec_path.name}")
    print(f"  프롬프트 길이: {len(prompt)}자")
    print(f"  프롬프트 시작: {prompt[:80]}...")
    print(f"  로드 결과: {'✅' if has_prompt else '❌'}")
    print()
    return has_prompt


def test_full_pipeline_dryrun():
    """전체 파이프라인 드라이런 테스트"""
    print("=" * 60)
    print("TEST 5: 전체 파이프라인 드라이런")
    print("=" * 60)

    orch = Orchestrator()

    # Mock 에이전트 등록
    agents_map = {
        "researcher": MockResearcher,
        "strategist": MockStrategist,
        "copywriter": MockCopywriter,
        "design_director": MockDesignDirector,
        "image_generator": MockImageGenerator,
        "qa_editor": MockQAEditor,
        "publisher": MockPublisher,
    }

    for agent_id, cls in agents_map.items():
        spec_info = orch.registry.get(agent_id)
        spec_path = None
        if spec_info and "spec" in spec_info:
            spec_path = PROJECT_ROOT / spec_info["spec"]
        orch.register_agent(agent_id, cls(agent_id=agent_id, spec_path=spec_path))

    print(f"  등록된 에이전트: {len(orch._agents)}개\n")

    # 파이프라인 실행
    result = orch.run_content_pipeline(trigger="test_dryrun")

    print(f"\n  세션 ID: {result['session_id']}")
    print(f"  최종 상태: {result['status']}")
    print(f"  일지 경로: {result['journal_path']}")

    success = result["status"] == "completed"
    print(f"\n  파이프라인 결과: {'✅ 성공' if success else '❌ 실패'}")

    # 업무일지 내용 확인
    journal_md = Path(result["journal_path"]) / "work_journal.md"
    if journal_md.exists():
        lines = journal_md.read_text(encoding="utf-8").count("\n")
        print(f"  업무일지 길이: {lines}줄")

    print()
    return success


# ──────────────────────────────────────────
# 메인
# ──────────────────────────────────────────

if __name__ == "__main__":
    print("\n🧪 멘탈헬스 카드뉴스 시스템 — 통합 테스트\n")

    results = {
        "card_spec 검증기": test_spec_validator(),
        "업무일지 시스템": test_work_journal(),
        "에이전트 레지스트리": test_agent_registry(),
        "System Prompt 로드": test_base_agent_prompt_loading(),
        "전체 파이프라인 드라이런": test_full_pipeline_dryrun(),
    }

    print("=" * 60)
    print("📊 테스트 결과 요약")
    print("=" * 60)

    all_passed = True
    for name, passed in results.items():
        icon = "✅" if passed else "❌"
        print(f"  {icon} {name}")
        if not passed:
            all_passed = False

    print(f"\n{'🎉 모든 테스트 통과!' if all_passed else '⚠️ 일부 테스트 실패'}")
    sys.exit(0 if all_passed else 1)

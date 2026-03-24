"""
Bootstrap — 오케스트레이터에 에이전트 인스턴스 등록

사용법:
    from orchestrator.bootstrap import create_orchestrator
    orch = create_orchestrator()
    result = orch.run_content_pipeline()
"""

import importlib
from pathlib import Path

from orchestrator.main import Orchestrator

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _import_agent_class(module_path: str, class_name: str):
    """숫자로 시작하는 모듈명도 import 가능하도록 importlib 사용"""
    module = importlib.import_module(module_path)
    return getattr(module, class_name)


def create_orchestrator() -> Orchestrator:
    """
    Orchestrator를 생성하고 구현된 에이전트 인스턴스를 등록합니다.

    현재 등록 가능한 에이전트:
    - researcher (AGENT 1)
    - strategist (AGENT 2)
    - copywriter (AGENT 3)
    - design_director (AGENT 4)
    - image_generator (AGENT 5)
    - qa_editor (AGENT 6)
    - publisher (AGENT 7)
    """
    orch = Orchestrator()

    # ── Phase 1 콘텐츠 에이전트 등록 ──
    # 파일명이 숫자로 시작하므로 importlib 사용
    ResearcherAgent = _import_agent_class("agents.content_team.01_researcher", "ResearcherAgent")
    StrategistAgent = _import_agent_class("agents.content_team.02_strategist", "StrategistAgent")
    CopywriterAgent = _import_agent_class("agents.content_team.03_copywriter", "CopywriterAgent")

    agents_dir = PROJECT_ROOT / "agents" / "content_team"

    orch.register_agent(
        "researcher",
        ResearcherAgent(
            agent_id="researcher",
            spec_path=agents_dir / "01_researcher.md",
        ),
    )

    orch.register_agent(
        "strategist",
        StrategistAgent(
            agent_id="strategist",
            spec_path=agents_dir / "02_strategist.md",
        ),
    )

    orch.register_agent(
        "copywriter",
        CopywriterAgent(
            agent_id="copywriter",
            spec_path=agents_dir / "03_copywriter.md",
        ),
    )

    # ── Phase 2 비주얼 에이전트 등록 ──
    DesignDirectorAgent = _import_agent_class("agents.content_team.04_design_director", "DesignDirectorAgent")
    ImageGeneratorAgent = _import_agent_class("agents.content_team.05_image_generator", "ImageGeneratorAgent")

    orch.register_agent(
        "design_director",
        DesignDirectorAgent(),
    )

    orch.register_agent(
        "image_generator",
        ImageGeneratorAgent(),
    )

    # ── Phase 3 QA & 퍼블리싱 에이전트 등록 ──
    QAEditorAgent = _import_agent_class("agents.content_team.06_qa_editor", "QAEditorAgent")
    PublisherAgent = _import_agent_class("agents.content_team.07_publisher", "PublisherAgent")

    orch.register_agent(
        "qa_editor",
        QAEditorAgent(),
    )

    orch.register_agent(
        "publisher",
        PublisherAgent(),
    )

    return orch


def list_registered_agents(orch: Orchestrator) -> list[str]:
    """등록된 에이전트 ID 목록 반환"""
    return list(orch._agents.keys())


# ── CLI ──

if __name__ == "__main__":
    print("=== Orchestrator 부트스트랩 ===\n")

    orch = create_orchestrator()
    registered = list_registered_agents(orch)

    print(f"등록된 에이전트 ({len(registered)}개):")
    for agent_id in registered:
        agent = orch.get_agent(agent_id)
        prompt_preview = agent.system_prompt[:60] + "..." if len(agent.system_prompt) > 60 else agent.system_prompt
        print(f"  - {agent_id}: {prompt_preview}")

    print(f"\n파이프라인 스텝:")
    steps = orch.registry.get_pipeline_steps("content_pipeline")
    for step in steps:
        status = "✅ 등록됨" if step in registered else "⬜ 미등록"
        if step == "human_approval":
            status = "🔒 체크포인트"
        print(f"  {step}: {status}")

    print("\n✅ 부트스트랩 완료")

"""
Orchestrator — 파이프라인 실행 엔진

에이전트 레지스트리를 참조하여 파이프라인을 순차 실행하고,
모든 과정을 업무일지에 기록합니다.
"""

import json
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from lib.base_agent import AgentCall, AgentResult, BaseAgent, AgentRegistry
from lib.work_journal import WorkJournal
from lib.spec_validator import SpecValidator

KST = timezone(timedelta(hours=9))
PROJECT_ROOT = Path(__file__).parent.parent


class Orchestrator:
    """
    멀티 에이전트 파이프라인 오케스트레이터

    사용법:
        orchestrator = Orchestrator()
        orchestrator.run_content_pipeline()         # 콘텐츠 파이프라인 전체 실행
        orchestrator.run_single("qa_editor", data)  # 단일 에이전트 실행
    """

    def __init__(self, config_path: str | Path | None = None):
        self.registry = AgentRegistry(PROJECT_ROOT / "agents" / "agent_registry.yaml")
        self.validator = SpecValidator()
        self._agents: dict[str, BaseAgent] = {}

    def register_agent(self, agent_id: str, agent: BaseAgent):
        """에이전트 인스턴스 등록"""
        self._agents[agent_id] = agent

    def get_agent(self, agent_id: str) -> BaseAgent | None:
        """등록된 에이전트 조회"""
        return self._agents.get(agent_id)

    # ── 파이프라인 실행 ──

    def run_content_pipeline(
        self,
        trigger: str = "manual",
        initial_context: dict | None = None,
    ) -> dict:
        """
        콘텐츠 제작 파이프라인 전체 실행

        Returns:
            {
                "session_id": "...",
                "status": "completed" | "failed" | "awaiting_approval",
                "journal_path": "...",
                "final_output": {...}
            }
        """
        # 세션 ID 생성
        now = datetime.now(KST)
        session_id = now.strftime("%Y-%m-%d") + "-001"  # TODO: 자동 채번

        # 업무일지 초기화
        journal = WorkJournal(session_id=session_id, output_dir=PROJECT_ROOT / "output")

        journal.log(
            "orchestrator", "파이프라인 시작",
            f"콘텐츠 제작 파이프라인 실행 | 트리거: {trigger} | 세션: {session_id}"
        )

        # 파이프라인 스텝 로드
        steps = self.registry.get_pipeline_steps("content_pipeline")
        journal.log(
            "orchestrator", "파이프라인 로드",
            f"실행할 에이전트: {' → '.join(steps)}"
        )

        # 컨텍스트 초기화
        context = {
            "session_id": session_id,
            "date": now.strftime("%Y-%m-%d"),
            "trigger": trigger,
            "pipeline": "content_pipeline",
            **(initial_context or {}),
        }

        # 순차 실행
        current_data = {}
        results = {}

        for step_index, agent_id in enumerate(steps):
            # human_approval 체크포인트 처리
            if agent_id == "human_approval":
                journal.log_checkpoint(
                    "인간 승인 대기",
                    "캔버스 에디터에 로드 완료. 운영자 승인을 기다립니다."
                )
                # 실제 운영 시 여기서 대기 상태로 전환
                # 현재는 시뮬레이션으로 자동 통과
                journal.log_checkpoint("인간 승인 완료", "운영자가 승인했습니다 (시뮬레이션)")
                continue

            # 에이전트 존재 확인
            agent = self.get_agent(agent_id)
            if not agent:
                journal.log_error(
                    "orchestrator",
                    f"에이전트 '{agent_id}'가 등록되지 않았습니다. 건너뜁니다.",
                )
                continue

            # 에이전트 설정 로드
            agent_info = self.registry.get(agent_id) or {}
            max_retries = agent_info.get("max_retries", 2)
            timeout = agent_info.get("timeout_seconds", 300)

            # 데이터 핸드오프 기록
            if step_index > 0 and current_data:
                prev_agent = steps[step_index - 1]
                if prev_agent != "human_approval":
                    data_keys = list(current_data.keys())
                    journal.log_handoff(
                        prev_agent, agent_id,
                        f"데이터 키: {', '.join(data_keys[:5])}"
                    )

            # 호출 객체 생성
            call = AgentCall(
                agent_id=agent_id,
                task_type="content_pipeline",
                input_data=current_data,
                context=context,
            )

            # 재시도 루프
            result = None
            for retry in range(max_retries + 1):
                if retry > 0:
                    journal.log(
                        "orchestrator", "재시도",
                        f"{agent_id} 에이전트 재시도 {retry}/{max_retries}",
                        status="warning",
                    )

                result = agent.run(call, journal)

                if result.is_success():
                    break
                elif retry < max_retries:
                    journal.log_error(agent_id, f"실패 — 재시도 예정", retry_count=retry + 1)
                    time.sleep(1)  # 재시도 전 대기

            # 최종 결과 처리
            results[agent_id] = result

            if result and result.is_success():
                current_data = result.output_data

                # card_spec이 포함된 경우 검증
                if "card_spec" in current_data:
                    validation_errors = self.validator.validate(current_data["card_spec"])
                    errors = [e for e in validation_errors if e.severity == "error"]
                    warnings = [e for e in validation_errors if e.severity == "warning"]
                    journal.log_validation(
                        agent_id,
                        [e.to_dict() for e in errors],
                        [e.to_dict() for e in warnings],
                    )
            else:
                # 파이프라인 중단
                journal.log(
                    "orchestrator", "파이프라인 중단",
                    f"{agent_id} 에이전트 최종 실패. 파이프라인을 중단합니다.",
                    status="error",
                )
                journal.finalize("failed")
                journal.save()
                return {
                    "session_id": session_id,
                    "status": "failed",
                    "failed_at": agent_id,
                    "journal_path": str(journal.session_dir),
                }

        # 파이프라인 완료
        journal.finalize("completed")
        journal.save()

        return {
            "session_id": session_id,
            "status": "completed",
            "journal_path": str(journal.session_dir),
            "final_output": current_data,
        }

    # ── 단일 에이전트 실행 ──

    def run_single(
        self,
        agent_id: str,
        input_data: dict,
        task_type: str = "single_run",
        context: dict | None = None,
    ) -> AgentResult:
        """특정 에이전트 단독 실행 (디버깅/수동 실행용)"""
        session_id = datetime.now(KST).strftime("%Y-%m-%d") + f"-single-{agent_id}"
        journal = WorkJournal(session_id=session_id, output_dir=PROJECT_ROOT / "output")

        journal.log("orchestrator", "단일 실행", f"에이전트 {agent_id} 단독 실행")

        agent = self.get_agent(agent_id)
        if not agent:
            journal.log_error("orchestrator", f"에이전트 '{agent_id}'가 등록되지 않았습니다")
            journal.finalize("failed")
            journal.save()
            return AgentResult(agent_id=agent_id, status="failure", error="Agent not found")

        call = AgentCall(
            agent_id=agent_id,
            task_type=task_type,
            input_data=input_data,
            context=context or {"date": datetime.now(KST).strftime("%Y-%m-%d")},
        )

        result = agent.run(call, journal)
        journal.finalize("completed" if result.is_success() else "failed")
        journal.save()
        return result

    # ── 태스크 라우팅 ──

    def route_task(self, task_type: str, input_data: dict) -> dict:
        """태스크 유형에 따라 적절한 에이전트/파이프라인으로 라우팅"""
        routing = self.registry.get_task_routing(task_type)

        if not routing:
            return {"error": f"알 수 없는 태스크 유형: {task_type}"}

        if "pipeline" in routing:
            # 파이프라인 실행
            return self.run_content_pipeline(
                trigger=f"task_routing:{task_type}",
                initial_context={"task_type": task_type},
            )
        elif "entry_agent" in routing:
            # 단일 에이전트 실행
            agent_id = routing["entry_agent"]
            result = self.run_single(agent_id, input_data, task_type=task_type)
            return result.to_dict()
        else:
            return {"error": f"라우팅 설정이 불완전합니다: {routing}"}


# ── CLI ──

if __name__ == "__main__":
    print("=== Orchestrator 초기화 테스트 ===\n")

    orch = Orchestrator()

    # 레지스트리 확인
    print("📋 등록된 에이전트:")
    for agent_id, info in orch.registry.get_all().items():
        name = info.get("name", agent_id) if isinstance(info, dict) else agent_id
        team = info.get("team", "?") if isinstance(info, dict) else "?"
        print(f"  - {agent_id}: {name} ({team})")

    print("\n📌 콘텐츠 파이프라인 순서:")
    steps = orch.registry.get_pipeline_steps("content_pipeline")
    print(f"  {' → '.join(steps)}")

    print("\n🔀 태스크 라우팅:")
    for task_type in ["content_creation", "feature_request", "bug_report", "manual_publish"]:
        routing = orch.registry.get_task_routing(task_type)
        if routing:
            target = routing.get("pipeline", routing.get("entry_agent", "?"))
            print(f"  {task_type} → {target}")

    print("\n✅ Orchestrator 초기화 성공")

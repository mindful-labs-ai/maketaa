"""
BaseAgent — 모든 에이전트의 공통 기반 클래스

모든 에이전트는 이 클래스를 상속받아 execute() 메서드를 구현합니다.
- 표준 Input/Output 인터페이스
- 업무일지(WorkJournal) 자동 연동
- 타임아웃/재시도 지원
- 에이전트 정의(.md) 파일에서 System Prompt 로드
"""

import json
import time
import yaml
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Optional

from lib.work_journal import WorkJournal

KST = timezone(timedelta(hours=9))

# ── 데이터 클래스 ──

@dataclass
class AgentCall:
    """에이전트 호출 요청"""
    agent_id: str
    task_type: str
    input_data: dict
    context: dict = field(default_factory=dict)   # 날짜, 세션ID 등 공유 컨텍스트
    config: dict = field(default_factory=dict)     # 에이전트별 설정 오버라이드


@dataclass
class AgentResult:
    """에이전트 실행 결과"""
    agent_id: str
    status: str = "success"        # success | failure | needs_review
    output_data: dict = field(default_factory=dict)
    artifacts: list = field(default_factory=list)  # 생성된 파일 경로
    logs: list = field(default_factory=list)        # 실행 로그 메시지
    duration_ms: int = 0
    error: str = ""

    def is_success(self) -> bool:
        return self.status == "success"

    def to_dict(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "status": self.status,
            "output_data": self.output_data,
            "artifacts": self.artifacts,
            "logs": self.logs,
            "duration_ms": self.duration_ms,
            "error": self.error,
        }


# ── Base Agent ──

class BaseAgent(ABC):
    """
    모든 에이전트의 기반 클래스

    사용법:
        class ResearcherAgent(BaseAgent):
            def execute(self, call: AgentCall) -> AgentResult:
                # 실제 로직
                ...

        agent = ResearcherAgent(
            agent_id="researcher",
            spec_path="agents/content_team/01_researcher.md"
        )
        result = agent.run(call, journal)
    """

    def __init__(
        self,
        agent_id: str,
        spec_path: str | Path | None = None,
        config: dict | None = None,
    ):
        self.agent_id = agent_id
        self.spec_path = Path(spec_path) if spec_path else None
        self.config = config or {}
        self._system_prompt: str | None = None

    @property
    def system_prompt(self) -> str:
        """에이전트 정의 파일에서 System Prompt 추출"""
        if self._system_prompt is None:
            self._system_prompt = self._load_system_prompt()
        return self._system_prompt

    def _load_system_prompt(self) -> str:
        """spec .md 파일에서 System Prompt 블록 파싱"""
        if not self.spec_path or not self.spec_path.exists():
            return f"You are the {self.agent_id} agent."

        content = self.spec_path.read_text(encoding="utf-8")
        # ```로 감싸진 System Prompt 블록 찾기
        # "## System Prompt" 섹션 아래의 첫 번째 코드 블록
        in_prompt_section = False
        in_code_block = False
        prompt_lines = []

        for line in content.split("\n"):
            if "## System Prompt" in line:
                in_prompt_section = True
                continue
            if in_prompt_section:
                if line.strip().startswith("```") and not in_code_block:
                    in_code_block = True
                    continue
                elif line.strip().startswith("```") and in_code_block:
                    break  # 코드 블록 종료
                elif in_code_block:
                    prompt_lines.append(line)
                elif line.startswith("## "):
                    break  # 다음 섹션 시작

        return "\n".join(prompt_lines).strip() if prompt_lines else f"You are the {self.agent_id} agent."

    # ── 실행 ──

    def run(self, call: AgentCall, journal: WorkJournal) -> AgentResult:
        """
        에이전트 실행 (업무일지 자동 기록 포함)
        이 메서드를 직접 호출하세요. execute()가 아닌 run()을 사용합니다.
        """
        # 1. 시작 기록
        input_summary = self._summarize_input(call.input_data)
        journal.log_agent_start(self.agent_id, input_summary=input_summary)

        start_time = time.time()

        try:
            # 2. 사전 검증
            self._pre_validate(call, journal)

            # 3. 실제 실행 (하위 클래스 구현)
            result = self.execute(call)

            # 4. 소요 시간 계산
            elapsed_ms = int((time.time() - start_time) * 1000)
            result.duration_ms = elapsed_ms

            # 5. 실행 로그를 일지에 기록
            for log_msg in result.logs:
                journal.log(self.agent_id, "실행 로그", log_msg)

            # 6. 완료 기록
            output_summary = self._summarize_output(result)
            journal.log_agent_end(
                self.agent_id,
                output_summary=output_summary,
                duration_ms=elapsed_ms,
                success=result.is_success(),
            )

            # 7. 생성된 파일 기록
            for artifact in result.artifacts:
                journal.log(self.agent_id, "파일 생성", artifact, status="info")

            return result

        except Exception as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
            error_msg = f"{type(e).__name__}: {str(e)}"

            journal.log_error(self.agent_id, error_msg)

            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error=error_msg,
                duration_ms=elapsed_ms,
                logs=[f"예외 발생: {error_msg}"],
            )

    @abstractmethod
    def execute(self, call: AgentCall) -> AgentResult:
        """
        실제 에이전트 로직. 하위 클래스에서 반드시 구현해야 합니다.

        - call.input_data: 이전 에이전트의 출력 데이터
        - call.context: 공유 컨텍스트 (날짜, 세션ID 등)
        - call.config: 에이전트별 설정 오버라이드

        반환: AgentResult (status, output_data, artifacts, logs)
        """
        ...

    # ── 헬퍼 ──

    def _pre_validate(self, call: AgentCall, journal: WorkJournal):
        """호출 전 입력 데이터 기본 검증"""
        if not call.input_data and self.agent_id != "researcher":
            # researcher는 첫 에이전트라 입력이 없을 수 있음
            journal.log(
                self.agent_id, "입력 검증",
                "입력 데이터가 비어있습니다",
                status="warning",
            )

    def _summarize_input(self, data: dict) -> str:
        """입력 데이터 요약 (일지용)"""
        if not data:
            return "(입력 없음)"
        keys = list(data.keys())
        return f"키: {', '.join(keys[:5])}{'...' if len(keys) > 5 else ''}"

    def _summarize_output(self, result: AgentResult) -> str:
        """출력 데이터 요약 (일지용)"""
        parts = []
        if result.output_data:
            keys = list(result.output_data.keys())
            parts.append(f"출력 키: {', '.join(keys[:5])}")
        if result.artifacts:
            parts.append(f"파일 {len(result.artifacts)}개 생성")
        if result.error:
            parts.append(f"에러: {result.error}")
        return " | ".join(parts) if parts else f"상태: {result.status}"

    def log_step(self, journal: WorkJournal, action: str, detail: str, status: str = "info"):
        """에이전트 실행 중 개별 단계 기록 (execute() 내부에서 호출)"""
        journal.log(self.agent_id, action, detail, status=status)


# ── 에이전트 레지스트리 로더 ──

class AgentRegistry:
    """
    agent_registry.yaml에서 에이전트 정보를 로드하고 관리

    사용법:
        registry = AgentRegistry("agents/agent_registry.yaml")
        agent_info = registry.get("researcher")
        pipeline = registry.get_pipeline("content_pipeline")
    """

    def __init__(self, registry_path: str | Path):
        self.registry_path = Path(registry_path)
        self._data: dict = {}
        self._load()

    def _load(self):
        if self.registry_path.exists():
            with open(self.registry_path, "r", encoding="utf-8") as f:
                self._data = yaml.safe_load(f) or {}

    def get(self, agent_id: str) -> dict | None:
        """에이전트 정보 조회"""
        return self._data.get(agent_id)

    def get_all(self) -> dict:
        """모든 에이전트 정보"""
        excluded = {"version", "updated_at", "pipelines", "task_routing"}
        return {k: v for k, v in self._data.items() if k not in excluded}

    def get_pipeline(self, pipeline_name: str) -> dict | None:
        """파이프라인 정의 조회"""
        pipelines = self._data.get("pipelines", {})
        return pipelines.get(pipeline_name)

    def get_pipeline_steps(self, pipeline_name: str) -> list[str]:
        """파이프라인의 에이전트 실행 순서 반환"""
        pipeline = self.get_pipeline(pipeline_name)
        if not pipeline:
            return []
        steps = pipeline.get("steps", [])
        # parallel 등 복합 스텝은 문자열만 필터
        return [s for s in steps if isinstance(s, str)]

    def get_task_routing(self, task_type: str) -> dict | None:
        """태스크 유형 → 에이전트/파이프라인 매핑"""
        routing = self._data.get("task_routing", {})
        return routing.get(task_type)

    def get_spec_path(self, agent_id: str) -> Path | None:
        """에이전트의 spec 파일 경로"""
        info = self.get(agent_id)
        if info and "spec" in info:
            return self.registry_path.parent.parent / info["spec"]
        return None

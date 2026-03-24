"""
ResearcherAgent — 멘탈헬스/웰니스 분야 리서처 에이전트

파이프라인의 첫 번째 에이전트로, 최신 정보를 수집하고
카드뉴스 후보 주제 3~5개를 제안합니다.
"""

import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

from lib.base_agent import BaseAgent, AgentCall, AgentResult
from lib.claude_client import ClaudeClient

logger = logging.getLogger(__name__)

# 프로젝트 루트 경로
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# 응답 스키마 — Claude에게 이 구조로 응답하도록 안내
_RESPONSE_SCHEMA: dict[str, Any] = {
    "candidates": [
        {
            "id": "topic_001",
            "topic": "주제명",
            "angle": "접근 각도 설명",
            "trend_score": 0.85,
            "sources": [
                {"url": "https://example.com/article", "title": "기사 제목", "type": "news"}
            ],
            "season_relevance": "봄철 우울감",
            "target_keywords": ["키워드1", "키워드2"],
            "rationale": "이 주제를 추천하는 이유"
        }
    ]
}


class ResearcherAgent(BaseAgent):
    """
    리서처 에이전트 — 멘탈헬스/웰니스 분야 최신 정보를 수집하고
    카드뉴스 후보 주제 3~5개를 제안합니다.

    사용법:
        agent = ResearcherAgent()
        result = agent.run(call, journal)
    """

    def __init__(
        self,
        claude_client: ClaudeClient | None = None,
        config: dict | None = None,
    ):
        """
        Args:
            claude_client: ClaudeClient 인스턴스 (None이면 기본 설정으로 생성)
            config: 에이전트별 설정 오버라이드
        """
        spec_path = _PROJECT_ROOT / "agents" / "content_team" / "01_researcher.md"
        super().__init__(
            agent_id="researcher",
            spec_path=spec_path,
            config=config,
        )
        self.claude = claude_client or ClaudeClient()

    def execute(self, call: AgentCall) -> AgentResult:
        """
        리서처 에이전트 핵심 로직

        1. input_data에서 날짜/시즌/최근 주제 정보 추출
        2. Claude API에 JSON 형식으로 후보 주제 요청
        3. 응답 파싱 및 검증 후 AgentResult로 반환

        Args:
            call: 에이전트 호출 요청 (input_data에 날짜, 시즌 정보 포함)

        Returns:
            AgentResult — output_data에 candidates 리스트 포함
        """
        logs: list[str] = []

        # ── 1. 입력 데이터 파싱 ──
        input_data = call.input_data
        date = input_data.get("date", datetime.now().strftime("%Y-%m-%d"))
        trigger = input_data.get("trigger", "manual")
        season_info = input_data.get("season_info", {})
        recent_topics = input_data.get("recent_topics", [])

        logs.append(f"리서치 시작 — 날짜: {date}, 트리거: {trigger}")
        logs.append(f"시즌 정보: {season_info.get('season', '미지정')} / 이벤트: {season_info.get('events', [])}")

        # ── 2. 사용자 메시지 구성 ──
        user_message = self._build_user_message(date, season_info, recent_topics)
        logs.append("Claude API 호출 중...")

        # ── 3. Claude API 호출 (JSON 모드, 재시도 포함) ──
        try:
            response_data = self.claude.chat_with_retry(
                system_prompt=self.system_prompt,
                user_message=user_message,
                max_retries=3,
                json_mode=True,
                response_schema=_RESPONSE_SCHEMA,
            )
        except Exception as e:
            logger.error("Claude API 호출 실패: %s", e)
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error=f"Claude API 호출 실패: {e}",
                logs=logs + [f"API 호출 실패: {e}"],
            )

        # ── 4. 응답 검증 및 정규화 ──
        candidates = self._validate_and_normalize(response_data, logs)

        if not candidates:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error="유효한 후보 주제를 생성하지 못했습니다",
                logs=logs,
            )

        logs.append(f"후보 주제 {len(candidates)}개 생성 완료")

        # ── 5. 결과 반환 ──
        output_data: dict[str, Any] = {
            "candidates": candidates,
        }

        return AgentResult(
            agent_id=self.agent_id,
            status="success",
            output_data=output_data,
            logs=logs,
        )

    # ── 내부 헬퍼 ──

    def _build_user_message(
        self,
        date: str,
        season_info: dict,
        recent_topics: list[str],
    ) -> str:
        """
        Claude에게 전달할 사용자 메시지를 구성합니다.

        Args:
            date: 오늘 날짜 (YYYY-MM-DD)
            season_info: 시즌 정보 (month, season, events)
            recent_topics: 최근 발행한 주제 목록 (중복 방지용)

        Returns:
            구성된 사용자 메시지 문자열
        """
        # 시즌 정보 문자열화
        season = season_info.get("season", "미지정")
        month = season_info.get("month", "")
        events = season_info.get("events", [])
        events_str = ", ".join(events) if events else "특이사항 없음"

        # 최근 주제 문자열화
        if recent_topics:
            recent_str = "\n".join(f"  - {t}" for t in recent_topics)
        else:
            recent_str = "  (최근 발행 주제 없음)"

        message = f"""오늘 날짜: {date}
현재 시즌: {season} ({month}월)
시즌 이벤트/이슈: {events_str}

최근 발행한 주제 (중복을 피해주세요):
{recent_str}

위 정보를 바탕으로 멘탈헬스/웰니스 카드뉴스 후보 주제 3~5개를 제안해주세요.

각 후보에 대해 다음 정보를 포함해주세요:
- id: topic_001 형식의 고유 ID
- topic: 주제명
- angle: 카드뉴스에서 다룰 접근 각도
- trend_score: 트렌드 점수 (0.0~1.0, 현재 관심도 기반)
- sources: 관련 자료 목록 (url, title, type)
- season_relevance: 현재 시즌과의 연관성
- target_keywords: 타겟 키워드 리스트
- rationale: 이 주제를 추천하는 이유"""

        return message

    def _validate_and_normalize(
        self,
        response_data: dict | Any,
        logs: list[str],
    ) -> list[dict]:
        """
        Claude 응답 데이터를 검증하고 정규화합니다.

        Args:
            response_data: Claude가 반환한 파싱된 JSON 데이터
            logs: 로그 메시지 리스트 (검증 과정 기록용)

        Returns:
            검증된 후보 주제 리스트 (빈 리스트면 실패)
        """
        # candidates 키 추출
        if isinstance(response_data, dict):
            candidates = response_data.get("candidates", [])
        elif isinstance(response_data, list):
            # 최상위가 리스트인 경우 candidates로 간주
            candidates = response_data
        else:
            logs.append(f"예상치 못한 응답 형식: {type(response_data)}")
            return []

        if not isinstance(candidates, list) or len(candidates) == 0:
            logs.append("후보 주제가 비어있습니다")
            return []

        # 각 후보 항목 검증
        validated: list[dict] = []
        required_fields = {"topic", "angle", "rationale"}

        for i, candidate in enumerate(candidates):
            if not isinstance(candidate, dict):
                logs.append(f"후보 {i+1}: dict가 아닌 형식 — 건너뜀")
                continue

            # 필수 필드 확인
            missing = required_fields - set(candidate.keys())
            if missing:
                logs.append(f"후보 {i+1}: 필수 필드 누락 ({', '.join(missing)}) — 건너뜀")
                continue

            # 기본값 보정
            normalized: dict[str, Any] = {
                "id": candidate.get("id", f"topic_{i+1:03d}"),
                "topic": candidate["topic"],
                "angle": candidate["angle"],
                "trend_score": self._clamp(candidate.get("trend_score", 0.5), 0.0, 1.0),
                "sources": candidate.get("sources", []),
                "season_relevance": candidate.get("season_relevance", ""),
                "target_keywords": candidate.get("target_keywords", []),
                "rationale": candidate["rationale"],
            }
            validated.append(normalized)

        logs.append(f"검증 결과: {len(validated)}/{len(candidates)}개 통과")
        return validated

    @staticmethod
    def _clamp(value: float | int | Any, min_val: float, max_val: float) -> float:
        """값을 min_val~max_val 범위로 제한합니다."""
        try:
            return max(min_val, min(max_val, float(value)))
        except (TypeError, ValueError):
            return 0.5


# ── CLI 테스트 ──

if __name__ == "__main__":
    import sys

    print("=== ResearcherAgent 실행 시뮬레이션 ===\n")

    # 프로젝트 루트를 sys.path에 추가 (직접 실행 시)
    sys.path.insert(0, str(_PROJECT_ROOT))

    from lib.work_journal import WorkJournal

    # 테스트용 입력 데이터
    test_input: dict[str, Any] = {
        "trigger": "manual",
        "date": "2026-03-14",
        "season_info": {
            "month": 3,
            "season": "봄",
            "events": ["개학 시즌", "봄철 우울감"],
        },
        "recent_topics": [
            "수면 위생 관리법",
            "직장인 번아웃 예방",
        ],
    }

    # AgentCall 생성
    call = AgentCall(
        agent_id="researcher",
        task_type="research",
        input_data=test_input,
    )

    # 에이전트 및 업무일지 생성
    journal = WorkJournal(session_id="2026-03-14-test", output_dir=str(_PROJECT_ROOT / "output"))

    try:
        agent = ResearcherAgent()
        result = agent.run(call, journal)

        print(f"\n--- 실행 결과 ---")
        print(f"상태: {result.status}")
        print(f"소요 시간: {result.duration_ms}ms")

        if result.is_success():
            candidates = result.output_data.get("candidates", [])
            print(f"후보 주제 수: {len(candidates)}개\n")
            for c in candidates:
                print(f"  [{c['id']}] {c['topic']}")
                print(f"    각도: {c['angle']}")
                print(f"    트렌드: {c['trend_score']}")
                print(f"    이유: {c['rationale']}")
                print()
        else:
            print(f"에러: {result.error}")

        # 업무일지 저장
        journal.finalize("completed" if result.is_success() else "failed")
        journal.save()

    except ValueError as e:
        # API 키 미설정 등
        print(f"\n[시뮬레이션 모드] API 키 없이 구조만 확인합니다.")
        print(f"에러: {e}")
        print(f"\n에이전트 ID: researcher")
        print(f"스펙 파일: {_PROJECT_ROOT / 'agents' / 'content_team' / '01_researcher.md'}")
        print(f"시스템 프롬프트 로드 확인...")

        # 시스템 프롬프트 로드 테스트 (API 키 없이도 가능)
        from lib.base_agent import BaseAgent as _BA

        class _TestAgent(_BA):
            def execute(self, call: AgentCall) -> AgentResult:
                return AgentResult(agent_id=self.agent_id)

        test_agent = _TestAgent(
            agent_id="researcher",
            spec_path=_PROJECT_ROOT / "agents" / "content_team" / "01_researcher.md",
        )
        prompt = test_agent.system_prompt
        print(f"시스템 프롬프트 ({len(prompt)}자):\n  {prompt[:100]}...")

        # 메시지 빌드 테스트
        agent_stub = ResearcherAgent.__new__(ResearcherAgent)
        msg = ResearcherAgent._build_user_message(
            agent_stub,
            date="2026-03-14",
            season_info=test_input["season_info"],
            recent_topics=test_input["recent_topics"],
        )
        print(f"\n사용자 메시지 미리보기:\n{msg}")

    print("\n=== 시뮬레이션 종료 ===")

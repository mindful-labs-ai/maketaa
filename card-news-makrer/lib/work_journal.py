"""
업무일지(Work Journal) 시스템
- 각 에이전트의 모든 행동을 투명하게 기록
- 파이프라인 실행 단위(session)별로 일지 파일 생성
- 블랙박스 없이 누가 무엇을 왜 했는지 추적 가능
"""

import json
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Optional

KST = timezone(timedelta(hours=9))


class JournalEntry:
    """업무일지 단일 항목"""

    def __init__(
        self,
        agent_id: str,
        action: str,
        detail: str,
        input_summary: str = "",
        output_summary: str = "",
        status: str = "info",  # info | success | warning | error
        duration_ms: int = 0,
        metadata: dict | None = None,
    ):
        self.timestamp = datetime.now(KST).isoformat()
        self.agent_id = agent_id
        self.action = action
        self.detail = detail
        self.input_summary = input_summary
        self.output_summary = output_summary
        self.status = status
        self.duration_ms = duration_ms
        self.metadata = metadata or {}

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "agent_id": self.agent_id,
            "action": self.action,
            "detail": self.detail,
            "input_summary": self.input_summary,
            "output_summary": self.output_summary,
            "status": self.status,
            "duration_ms": self.duration_ms,
            "metadata": self.metadata,
        }

    def to_markdown_row(self) -> str:
        """마크다운 테이블 행으로 변환"""
        time_str = self.timestamp[11:19]  # HH:MM:SS
        icon = {"info": "📝", "success": "✅", "warning": "⚠️", "error": "❌"}.get(self.status, "📝")
        duration = f"{self.duration_ms}ms" if self.duration_ms else "-"
        return f"| {time_str} | {icon} | **{self.agent_id}** | {self.action} | {self.detail} | {duration} |"


class WorkJournal:
    """
    파이프라인 세션별 업무일지 관리자

    사용법:
        journal = WorkJournal(session_id="2026-03-09-001")
        journal.log("researcher", "시작", "리서처 에이전트 실행 시작")
        journal.log_agent_start("researcher", input_summary="트리거: 스케줄러")
        journal.log_agent_end("researcher", output_summary="후보 주제 5개 생성", duration_ms=2340)
        journal.save()
    """

    def __init__(self, session_id: str, output_dir: str | Path = "./output"):
        self.session_id = session_id
        self.output_dir = Path(output_dir)
        self.entries: list[JournalEntry] = []
        self.started_at = datetime.now(KST).isoformat()
        self.pipeline_status = "running"  # running | completed | failed

        # 세션 디렉토리 생성 (날짜/세션별 분리)
        date_part = session_id[:10] if len(session_id) >= 10 else session_id
        self.date_dir = self.output_dir / date_part
        self.session_dir = self.date_dir / session_id
        self.session_dir.mkdir(parents=True, exist_ok=True)

    def log(
        self,
        agent_id: str,
        action: str,
        detail: str,
        status: str = "info",
        **kwargs,
    ) -> JournalEntry:
        """범용 로그 기록"""
        entry = JournalEntry(
            agent_id=agent_id,
            action=action,
            detail=detail,
            status=status,
            **kwargs,
        )
        self.entries.append(entry)
        # 콘솔 출력 (개발 중 디버깅용)
        icon = {"info": "📝", "success": "✅", "warning": "⚠️", "error": "❌"}.get(status, "📝")
        print(f"  {icon} [{agent_id}] {action}: {detail}")
        return entry

    def log_agent_start(self, agent_id: str, input_summary: str = "") -> JournalEntry:
        """에이전트 실행 시작 기록"""
        return self.log(
            agent_id=agent_id,
            action="실행 시작",
            detail=f"{agent_id} 에이전트가 작업을 시작합니다",
            input_summary=input_summary,
            status="info",
        )

    def log_agent_end(
        self,
        agent_id: str,
        output_summary: str = "",
        duration_ms: int = 0,
        success: bool = True,
    ) -> JournalEntry:
        """에이전트 실행 완료 기록"""
        return self.log(
            agent_id=agent_id,
            action="실행 완료" if success else "실행 실패",
            detail=output_summary or f"{agent_id} 에이전트 작업 {'완료' if success else '실패'}",
            output_summary=output_summary,
            duration_ms=duration_ms,
            status="success" if success else "error",
        )

    def log_handoff(self, from_agent: str, to_agent: str, data_summary: str) -> JournalEntry:
        """에이전트 간 데이터 전달 기록"""
        return self.log(
            agent_id="orchestrator",
            action="데이터 전달",
            detail=f"{from_agent} → {to_agent}: {data_summary}",
            status="info",
        )

    def log_validation(self, agent_id: str, errors: list, warnings: list) -> JournalEntry:
        """검증 결과 기록"""
        if errors:
            return self.log(
                agent_id=agent_id,
                action="검증 실패",
                detail=f"에러 {len(errors)}건, 경고 {len(warnings)}건",
                status="error",
                metadata={"errors": errors, "warnings": warnings},
            )
        elif warnings:
            return self.log(
                agent_id=agent_id,
                action="검증 통과 (경고 있음)",
                detail=f"경고 {len(warnings)}건",
                status="warning",
                metadata={"warnings": warnings},
            )
        else:
            return self.log(
                agent_id=agent_id,
                action="검증 통과",
                detail="모든 검증 항목 통과",
                status="success",
            )

    def log_checkpoint(self, checkpoint_name: str, detail: str) -> JournalEntry:
        """인간 승인 등 체크포인트 기록"""
        return self.log(
            agent_id="checkpoint",
            action=checkpoint_name,
            detail=detail,
            status="info",
        )

    def log_error(self, agent_id: str, error_msg: str, retry_count: int = 0) -> JournalEntry:
        """에러 기록"""
        return self.log(
            agent_id=agent_id,
            action="에러 발생",
            detail=f"{error_msg} (재시도: {retry_count}회)",
            status="error",
            metadata={"retry_count": retry_count},
        )

    def finalize(self, status: str = "completed"):
        """파이프라인 종료 처리"""
        self.pipeline_status = status
        self.log(
            agent_id="orchestrator",
            action="파이프라인 종료",
            detail=f"세션 {self.session_id} — 상태: {status}",
            status="success" if status == "completed" else "error",
        )

    # ── 저장 ──

    def save(self):
        """JSON + Markdown 두 형식으로 저장 + 통합 인덱스 업데이트"""
        self._save_json()
        self._save_markdown()
        self._update_daily_index()

    def _save_json(self):
        """구조화된 JSON 로그 저장"""
        data = {
            "session_id": self.session_id,
            "started_at": self.started_at,
            "pipeline_status": self.pipeline_status,
            "total_entries": len(self.entries),
            "summary": self._build_summary(),
            "entries": [e.to_dict() for e in self.entries],
        }
        filepath = self.session_dir / "work_journal.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\n💾 업무일지 저장: {filepath}")

    def _save_markdown(self):
        """사람이 읽기 쉬운 마크다운 업무일지 저장"""
        lines = []
        lines.append(f"# 업무일지 — {self.session_id}")
        lines.append(f"")
        lines.append(f"**시작:** {self.started_at}")
        lines.append(f"**상태:** {self.pipeline_status}")
        lines.append(f"**총 기록:** {len(self.entries)}건")
        lines.append(f"")

        # 요약
        summary = self._build_summary()
        lines.append(f"## 요약")
        lines.append(f"")
        for agent_id, info in summary.get("agents", {}).items():
            icon = "✅" if info["status"] == "success" else "❌" if info["status"] == "error" else "📝"
            duration = f" ({info['duration_ms']}ms)" if info.get("duration_ms") else ""
            lines.append(f"- {icon} **{agent_id}**: {info['status']}{duration}")
        lines.append(f"")

        # 상세 타임라인
        lines.append(f"## 상세 타임라인")
        lines.append(f"")
        lines.append(f"| 시간 | 상태 | 에이전트 | 행동 | 상세 | 소요 |")
        lines.append(f"|------|------|----------|------|------|------|")
        for entry in self.entries:
            lines.append(entry.to_markdown_row())
        lines.append(f"")

        # 에러/경고 모음
        errors = [e for e in self.entries if e.status == "error"]
        warnings = [e for e in self.entries if e.status == "warning"]
        if errors or warnings:
            lines.append(f"## 이슈 목록")
            lines.append(f"")
            for e in errors:
                lines.append(f"- ❌ [{e.agent_id}] {e.detail}")
            for w in warnings:
                lines.append(f"- ⚠️ [{w.agent_id}] {w.detail}")
            lines.append(f"")

        filepath = self.session_dir / "work_journal.md"
        with open(filepath, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        print(f"📄 업무일지(MD) 저장: {filepath}")

    def _update_daily_index(self):
        """날짜별 통합 인덱스(work_journal.md) 업데이트 — 같은 날의 모든 세션을 합산"""
        if not self.date_dir.exists():
            return

        # 해당 날짜 디렉토리 아래의 모든 세션 JSON 수집
        sessions = []
        for session_path in sorted(self.date_dir.iterdir()):
            if session_path.is_dir():
                json_file = session_path / "work_journal.json"
                if json_file.exists():
                    with open(json_file, "r", encoding="utf-8") as f:
                        sessions.append(json.load(f))

        if not sessions:
            return

        date_str = self.date_dir.name
        lines = []
        lines.append(f"# 업무일지 — {date_str}")
        lines.append(f"")
        lines.append(f"**총 세션:** {len(sessions)}개")
        total_entries = sum(s.get('total_entries', 0) for s in sessions)
        lines.append(f"**총 기록:** {total_entries}건")
        lines.append(f"")

        # 세션 목차
        lines.append(f"## 세션 목록")
        lines.append(f"")
        for s in sessions:
            sid = s.get('session_id', 'unknown')
            status = s.get('pipeline_status', 'unknown')
            icon = "✅" if status == "completed" else "❌" if status == "failed" else "🔄"
            entries = s.get('total_entries', 0)
            agents_info = s.get('summary', {}).get('agents', {})
            agent_names = ", ".join(agents_info.keys())
            lines.append(f"- {icon} **{sid}** — {status} ({entries}건) — 에이전트: {agent_names}")
        lines.append(f"")

        # 각 세션의 상세 타임라인
        for s in sessions:
            sid = s.get('session_id', 'unknown')
            lines.append(f"---")
            lines.append(f"")
            lines.append(f"## {sid}")
            lines.append(f"")
            lines.append(f"**시작:** {s.get('started_at', '')}")
            lines.append(f"**상태:** {s.get('pipeline_status', '')}")
            lines.append(f"")

            # 요약
            agents_info = s.get('summary', {}).get('agents', {})
            for agent_id, info in agents_info.items():
                icon = "✅" if info["status"] == "success" else "❌" if info["status"] == "error" else "📝"
                duration = f" ({info['duration_ms']}ms)" if info.get("duration_ms") else ""
                lines.append(f"- {icon} **{agent_id}**: {info['status']}{duration}")
            lines.append(f"")

            # 타임라인 테이블
            lines.append(f"| 시간 | 상태 | 에이전트 | 행동 | 상세 | 소요 |")
            lines.append(f"|------|------|----------|------|------|------|")
            for entry in s.get('entries', []):
                time_str = entry.get('timestamp', '')[11:19]
                status = entry.get('status', 'info')
                icon = {"info": "📝", "success": "✅", "warning": "⚠️", "error": "❌"}.get(status, "📝")
                duration = f"{entry['duration_ms']}ms" if entry.get('duration_ms') else "-"
                lines.append(f"| {time_str} | {icon} | **{entry.get('agent_id','')}** | {entry.get('action','')} | {entry.get('detail','')} | {duration} |")
            lines.append(f"")

        filepath = self.date_dir / "work_journal.md"
        with open(filepath, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        print(f"📋 통합 업무일지 업데이트: {filepath}")

    def _build_summary(self) -> dict:
        """에이전트별 요약 생성"""
        agents = {}
        for entry in self.entries:
            aid = entry.agent_id
            if aid not in agents:
                agents[aid] = {"status": "info", "actions": 0, "duration_ms": 0}
            agents[aid]["actions"] += 1
            agents[aid]["duration_ms"] += entry.duration_ms
            # 상태 업그레이드: info < success < warning < error
            priority = {"info": 0, "success": 1, "warning": 2, "error": 3}
            if priority.get(entry.status, 0) > priority.get(agents[aid]["status"], 0):
                agents[aid]["status"] = entry.status

        return {"agents": agents, "total_entries": len(self.entries)}


# ── CLI 테스트 ──

if __name__ == "__main__":
    print("=== 업무일지 시스템 테스트 ===\n")

    journal = WorkJournal(session_id="2026-03-09-001", output_dir="./output")

    journal.log("orchestrator", "파이프라인 시작", "콘텐츠 제작 파이프라인 실행")
    journal.log_agent_start("researcher", input_summary="트리거: 스케줄러, 날짜: 2026-03-09")

    # 시뮬레이션
    time.sleep(0.1)
    journal.log("researcher", "웹 검색", "정신건강 뉴스 검색 중... 23건 수집")
    journal.log("researcher", "트렌드 분석", "SNS 키워드 트래킹 완료, 봄피로 급상승")
    journal.log_agent_end("researcher", output_summary="후보 주제 5개 생성 완료", duration_ms=2340)

    journal.log_handoff("researcher", "strategist", "후보 주제 5개 JSON")

    journal.log_agent_start("strategist", input_summary="후보 주제 5개")
    journal.log("strategist", "주제 선정", "'봄철 무기력감 극복하기' 선정 (트렌드 0.92)")
    journal.log("strategist", "카드 기획", "8장 구성 기획 완료")
    journal.log_agent_end("strategist", output_summary="기획안 JSON 생성", duration_ms=1560)

    journal.finalize("completed")
    journal.save()
    print("\n✅ 테스트 완료")

"""
콘텐츠 파이프라인 실행 스크립트

AGENT 1(Researcher) → AGENT 2(Strategist) → AGENT 3(Copywriter)를 실행하고
생성된 card_spec을 Supabase에 저장합니다.

사용법:
    python scripts/run_content_pipeline.py
"""

import importlib
import json
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# .env 파일 로드
from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

from lib.base_agent import AgentCall, AgentResult
from lib.work_journal import WorkJournal
from lib.spec_validator import SpecValidator
from lib.season_utils import get_season_info


def _import_agent(module_path: str, class_name: str):
    """숫자로 시작하는 모듈명도 import 가능하도록 importlib 사용"""
    mod = importlib.import_module(module_path)
    return getattr(mod, class_name)

KST = timezone(timedelta(hours=9))


def run_pipeline():
    """AGENT 1→3 콘텐츠 파이프라인 실행"""
    now = datetime.now(KST)
    date_str = now.strftime("%Y-%m-%d")
    session_id = f"{date_str}-live-001"

    print("=" * 60)
    print(f"  카드뉴스 콘텐츠 파이프라인 실행")
    print(f"  날짜: {date_str}")
    print(f"  세션: {session_id}")
    print("=" * 60)
    print()

    # API 키 확인
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY가 설정되지 않았습니다.")
        sys.exit(1)
    print(f"API 키: {api_key[:20]}...{api_key[-4:]}")

    # 업무일지 초기화
    journal = WorkJournal(session_id=session_id, output_dir=str(PROJECT_ROOT / "output"))
    journal.log("orchestrator", "파이프라인 시작", f"콘텐츠 파이프라인 LIVE 실행 | 세션: {session_id}")

    # 시즌 정보
    season_info = get_season_info(date_str)
    print(f"시즌: {season_info.get('season', '?')} | 이벤트: {season_info.get('events', [])}")
    print()

    # 공유 컨텍스트
    context = {
        "session_id": session_id,
        "date": date_str,
        "trigger": "manual",
        "pipeline": "content_pipeline",
    }

    # ── AGENT 1: Researcher ──
    print("-" * 40)
    print("AGENT 1: Researcher 실행 중...")
    print("-" * 40)

    ResearcherAgent = _import_agent("agents.content_team.01_researcher", "ResearcherAgent")

    researcher = ResearcherAgent()
    researcher_call = AgentCall(
        agent_id="researcher",
        task_type="content_pipeline",
        input_data={
            "date": date_str,
            "trigger": "manual",
            "season_info": season_info,
            "recent_topics": [],
        },
        context=context,
    )

    researcher_result = researcher.run(researcher_call, journal)

    if not researcher_result.is_success():
        print(f"\nResearcher 실패: {researcher_result.error}")
        journal.finalize("failed")
        journal.save()
        sys.exit(1)

    print(f"\nResearcher 성공! 후보 주제 {len(researcher_result.output_data.get('candidates', []))}개")
    for c in researcher_result.output_data.get("candidates", []):
        print(f"  - [{c.get('id')}] {c.get('topic')} (트렌드: {c.get('trend_score', 0):.2f})")
    print()

    # ── AGENT 2: Strategist ──
    print("-" * 40)
    print("AGENT 2: Strategist 실행 중...")
    print("-" * 40)

    StrategistAgent = _import_agent("agents.content_team.02_strategist", "StrategistAgent")

    strategist = StrategistAgent()
    strategist_call = AgentCall(
        agent_id="strategist",
        task_type="content_pipeline",
        input_data=researcher_result.output_data,
        context=context,
    )

    strategist_result = strategist.run(strategist_call, journal)

    if not strategist_result.is_success():
        print(f"\nStrategist 실패: {strategist_result.error}")
        journal.finalize("failed")
        journal.save()
        sys.exit(1)

    selected = strategist_result.output_data.get("selected_topic", {})
    total_cards = strategist_result.output_data.get("total_cards", 0)
    print(f"\nStrategist 성공! 선정 주제: {selected.get('topic', '?')}")
    print(f"  카드 수: {total_cards}장")
    print()

    # ── AGENT 3: Copywriter ──
    print("-" * 40)
    print("AGENT 3: Copywriter 실행 중...")
    print("-" * 40)

    CopywriterAgent = _import_agent("agents.content_team.03_copywriter", "CopywriterAgent")

    copywriter = CopywriterAgent()
    copywriter_call = AgentCall(
        agent_id="copywriter",
        task_type="content_pipeline",
        input_data=strategist_result.output_data,
        context=context,
    )

    copywriter_result = copywriter.run(copywriter_call, journal)

    if not copywriter_result.is_success():
        print(f"\nCopywriter 실패: {copywriter_result.error}")
        journal.finalize("failed")
        journal.save()
        sys.exit(1)

    card_spec = copywriter_result.output_data.get("card_spec")
    if not card_spec:
        print("\ncard_spec이 생성되지 않았습니다.")
        journal.finalize("failed")
        journal.save()
        sys.exit(1)

    print(f"\nCopywriter 성공!")
    print(f"  주제: {card_spec['meta'].get('topic', '?')}")
    print(f"  카드 수: {len(card_spec.get('cards', []))}장")
    print()

    # ── card_spec 검증 ──
    validator = SpecValidator()
    validation_errors = validator.validate(card_spec)
    errors = [e for e in validation_errors if e.severity == "error"]
    warnings = [e for e in validation_errors if e.severity == "warning"]

    if errors:
        print(f"검증 에러 {len(errors)}건:")
        for e in errors:
            print(f"  - {e}")
    if warnings:
        print(f"검증 경고 {len(warnings)}건:")
        for w in warnings:
            print(f"  - {w}")
    if not errors:
        print("card_spec 검증 통과!")
    print()

    # ── card_spec JSON 저장 ──
    output_dir = PROJECT_ROOT / "output" / date_str / session_id
    output_dir.mkdir(parents=True, exist_ok=True)
    spec_file = output_dir / "card_spec.json"
    with open(spec_file, "w", encoding="utf-8") as f:
        json.dump(card_spec, f, ensure_ascii=False, indent=2)
    print(f"card_spec 저장: {spec_file}")

    # ── Supabase에 저장 ──
    print("\nSupabase에 card_spec 저장 중...")
    try:
        save_to_supabase(card_spec)
        print("Supabase 저장 성공!")
    except Exception as e:
        print(f"Supabase 저장 실패: {e}")
        print("(로컬 JSON 파일은 정상 저장되었습니다)")

    # ── 업무일지 완료 ──
    journal.finalize("completed")
    journal.save()

    print()
    print("=" * 60)
    print("  파이프라인 실행 완료!")
    print(f"  card_spec: {spec_file}")
    print(f"  업무일지: {output_dir / 'work_journal.md'}")
    print(f"  캔버스 에디터: https://canvaseditor-mu.vercel.app")
    print("=" * 60)


def save_to_supabase(card_spec: dict):
    """card_spec을 Supabase card_specs 테이블에 저장 (service role key 사용)"""
    from supabase import create_client

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

    if not url or not key:
        raise ValueError("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다")

    client = create_client(url, key)

    spec_id = card_spec["meta"]["id"]
    topic = card_spec["meta"].get("topic", "")
    status = card_spec["meta"].get("status", "draft")

    data = {
        "id": spec_id,
        "owner_id": "system-pipeline",
        "topic": topic,
        "status": status,
        "spec": card_spec,
    }

    result = client.table("card_specs").upsert(data).execute()

    if hasattr(result, 'data') and result.data:
        print(f"  저장 완료: id={spec_id}, topic={topic}")
    else:
        raise RuntimeError(f"Supabase 저장 결과가 비어있습니다: {result}")


if __name__ == "__main__":
    run_pipeline()

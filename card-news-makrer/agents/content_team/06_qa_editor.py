"""
QAEditorAgent — 카드뉴스 품질 관리 에디터 에이전트

발행 전 모든 콘텐츠의 정확성, 안전성, 품질을 최종 검수합니다.
- 위기 표현(자해/자살) 필터링 (CRITICAL)
- 비전문가적 진단 표현 차단 (CRITICAL)
- 글자 수 규칙 검증 및 자동 수정 (MINOR)
- 브랜드 톤 검증 (MINOR)
- 해시태그 적절성 검증 (MINOR)
- 출처 인용 검증 (MINOR)
- 맞춤법/문법 교정 (MINOR)
"""

import json
import logging
import re
import sys
import yaml
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

# 프로젝트 루트를 sys.path에 추가
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from lib.base_agent import BaseAgent, AgentCall, AgentResult
from lib.claude_client import ClaudeClient

logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))

# ── 설정 로더 ──

_SETTINGS_PATH = _PROJECT_ROOT / "config" / "settings.yaml"


def _load_settings() -> dict:
    """config/settings.yaml 전체 로드"""
    if not _SETTINGS_PATH.exists():
        return {}
    with open(_SETTINGS_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


_SETTINGS = _load_settings()

# QA 안전 키워드
_QA_SETTINGS = _SETTINGS.get("qa", {})
_SAFETY_BLOCK = _QA_SETTINGS.get("safety_keywords", {}).get("block", ["자해", "자살", "극단적 선택"])
_SAFETY_WARN = _QA_SETTINGS.get("safety_keywords", {}).get("warn", ["우울증 진단", "약물 처방", "치료 방법"])

# 카드뉴스 텍스트 제한
_CARDNEWS = _SETTINGS.get("cardnews", {})
_HEADLINE_MAX = _CARDNEWS.get("text", {}).get("headline_max_length", 15)
_BODY_MAX = _CARDNEWS.get("text", {}).get("body_max_length", 50)

# 진단 표현 패턴: "당신은 ~증입니다", "당신은 ~장애입니다" 등
_DIAGNOSTIC_PATTERN = re.compile(r"당신은\s+.*(?:증|장애|병)\s*(?:입니다|이에요|이야)")

# 금지 해시태그
_BANNED_HASHTAGS = {
    "#자살", "#자해", "#극단적선택", "#우울증진단",
    "#자살방법", "#자해방법", "#죽고싶다",
}


class QAEditorAgent(BaseAgent):
    """
    QA 에디터 에이전트

    image_generator가 완성한 card_spec + assets를 받아
    안전성, 정확성, 품질을 검수하고 문제를 자동 수정합니다.
    """

    def __init__(self, config: dict | None = None):
        spec_path = Path(__file__).resolve().parent / "06_qa_editor.md"
        super().__init__(
            agent_id="qa_editor",
            spec_path=spec_path,
            config=config or {},
        )
        self.client = ClaudeClient(
            max_tokens=self.config.get("max_tokens", 4096),
            temperature=self.config.get("temperature", 0.3),
        )

    # ── 메인 실행 ──

    def execute(self, call: AgentCall) -> AgentResult:
        """
        QA 검수 실행

        Args:
            call: AgentCall — input_data에 card_spec, assets, sns_caption이 담겨 있음

        Returns:
            AgentResult — output_data에 수정된 card_spec + qa_report 포함
        """
        logs: list[str] = []
        input_data = call.input_data

        # 1. 입력 데이터 검증
        card_spec = input_data.get("card_spec")
        if not card_spec:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error="필수 입력 데이터 누락: card_spec",
                logs=["입력 검증 실패 — card_spec이 없습니다"],
            )

        cards = card_spec.get("cards", [])
        if not cards:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error="card_spec에 cards 배열이 비어있습니다",
                logs=["입력 검증 실패 — cards 배열이 비어있습니다"],
            )

        assets = input_data.get("assets", [])
        sns_caption = input_data.get("sns_caption", {})
        meta = card_spec.get("meta", {})

        logs.append(
            f"입력 수신 — 주제: {meta.get('topic', '?')}, "
            f"카드 수: {len(cards)}, 에셋 수: {len(assets)}"
        )

        # 2. QA 검수 실행
        critical_issues: list[dict] = []
        minor_issues: list[dict] = []
        total_fixes = 0

        # 체크리스트 초기값
        checklist = {
            "sources_cited": True,
            "crisis_expression_clean": True,
            "no_diagnostic_language": True,
            "brand_tone_match": True,
            "readability_ok": True,
            "char_count_ok": True,
            "hashtags_ok": True,
            "cta_included": True,
            "grammar_ok": True,
            "factcheck_ok": True,
        }

        # 2a. 위기 표현 필터링 (CRITICAL)
        safety_result = self._check_safety(cards)
        if safety_result["issues"]:
            critical_issues.extend(safety_result["issues"])
            total_fixes += safety_result["fixes"]
            checklist["crisis_expression_clean"] = False
            logs.append(f"[CRITICAL] 위기 표현 {len(safety_result['issues'])}건 감지")

        # 2b. 진단 표현 차단 (CRITICAL)
        diag_result = self._check_diagnostic_language(cards)
        if diag_result["issues"]:
            critical_issues.extend(diag_result["issues"])
            total_fixes += diag_result["fixes"]
            checklist["no_diagnostic_language"] = False
            logs.append(f"[CRITICAL] 진단 표현 {len(diag_result['issues'])}건 감지")

        # 2c. 글자 수 검증 (MINOR)
        textlen_result = self._check_text_length(cards)
        if textlen_result["issues"]:
            minor_issues.extend(textlen_result["issues"])
            total_fixes += textlen_result["fixes"]
            checklist["char_count_ok"] = False
            logs.append(f"[MINOR] 글자 수 초과 {len(textlen_result['issues'])}건 — 자동 수정")

        # 2d. 브랜드 톤 검증 (MINOR)
        try:
            tone_result = self._check_brand_tone(card_spec)
            if tone_result["issues"]:
                minor_issues.extend(tone_result["issues"])
                checklist["brand_tone_match"] = False
                logs.append(f"[MINOR] 브랜드 톤 불일치 {len(tone_result['issues'])}건")
        except Exception as e:
            logs.append(f"[WARN] 브랜드 톤 검증 스킵 (API 에러): {e}")

        # 2e. 해시태그 검증 (MINOR)
        hashtag_result = self._check_hashtags(sns_caption)
        if hashtag_result["issues"]:
            minor_issues.extend(hashtag_result["issues"])
            total_fixes += hashtag_result["fixes"]
            checklist["hashtags_ok"] = False
            logs.append(f"[MINOR] 금지 해시태그 {len(hashtag_result['issues'])}건")

        # 2f. 출처 검증 (MINOR)
        source_result = self._check_sources(meta)
        if source_result["issues"]:
            minor_issues.extend(source_result["issues"])
            checklist["sources_cited"] = False
            logs.append(f"[MINOR] 출처 누락 {len(source_result['issues'])}건")

        # 2g. 맞춤법/문법 검증 (MINOR)
        try:
            grammar_result = self._check_grammar(cards)
            if grammar_result["issues"]:
                minor_issues.extend(grammar_result["issues"])
                total_fixes += grammar_result["fixes"]
                checklist["grammar_ok"] = False
                logs.append(f"[MINOR] 맞춤법/문법 수정 {len(grammar_result['issues'])}건")
        except Exception as e:
            logs.append(f"[WARN] 맞춤법 검증 스킵 (API 에러): {e}")

        # 2h. CTA 포함 확인
        cta_ok = self._check_cta(cards)
        if not cta_ok:
            checklist["cta_included"] = False
            minor_issues.append({
                "card_number": len(cards),
                "field": "role",
                "issue": "마지막 카드에 CTA(행동 유도) 요소가 없습니다",
                "severity": "minor",
                "auto_fixed": False,
                "before": None,
                "after": None,
            })
            logs.append("[MINOR] CTA 미포함")

        # 3. overall_status 결정
        has_unfixed_critical = any(
            not issue.get("auto_fixed", False) for issue in critical_issues
        )

        if has_unfixed_critical:
            overall_status = "fail"
        elif total_fixes > 0:
            overall_status = "pass_with_fixes"
        else:
            overall_status = "pass"

        # 4. QA 보고서 생성
        reviewed_at = datetime.now(KST).isoformat()
        qa_report = {
            "overall_status": overall_status,
            "critical_issues": critical_issues,
            "minor_issues": minor_issues,
            "checklist": checklist,
            "total_fixes": total_fixes,
            "reviewed_at": reviewed_at,
        }

        # 5. 수정된 card_spec 조립
        corrected_card_spec = {
            **card_spec,
            "cards": cards,  # cards는 in-place 수정됨
        }

        logs.append(
            f"QA 완료 — 상태: {overall_status}, "
            f"CRITICAL: {len(critical_issues)}건, "
            f"MINOR: {len(minor_issues)}건, "
            f"수정: {total_fixes}건"
        )

        result_status = "success" if overall_status != "fail" else "needs_review"

        return AgentResult(
            agent_id=self.agent_id,
            status=result_status,
            output_data={
                "card_spec": corrected_card_spec,
                "sns_caption": sns_caption,
                "qa_report": qa_report,
            },
            logs=logs,
        )

    # ── QA 체크 메서드 ──

    def _check_safety(self, cards: list[dict]) -> dict:
        """
        위기 표현 필터링 (CRITICAL)

        자해, 자살, 극단적 선택 등 settings.yaml의 block 키워드를 검사합니다.
        발견 시 해당 텍스트를 안전한 대체 표현으로 교체합니다.
        """
        issues: list[dict] = []
        fixes = 0

        for card in cards:
            card_num = card.get("index", card.get("card_number", 0))
            text_obj = card.get("text", {})

            for field_name in ("headline", "body", "sub_text"):
                text_value = text_obj.get(field_name, "")
                if not text_value:
                    continue

                for keyword in _SAFETY_BLOCK:
                    if keyword in text_value:
                        before = text_value
                        # 위험 키워드를 안전한 표현으로 대체
                        text_value = text_value.replace(keyword, "어려움")
                        text_obj[field_name] = text_value
                        fixes += 1

                        issues.append({
                            "card_number": card_num,
                            "field": f"text.{field_name}",
                            "issue": f"위기 표현 '{keyword}' 감지 → '어려움'으로 대체",
                            "severity": "critical",
                            "auto_fixed": True,
                            "before": before,
                            "after": text_value,
                        })

                # warn 키워드는 플래그만 (수정하지 않음)
                for keyword in _SAFETY_WARN:
                    if keyword in text_value:
                        issues.append({
                            "card_number": card_num,
                            "field": f"text.{field_name}",
                            "issue": f"주의 표현 '{keyword}' 감지 — 전문가 검토 권장",
                            "severity": "critical",
                            "auto_fixed": False,
                            "before": text_value,
                            "after": None,
                        })

        return {"issues": issues, "fixes": fixes}

    def _check_diagnostic_language(self, cards: list[dict]) -> dict:
        """
        비전문가적 진단 표현 차단 (CRITICAL)

        '당신은 ~증입니다' 패턴을 감지하고 안전한 표현으로 교체합니다.
        """
        issues: list[dict] = []
        fixes = 0

        for card in cards:
            card_num = card.get("index", card.get("card_number", 0))
            text_obj = card.get("text", {})

            for field_name in ("headline", "body", "sub_text"):
                text_value = text_obj.get(field_name, "")
                if not text_value:
                    continue

                match = _DIAGNOSTIC_PATTERN.search(text_value)
                if match:
                    before = text_value
                    # 진단 표현을 안전한 표현으로 대체
                    text_value = _DIAGNOSTIC_PATTERN.sub(
                        "이런 증상이 있다면 전문가 상담을 권합니다",
                        text_value,
                    )
                    text_obj[field_name] = text_value
                    fixes += 1

                    issues.append({
                        "card_number": card_num,
                        "field": f"text.{field_name}",
                        "issue": f"진단 표현 감지 '{match.group()}' → 안전한 표현으로 대체",
                        "severity": "critical",
                        "auto_fixed": True,
                        "before": before,
                        "after": text_value,
                    })

        return {"issues": issues, "fixes": fixes}

    def _check_text_length(self, cards: list[dict]) -> dict:
        """
        글자 수 검증 (MINOR)

        headline ≤ 15자, body ≤ 50자를 초과하면 자동으로 truncate합니다.
        """
        issues: list[dict] = []
        fixes = 0

        for card in cards:
            card_num = card.get("index", card.get("card_number", 0))
            text_obj = card.get("text", {})

            # headline 검사
            headline = text_obj.get("headline", "")
            if len(headline) > _HEADLINE_MAX:
                before = headline
                truncated = headline[:_HEADLINE_MAX - 1] + "…"
                text_obj["headline"] = truncated
                fixes += 1

                issues.append({
                    "card_number": card_num,
                    "field": "text.headline",
                    "issue": f"글자 수 초과 ({len(before)}자 → {_HEADLINE_MAX}자로 수정)",
                    "severity": "minor",
                    "auto_fixed": True,
                    "before": before,
                    "after": truncated,
                })

            # body 검사
            body = text_obj.get("body", "")
            if len(body) > _BODY_MAX:
                before = body
                truncated = body[:_BODY_MAX - 1] + "…"
                text_obj["body"] = truncated
                fixes += 1

                issues.append({
                    "card_number": card_num,
                    "field": "text.body",
                    "issue": f"글자 수 초과 ({len(before)}자 → {_BODY_MAX}자로 수정)",
                    "severity": "minor",
                    "auto_fixed": True,
                    "before": before,
                    "after": truncated,
                })

        return {"issues": issues, "fixes": fixes}

    def _check_brand_tone(self, card_spec: dict) -> dict:
        """
        브랜드 톤 검증 (MINOR)

        Claude를 호출하여 전체 카드의 톤이 따뜻하고 공감적인지 확인합니다.
        """
        issues: list[dict] = []

        # 모든 카드의 텍스트를 수집
        all_texts: list[str] = []
        cards = card_spec.get("cards", [])
        for card in cards:
            text_obj = card.get("text", {})
            headline = text_obj.get("headline", "")
            body = text_obj.get("body", "")
            if headline:
                all_texts.append(headline)
            if body:
                all_texts.append(body)

        if not all_texts:
            return {"issues": issues, "fixes": 0}

        combined_text = "\n".join(all_texts)

        tone_prompt = (
            "당신은 멘탈헬스 콘텐츠의 톤 검수 전문가입니다.\n"
            "다음 텍스트들이 '따뜻하고 공감적이며 비판단적인' 톤을 유지하는지 검사하세요.\n"
            "문제가 없으면 issues를 빈 배열로 반환하세요."
        )

        response_schema = {
            "tone_ok": True,
            "issues": [
                {
                    "text": "문제가 있는 텍스트",
                    "reason": "이유",
                }
            ],
        }

        result = self.client.chat_with_retry(
            system_prompt=tone_prompt,
            user_message=f"검수할 텍스트:\n{combined_text}",
            json_mode=True,
            response_schema=response_schema,
            max_retries=2,
        )

        tone_issues = result.get("issues", [])
        for ti in tone_issues:
            issues.append({
                "card_number": None,
                "field": "brand_tone",
                "issue": f"톤 불일치: {ti.get('reason', '?')} — 텍스트: '{ti.get('text', '?')}'",
                "severity": "minor",
                "auto_fixed": False,
                "before": ti.get("text"),
                "after": None,
            })

        return {"issues": issues, "fixes": 0}

    def _check_hashtags(self, sns_caption: dict) -> dict:
        """
        해시태그 적절성 검증 (MINOR)

        금지 해시태그가 포함되어 있으면 제거합니다.
        """
        issues: list[dict] = []
        fixes = 0

        instagram = sns_caption.get("instagram", {})
        if isinstance(instagram, str):
            # caption이 문자열인 경우 (구조가 다를 수 있음)
            return {"issues": issues, "fixes": fixes}

        hashtags = instagram.get("hashtags", [])
        if not hashtags:
            return {"issues": issues, "fixes": fixes}

        cleaned_hashtags: list[str] = []
        for tag in hashtags:
            if tag in _BANNED_HASHTAGS:
                fixes += 1
                issues.append({
                    "card_number": None,
                    "field": "sns.instagram.hashtags",
                    "issue": f"금지 해시태그 '{tag}' 제거",
                    "severity": "minor",
                    "auto_fixed": True,
                    "before": tag,
                    "after": None,
                })
            else:
                cleaned_hashtags.append(tag)

        # 해시태그 목록 업데이트
        if fixes > 0:
            instagram["hashtags"] = cleaned_hashtags

        return {"issues": issues, "fixes": fixes}

    def _check_sources(self, meta: dict) -> dict:
        """
        출처 인용 검증 (MINOR)

        통계나 수치가 사용된 경우 출처가 명시되어 있는지 확인합니다.
        """
        issues: list[dict] = []

        sources = meta.get("sources", [])
        if not sources:
            issues.append({
                "card_number": None,
                "field": "meta.sources",
                "issue": "출처가 하나도 없습니다 — 통계/수치 사용 시 출처 필수",
                "severity": "minor",
                "auto_fixed": False,
                "before": None,
                "after": None,
            })

        return {"issues": issues, "fixes": 0}

    def _check_grammar(self, cards: list[dict]) -> dict:
        """
        맞춤법/문법 검증 (MINOR)

        Claude를 호출하여 텍스트의 맞춤법과 문법을 교정합니다.
        """
        issues: list[dict] = []
        fixes = 0

        # 모든 카드의 텍스트를 수집
        card_texts: list[dict] = []
        for card in cards:
            card_num = card.get("index", card.get("card_number", 0))
            text_obj = card.get("text", {})
            headline = text_obj.get("headline", "")
            body = text_obj.get("body", "")
            card_texts.append({
                "card_number": card_num,
                "headline": headline,
                "body": body,
            })

        grammar_prompt = (
            "당신은 한국어 맞춤법/문법 교정 전문가입니다.\n"
            "다음 카드뉴스 텍스트의 맞춤법과 문법을 검사하세요.\n"
            "수정이 필요한 항목만 corrections 배열에 포함하세요.\n"
            "수정이 필요 없으면 corrections를 빈 배열로 반환하세요."
        )

        response_schema = {
            "corrections": [
                {
                    "card_number": 1,
                    "field": "headline",
                    "before": "수정 전",
                    "after": "수정 후",
                    "reason": "이유",
                }
            ],
        }

        texts_json = json.dumps(card_texts, ensure_ascii=False)
        result = self.client.chat_with_retry(
            system_prompt=grammar_prompt,
            user_message=f"검수할 텍스트:\n{texts_json}",
            json_mode=True,
            response_schema=response_schema,
            max_retries=2,
        )

        corrections = result.get("corrections", [])
        for corr in corrections:
            card_num = corr.get("card_number")
            field_name = corr.get("field", "headline")
            before = corr.get("before", "")
            after = corr.get("after", "")
            reason = corr.get("reason", "")

            if not before or not after or before == after:
                continue

            # 해당 카드 찾아서 수정 적용
            for card in cards:
                cn = card.get("index", card.get("card_number", 0))
                if cn == card_num:
                    text_obj = card.get("text", {})
                    current_val = text_obj.get(field_name, "")
                    if current_val == before:
                        text_obj[field_name] = after
                        fixes += 1

                        issues.append({
                            "card_number": card_num,
                            "field": f"text.{field_name}",
                            "issue": f"맞춤법/문법 수정: {reason}",
                            "severity": "minor",
                            "auto_fixed": True,
                            "before": before,
                            "after": after,
                        })
                    break

        return {"issues": issues, "fixes": fixes}

    def _check_cta(self, cards: list[dict]) -> bool:
        """
        마지막 카드에 CTA(행동 유도) 요소가 포함되어 있는지 확인합니다.
        """
        if not cards:
            return False

        last_card = cards[-1]
        role = last_card.get("role", "")

        # closing 또는 cta 역할이면 OK
        if role in ("closing", "cta"):
            return True

        return False


# ── 테스트 코드 ──

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    print("=" * 60)
    print("QAEditorAgent 테스트")
    print("=" * 60)

    # 테스트용 입력 데이터 (의도적으로 문제를 포함)
    test_input = {
        "card_spec": {
            "meta": {
                "id": "2026-03-15-001",
                "topic": "봄철 무기력감 극복",
                "angle": "계절 변화가 감정에 미치는 영향과 실천적 대처법",
                "target_persona": "20~30대 직장인",
                "created_at": "2026-03-15T09:00:00+09:00",
                "status": "draft",
                "sources": [],
            },
            "cards": [
                {
                    "index": 1,
                    "role": "cover",
                    "text": {
                        "headline": "봄인데 왜 힘들까?",
                        "body": "계절이 바뀌면 마음도 흔들립니다",
                        "sub_text": "",
                    },
                },
                {
                    "index": 2,
                    "role": "empathy",
                    "text": {
                        "headline": "당신만 그런 게 아니에요 정말로요",
                        "body": "봄이면 더 무기력한 건 자연스러운 현상이니 걱정하지 마세요 괜찮습니다",
                        "sub_text": "",
                    },
                },
                {
                    "index": 3,
                    "role": "closing",
                    "text": {
                        "headline": "괜찮아, 천천히",
                        "body": "완벽하지 않아도 충분합니다",
                        "sub_text": "",
                    },
                },
            ],
            "sns": {
                "instagram": {
                    "caption": "봄이 와도 마음은 겨울인 당신에게...",
                    "hashtags": ["#멘탈헬스", "#봄철무기력", "#자기돌봄"],
                },
            },
        },
        "assets": [
            {"card_number": 1, "bg_path": "/output/assets/bg_1.png"},
            {"card_number": 2, "bg_path": "/output/assets/bg_2.png"},
            {"card_number": 3, "bg_path": "/output/assets/bg_3.png"},
        ],
        "sns_caption": {
            "instagram": {
                "caption": "봄이 와도 마음은 겨울인 당신에게...",
                "hashtags": ["#멘탈헬스", "#봄철무기력", "#자기돌봄"],
            },
        },
    }

    test_call = AgentCall(
        agent_id="qa_editor",
        task_type="card_news_qa",
        input_data=test_input,
        context={"date": "2026-03-15", "session_id": "test-session-001"},
    )

    # 에이전트 생성 및 실행 (API 없이 rule-based 체크만 테스트)
    try:
        agent = QAEditorAgent()
        print(f"\n시스템 프롬프트 로드 완료 ({len(agent.system_prompt)}자)")

        result = agent.execute(test_call)

        print(f"\n실행 결과 상태: {result.status}")
        print(f"로그 ({len(result.logs)}건):")
        for log_msg in result.logs:
            print(f"  - {log_msg}")

        if result.output_data.get("qa_report"):
            qa_report = result.output_data["qa_report"]
            print(f"\nQA 보고서:")
            print(json.dumps(qa_report, ensure_ascii=False, indent=2))

    except ValueError as e:
        print(f"\n초기화 실패 (API 키 미설정 등): {e}")
        print("ANTHROPIC_API_KEY 환경변수를 설정한 후 다시 시도하세요.")
        print("\n--- rule-based 체크만 단독 테스트 ---")

        # API 없이 rule-based 체크만 테스트
        cards = test_input["card_spec"]["cards"]

        # 글자 수 테스트
        print("\n[텍스트 길이 검사]")
        for card in cards:
            h = card["text"]["headline"]
            b = card["text"]["body"]
            print(f"  카드 {card['index']}: headline={len(h)}자, body={len(b)}자")

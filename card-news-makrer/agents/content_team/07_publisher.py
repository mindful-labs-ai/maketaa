"""
PublisherAgent — 카드뉴스 SNS 발행 에이전트

인간 승인이 완료된 카드뉴스를 Instagram + Threads에 업로드하고
발행 완료 보고서를 생성합니다.
- Instagram Graph API를 통한 Carousel 포스트 업로드
- Threads API를 통한 텍스트 + 이미지 포스트 발행
- dry-run 모드 지원
- 최대 3회 재시도 (5초 간격)
"""

import json
import logging
import os
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

# 프로젝트 루트를 sys.path에 추가
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from lib.base_agent import BaseAgent, AgentCall, AgentResult

logger = logging.getLogger(__name__)

# 한국 표준시
KST = timezone(timedelta(hours=9))

# 재시도 설정
MAX_RETRIES = 3
RETRY_INTERVAL_SEC = 5


class PublisherAgent(BaseAgent):
    """
    퍼블리셔 에이전트

    인간 승인이 완료된 카드뉴스를 Instagram과 Threads에 발행하고
    발행 완료 보고서를 작성합니다.
    """

    def __init__(self, config: dict | None = None):
        spec_path = Path(__file__).resolve().parent / "07_publisher.md"
        super().__init__(
            agent_id="publisher",
            spec_path=spec_path,
            config=config or {},
        )
        self.dry_run = self.config.get("dry_run", False)

        # API 클라이언트 (지연 초기화)
        self._ig_access_token: str | None = None
        self._ig_user_id: str | None = None
        self._threads_access_token: str | None = None
        self._threads_user_id: str | None = None
        self._credentials_loaded = False

    # ── 자격 증명 로드 ──

    def _load_credentials(self) -> dict[str, list[str]]:
        """
        환경변수에서 API 자격 증명을 로드합니다.
        누락된 자격 증명 목록을 플랫폼별로 반환합니다.
        """
        if self._credentials_loaded:
            missing: dict[str, list[str]] = {}
            if not self._ig_access_token or not self._ig_user_id:
                missing["instagram"] = []
                if not self._ig_access_token:
                    missing["instagram"].append("INSTAGRAM_ACCESS_TOKEN")
                if not self._ig_user_id:
                    missing["instagram"].append("INSTAGRAM_USER_ID")
            if not self._threads_access_token or not self._threads_user_id:
                missing["threads"] = []
                if not self._threads_access_token:
                    missing["threads"].append("THREADS_ACCESS_TOKEN")
                if not self._threads_user_id:
                    missing["threads"].append("THREADS_USER_ID")
            return missing

        self._ig_access_token = os.environ.get("INSTAGRAM_ACCESS_TOKEN")
        self._ig_user_id = os.environ.get("INSTAGRAM_USER_ID")
        self._threads_access_token = os.environ.get("THREADS_ACCESS_TOKEN")
        self._threads_user_id = os.environ.get("THREADS_USER_ID")
        self._credentials_loaded = True

        missing = {}
        if not self._ig_access_token or not self._ig_user_id:
            missing["instagram"] = []
            if not self._ig_access_token:
                missing["instagram"].append("INSTAGRAM_ACCESS_TOKEN")
            if not self._ig_user_id:
                missing["instagram"].append("INSTAGRAM_USER_ID")
        if not self._threads_access_token or not self._threads_user_id:
            missing["threads"] = []
            if not self._threads_access_token:
                missing["threads"].append("THREADS_ACCESS_TOKEN")
            if not self._threads_user_id:
                missing["threads"].append("THREADS_USER_ID")

        return missing

    # ── 메인 실행 ──

    def execute(self, call: AgentCall) -> AgentResult:
        """
        SNS 발행 실행

        Args:
            call: AgentCall — input_data에 approved, card_spec, final_cards,
                  sns_caption, hashtags가 담겨 있음

        Returns:
            AgentResult — output_data에 publish_report 포함
        """
        logs: list[str] = []
        artifacts: list[str] = []
        input_data = call.input_data
        errors: list[str] = []
        total_retries = 0

        # 1. 입력 데이터 검증
        approved = input_data.get("approved", False)
        if not approved:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error="발행 승인이 완료되지 않았습니다 (approved != true)",
                logs=["입력 검증 실패 — approved가 true가 아닙니다."],
            )

        card_spec = input_data.get("card_spec")
        final_cards = input_data.get("final_cards", [])
        sns_caption = input_data.get("sns_caption", {})
        hashtags = input_data.get("hashtags", [])

        if not card_spec:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error="필수 입력 데이터 누락: card_spec",
                logs=["입력 검증 실패 — card_spec이 없습니다."],
            )

        if not final_cards:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error="필수 입력 데이터 누락: final_cards",
                logs=["입력 검증 실패 — final_cards가 비어있습니다."],
            )

        # 메타 정보 추출
        meta = card_spec.get("meta", {})
        topic = meta.get("topic", "알 수 없는 주제")
        date_str = call.context.get("date", datetime.now(KST).strftime("%Y-%m-%d"))

        logs.append(
            f"입력 수신 — 주제: {topic}, 카드 {len(final_cards)}장, "
            f"해시태그 {len(hashtags)}개"
        )

        if self.dry_run:
            logs.append("[DRY-RUN] 실제 API 호출 없이 시뮬레이션합니다.")

        # 2. 자격 증명 로드
        missing_creds = self._load_credentials()

        # 3. 캡션 및 해시태그 준비
        ig_caption = sns_caption.get("instagram", "")
        threads_text = sns_caption.get("threads", "")

        # Instagram 캡션 + 해시태그 결합
        ig_full_caption = self._build_instagram_caption(ig_caption, hashtags)

        # 4. 플랫폼별 발행
        ig_result = self._publish_instagram(
            final_cards=final_cards,
            caption=ig_full_caption,
            missing_creds=missing_creds.get("instagram"),
            logs=logs,
        )
        total_retries += ig_result.get("retries", 0)
        if ig_result.get("error"):
            errors.append(f"Instagram: {ig_result['error']}")

        threads_result = self._publish_threads(
            final_cards=final_cards,
            text=threads_text,
            missing_creds=missing_creds.get("threads"),
            logs=logs,
        )
        total_retries += threads_result.get("retries", 0)
        if threads_result.get("error"):
            errors.append(f"Threads: {threads_result['error']}")

        # 5. 발행 보고서 작성
        publish_report = {
            "session_date": date_str,
            "topic": topic,
            "platforms": {
                "instagram": {
                    "status": ig_result["status"],
                    "post_url": ig_result.get("post_url"),
                    "post_id": ig_result.get("post_id"),
                    "published_at": ig_result.get("published_at"),
                    "card_count": len(final_cards),
                },
                "threads": {
                    "status": threads_result["status"],
                    "post_url": threads_result.get("post_url"),
                    "post_id": threads_result.get("post_id"),
                    "published_at": threads_result.get("published_at"),
                },
            },
            "total_retries": total_retries,
            "errors": errors,
        }

        # 6. 보고서 파일 저장
        output_base = Path(self.config.get("output_dir", _PROJECT_ROOT / "output"))
        report_dir = output_base / date_str
        report_dir.mkdir(parents=True, exist_ok=True)
        report_path = str(report_dir / "publish_report.json")

        try:
            with open(report_path, "w", encoding="utf-8") as f:
                json.dump(publish_report, f, ensure_ascii=False, indent=2)
            artifacts.append(report_path)
            logs.append(f"발행 보고서 저장: {report_path}")
        except OSError as e:
            logs.append(f"발행 보고서 저장 실패: {e}")

        # 7. 전체 상태 판정
        ig_ok = ig_result["status"] == "success"
        th_ok = threads_result["status"] == "success"

        if ig_ok and th_ok:
            overall_status = "success"
            logs.append("모든 플랫폼 발행 성공")
        elif ig_ok or th_ok:
            overall_status = "needs_review"
            logs.append("일부 플랫폼 발행 실패 — 확인 필요")
        else:
            overall_status = "failure"
            logs.append("모든 플랫폼 발행 실패")

        return AgentResult(
            agent_id=self.agent_id,
            status=overall_status,
            output_data={"publish_report": publish_report},
            artifacts=artifacts,
            logs=logs,
        )

    # ── Instagram 발행 ──

    def _publish_instagram(
        self,
        final_cards: list[dict],
        caption: str,
        missing_creds: list[str] | None,
        logs: list[str],
    ) -> dict:
        """
        Instagram Graph API를 사용하여 Carousel 포스트를 발행합니다.

        Flow:
          1. 각 이미지를 컨테이너로 업로드 (POST /{ig-user-id}/media)
          2. Carousel 컨테이너 생성 (POST /{ig-user-id}/media with children)
          3. 발행 (POST /{ig-user-id}/media_publish)

        Returns:
            dict: {status, post_url, post_id, published_at, retries, error}
        """
        platform = "Instagram"

        # 자격 증명 확인
        if not self.dry_run and missing_creds:
            error_msg = f"자격 증명 누락: {', '.join(missing_creds)}"
            logs.append(f"[{platform}] {error_msg}")
            return {
                "status": "failed",
                "post_url": None,
                "post_id": None,
                "published_at": None,
                "retries": 0,
                "error": error_msg,
            }

        # Dry-run 모드
        if self.dry_run:
            now_str = datetime.now(KST).isoformat()
            logs.append(f"[{platform}] [DRY-RUN] Carousel 발행 시뮬레이션 완료 (카드 {len(final_cards)}장)")
            return {
                "status": "success",
                "post_url": "https://www.instagram.com/p/DRY_RUN_POST_ID/",
                "post_id": "DRY_RUN_IG_POST_001",
                "published_at": now_str,
                "retries": 0,
                "error": None,
            }

        # 실제 API 호출
        import requests

        base_url = "https://graph.facebook.com/v19.0"
        retries = 0
        last_error = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                # Step 1: 각 이미지를 컨테이너로 업로드
                child_ids = []
                for card in final_cards:
                    card_path = card.get("path", "")
                    # 이미지 URL이 필요 — 로컬 파일이면 image_url 파라미터 사용 불가
                    # Instagram Graph API는 공개 URL이 필요하므로,
                    # 실제 환경에서는 S3 등에 먼저 업로드해야 함
                    image_url = card.get("public_url", card_path)

                    resp = requests.post(
                        f"{base_url}/{self._ig_user_id}/media",
                        data={
                            "image_url": image_url,
                            "is_carousel_item": "true",
                            "access_token": self._ig_access_token,
                        },
                        timeout=30,
                    )
                    resp.raise_for_status()
                    container_id = resp.json().get("id")
                    if not container_id:
                        raise ValueError(f"컨테이너 ID를 받지 못했습니다: {resp.json()}")
                    child_ids.append(container_id)

                logs.append(f"[{platform}] 이미지 컨테이너 {len(child_ids)}개 업로드 완료")

                # Step 2: Carousel 컨테이너 생성
                carousel_resp = requests.post(
                    f"{base_url}/{self._ig_user_id}/media",
                    data={
                        "media_type": "CAROUSEL",
                        "children": ",".join(child_ids),
                        "caption": caption,
                        "access_token": self._ig_access_token,
                    },
                    timeout=30,
                )
                carousel_resp.raise_for_status()
                carousel_id = carousel_resp.json().get("id")
                if not carousel_id:
                    raise ValueError(f"Carousel ID를 받지 못했습니다: {carousel_resp.json()}")

                logs.append(f"[{platform}] Carousel 컨테이너 생성 완료: {carousel_id}")

                # Step 3: 발행
                publish_resp = requests.post(
                    f"{base_url}/{self._ig_user_id}/media_publish",
                    data={
                        "creation_id": carousel_id,
                        "access_token": self._ig_access_token,
                    },
                    timeout=30,
                )
                publish_resp.raise_for_status()
                post_id = publish_resp.json().get("id")

                now_str = datetime.now(KST).isoformat()
                post_url = f"https://www.instagram.com/p/{post_id}/"
                logs.append(f"[{platform}] 발행 성공 — post_id: {post_id}")

                return {
                    "status": "success",
                    "post_url": post_url,
                    "post_id": post_id,
                    "published_at": now_str,
                    "retries": retries,
                    "error": None,
                }

            except Exception as e:
                last_error = f"{type(e).__name__}: {str(e)}"
                retries += 1
                logger.warning(
                    "[%s] 발행 실패 (시도 %d/%d): %s",
                    platform, attempt, MAX_RETRIES, last_error,
                )
                if attempt < MAX_RETRIES:
                    logs.append(f"[{platform}] 시도 {attempt} 실패 — {RETRY_INTERVAL_SEC}초 후 재시도")
                    time.sleep(RETRY_INTERVAL_SEC)

        # 모든 재시도 실패
        logs.append(f"[{platform}] {MAX_RETRIES}회 시도 후 최종 실패: {last_error}")
        return {
            "status": "failed",
            "post_url": None,
            "post_id": None,
            "published_at": None,
            "retries": retries,
            "error": last_error,
        }

    # ── Threads 발행 ──

    def _publish_threads(
        self,
        final_cards: list[dict],
        text: str,
        missing_creds: list[str] | None,
        logs: list[str],
    ) -> dict:
        """
        Threads API를 사용하여 표지 이미지 + 텍스트 포스트를 발행합니다.

        Returns:
            dict: {status, post_url, post_id, published_at, retries, error}
        """
        platform = "Threads"

        # 자격 증명 확인
        if not self.dry_run and missing_creds:
            error_msg = f"자격 증명 누락: {', '.join(missing_creds)}"
            logs.append(f"[{platform}] {error_msg}")
            return {
                "status": "failed",
                "post_url": None,
                "post_id": None,
                "published_at": None,
                "retries": 0,
                "error": error_msg,
            }

        # Dry-run 모드
        if self.dry_run:
            now_str = datetime.now(KST).isoformat()
            logs.append(f"[{platform}] [DRY-RUN] 포스트 발행 시뮬레이션 완료")
            return {
                "status": "success",
                "post_url": "https://www.threads.net/@dry_run_user/post/DRY_RUN_001",
                "post_id": "DRY_RUN_TH_POST_001",
                "published_at": now_str,
                "retries": 0,
                "error": None,
            }

        # 실제 API 호출
        import requests

        base_url = "https://graph.threads.net/v1.0"
        retries = 0
        last_error = None

        # 표지 이미지 (첫 번째 카드)
        cover_card = final_cards[0] if final_cards else {}
        cover_url = cover_card.get("public_url", cover_card.get("path", ""))

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                # Step 1: 미디어 컨테이너 생성
                create_data: dict[str, Any] = {
                    "media_type": "IMAGE",
                    "text": text,
                    "access_token": self._threads_access_token,
                }
                if cover_url:
                    create_data["image_url"] = cover_url

                create_resp = requests.post(
                    f"{base_url}/{self._threads_user_id}/threads",
                    data=create_data,
                    timeout=30,
                )
                create_resp.raise_for_status()
                container_id = create_resp.json().get("id")
                if not container_id:
                    raise ValueError(f"Threads 컨테이너 ID를 받지 못했습니다: {create_resp.json()}")

                logs.append(f"[{platform}] 미디어 컨테이너 생성 완료: {container_id}")

                # Step 2: 발행
                publish_resp = requests.post(
                    f"{base_url}/{self._threads_user_id}/threads_publish",
                    data={
                        "creation_id": container_id,
                        "access_token": self._threads_access_token,
                    },
                    timeout=30,
                )
                publish_resp.raise_for_status()
                post_id = publish_resp.json().get("id")

                now_str = datetime.now(KST).isoformat()
                post_url = f"https://www.threads.net/@user/post/{post_id}"
                logs.append(f"[{platform}] 발행 성공 — post_id: {post_id}")

                return {
                    "status": "success",
                    "post_url": post_url,
                    "post_id": post_id,
                    "published_at": now_str,
                    "retries": retries,
                    "error": None,
                }

            except Exception as e:
                last_error = f"{type(e).__name__}: {str(e)}"
                retries += 1
                logger.warning(
                    "[%s] 발행 실패 (시도 %d/%d): %s",
                    platform, attempt, MAX_RETRIES, last_error,
                )
                if attempt < MAX_RETRIES:
                    logs.append(f"[{platform}] 시도 {attempt} 실패 — {RETRY_INTERVAL_SEC}초 후 재시도")
                    time.sleep(RETRY_INTERVAL_SEC)

        # 모든 재시도 실패
        logs.append(f"[{platform}] {MAX_RETRIES}회 시도 후 최종 실패: {last_error}")
        return {
            "status": "failed",
            "post_url": None,
            "post_id": None,
            "published_at": None,
            "retries": retries,
            "error": last_error,
        }

    # ── 헬퍼 ──

    @staticmethod
    def _build_instagram_caption(caption: str, hashtags: list[str]) -> str:
        """
        Instagram 캡션 + 해시태그를 결합합니다.
        - 캡션 + 해시태그 총 2200자 이내
        - 해시태그 최대 30개
        """
        # 해시태그 30개 제한
        limited_hashtags = hashtags[:30]
        hashtag_str = " ".join(limited_hashtags)

        if not caption:
            full = hashtag_str
        elif not hashtag_str:
            full = caption
        else:
            full = f"{caption}\n\n{hashtag_str}"

        # 2200자 제한
        if len(full) > 2200:
            # 해시태그를 줄여서 맞춤
            max_hashtag_len = 2200 - len(caption) - 2  # \n\n 공간
            if max_hashtag_len > 0:
                truncated = hashtag_str[:max_hashtag_len].rsplit(" ", 1)[0]
                full = f"{caption}\n\n{truncated}"
            else:
                full = caption[:2200]

        return full


# ── 테스트 코드 ──

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    print("=" * 60)
    print("PublisherAgent 테스트")
    print("=" * 60)

    # 테스트용 입력 데이터
    test_input = {
        "approved": True,
        "card_spec": {
            "meta": {
                "id": "2026-03-15-001",
                "topic": "봄철 무기력감 극복",
                "angle": "계절 변화가 감정에 미치는 영향",
                "target_persona": "20~30대 직장인",
                "created_at": "2026-03-15T09:00:00+09:00",
                "status": "approved",
            },
            "cards": [
                {"index": i + 1, "role": role}
                for i, role in enumerate([
                    "cover", "empathy", "cause", "insight",
                    "solution", "tip", "tip", "closing",
                ])
            ],
        },
        "final_cards": [
            {"card_number": i + 1, "path": f"/output/2026-03-15/cards/card_{i + 1}_final.png"}
            for i in range(8)
        ],
        "sns_caption": {
            "instagram": "봄이 와도 마음은 겨울인 당신에게... 괜찮아요, 함께 이겨내봐요.",
            "threads": "봄인데 왜 이렇게 힘들까? 당신만 그런 게 아니에요.",
        },
        "hashtags": [
            "#멘탈헬스", "#심리상담", "#봄철무기력", "#마음건강",
            "#자기돌봄", "#힐링", "#카드뉴스", "#정신건강",
        ],
    }

    test_call = AgentCall(
        agent_id="publisher",
        task_type="publish",
        input_data=test_input,
        context={"date": "2026-03-15", "session_id": "test-session-001"},
    )

    # dry-run 모드로 테스트
    agent = PublisherAgent(config={"dry_run": True})
    print(f"\n시스템 프롬프트 로드 완료 ({len(agent.system_prompt)}자)")
    print(f"시스템 프롬프트 미리보기:\n{agent.system_prompt[:200]}...\n")

    result = agent.execute(test_call)

    print(f"\n실행 결과 상태: {result.status}")
    print(f"로그 ({len(result.logs)}건):")
    for log_msg in result.logs:
        print(f"  - {log_msg}")
    print(f"생성된 파일 ({len(result.artifacts)}개):")
    for art in result.artifacts:
        print(f"  - {art}")

    if result.output_data.get("publish_report"):
        print(f"\n발행 보고서:")
        print(json.dumps(result.output_data["publish_report"], ensure_ascii=False, indent=2))
    else:
        print(f"\n에러: {result.error}")

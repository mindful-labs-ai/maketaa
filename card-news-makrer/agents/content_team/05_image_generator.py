"""
ImageGeneratorAgent — 카드뉴스 배경 이미지 생성 에이전트

디자인 디렉터의 card_spec + image_prompts를 받아
각 카드의 배경 이미지를 생성하고 에셋으로 저장합니다.
- DALL-E 3 API를 통한 이미지 생성
- Pillow를 사용한 플레이스홀더 이미지 생성 (API 미사용 시)
- dry-run 모드 지원
- 에셋 경로를 card_spec의 background.src에 반영
"""

import json
import logging
import os
import sys
import time
import yaml
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any
from urllib.request import urlopen

# 프로젝트 루트를 sys.path에 추가
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from lib.base_agent import BaseAgent, AgentCall, AgentResult

logger = logging.getLogger(__name__)

# 한국 표준시
KST = timezone(timedelta(hours=9))

# ── 설정 로더 ──
_SETTINGS_PATH = _PROJECT_ROOT / "config" / "settings.yaml"


def _load_image_settings() -> dict:
    """config/settings.yaml에서 image_api 설정 로드"""
    if not _SETTINGS_PATH.exists():
        return {}
    with open(_SETTINGS_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data.get("image_api", {})


_IMAGE_SETTINGS = _load_image_settings()


class ImageGeneratorAgent(BaseAgent):
    """
    이미지 제너레이터 에이전트

    디자인 디렉터의 card_spec과 image_prompts를 받아
    각 카드의 배경 이미지를 생성하고, card_spec.background.src를 업데이트합니다.
    """

    def __init__(self, config: dict | None = None):
        spec_path = Path(__file__).resolve().parent / "05_image_generator.md"
        super().__init__(
            agent_id="image_generator",
            spec_path=spec_path,
            config=config or {},
        )
        # 이미지 API 설정 (settings.yaml 기본값 + config 오버라이드)
        self.image_model = self.config.get("image_model", _IMAGE_SETTINGS.get("model", "dall-e-3"))
        self.image_size = self.config.get("image_size", _IMAGE_SETTINGS.get("size", "1024x1024"))
        self.image_quality = self.config.get("image_quality", _IMAGE_SETTINGS.get("quality", "hd"))
        self.dry_run = self.config.get("dry_run", False)

        # OpenAI 클라이언트 (지연 초기화)
        self._openai_client = None

    def _get_openai_client(self):
        """OpenAI 클라이언트 지연 초기화"""
        if self._openai_client is None:
            try:
                from openai import OpenAI
                api_key = os.environ.get("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")
                self._openai_client = OpenAI(api_key=api_key)
            except (ImportError, ValueError) as e:
                logger.warning("OpenAI 클라이언트 초기화 실패: %s", e)
                raise
        return self._openai_client

    # ── 메인 실행 ──

    def execute(self, call: AgentCall) -> AgentResult:
        """
        이미지 생성 실행

        Args:
            call: AgentCall — input_data에 card_spec + image_prompts가 담겨 있음

        Returns:
            AgentResult — output_data에 업데이트된 card_spec + assets + generation_log 포함
        """
        logs: list[str] = []
        artifacts: list[str] = []
        input_data = call.input_data

        # 1. 입력 데이터 검증
        card_spec = input_data.get("card_spec")
        image_prompts = input_data.get("image_prompts", [])

        if not card_spec:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error="필수 입력 데이터 누락: card_spec",
                logs=["입력 검증 실패 — card_spec이 없습니다."],
            )

        cards = card_spec.get("cards", [])
        if not cards:
            return AgentResult(
                agent_id=self.agent_id,
                status="failure",
                error="card_spec에 cards 배열이 비어있습니다.",
                logs=["입력 검증 실패 — cards가 비어있습니다."],
            )

        total_cards = len(cards)
        logs.append(f"입력 수신 — 카드 {total_cards}장, 이미지 프롬프트 {len(image_prompts)}개")

        if self.dry_run:
            logs.append("[DRY-RUN] 실제 API 호출 없이 플레이스홀더로 대체합니다.")

        # 2. 출력 디렉토리 설정
        date_str = call.context.get("date", datetime.now(KST).strftime("%Y-%m-%d"))
        output_base = Path(self.config.get("output_dir", _PROJECT_ROOT / "output"))
        assets_dir = output_base / date_str / "assets"
        cards_dir = output_base / date_str / "cards"
        assets_dir.mkdir(parents=True, exist_ok=True)
        cards_dir.mkdir(parents=True, exist_ok=True)

        logs.append(f"출력 디렉토리: {assets_dir}")

        # 3. image_prompts를 card_number 기준 dict로 변환
        prompt_map: dict[int, dict] = {}
        for ip in image_prompts:
            card_num = ip.get("card_number")
            if card_num is not None:
                prompt_map[card_num] = ip

        # 4. 각 카드에 대해 이미지 생성
        generation_log = {
            "total_images": total_cards,
            "success": 0,
            "failed": 0,
            "retries": 0,
        }
        assets_list: list[dict] = []

        for card in cards:
            card_number = card.get("index") or card.get("card_number", 0)
            prompt_info = prompt_map.get(card_number, {})
            prompt_text = prompt_info.get("prompt") or ""

            # card 자체의 background.prompt도 폴백으로 사용
            if not prompt_text:
                bg = card.get("background", {})
                prompt_text = bg.get("prompt") or ""

            # 기본 색상 추출 (플레이스홀더용)
            style = card.get("style", {})
            palette = style.get("color_palette", {})
            bg_color = palette.get("background", "#2D2D2D")

            if not prompt_text and not self.dry_run:
                # 프롬프트가 없으면 플레이스홀더 생성
                logs.append(f"카드 {card_number}: 프롬프트 없음 — 플레이스홀더 생성")
                placeholder_path = self._create_placeholder_image(
                    color=bg_color,
                    card_number=card_number,
                    output_dir=assets_dir,
                )
                # card_spec 업데이트
                if "background" not in card:
                    card["background"] = {}
                card["background"]["src"] = placeholder_path
                card["background"]["type"] = "solid"

                generation_log["success"] += 1
                artifacts.append(placeholder_path)
                assets_list.append({
                    "card_number": card_number,
                    "bg_path": placeholder_path,
                    "preview_path": None,
                })
                continue

            # 이미지 생성
            gen_result = self._generate_single_image(
                prompt=prompt_text,
                card_number=card_number,
                output_dir=assets_dir,
                negative_prompt=prompt_info.get("negative_prompt", ""),
                bg_color=bg_color,
            )

            if gen_result.get("success", False):
                generation_log["success"] += 1
                img_path = gen_result["path"]
                artifacts.append(img_path)
                logs.append(
                    f"카드 {card_number}: 이미지 생성 성공 "
                    f"({gen_result.get('generation_time_ms', 0)}ms)"
                )
            else:
                generation_log["failed"] += 1
                img_path = gen_result.get("path", "")
                error_detail = gen_result.get("error", "알 수 없는 에러")
                logs.append(f"카드 {card_number}: 이미지 생성 실패 — {error_detail} (플레이스홀더 사용)")
                if img_path:
                    artifacts.append(img_path)

            # card_spec의 background.src 업데이트
            if "background" not in card:
                card["background"] = {}
            card["background"]["src"] = img_path
            if prompt_text:
                card["background"]["prompt_used"] = prompt_text

            assets_list.append({
                "card_number": card_number,
                "bg_path": img_path,
                "preview_path": None,
            })

        logs.append(
            f"이미지 생성 완료 — 성공: {generation_log['success']}, "
            f"실패: {generation_log['failed']}"
        )

        # 5. 결과 조립
        output_data = {
            "card_spec": card_spec,
            "assets": assets_list,
            "generation_log": generation_log,
        }

        status = "success" if generation_log["failed"] == 0 else "needs_review"

        return AgentResult(
            agent_id=self.agent_id,
            status=status,
            output_data=output_data,
            artifacts=artifacts,
            logs=logs,
        )

    # ── 단일 이미지 생성 ──

    def _generate_single_image(
        self,
        prompt: str,
        card_number: int,
        output_dir: Path,
        negative_prompt: str = "",
        bg_color: str = "#2D2D2D",
    ) -> dict:
        """
        단일 카드의 배경 이미지를 생성합니다.

        DALL-E API를 호출하고, 실패 시 플레이스홀더를 생성합니다.

        Args:
            prompt: 이미지 생성 프롬프트
            card_number: 카드 번호
            output_dir: 이미지 저장 디렉토리
            negative_prompt: 네거티브 프롬프트 (DALL-E에서는 프롬프트에 통합)
            bg_color: 플레이스홀더 배경색

        Returns:
            dict: {path, url, generation_time_ms, success, error}
        """
        filename = f"card_{card_number}_bg.png"
        save_path = str(output_dir / filename)

        # Dry-run 모드
        if self.dry_run:
            placeholder_path = self._create_placeholder_image(
                color=bg_color,
                card_number=card_number,
                output_dir=output_dir,
            )
            return {
                "path": placeholder_path,
                "url": None,
                "generation_time_ms": 0,
                "success": True,
                "error": None,
                "dry_run": True,
            }

        # DALL-E API 호출 시도
        start_ms = time.time()
        try:
            client = self._get_openai_client()

            # 네거티브 프롬프트를 메인 프롬프트에 통합 (DALL-E 3 방식)
            full_prompt = prompt
            if negative_prompt:
                full_prompt += f"\n\nAvoid: {negative_prompt}"

            response = client.images.generate(
                model=self.image_model,
                prompt=full_prompt,
                size=self.image_size,
                quality=self.image_quality,
                n=1,
            )

            image_url = response.data[0].url
            elapsed_ms = int((time.time() - start_ms) * 1000)

            # 이미지 다운로드 및 저장
            image_data = urlopen(image_url).read()
            with open(save_path, "wb") as f:
                f.write(image_data)

            logger.info("이미지 생성 완료 — 카드 %d, 경로: %s", card_number, save_path)

            return {
                "path": save_path,
                "url": image_url,
                "generation_time_ms": elapsed_ms,
                "success": True,
                "error": None,
            }

        except Exception as e:
            elapsed_ms = int((time.time() - start_ms) * 1000)
            error_msg = f"{type(e).__name__}: {str(e)}"
            logger.warning(
                "이미지 생성 실패 (카드 %d) — 플레이스홀더로 대체: %s",
                card_number, error_msg,
            )

            # 플레이스홀더로 폴백
            placeholder_path = self._create_placeholder_image(
                color=bg_color,
                card_number=card_number,
                output_dir=output_dir,
            )

            return {
                "path": placeholder_path,
                "url": None,
                "generation_time_ms": elapsed_ms,
                "success": False,
                "error": error_msg,
            }

    # ── 플레이스홀더 이미지 생성 ──

    def _create_placeholder_image(
        self,
        color: str,
        card_number: int,
        output_dir: Path,
    ) -> str:
        """
        Pillow를 사용하여 단색 플레이스홀더 이미지를 생성합니다.

        Args:
            color: 배경색 (hex 코드, 예: "#2D2D2D")
            card_number: 카드 번호
            output_dir: 저장 디렉토리

        Returns:
            str: 저장된 이미지 파일 경로
        """
        filename = f"card_{card_number}_bg.png"
        save_path = output_dir / filename

        try:
            from PIL import Image, ImageDraw, ImageFont

            # 1080x1080 이미지 생성
            img = Image.new("RGB", (1080, 1080), color=color)
            draw = ImageDraw.Draw(img)

            # 중앙에 카드 번호 표시 (플레이스홀더임을 알려줌)
            label = f"Card {card_number}\n(placeholder)"
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
            except (OSError, IOError):
                font = ImageFont.load_default()

            # 텍스트 중앙 배치
            bbox = draw.textbbox((0, 0), label, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            x = (1080 - text_width) // 2
            y = (1080 - text_height) // 2

            # 텍스트 색상: 배경이 밝으면 검정, 어두우면 흰색
            bg_brightness = self._hex_brightness(color)
            text_color = "#000000" if bg_brightness > 128 else "#FFFFFF"

            draw.text((x, y), label, fill=text_color, font=font)
            img.save(str(save_path), "PNG")

            logger.info("플레이스홀더 이미지 생성 — 카드 %d, 경로: %s", card_number, save_path)

        except ImportError:
            # Pillow가 없는 경우 — 최소 크기의 빈 PNG 파일 생성
            logger.warning("Pillow 미설치 — 빈 PNG 파일을 생성합니다.")
            self._create_minimal_png(save_path)

        return str(save_path)

    @staticmethod
    def _hex_brightness(hex_color: str) -> int:
        """hex 색상의 밝기(0~255)를 계산합니다."""
        hex_color = hex_color.lstrip("#")
        if len(hex_color) != 6:
            return 128  # 기본값
        try:
            r = int(hex_color[0:2], 16)
            g = int(hex_color[2:4], 16)
            b = int(hex_color[4:6], 16)
            # perceived brightness
            return int(0.299 * r + 0.587 * g + 0.114 * b)
        except ValueError:
            return 128

    @staticmethod
    def _create_minimal_png(path: Path):
        """Pillow 없이 최소한의 1x1 PNG 파일을 생성합니다."""
        # 최소 유효 PNG (1x1 흰색 픽셀)
        import struct
        import zlib

        def _chunk(chunk_type: bytes, data: bytes) -> bytes:
            raw = chunk_type + data
            return struct.pack(">I", len(data)) + raw + struct.pack(">I", zlib.crc32(raw) & 0xFFFFFFFF)

        signature = b"\x89PNG\r\n\x1a\n"
        ihdr_data = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
        ihdr = _chunk(b"IHDR", ihdr_data)
        raw_pixel = b"\x00\xff\xff\xff"  # filter byte + RGB
        idat = _chunk(b"IDAT", zlib.compress(raw_pixel))
        iend = _chunk(b"IEND", b"")

        with open(str(path), "wb") as f:
            f.write(signature + ihdr + idat + iend)


# ── 테스트 코드 ──

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    print("=" * 60)
    print("ImageGeneratorAgent 테스트")
    print("=" * 60)

    # 테스트용 입력 데이터 (디자인 디렉터 출력 모사)
    _test_roles = ["cover", "empathy", "cause", "insight",
                   "solution", "tip", "tip", "closing"]
    _test_bg_colors = ["#2D2D2D", "#3A3A5C", "#4A4A6A", "#2D2D5E",
                       "#3D5A3D", "#5A3D3D", "#3D3D5A", "#2D2D2D"]

    test_input = {
        "card_spec": {
            "meta": {
                "id": "2026-03-15-001",
                "topic": "봄철 무기력감 극복",
                "angle": "계절 변화가 감정에 미치는 영향",
                "target_persona": "20~30대 직장인",
                "created_at": "2026-03-15T09:00:00+09:00",
                "status": "draft",
                "sources": [],
            },
            "cards": [
                {
                    "index": i + 1,
                    "role": _test_roles[i],
                    "text": {
                        "headline": f"헤드라인 {i + 1}",
                        "body": f"카드 {i + 1} 본문 텍스트입니다.",
                        "sub_text": "",
                    },
                    "style": {
                        "layout": "center",
                        "color_palette": {
                            "primary": "#7B68EE",
                            "secondary": "#F8F7FF",
                            "text": "#FFFFFF",
                            "background": _test_bg_colors[i],
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
                for i in range(8)
            ],
            "sns": {
                "instagram": {
                    "caption": "봄이 와도 마음은 겨울인 당신에게...",
                    "hashtags": ["#멘탈헬스", "#봄철무기력"],
                },
                "threads": {"text": "봄인데 왜 이렇게 힘들까?"},
            },
        },
        "image_prompts": [
            {
                "card_number": i + 1,
                "prompt": f"Soft watercolor background for mental health card about {topic}, "
                          f"no text, soothing pastel tones, 1080x1080",
                "negative_prompt": "text, letters, words, harsh colors",
                "style": "watercolor_soft",
            }
            for i, topic in enumerate([
                "spring fatigue", "emotional empathy", "scientific causes",
                "body signals", "building routines", "walking tips",
                "self-care checklist", "closing encouragement",
            ])
        ],
    }

    test_call = AgentCall(
        agent_id="image_generator",
        task_type="image_generation",
        input_data=test_input,
        context={"date": "2026-03-15", "session_id": "test-session-001"},
    )

    # dry-run 모드로 테스트
    agent = ImageGeneratorAgent(config={"dry_run": True})
    print(f"\n시스템 프롬프트 로드 완료 ({len(agent.system_prompt)}자)")
    print(f"시스템 프롬프트 미리보기:\n{agent.system_prompt[:200]}...\n")

    result = agent.execute(test_call)

    print(f"\n실행 결과 상태: {result.status}")
    print(f"소요 시간: {result.duration_ms}ms")
    print(f"로그 ({len(result.logs)}건):")
    for log_msg in result.logs:
        print(f"  - {log_msg}")
    print(f"생성된 파일 ({len(result.artifacts)}개):")
    for art in result.artifacts:
        print(f"  - {art}")

    if result.is_success():
        gen_log = result.output_data.get("generation_log", {})
        print(f"\n생성 요약: {json.dumps(gen_log, ensure_ascii=False)}")
    else:
        print(f"\n에러: {result.error}")

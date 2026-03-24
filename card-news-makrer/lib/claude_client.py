"""
ClaudeClient — Claude API 연동 모듈

모든 콘텐츠 에이전트가 이 모듈을 통해 Claude API를 호출합니다.
- 기본 채팅, JSON 모드, 재시도 로직 지원
- config/settings.yaml에서 기본 설정 로드
- 환경변수 ANTHROPIC_API_KEY에서 API 키 로드
"""

import json
import logging
import os
import re
import time
import yaml
from pathlib import Path
from typing import Any, Optional

from anthropic import Anthropic, APIError, APIConnectionError, RateLimitError, APITimeoutError

logger = logging.getLogger(__name__)

# 프로젝트 루트 기준 설정 파일 경로
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_SETTINGS_PATH = _PROJECT_ROOT / "config" / "settings.yaml"


# ── 설정 로더 ──

def _load_settings() -> dict:
    """config/settings.yaml에서 claude_api 설정 로드"""
    if not _SETTINGS_PATH.exists():
        logger.warning("설정 파일을 찾을 수 없습니다: %s — 기본값을 사용합니다", _SETTINGS_PATH)
        return {}
    with open(_SETTINGS_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data.get("claude_api", {})


_DEFAULT_SETTINGS = _load_settings()


# ── Claude Client ──

class ClaudeClient:
    """
    Claude API 클라이언트

    사용법:
        client = ClaudeClient()
        response = client.chat(
            system_prompt="당신은 카드뉴스 작성 전문가입니다.",
            user_message="봄철 무기력감에 대한 카드뉴스 기획안을 작성해주세요.",
        )
        print(response)

        # JSON 모드
        data = client.chat_json(
            system_prompt="JSON으로만 응답하세요.",
            user_message="주제 3가지를 제안해주세요.",
            response_schema={"topics": [{"title": "str", "reason": "str"}]},
        )
    """

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ):
        # API 키: 인자 > 환경변수
        resolved_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not resolved_key:
            raise ValueError(
                "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다. "
                "export ANTHROPIC_API_KEY='sk-...' 를 실행하거나 생성자에 api_key를 전달하세요."
            )

        self.client = Anthropic(api_key=resolved_key)
        self.model = model or _DEFAULT_SETTINGS.get("model", "claude-sonnet-4-20250514")
        self.default_max_tokens = max_tokens or _DEFAULT_SETTINGS.get("max_tokens", 4096)
        self.default_temperature = temperature if temperature is not None else _DEFAULT_SETTINGS.get("temperature", 0.7)

        logger.info("ClaudeClient 초기화 — 모델: %s, max_tokens: %d", self.model, self.default_max_tokens)

    # ── 기본 채팅 ──

    def chat(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> str:
        """
        Claude API 단일 호출 — 텍스트 응답 반환

        Args:
            system_prompt: 시스템 프롬프트
            user_message: 사용자 메시지
            max_tokens: 최대 토큰 수 (기본값: settings.yaml 참조)
            temperature: 온도 (기본값: settings.yaml 참조)

        Returns:
            Claude의 텍스트 응답
        """
        tokens = max_tokens or self.default_max_tokens
        temp = temperature if temperature is not None else self.default_temperature

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=tokens,
                temperature=temp,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            )
            # 텍스트 블록 추출
            text = "".join(
                block.text for block in response.content if block.type == "text"
            )
            logger.debug(
                "API 호출 완료 — 입력 토큰: %d, 출력 토큰: %d",
                response.usage.input_tokens,
                response.usage.output_tokens,
            )
            return text

        except RateLimitError as e:
            logger.error("레이트 리밋 초과: %s", e)
            raise
        except APITimeoutError as e:
            logger.error("API 타임아웃: %s", e)
            raise
        except APIConnectionError as e:
            logger.error("API 연결 실패: %s", e)
            raise
        except APIError as e:
            logger.error("Claude API 에러 (상태 %s): %s", e.status_code, e.message)
            raise

    # ── JSON 모드 ──

    def chat_json(
        self,
        system_prompt: str,
        user_message: str,
        response_schema: dict | None = None,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> dict:
        """
        JSON 형식으로 응답을 요청하고 파싱된 dict 반환

        시스템 프롬프트에 JSON 출력 지시를 자동 추가합니다.
        응답에서 JSON 블록을 추출하여 파싱합니다.

        Args:
            system_prompt: 시스템 프롬프트 (JSON 지시가 자동 추가됨)
            user_message: 사용자 메시지
            response_schema: 기대하는 응답 스키마 (예시 구조)
            max_tokens: 최대 토큰 수
            temperature: 온도 (JSON 모드에서는 낮은 값 권장)

        Returns:
            파싱된 JSON dict
        """
        # JSON 지시 프롬프트를 시스템 프롬프트에 추가
        json_instruction = format_json_instruction(response_schema)
        enhanced_prompt = f"{system_prompt}\n\n{json_instruction}"

        # JSON 응답은 낮은 temperature가 유리
        temp = temperature if temperature is not None else min(self.default_temperature, 0.3)

        raw_response = self.chat(
            system_prompt=enhanced_prompt,
            user_message=user_message,
            max_tokens=max_tokens,
            temperature=temp,
        )

        # JSON 추출 및 파싱
        return _extract_json(raw_response)

    # ── 재시도 포함 호출 ──

    def chat_with_retry(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int | None = None,
        temperature: float | None = None,
        max_retries: int = 3,
        json_mode: bool = False,
        response_schema: dict | None = None,
    ) -> str | dict:
        """
        재시도 로직이 포함된 Claude API 호출

        지수 백오프(exponential backoff)를 적용합니다.
        - 1차 재시도: 2초 대기
        - 2차 재시도: 4초 대기
        - 3차 재시도: 8초 대기

        Args:
            system_prompt: 시스템 프롬프트
            user_message: 사용자 메시지
            max_tokens: 최대 토큰 수
            temperature: 온도
            max_retries: 최대 재시도 횟수 (기본 3)
            json_mode: True이면 chat_json 사용
            response_schema: JSON 모드 시 기대 스키마

        Returns:
            json_mode=False이면 str, True이면 dict
        """
        last_error: Exception | None = None

        for attempt in range(1, max_retries + 1):
            try:
                if json_mode:
                    return self.chat_json(
                        system_prompt=system_prompt,
                        user_message=user_message,
                        response_schema=response_schema,
                        max_tokens=max_tokens,
                        temperature=temperature,
                    )
                else:
                    return self.chat(
                        system_prompt=system_prompt,
                        user_message=user_message,
                        max_tokens=max_tokens,
                        temperature=temperature,
                    )

            except (RateLimitError, APITimeoutError, APIConnectionError) as e:
                last_error = e
                if attempt < max_retries:
                    wait_seconds = 2 ** attempt  # 2, 4, 8초
                    logger.warning(
                        "API 호출 실패 (시도 %d/%d) — %s초 후 재시도: %s",
                        attempt, max_retries, wait_seconds, e,
                    )
                    time.sleep(wait_seconds)
                else:
                    logger.error(
                        "API 호출 최종 실패 (시도 %d/%d): %s",
                        attempt, max_retries, e,
                    )

            except (APIError, json.JSONDecodeError) as e:
                # API 에러 또는 JSON 파싱 에러는 재시도 대상이 아닐 수 있음
                last_error = e
                if attempt < max_retries:
                    wait_seconds = 2 ** attempt
                    logger.warning(
                        "API 에러 발생 (시도 %d/%d) — %s초 후 재시도: %s",
                        attempt, max_retries, wait_seconds, e,
                    )
                    time.sleep(wait_seconds)
                else:
                    logger.error(
                        "API 호출 최종 실패 (시도 %d/%d): %s",
                        attempt, max_retries, e,
                    )

        # 모든 재시도 실패
        raise RuntimeError(
            f"Claude API 호출이 {max_retries}회 재시도 후에도 실패했습니다: {last_error}"
        ) from last_error


# ── 헬퍼 함수 ──

def load_agent_prompt(agent_id: str, spec_path: str | Path) -> str:
    """
    에이전트 정의(.md) 파일에서 System Prompt 추출

    ## System Prompt 섹션 아래의 코드 블록(```)을 파싱합니다.
    코드 블록이 없으면 섹션 본문 텍스트를 사용합니다.

    Args:
        agent_id: 에이전트 ID (폴백 프롬프트 생성용)
        spec_path: .md 파일 경로

    Returns:
        추출된 시스템 프롬프트 문자열
    """
    path = Path(spec_path)
    if not path.exists():
        logger.warning("에이전트 스펙 파일을 찾을 수 없습니다: %s", path)
        return f"You are the {agent_id} agent."

    content = path.read_text(encoding="utf-8")

    # "## System Prompt" 섹션 아래의 코드 블록 추출
    in_prompt_section = False
    in_code_block = False
    prompt_lines: list[str] = []

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

    if prompt_lines:
        return "\n".join(prompt_lines).strip()

    # 코드 블록이 없으면 섹션 본문을 통째로 사용
    if in_prompt_section:
        section_lines: list[str] = []
        capture = False
        for line in content.split("\n"):
            if "## System Prompt" in line:
                capture = True
                continue
            if capture:
                if line.startswith("## "):
                    break
                section_lines.append(line)
        text = "\n".join(section_lines).strip()
        if text:
            return text

    return f"You are the {agent_id} agent."


def count_tokens(text: str) -> int:
    """
    간이 토큰 카운트 (한글 고려)

    정확한 토큰 수가 아닌 근사치입니다.
    - 영문: 단어 수 * 1.3 (서브워드 토큰화 고려)
    - 한글: 글자 수 * 1.5 (한글 한 글자가 보통 1~2 토큰)
    - 특수문자/숫자: 개별 카운트

    Args:
        text: 토큰을 셀 텍스트

    Returns:
        추정 토큰 수 (정수)
    """
    if not text:
        return 0

    # 한글 문자 수
    korean_chars = len(re.findall(r"[가-힣]", text))
    # 한글을 제외한 나머지 텍스트
    non_korean = re.sub(r"[가-힣]", " ", text)
    # 영문 단어 수 (공백 기준)
    english_words = len(non_korean.split())

    # 근사 토큰 수 계산
    estimated = int(korean_chars * 1.5 + english_words * 1.3)

    return max(estimated, 1)  # 최소 1 토큰


def format_json_instruction(schema: dict | None = None) -> str:
    """
    JSON 출력 형식 안내 프롬프트 생성

    Claude에게 JSON 형식으로만 응답하도록 지시하는 프롬프트를 만듭니다.
    스키마가 주어지면 예시 구조를 포함합니다.

    Args:
        schema: 기대하는 JSON 구조 (예시)

    Returns:
        JSON 출력 지시 프롬프트 문자열
    """
    parts = [
        "반드시 JSON 형식으로만 응답하세요.",
        "JSON 외의 텍스트(설명, 마크다운 등)를 포함하지 마세요.",
        "유효한 JSON이어야 합니다.",
    ]

    if schema:
        schema_str = json.dumps(schema, ensure_ascii=False, indent=2)
        parts.append(f"\n응답 JSON 구조:\n```json\n{schema_str}\n```")

    return "\n".join(parts)


# ── 내부 유틸리티 ──

def _extract_json(text: str) -> dict:
    """
    텍스트에서 JSON을 추출하고 파싱

    1. 전체 텍스트가 JSON인지 시도
    2. ```json ... ``` 코드 블록에서 추출
    3. { ... } 또는 [ ... ] 패턴 매칭

    Args:
        text: Claude의 원시 응답 텍스트

    Returns:
        파싱된 dict

    Raises:
        json.JSONDecodeError: JSON 추출/파싱 실패 시
    """
    stripped = text.strip()

    # 1. 전체가 JSON인 경우
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    # 2. 코드 블록에서 추출
    code_block_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", stripped, re.DOTALL)
    if code_block_match:
        try:
            return json.loads(code_block_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # 3. 가장 바깥쪽 { ... } 또는 [ ... ] 추출
    brace_match = re.search(r"(\{.*\}|\[.*\])", stripped, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(1))
        except json.JSONDecodeError:
            pass

    # 모든 방법 실패
    raise json.JSONDecodeError(
        f"응답에서 유효한 JSON을 추출할 수 없습니다. 원시 응답: {stripped[:200]}...",
        stripped,
        0,
    )

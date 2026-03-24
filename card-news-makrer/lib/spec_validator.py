"""
card_spec.json 검증기
- JSON Schema 기반 구조 검증
- 비즈니스 규칙 검증 (글자 수, 안전 키워드 등)
"""

import json
from pathlib import Path
from typing import Any

# jsonschema가 없으면 기본 검증만 수행
try:
    import jsonschema
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False


SCHEMA_PATH = Path(__file__).parent.parent / "schemas" / "card_spec.schema.json"


class ValidationError:
    """검증 에러 단일 항목"""
    def __init__(self, field: str, message: str, severity: str = "error"):
        self.field = field
        self.message = message
        self.severity = severity  # "error" | "warning"

    def to_dict(self) -> dict:
        return {
            "field": self.field,
            "message": self.message,
            "severity": self.severity,
        }

    def __repr__(self):
        return f"[{self.severity.upper()}] {self.field}: {self.message}"


class SpecValidator:
    """card_spec.json 검증기"""

    # 안전 키워드 (settings.yaml에서도 관리)
    BLOCK_KEYWORDS = ["자해", "자살", "극단적 선택"]
    WARN_KEYWORDS = ["우울증 진단", "약물 처방", "치료 방법"]

    VALID_ROLES = ["cover", "empathy", "cause", "insight", "solution", "tip", "closing", "source", "cta"]
    VALID_LAYOUTS = ["center", "top-left", "top-right", "bottom-left", "bottom-right", "split"]
    VALID_STATUSES = ["draft", "review", "approved", "published"]

    def __init__(self, schema_path: str | Path | None = None):
        self.schema_path = Path(schema_path) if schema_path else SCHEMA_PATH
        self._schema = None

    @property
    def schema(self) -> dict | None:
        if self._schema is None and self.schema_path.exists():
            with open(self.schema_path, "r", encoding="utf-8") as f:
                self._schema = json.load(f)
        return self._schema

    def validate(self, spec: dict) -> list[ValidationError]:
        """전체 검증 실행. ValidationError 리스트 반환 (비어있으면 통과)"""
        errors = []
        errors.extend(self._validate_schema(spec))
        errors.extend(self._validate_meta(spec.get("meta", {})))
        errors.extend(self._validate_cards(spec.get("cards", [])))
        errors.extend(self._validate_sns(spec.get("sns", {})))
        errors.extend(self._validate_safety(spec))
        return errors

    def validate_file(self, filepath: str | Path) -> list[ValidationError]:
        """파일 경로로부터 검증"""
        filepath = Path(filepath)
        if not filepath.exists():
            return [ValidationError("file", f"파일을 찾을 수 없습니다: {filepath}")]
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                spec = json.load(f)
        except json.JSONDecodeError as e:
            return [ValidationError("file", f"JSON 파싱 에러: {e}")]
        return self.validate(spec)

    def is_valid(self, spec: dict) -> bool:
        """에러가 없으면 True"""
        errors = self.validate(spec)
        return not any(e.severity == "error" for e in errors)

    # ── 내부 검증 메서드 ──

    def _validate_schema(self, spec: dict) -> list[ValidationError]:
        """JSON Schema 검증 (jsonschema 패키지 있을 때만)"""
        if not HAS_JSONSCHEMA or self.schema is None:
            return []
        errors = []
        validator = jsonschema.Draft7Validator(self.schema)
        for error in validator.iter_errors(spec):
            path = ".".join(str(p) for p in error.absolute_path) or "(root)"
            errors.append(ValidationError(path, error.message))
        return errors

    def _validate_meta(self, meta: dict) -> list[ValidationError]:
        """meta 필드 비즈니스 규칙 검증"""
        errors = []
        if not meta:
            errors.append(ValidationError("meta", "meta 필드가 비어있습니다"))
            return errors

        for required in ["id", "topic", "created_at", "status"]:
            if required not in meta:
                errors.append(ValidationError(f"meta.{required}", f"필수 필드가 없습니다: {required}"))

        if meta.get("status") and meta["status"] not in self.VALID_STATUSES:
            errors.append(ValidationError("meta.status", f"유효하지 않은 상태: {meta['status']}"))

        return errors

    def _validate_cards(self, cards: list) -> list[ValidationError]:
        """cards 배열 비즈니스 규칙 검증"""
        errors = []
        if not cards:
            errors.append(ValidationError("cards", "카드가 없습니다"))
            return errors

        if len(cards) < 6:
            errors.append(ValidationError("cards", f"카드가 최소 6장 이상이어야 합니다 (현재 {len(cards)}장)"))
        if len(cards) > 10:
            errors.append(ValidationError("cards", f"카드가 최대 10장을 초과했습니다 (현재 {len(cards)}장)"))

        # 개별 카드 검증
        for i, card in enumerate(cards):
            prefix = f"cards[{i}]"

            # role 검증
            role = card.get("role", "")
            if role not in self.VALID_ROLES:
                errors.append(ValidationError(f"{prefix}.role", f"유효하지 않은 역할: {role}"))

            # index 연속성
            if card.get("index") != i + 1:
                errors.append(ValidationError(
                    f"{prefix}.index",
                    f"index가 순서와 다릅니다 (expected {i+1}, got {card.get('index')})",
                    severity="warning"
                ))

            # 텍스트 글자 수 검증
            text = card.get("text", {})
            headline = text.get("headline", "")
            body = text.get("body", "")
            sub_text = text.get("sub_text", "")
            description = text.get("description", "")
            quote = text.get("quote", "")
            bullet_points = text.get("bullet_points", [])

            if len(headline) > 30:
                errors.append(ValidationError(
                    f"{prefix}.text.headline",
                    f"헤드라인이 30자를 초과했습니다 ({len(headline)}자): '{headline}'"
                ))
            if body and len(body) > 150:
                errors.append(ValidationError(
                    f"{prefix}.text.body",
                    f"본문이 150자를 초과했습니다 ({len(body)}자)",
                    severity="warning"
                ))
            if sub_text and len(sub_text) > 100:
                errors.append(ValidationError(
                    f"{prefix}.text.sub_text",
                    f"보조 텍스트가 100자를 초과했습니다 ({len(sub_text)}자)",
                    severity="warning"
                ))
            if description and len(description) > 300:
                errors.append(ValidationError(
                    f"{prefix}.text.description",
                    f"설명이 300자를 초과했습니다 ({len(description)}자)",
                    severity="warning"
                ))
            if quote and len(quote) > 200:
                errors.append(ValidationError(
                    f"{prefix}.text.quote",
                    f"인용문이 200자를 초과했습니다 ({len(quote)}자)",
                    severity="warning"
                ))
            for j, bullet in enumerate(bullet_points):
                if isinstance(bullet, str) and len(bullet) > 100:
                    errors.append(ValidationError(
                        f"{prefix}.text.bullet_points[{j}]",
                        f"bullet_points 항목이 100자를 초과했습니다 ({len(bullet)}자)",
                        severity="warning"
                    ))

            # layout 검증
            layout = card.get("style", {}).get("layout", "")
            if layout and layout not in self.VALID_LAYOUTS:
                errors.append(ValidationError(f"{prefix}.style.layout", f"유효하지 않은 레이아웃: {layout}"))

        # cover와 cta 카드 존재 확인
        roles = [c.get("role") for c in cards]
        if "cover" not in roles:
            errors.append(ValidationError("cards", "표지(cover) 카드가 없습니다"))
        if "cta" not in roles:
            errors.append(ValidationError("cards", "CTA 카드가 없습니다", severity="warning"))

        return errors

    def _validate_sns(self, sns: dict) -> list[ValidationError]:
        """SNS 필드 검증"""
        errors = []
        ig = sns.get("instagram", {})
        if ig:
            caption = ig.get("caption", "")
            if len(caption) > 2200:
                errors.append(ValidationError(
                    "sns.instagram.caption",
                    f"인스타그램 캡션이 2200자를 초과했습니다 ({len(caption)}자)"
                ))
            hashtags = ig.get("hashtags", [])
            if len(hashtags) > 30:
                errors.append(ValidationError(
                    "sns.instagram.hashtags",
                    f"해시태그가 30개를 초과했습니다 ({len(hashtags)}개)"
                ))
        return errors

    def _validate_safety(self, spec: dict) -> list[ValidationError]:
        """안전 키워드 검사 (전체 텍스트 스캔)"""
        errors = []
        text_blob = json.dumps(spec, ensure_ascii=False)

        for keyword in self.BLOCK_KEYWORDS:
            if keyword in text_blob:
                errors.append(ValidationError(
                    "safety",
                    f"차단 키워드 감지: '{keyword}' — 즉시 제거 필요"
                ))

        for keyword in self.WARN_KEYWORDS:
            if keyword in text_blob:
                errors.append(ValidationError(
                    "safety",
                    f"주의 키워드 감지: '{keyword}' — 맥락 확인 필요",
                    severity="warning"
                ))

        return errors


# ── CLI 실행 ──

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python spec_validator.py <card_spec.json>")
        sys.exit(1)

    filepath = sys.argv[1]
    validator = SpecValidator()
    errors = validator.validate_file(filepath)

    if not errors:
        print("✅ 검증 통과: 에러 없음")
        sys.exit(0)

    error_count = sum(1 for e in errors if e.severity == "error")
    warn_count = sum(1 for e in errors if e.severity == "warning")

    print(f"\n{'='*60}")
    print(f"검증 결과: ❌ {error_count}개 에러, ⚠️ {warn_count}개 경고")
    print(f"{'='*60}\n")

    for e in errors:
        icon = "❌" if e.severity == "error" else "⚠️"
        print(f"  {icon} [{e.field}] {e.message}")

    sys.exit(1 if error_count > 0 else 0)

"""
Season Info Utility -- 날짜 기반 시즌 정보 생성

ResearcherAgent의 입력으로 사용되는 시즌 정보를 생성합니다.
- 한국식 계절 구분 (봄/여름/가을/겨울)
- 월별 멘탈헬스 관련 이벤트 및 테마
- 국제 정신건강 인식의 날 포함
"""

from datetime import datetime
from typing import Any


# ── 한국식 계절 매핑 ──

_SEASON_MAP: dict[int, str] = {
    1: "겨울", 2: "겨울",
    3: "봄", 4: "봄", 5: "봄",
    6: "여름", 7: "여름", 8: "여름",
    9: "가을", 10: "가을", 11: "가을",
    12: "겨울",
}


# ── 월별 이벤트 (멘탈헬스 관련 + 한국 달력 + 국제 기념일) ──

_MONTHLY_EVENTS: dict[int, list[str]] = {
    1: [
        "새해",
        "블루먼데이 (1월 셋째 월요일)",
        "설날 연휴",
    ],
    2: [
        "세계 암의 날 (2/4)",
        "발렌타인데이",
        "입춘",
    ],
    3: [
        "세계 수면의 날 (3월 셋째 금요일)",
        "춘분",
        "개학 시즌",
        "삼일절",
    ],
    4: [
        "세계 보건의 날 (4/7)",
        "식목일",
        "봄꽃 시즌",
    ],
    5: [
        "정신건강의 달 (미국)",
        "어린이날 (5/5)",
        "어버이날 (5/8)",
        "스승의날 (5/15)",
        "부부의 날 (5/21)",
    ],
    6: [
        "PTSD 인식의 달",
        "현충일 (6/6)",
        "장마 시즌 시작",
    ],
    7: [
        "자기돌봄의 달",
        "여름 휴가 시즌",
        "복날",
    ],
    8: [
        "광복절 (8/15)",
        "여름 휴가 시즌",
        "개학 준비 시즌",
    ],
    9: [
        "세계 자살예방의 날 (9/10)",
        "추석 연휴",
        "추분",
    ],
    10: [
        "세계 정신건강의 날 (10/10)",
        "한글날 (10/9)",
        "가을 시즌",
    ],
    11: [
        "수능 시즌",
        "빼빼로데이 (11/11)",
        "입동",
    ],
    12: [
        "크리스마스",
        "연말 결산 시즌",
        "동지",
        "송년회 시즌",
    ],
}


# ── 월별 멘탈헬스 테마 ──

_MONTHLY_MENTAL_HEALTH_THEMES: dict[int, list[str]] = {
    1: [
        "새해 목표 스트레스",
        "겨울철 우울감",
        "명절 후 공허감",
    ],
    2: [
        "관계 불안",
        "겨울철 우울감",
        "계절성 정서장애 (SAD)",
    ],
    3: [
        "봄철 우울증",
        "계절성 정서장애",
        "신학기 적응 스트레스",
        "수면 건강",
    ],
    4: [
        "봄철 무기력감",
        "환절기 자율신경 불균형",
        "직장인 번아웃",
    ],
    5: [
        "가정의 달 스트레스",
        "양육 번아웃",
        "정신건강 인식 제고",
    ],
    6: [
        "트라우마 인식",
        "장마철 우울감",
        "상반기 번아웃",
    ],
    7: [
        "자기돌봄",
        "여름 우울증",
        "휴가 불안",
    ],
    8: [
        "계절성 피로",
        "개학 불안",
        "열대야 수면 장애",
    ],
    9: [
        "자살예방 인식",
        "명절 스트레스",
        "가을 우울증",
    ],
    10: [
        "정신건강 인식의 달",
        "가을 우울감",
        "사회적 고립감",
    ],
    11: [
        "시험 스트레스",
        "계절성 정서장애",
        "연말 불안",
    ],
    12: [
        "연말 우울증",
        "한 해 회고 스트레스",
        "외로움과 고립감",
        "겨울철 수면 건강",
    ],
}


def get_season_info(date_str: str) -> dict[str, Any]:
    """
    날짜 문자열로부터 시즌 정보를 생성합니다.

    Args:
        date_str: "YYYY-MM-DD" 형식의 날짜 문자열

    Returns:
        시즌 정보 dict:
        {
            "month": int,
            "season": str,          # 봄 | 여름 | 가을 | 겨울
            "events": list[str],    # 해당 월의 관련 이벤트
            "mental_health_themes": list[str],  # 해당 월의 멘탈헬스 테마
        }

    Raises:
        ValueError: 날짜 형식이 올바르지 않은 경우
    """
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise ValueError(
            f"날짜 형식이 올바르지 않습니다: '{date_str}'. "
            f"'YYYY-MM-DD' 형식을 사용하세요. (예: '2026-03-15')"
        )

    month = dt.month
    season = _SEASON_MAP[month]
    events = _MONTHLY_EVENTS.get(month, [])
    themes = _MONTHLY_MENTAL_HEALTH_THEMES.get(month, [])

    return {
        "month": month,
        "season": season,
        "events": list(events),
        "mental_health_themes": list(themes),
    }


def get_season_name(month: int) -> str:
    """
    월(1-12)에 해당하는 한국식 계절명을 반환합니다.

    Args:
        month: 1~12 사이의 정수

    Returns:
        계절명 (봄 | 여름 | 가을 | 겨울)

    Raises:
        ValueError: month가 1~12 범위를 벗어난 경우
    """
    if not (1 <= month <= 12):
        raise ValueError(f"월(month)은 1~12 사이여야 합니다: {month}")
    return _SEASON_MAP[month]


# ── CLI 테스트 ──

if __name__ == "__main__":
    import json
    import sys

    date_input = sys.argv[1] if len(sys.argv) > 1 else "2026-03-15"
    info = get_season_info(date_input)
    print(json.dumps(info, ensure_ascii=False, indent=2))

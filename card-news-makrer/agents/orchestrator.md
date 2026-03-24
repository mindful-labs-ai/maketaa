# ORCHESTRATOR - 워크플로우 총괄 조율

## 메타 정보

| 항목 | 값 |
|------|-----|
| Agent ID | `orchestrator` |
| 팀 | - (시스템 레벨) |
| 트리거 | 스케줄러 (월/수/금 09:00) / 수동 실행 / 운영자 요청 |
| 모델 | claude-sonnet-4-20250514 |

---

## 역할

전체 파이프라인의 실행 순서를 관리하고, 에이전트 간 데이터 전달을 조율합니다.
각 에이전트의 출력을 검증한 뒤 다음 에이전트에 입력으로 넘기며,
에러 발생 시 재시도 또는 폴백 로직을 실행합니다.

---

## System Prompt

```
당신은 멘탈헬스 카드뉴스 자동 제작 시스템의 오케스트레이터입니다.

핵심 책임:
1. 콘텐츠 파이프라인 실행 관리 (AGENT 1→2→3→4→5→6→승인→7)
2. 각 에이전트의 출력 유효성 검증 후 다음 에이전트에 전달
3. 에러/타임아웃 발생 시 재시도(최대 2회) 또는 운영자 알림
4. 프로덕트 팀 에이전트는 별도 트리거로 호출 (운영자 요청 또는 자율 감지)

파이프라인 실행 규칙:
- 각 에이전트 호출 전 input 스키마 유효성 검증
- 각 에이전트 호출 후 output 스키마 유효성 검증
- 실패 시 에러 로그 기록 + 운영자 알림
- 인간 승인 대기 시 알림 발송 후 대기 상태 전환
```

---

## 파이프라인 정의

### 콘텐츠 제작 파이프라인 (content_pipeline)

```yaml
pipeline: content_pipeline
trigger: scheduler | manual
steps:
  - agent: researcher
    timeout: 300s
    retry: 2
    on_success: pass output → strategist
    on_failure: alert operator

  - agent: strategist
    timeout: 180s
    retry: 2
    on_success: pass output → copywriter
    on_failure: alert operator

  - agent: copywriter
    timeout: 180s
    retry: 2
    on_success: pass output → design_director
    on_failure: alert operator

  - agent: design_director
    timeout: 180s
    retry: 2
    on_success: pass output → image_generator
    on_failure: alert operator

  - agent: image_generator
    timeout: 600s
    retry: 2
    on_success: pass output → qa_editor
    on_failure: alert operator

  - agent: qa_editor
    timeout: 180s
    retry: 1
    on_success: load canvas_editor → notify operator
    on_failure: alert operator

  - checkpoint: human_approval
    action: wait_for_approval
    timeout: 48h
    on_approve: pass output → publisher
    on_reject: return to qa_editor with feedback

  - agent: publisher
    timeout: 120s
    retry: 2
    on_success: log report → notify operator
    on_failure: alert operator
```

### 프로덕트 팀 태스크 파이프라인 (product_task)

```yaml
pipeline: product_task
trigger: operator_request | auto_detect
steps:
  - agent: pm
    action: analyze_request → create_prd → assign_tasks

  - parallel:
      - agent: designer (if design task assigned)
      - agent: engineer (if dev task assigned)

  - agent: pm
    action: verify_completion → report_to_operator
```

---

## 에이전트 호출 인터페이스

각 에이전트는 다음 표준 인터페이스로 호출됩니다:

```python
class AgentCall:
    agent_id: str          # 에이전트 식별자
    task_type: str         # 태스크 유형
    input_data: dict       # 입력 데이터 (이전 에이전트 출력)
    context: dict          # 공유 컨텍스트 (날짜, 세션ID 등)
    config: dict           # 에이전트별 설정 오버라이드
```

```python
class AgentResult:
    agent_id: str
    status: str            # "success" | "failure" | "needs_review"
    output_data: dict      # 출력 데이터
    artifacts: list[str]   # 생성된 파일 경로
    logs: list[str]        # 실행 로그
    duration_seconds: float
```

---

## 에러 핸들링

| 에러 유형 | 대응 |
|-----------|------|
| 에이전트 타임아웃 | 최대 2회 재시도 → 실패 시 운영자 알림 |
| 출력 스키마 불일치 | 에이전트에 재요청 (수정 지시 포함) |
| API 한도 초과 | 대기 후 재시도 |
| 이미지 생성 실패 | 프롬프트 단순화 후 재시도 |
| 인간 승인 48시간 초과 | 리마인더 알림 발송 |

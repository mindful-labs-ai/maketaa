# T-D06: 승인/반려 플로우 UX 설계

_작성자: 제품 디자인 에이전트 (AGENT 0-D) | 작성일: 2026-03-09_

---

## 개요

승인/반려 플로우는 완료된 카드뉴스를 운영자가 최종 검수한 후 발행을 승인하거나 반려하는 과정입니다. 이 플로우는 draft → review → approved/rejected → published의 상태 전환을 관리하며, 최종 발행 전 체크리스트 확인과 반려 사유 기록을 포함합니다.

---

## 1. 상태 흐름도 (Status Flow Diagram)

### 1.1 전체 상태 전환

```
┌──────────────────────────────────────────────────────────────┐
│                      START                                    │
│               (카드 로드 → DRAFT 상태)                        │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  DRAFT (초안)         │
            │  상태 배지: 회색       │
            │  [승인] [반려] 버튼   │
            │  헤더: "편집 중"      │
            └──────────┬───────────┘
                       │
         ┌─────────────┴──────────────┐
         │                            │
         │ [승인] 클릭               │ [반려] 클릭
         │                            │
         ▼                            ▼
   ┌─────────────────┐         ┌──────────────────┐
   │ AWAITING_REVIEW │         │ 반려 사유 입력   │
   │ (검수 대기)      │         │ 모달 표시        │
   │ 확인 모달 표시   │         └────┬─────────────┘
   └────────┬────────┘              │
            │                        │ [반려] 확인
            │ [발행] 확인           │
            │                        ▼
            │                   ┌──────────────────┐
            │                   │ REJECTED (반려)   │
            │                   │ 상태 배지: 주황색  │
            │                   │ status = "draft"  │
            │                   │ edit_logs 기록    │
            │                   └────────┬─────────┘
            │                            │
            │                            │ 재편집 후
            │                            │ [승인] 클릭
            │                            │
            ▼                            │
      ┌──────────────┐                 │
      │ SUBMITTING   │◄────────────────┘
      │ (발행 처리중)  │
      │ 로딩 스피너   │
      └────────┬─────┘
               │
         ┌─────┴────────┐
         │ [성공]  [실패]│
         │               │
         ▼               ▼
    ┌─────────────┐   ┌─────────────────┐
    │ APPROVED    │   │ ERROR           │
    │ (승인 완료)  │   │ (발행 실패)      │
    │ 초록 배지   │   │ 에러 토스트 표시 │
    │ 읽기 전용   │   │ [재시도]         │
    │ 발행 트리거  │   └────────┬────────┘
    │ 토스트      │            │
    └────────────┘            │
                               │ [재시도]
                               │
                               ▼
                          ┌──────────────┐
                          │ SUBMITTING   │
                          │ (재시도)      │
                          └──────────────┘
```

### 1.2 상태별 상세 설명

| 상태 | 코드 | 설명 | 편집 가능 | 버튼 |
|------|------|------|---------|------|
| Draft | draft | 초안 상태, 자유로운 편집 가능 | O | [승인], [반려] |
| Awaiting Review | review | 검수 대기 중 (상태 전환 전 확인 중) | X | - |
| Approved | approved | 승인 완료, 발행 진행 중 | X | - |
| Rejected | rejected | 반려됨, 사유 저장됨 | O | [승인], [반려] |
| Published | published | 발행 완료 | X | - |

---

## 2. 헤더 UI & 상태 배지

### 2.1 헤더 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│ 카드뉴스 제목              │ 상태 배지 │ [반려] [승인 & 발행] │
│ "마음의 건강과 일상의 스트레스" │ [draft]   │              │
└─────────────────────────────────────────────────────────┘
```

### 2.2 상태 배지 (Status Badge)

**배지 위치:** 헤더 중앙, 제목 우측

**배지 스타일:**

| 상태 | 배경색 | 텍스트색 | 텍스트 | 아이콘 |
|------|--------|---------|--------|--------|
| draft | #F8F7FF | #2D2D2D | 초안 | ○ (회색) |
| review | #FFF7E6 | #92400E | 검수 중 | ⟳ (주황색, 회전) |
| approved | #F6FFED | #274820 | 승인됨 | ✓ (초록색) |
| rejected | #FFF1F0 | #820000 | 반려됨 | ✕ (빨강색) |
| published | #F6FFED | #274820 | 발행 완료 | ✓✓ (초록색) |

**배지 스펙:**
- 크기: auto (최소 80px)
- padding: 6px 12px
- border-radius: 6px
- font-weight: 600
- font-size: 12px
- 아이콘 크기: 16px
- 아이콘 + 텍스트 gap: 6px
- display: flex, align-items center, justify-content center

### 2.3 액션 버튼 그룹 (Right Side)

**버튼 배치:**

```
┌─────────────────────────────────┐
│ [반려]  [승인 & 발행]            │
└─────────────────────────────────┘
```

**[반려] 버튼:**
- 스타일: 기본 (회색 테두리, 흰 배경)
- 크기: 40px height
- padding: 8px 16px
- 텍스트: "반려"
- 아이콘: 없음 또는 X 아이콘
- 호버: 배경색 #F5F5F5, 테두리 #BFBFBF
- 비활성: opacity 0.5, cursor not-allowed
- 클릭: 반려 모달 표시

**[승인 & 발행] 버튼:**
- 스타일: primary (파란색 배경)
- 크기: 40px height
- padding: 8px 16px
- 배경색: #7B68EE (primary)
- 텍스트색: #FFFFFF
- 텍스트: "승인 & 발행"
- 아이콘: ✓ (체크마크)
- 호버: 배경색 #5945C4 (진해짐)
- 활성: 로딩 스피너 표시, 비활성화
- 비활성: opacity 0.5, cursor not-allowed
- 클릭: 확인 모달 표시

### 2.4 상태별 버튼 활성화

| 상태 | [반려] | [승인 & 발행] |
|------|--------|------------|
| draft | ✓ 활성 | ✓ 활성 |
| review | X 비활성 | X 비활성 |
| approved | X 비활성 | X 비활성 |
| rejected | ✓ 활성 | ✓ 활성 |
| published | X 비활성 | X 비활성 |

---

## 3. 승인 확인 모달 (Approve Dialog)

### 3.1 모달 개요

사용자가 [승인 & 발행] 버튼을 클릭하면, 최종 확인을 위한 모달이 표시됩니다. 이 모달에서 체크리스트를 통해 검수 완료 상태를 확인합니다.

### 3.2 모달 UI 레이아웃

```
┌────────────────────────────────────────┐
│  승인 & 발행 확인                        │  [X 닫기]
├────────────────────────────────────────┤
│                                        │
│  카드뉴스를 발행하시겠습니까?            │
│                                        │
│  다음 항목을 모두 확인했습니까?         │
│                                        │
│  ☐ 모든 카드를 검토했습니다             │
│  ☐ 이미지와 텍스트가 명확합니다         │
│  ☐ 부적절한 내용이 없습니다             │
│                                        │
│  카드 요약정보:                         │
│  ┌──────────────────────────────────┐ │
│  │ • 총 카드 개수: 5개                │ │
│  │ • 최종 수정: 2분 전                │ │
│  │ • 수정 횟수: 12회                  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [취소]  [발행]                        │
│                                        │
└────────────────────────────────────────┘
```

### 3.3 모달 스펙

**모달 전체:**
- 너비: 500px (max-width 90vw)
- 배경: #FFFFFF
- border-radius: 12px
- padding: 32px
- box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15)
- 오버레이: 반투명 검은색 (opacity 0.5)

**제목 (Title):**
- 텍스트: "승인 & 발행 확인"
- font-size: 18px
- font-weight: 600
- color: #2D2D2D
- margin-bottom: 12px

**설명 (Description):**
- 텍스트: "카드뉴스를 발행하시겠습니까?"
- font-size: 16px
- font-weight: 400
- color: #6B7280
- margin-bottom: 20px

**닫기 버튼 (X):**
- 위치: 모달 우상단
- 크기: 24px × 24px
- 투명 배경, 호버 시 배경 #F5F5F5
- cursor: pointer

### 3.4 체크리스트 (Checklist)

**체크리스트 제목:**
- 텍스트: "다음 항목을 모두 확인했습니까?"
- font-size: 14px
- font-weight: 600
- color: #2D2D2D
- margin: 20px 0 12px 0

**체크박스 항목:**

```
각 항목 구조:
┌────────────────────────────────┐
│ ☐  항목 텍스트                  │
│ [로고]                          │
└────────────────────────────────┘
```

**항목 1:** "모든 카드를 검토했습니다"
- checkbox: 기본 unchecked
- 텍스트: 12px, color #2D2D2D
- gap: 8px

**항목 2:** "이미지와 텍스트가 명확합니다"
- checkbox: 기본 unchecked
- 텍스트: 12px, color #2D2D2D
- gap: 8px

**항목 3:** "부적절한 내용이 없습니다"
- checkbox: 기본 unchecked
- 텍스트: 12px, color #2D2D2D
- gap: 8px

**체크박스 스타일:**
- 크기: 18px × 18px
- 테두리: 2px solid #BFBFBF
- border-radius: 4px
- 호버: 테두리 #7B68EE
- 체크됨: 배경 #7B68EE, 아이콘 ✓ (흰색)
- cursor: pointer

**체크리스트 컨테이너:**
- 배경: #F8F7FF (surface)
- padding: 16px
- border-radius: 8px
- margin: 12px 0 20px 0
- border: 1px solid #E5E7EB

### 3.5 카드 요약정보 (Summary Box)

**섹션 제목:**
- "카드 요약정보:"
- font-size: 14px
- font-weight: 600
- color: #2D2D2D
- margin-bottom: 12px

**요약 박스:**
- 배경: #F5F5F5
- padding: 12px 16px
- border-radius: 6px
- border: 1px solid #E5E7EB

**요약 항목:**
- 폰트: 12px, color #6B7280
- margin: 6px 0
- 아이콘: • (bullet point)

```
• 총 카드 개수: 5개
• 최종 수정: 2분 전
• 수정 횟수: 12회
```

### 3.6 모달 하단 버튼

**[취소] 버튼:**
- 스타일: 기본 (회색 테두리)
- 크기: 40px height
- padding: 8px 24px
- 텍스트: "취소"
- 호버: 배경색 #F5F5F5
- 클릭: 모달 닫음, 상태 변경 없음

**[발행] 버튼:**
- 스타일: primary (파란색 배경)
- 크기: 40px height
- padding: 8px 24px
- 배경색: #7B68EE
- 텍스트색: #FFFFFF
- 텍스트: "발행"
- 호버: 배경색 #5945C4
- 활성: 로딩 스피너 표시
- **조건:** 3개 체크박스 모두 체크되어야 활성화
- 클릭: 상태 → "approved", 발행 API 호출

**버튼 배치:**
- 우측 정렬 (flex justify-end)
- gap: 12px
- margin-top: 24px

### 3.7 유효성 검사

**[발행] 버튼 활성화 조건:**
1. 체크박스 3개 모두 체크됨: `all_checked === true`
2. 네트워크 요청 중이 아님: `autoSaveStatus !== 'saving'`

**조건 만족 전:**
- 버튼 비활성화 (opacity 0.6, cursor not-allowed)
- 버튼 호버 시 툴팁: "모든 항목을 확인한 후 발행할 수 있습니다"

**조건 만족 후:**
- 버튼 활성화
- 호버: 배경색 진해짐

---

## 4. 반려 모달 (Reject Dialog)

### 4.1 모달 개요

사용자가 [반려] 버튼을 클릭하면, 반려 사유를 입력받는 모달이 표시됩니다.

### 4.2 모달 UI 레이아웃

```
┌────────────────────────────────────────┐
│  반려                                   │  [X 닫기]
├────────────────────────────────────────┤
│                                        │
│  반려 사유를 입력하세요                 │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ • 헤드라인 텍스트가 너무 길어요    │ │
│  │ • 배경 이미지가 흐릿합니다         │ │
│  │ • 본문에 오타가 있어요             │ │
│  │                                   │ │
│  │ (텍스트 200자 제한)                 │ │
│  │ 문자 수: 45 / 200                  │ │
│  │                                   │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [취소]  [반려]                        │
│                                        │
└────────────────────────────────────────┘
```

### 4.3 모달 스펙

**모달 전체:**
- 너비: 500px (max-width 90vw)
- 배경: #FFFFFF
- border-radius: 12px
- padding: 32px
- box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15)

**제목 (Title):**
- 텍스트: "반려"
- font-size: 18px
- font-weight: 600
- color: #2D2D2D

**설명 (Description):**
- 텍스트: "반려 사유를 입력하세요"
- font-size: 14px
- font-weight: 400
- color: #6B7280
- margin-bottom: 16px

**닫기 버튼 (X):**
- 위치: 모달 우상단
- 크기: 24px × 24px

### 4.4 텍스트 에어리어 (Textarea)

```
┌──────────────────────────────────┐
│ • 헤드라인 텍스트가 너무 길어요    │
│ • 배경 이미지가 흐릿합니다         │
│ • 본문에 오타가 있어요             │
│                                  │
│ (사용자 입력 영역)                  │
│                                  │
│ 문자 수: 45 / 200                 │
│                                  │
└──────────────────────────────────┘
```

**에어리어 스펙:**
- 너비: 100%
- 높이: 150px
- padding: 12px 16px
- border: 1px solid #E5E7EB
- border-radius: 6px
- font-size: 14px
- font-family: Pretendard
- resize: none (사용자 크기 조정 불가)
- 포커스: border 2px solid #7B68EE, box-shadow 0 0 0 3px rgba(123, 104, 238, 0.1)

**공통 사항:**
- placeholder: "반려 사유를 상세히 입력해주세요 (예: 이미지 품질 문제, 텍스트 오류 등)"
- placeholder 색: #9CA3AF

**글자 수 제한:**
- 최대: 200자
- 실시간 카운터: "45 / 200"
- 카운터 위치: 에어리어 하단 우측
- 카운터 색: #6B7280
- 200자 도달 시: 입력 불가, 색 변경 #FF4D4F (빨강)

**포커스 상태:**
- border: 2px solid #7B68EE
- box-shadow: 0 0 0 3px rgba(123, 104, 238, 0.1)

### 4.5 모달 하단 버튼

**[취소] 버튼:**
- 스타일: 기본 (회색 테두리)
- 클릭: 모달 닫음, 입력 내용 폐기

**[반려] 버튼:**
- 스타일: primary (빨강색 배경) - #FF4D4F
- 텍스트: "반려"
- **조건:** 텍스트 1자 이상 입력되어야 활성화
- 호버: 배경색 #FF7875 (밝아짐)
- 클릭: 상태 → "rejected", 반려 사유 저장, Supabase 업데이트

**버튼 배치:**
- 우측 정렬
- gap: 12px
- margin-top: 24px

---

## 5. 상태 전환 및 API 연동

### 5.1 상태 전환 로직

**[승인 & 발행] → [발행] 확인:**

```typescript
// 사용자가 [승인 & 발행] 클릭
→ Approve Dialog 표시 (AWAITING_REVIEW 상태)
→ 체크박스 3개 모두 체크 후 [발행] 클릭
→ cardSpec.meta.status = "approved"
→ Supabase card_specs 테이블 UPDATE (status = 'approved')
→ edit_logs 기록: "Status changed: draft → approved"
→ SUBMITTING 상태 진입 (로딩 스피너)
→ Publisher Agent 알림 API 호출 (async, 블로킹 X)
→ APPROVED 상태 진입
→ 성공 토스트: "카드뉴스가 승인되었습니다!"
→ 캔버스 읽기 전용 처리
→ 헤더 상태 배지 → "approved" (초록색)
```

**[반려] → 반려 사유 입력:**

```typescript
// 사용자가 [반려] 클릭
→ Reject Dialog 표시
→ 반려 사유 입력 (1 ~ 200자)
→ [반려] 버튼 클릭
→ cardSpec.meta.status = "rejected"
→ cardSpec.meta.rejection_reason = "사용자 입력"
→ Supabase card_specs 테이블 UPDATE
→ edit_logs 기록: "Status changed: draft → rejected, reason: ..."
→ REJECTED 상태 진입
→ 반려 토스트: "카드뉴스가 반려되었습니다"
→ 헤더 상태 배지 → "rejected" (주황색)
→ 편집 가능 상태로 복귀
→ 모달 자동 닫음
```

### 5.2 API 호출 스펙

**1. Status Update API (승인 시)**

```typescript
POST /api/card-specs/{spec_id}/approve
Content-Type: application/json

{
  "status": "approved",
  "approved_by": "user_id",
  "approved_at": "2026-03-09T10:30:00Z"
}

Response:
{
  "id": "2026-03-09-001",
  "status": "approved",
  "updated_at": "2026-03-09T10:30:00Z"
}
```

**2. Status Update API (반려 시)**

```typescript
POST /api/card-specs/{spec_id}/reject
Content-Type: application/json

{
  "status": "rejected",
  "rejection_reason": "헤드라인 텍스트가 너무 길어요",
  "rejected_by": "user_id",
  "rejected_at": "2026-03-09T10:31:00Z"
}

Response:
{
  "id": "2026-03-09-001",
  "status": "rejected",
  "rejection_reason": "...",
  "updated_at": "2026-03-09T10:31:00Z"
}
```

**3. Publisher Agent 알림 API (비동기, 승인 후)**

```typescript
POST /api/agents/publisher/notify
Content-Type: application/json

{
  "spec_id": "2026-03-09-001",
  "topic": "마음의 건강과 일상의 스트레스",
  "card_count": 5,
  "platforms": ["instagram", "threads"]
}

// 응답 불필요 (fire-and-forget)
// 에러 발생 시 로그만 기록, 사용자 UI 영향 없음
```

### 5.3 에러 처리

**상태 업데이트 실패:**

```
1. API 호출 실패 (네트워크 에러, 타임아웃 등)
   → 에러 토스트 표시
   → "상태 변경 실패. 인터넷 연결을 확인하세요."
   → 모달 유지, [재시도] 버튼 표시
   → 상태 변경 없음 (이전 상태 유지)

2. Supabase 유효성 검사 실패
   → 에러 토스트: "요청이 유효하지 않습니다"
   → 모달 닫음, 이전 상태 유지

3. Publisher Agent 알림 실패 (승인 후)
   → 사용자 UI에 영향 없음 (백그라운드 에러로 로깅만)
   → 상태는 이미 "approved"로 변경됨
```

---

## 6. 토스트 알림 (Toast Notifications)

### 6.1 승인 성공 토스트

```
┌────────────────────────────┐
│ ✓ 카드뉴스가 승인되었습니다! │
└────────────────────────────┘
```

**스펙:**
- 위치: 하단 중앙
- 배경색: #F6FFED (성공)
- 텍스트색: #274820 (진한 초록)
- 아이콘: ✓ (초록색, 16px)
- 지속시간: 3초 자동 닫음
- padding: 12px 16px
- border-radius: 8px

### 6.2 반려 성공 토스트

```
┌────────────────────────────┐
│ ⚠ 카드뉴스가 반려되었습니다  │
└────────────────────────────┘
```

**스펙:**
- 위치: 하단 중앙
- 배경색: #FFF7E6 (경고)
- 텍스트색: #92400E (주황)
- 아이콘: ⚠ (주황색, 16px)
- 지속시간: 3초 자동 닫음

### 6.3 에러 토스트

```
┌──────────────────────────────────────┐
│ ✕ 상태 변경 실패. 인터넷 연결을 확인하세요. [재시도] │
└──────────────────────────────────────┘
```

**스펙:**
- 위치: 하단 중앙
- 배경색: #FFF1F0 (에러)
- 텍스트색: #820000 (빨강)
- 아이콘: ✕ (빨강색, 16px)
- 지속시간: 5초 또는 [×] 클릭 시 닫음
- [재시도] 버튼: 같은 동작 반복

---

## 7. 전환 애니메이션 (Animations)

### 7.1 모달 나타나기

```css
@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal {
  animation: modalFadeIn 0.3s ease-out;
}
```

### 7.2 모달 사라지기

```css
@keyframes modalFadeOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}

.modal.closing {
  animation: modalFadeOut 0.2s ease-in;
}
```

### 7.3 로딩 스피너

```css
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 1s linear infinite;
  width: 16px;
  height: 16px;
  border: 2px solid #7B68EE;
  border-top: 2px solid transparent;
  border-radius: 50%;
}
```

### 7.4 상태 배지 업데이트

```css
@keyframes badgeUpdate {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.status-badge.updating {
  animation: badgeUpdate 0.4s ease-out;
}
```

### 7.5 토스트 페이드인

```css
@keyframes toastFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.toast {
  animation: toastFadeIn 0.3s ease-out;
}
```

### 7.6 prefers-reduced-motion 지원

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. 접근성 (Accessibility)

### 8.1 WCAG 2.1 AA 준수

**키보드 네비게이션:**
- Tab: 요소 간 순환 (버튼 → 체크박스 → 텍스트 에어리어)
- Enter: 버튼 활성화, 모달 [발행]/[반려] 확인
- Escape: 모달 닫기
- Space: 체크박스 토글

**포커스 관리:**
- 모든 버튼, 체크박스: focus-visible 2px #7B68EE 테두리
- 모달 열림 시 첫 포커스: 체크박스 또는 텍스트 에어리어
- 모달 닫힘 시 포커스: 이전 버튼으로 복귀

**ARIA 레이블:**
- 상태 배지: `aria-label="상태: 초안"`
- [승인 & 발행] 버튼: `aria-label="카드뉴스를 승인하고 발행합니다"`
- [반려] 버튼: `aria-label="카드뉴스를 반려합니다"`
- 체크박스: `aria-label="모든 카드를 검토했습니다"`, `aria-checked="true|false"`
- 텍스트 에어리어: `aria-label="반려 사유 입력"`, `aria-describedby="char-count"`
- 모달: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-title"`
- 글자 수 카운터: `id="char-count"`, `aria-live="polite"`

**색상 대비:**
- 텍스트 vs 배경: 4.5:1 (일반 텍스트)
- 상태 배지 아이콘: 3:1 이상

**스크린 리더 지원:**
- 상태 변경: `aria-live="polite"` + 상태 메시지
  - "카드뉴스가 승인됨 상태로 변경되었습니다"
  - "카드뉴스가 반려됨 상태로 변경되었습니다"
- 체크박스 변경: "모든 카드를 검토했습니다. 체크됨"

---

## 9. 엣지 케이스 및 에러 처리

### 9.1 이미 승인된 카드를 다시 승인 시도

**시나리오:**
- 상태가 이미 "approved"인데 새로고침으로 인해 버튼이 활성화됨

**대응:**
- API 응답: 409 Conflict
- 에러 토스트: "이미 승인된 카드뉴스입니다"
- 상태 배지: "approved"로 유지
- 모달 자동 닫음

### 9.2 네트워크 타임아웃 (승인 중)

**시나리오:**
- [발행] 버튼 클릭 후 10초 이상 응답 없음

**대응:**
1. 로딩 스피너 표시 (최대 10초)
2. 10초 후 에러 토스트: "요청 시간 초과. 다시 시도하세요."
3. 모달 유지, [취소]/[재시도] 버튼 활성화
4. 상태 변경 없음 (여전히 "draft")

### 9.3 중복 클릭 방지

**시나리오:**
- 사용자가 [발행] 버튼 빠르게 2회 클릭

**대응:**
1. 첫 클릭: SUBMITTING 상태, 로딩 스피너
2. 두 번째 클릭: 무시됨 (button disabled)
3. 결과: API 1회 호출만 수행

### 9.4 반려 사유 빈 입력

**시나리오:**
- [반려] 모달에서 텍스트 미입력 후 [반려] 클릭 시도

**대응:**
- 버튼 비활성화 (disabled)
- 포커스 인디케이터: 텍스트 에어리어에 초점
- 안내 메시지: "반려 사유를 입력하세요"

### 9.5 텍스트 에어리어 200자 초과 입력

**시나리오:**
- 사용자가 paste를 통해 200자 초과 텍스트 입력 시도

**대응:**
1. 200자까지만 허용 (초과분 자동 제거)
2. 글자 수 카운터: "200 / 200" (빨강색)
3. 추가 입력 불가 (input event 무시)

### 9.6 모달 열린 상태에서 카드 선택 변경

**시나리오:**
- 승인 모달이 열려있는데 좌측 카드 리스트에서 다른 카드 선택

**대응:**
- 모달 자동 닫음 (경고 없음)
- 토스트: "카드 선택이 변경되었습니다"
- 새 카드 정보로 UI 업데이트

---

## 10. 키보드 단축키 (Keyboard Shortcuts)

### 10.1 전역 단축키

| 단축키 | 동작 | 상태 |
|--------|------|------|
| Ctrl+Shift+A (또는 Cmd+Shift+A) | [승인 & 발행] 클릭 | draft 상태 |
| Ctrl+Shift+R (또는 Cmd+Shift+R) | [반려] 모달 열기 | draft 상태 |

### 10.2 모달 단축키

**승인 확인 모달:**
- Escape: 모달 닫기 ([취소]와 동일)
- Enter: [발행] 버튼 클릭 (체크박스 3개 모두 체크 시)

**반려 모달:**
- Escape: 모달 닫기 ([취소]와 동일)
- Ctrl+Enter: [반려] 버튼 클릭 (텍스트 입력 후)

### 10.3 구현 예시

```typescript
// Ctrl+Shift+A for Approve
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      e.shiftKey &&
      e.key === 'A'
    ) {
      e.preventDefault();
      if (cardSpec?.meta.status === 'draft') {
        openApproveDialog();
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [cardSpec]);
```

---

## 11. 상태 다이어그램 (Detailed State Machine)

### 11.1 상태 정의

```typescript
type ApprovalStatus =
  | 'draft'
  | 'awaiting_review'
  | 'submitting'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'error';

type DialogState =
  | 'closed'
  | 'approve_dialog'
  | 'reject_dialog'
  | 'loading';
```

### 11.2 상태 전환 테이블

| 현재 상태 | 트리거 | 다음 상태 | 액션 |
|-----------|--------|----------|------|
| draft | [승인 & 발행] 클릭 | awaiting_review | Approve Dialog 표시 |
| awaiting_review | [체크박스 체크] | - | 버튼 활성화 |
| awaiting_review | [발행] 클릭 | submitting | 로딩 스피너, API 호출 |
| submitting | API 성공 | approved | 토스트, 읽기 전용 |
| submitting | API 실패 | error | 에러 토스트 |
| error | [재시도] | submitting | API 재호출 |
| draft | [반려] 클릭 | - | Reject Dialog 표시 |
| - | 반려 모달에서 [반려] | rejected | 반려 사유 저장, 토스트 |
| rejected | 재편집 후 [승인] | awaiting_review | Approve Dialog 표시 |
| approved | N/A | published | Publisher Agent 완료 |

---

## 12. 컴포넌트 계층 구조 (Component Hierarchy)

```
CanvasEditor
├── Header
│   ├── Title
│   ├── StatusBadge
│   │   ├── Icon (status별로 다름)
│   │   └── Text
│   └── ActionButtons
│       ├── RejectButton
│       │   └── onClick: openRejectDialog()
│       └── ApproveButton
│           └── onClick: openApproveDialog()
│
├── ApproveDialog (Modal)
│   ├── Title
│   ├── Description
│   ├── Checklist
│   │   ├── CheckItem (검토 완료)
│   │   ├── CheckItem (이미지 명확)
│   │   └── CheckItem (부적절 내용 없음)
│   ├── SummaryBox
│   │   ├── CardCount
│   │   ├── LastModified
│   │   └── EditCount
│   └── FooterButtons
│       ├── CancelButton
│       └── ApproveButton (조건부 활성)
│
├── RejectDialog (Modal)
│   ├── Title
│   ├── Description
│   ├── Textarea
│   │   └── CharCounter (x / 200)
│   └── FooterButtons
│       ├── CancelButton
│       └── RejectButton (조건부 활성)
│
└── ToastContainer
    └── Toast (status별 색상)
        ├── Icon
        └── Message
```

---

## 13. Publisher Agent 알림 스펙

### 13.1 알림 목적

승인 완료 후 자동으로 Publisher Agent (AGENT 8~10)에 알림을 보내 SNS 발행 프로세스를 시작합니다.

### 13.2 알림 페이로드

```json
{
  "event": "card_approved",
  "spec_id": "2026-03-09-001",
  "timestamp": "2026-03-09T10:30:00Z",
  "topic": "마음의 건강과 일상의 스트레스",
  "card_count": 5,
  "platforms": ["instagram", "threads"],
  "sns_config": {
    "instagram": {
      "caption": "카드뉴스 설명...",
      "hashtags": ["#멘탈헬스", "#스트레스"]
    },
    "threads": {
      "text": "카드뉴스 스레드..."
    }
  },
  "approved_by": "user_id",
  "approved_at": "2026-03-09T10:30:00Z"
}
```

### 13.3 알림 전송 방식

**비동기 Fire-and-Forget:**
- 사용자 UI 블로킹 없음
- 응답 대기 안 함
- 에러 발생 시 로그만 기록
- 타임아웃: 30초

**재시도 정책:**
- 최대 3회 자동 재시도
- 백오프: 1s, 3s, 5s

---

## 14. 데이터 스키마 업데이트

### 14.1 Supabase card_specs 테이블 확장

```sql
-- 기존 테이블에 새 컬럼 추가
ALTER TABLE card_specs
ADD COLUMN rejection_reason TEXT,
ADD COLUMN approved_by TEXT,
ADD COLUMN approved_at TIMESTAMPTZ,
ADD COLUMN rejected_by TEXT,
ADD COLUMN rejected_at TIMESTAMPTZ;

-- Constraints
ALTER TABLE card_specs
ADD CONSTRAINT check_approval_fields
CHECK (
  CASE
    WHEN status = 'approved' THEN approved_by IS NOT NULL AND approved_at IS NOT NULL
    WHEN status = 'rejected' THEN rejected_by IS NOT NULL AND rejected_at IS NOT NULL AND rejection_reason IS NOT NULL
    ELSE TRUE
  END
);
```

### 14.2 edit_logs 확장

```sql
-- edit_logs 테이블에 메타데이터 추가
ALTER TABLE edit_logs
ADD COLUMN event_type TEXT CHECK (event_type IN ('field_edit', 'status_change', 'approval', 'rejection')),
ADD COLUMN metadata JSONB;

-- 상태 변경 기록 예
INSERT INTO edit_logs (spec_id, editor, field_path, old_value, new_value, event_type, metadata)
VALUES (
  '2026-03-09-001',
  'user_123',
  'meta.status',
  'draft',
  'approved',
  'status_change',
  '{"approved_at": "2026-03-09T10:30:00Z", "checklist": {"all_reviewed": true, "image_clear": true, "no_inappropriate": true}}'::jsonb
);
```

---

## 15. 개발 체크리스트

- [ ] ApprovalFlow.tsx 컴포넌트 생성
- [ ] StatusBadge.tsx 컴포넌트 구현 (상태별 색상)
- [ ] ApproveDialog.tsx 구현 (체크리스트 + 요약)
- [ ] RejectDialog.tsx 구현 (텍스트 에어리어 + 글자 수 제한)
- [ ] 승인 API 엔드포인트 구현 (/api/card-specs/{id}/approve)
- [ ] 반려 API 엔드포인트 구현 (/api/card-specs/{id}/reject)
- [ ] Publisher Agent 알림 API 구현
- [ ] Zustand store setStatus() 액션 연동
- [ ] edit_logs 기록 (승인/반려 이벤트)
- [ ] 토스트 알림 통합 (Sonner)
- [ ] 키보드 단축키 구현 (Ctrl+Shift+A, Ctrl+Shift+R)
- [ ] 접근성 테스트 (포커스, ARIA, 키보드)
- [ ] 애니메이션 구현 (모달, 배지, 토스트)
- [ ] 에러 처리 (네트워크, 타임아웃, 중복 클릭)
- [ ] 리스펀시브 테스트 (모달 모바일 레이아웃)

---

## 16. 참고 링크

- **Canvas Editor UX Flow:** `/product_team/design_specs/canvas_editor_ux_flow.md`
- **Zustand Store:** `/canvas_editor/stores/useCardStore.ts`
- **PRD:** `/product_team/prds/canvas_editor_mvp.md`
- **Design Tokens:** `/product_team/design_system/tokens.yaml`
- **shadcn/ui Dialog:** https://ui.shadcn.com/docs/components/dialog
- **shadcn/ui Checkbox:** https://ui.shadcn.com/docs/components/checkbox
- **Sonner Toast:** https://sonner.emilkowal.ski/

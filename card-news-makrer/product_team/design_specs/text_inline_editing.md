# T-D04: 텍스트 인라인 편집 인터랙션 명세

_작성자: 제품 디자인 에이전트 (AGENT 0-D) | 작성일: 2026-03-09_

---

## 개요

텍스트 인라인 편집은 사용자가 캔버스 위의 텍스트를 클릭하여 직접 수정할 수 있도록 합니다. Fabric.js의 IText 기능을 활용하여 캔버스 내에서 원본 텍스트를 편집하고, 실시간으로 글자 수를 표시합니다.

---

## 인터랙션 플로우

```
사용자 캔버스 접근
        │
        ▼
    [텍스트 클릭]
        │
        ├─► [1회 클릭] DEFAULT 상태
        │       │
        │       ▼
        │   텍스트 선택 (하이라이트)
        │   글자 수 카운터 표시 시작
        │   캐릭터 카운터: "12 / 15" (예시)
        │
        └─► [2회 클릭 또는 더블클릭] EDITING 상태
                │
                ▼
            텍스트 편집 모드 진입
            커서 표시 (깜빡이는 라인)
            키보드 입력 활성화
                │
                ├─► [키 입력]
                │    │
                │    ▼
                │   실시간 텍스트 업데이트
                │   글자 수 카운터 실시간 업데이트
                │   제한 도달 시 경고 색상 표시
                │
                ├─► [Enter 또는 Tab]
                │    │
                │    ▼
                │   편집 완료 (아래 참조)
                │
                └─► [Escape]
                     │
                     ▼
                    편집 취소 (원본 텍스트 복구)
                    SELECTED 상태로 복귀

    [클릭 아웃] 또는 [다른 텍스트 클릭]
        │
        ▼
    편집 완료
        │
        ├─► 텍스트 검증 및 저장
        │
        ├─► 글자 수 카운터 숨김
        │
        ├─► Zustand store 업데이트
        │
        ├─► 자동저장 트리거 (1초 디바운스)
        │
        └─► DEFAULT 상태로 복귀
```

---

## 상태 정의

### 1. DEFAULT (기본 상태)

텍스트 요소가 선택되지 않은 상태.

**시각적 표현:**
- 텍스트 색상: 원본 색상 유지 (#FFFFFF 또는 #2D2D2D)
- 테두리: 없음
- 커서: 기본 포인터
- 카운터: 표시 안 함

**CSS/Fabric.js:**
```css
.text-default {
  opacity: 1;
  outline: none;
}
```

---

### 2. HOVER (호버 상태)

마우스가 텍스트 위에 있을 때.

**시각적 표현:**
- 배경 박스: 반투명 오버레이 (rgba(123, 104, 238, 0.1))
- 테두리: 1px solid #7B68EE (primary)
- 커서: text
- 토폴로지: 텍스트 영역을 감싼 박스 표시

**CSS:**
```css
.text-hover {
  background: rgba(123, 104, 238, 0.08);
  border: 1px solid #7B68EE;
  border-radius: 4px;
  padding: 4px 8px;
  outline: 2px solid transparent;
  outline-offset: -2px;
}
```

**Fabric.js:**
```typescript
textObject.on('mouseover', function() {
  this.set({
    stroke: '#7B68EE',
    strokeWidth: 1,
  });
  canvas.renderAll();
});

textObject.on('mouseout', function() {
  this.set({
    stroke: null,
    strokeWidth: 0,
  });
  canvas.renderAll();
});
```

---

### 3. SELECTED (선택 상태)

텍스트가 1회 클릭으로 선택된 상태.

**시각적 표현:**
- 배경 박스: 선명한 오버레이 (rgba(123, 104, 238, 0.15))
- 테두리: 2px solid #7B68EE (primary)
- 숨겨진 선택 핸들: Fabric.js 선택 박스 (모서리 점 표시)
- 글자 수 카운터: 상단 우측에 표시 시작 (예: "12 / 15")
- 커서: text

**CSS:**
```css
.text-selected {
  background: rgba(123, 104, 238, 0.15);
  border: 2px solid #7B68EE;
  border-radius: 4px;
  padding: 6px 8px;
  box-shadow: 0 0 0 4px rgba(123, 104, 238, 0.1);
}
```

**Fabric.js:**
```typescript
textObject.set({
  stroke: '#7B68EE',
  strokeWidth: 2,
  strokeDasharray: null,
});

// 선택 핸들 표시
textObject.selectable = true;
textObject.evented = true;

canvas.setActiveObject(textObject);
canvas.renderAll();
```

---

### 4. EDITING (편집 상태)

더블클릭 또는 Enter로 편집 모드에 진입한 상태.

**시각적 표현:**
- 배경 박스: 밝은 배경 (흰색 #FFFFFF)
- 테두리: 2px solid #7B68EE (primary)
- 텍스트 커서: 깜빡이는 라인 (검은색 #2D2D2D, 1px)
- 글자 수 카운터: 실시간 업데이트 표시
- 키보드 입력: 활성화
- 제어 버튼: 없음 (keyboard navigation만 사용)

**CSS (Fabric.js IText):**
```css
.text-editing {
  background: #FFFFFF;
  border: 2px solid #7B68EE;
  border-radius: 4px;
  padding: 6px 8px;
}

/* 커서 깜빡임 */
@keyframes cursor-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.text-cursor {
  animation: cursor-blink 1s infinite;
  background: #2D2D2D;
  width: 1px;
  height: 1em;
}
```

**Fabric.js IText:**
```typescript
const itext = new fabric.IText(text, {
  left: 80,
  top: 310,
  width: 450,
  fontSize: 28,
  fontFamily: 'Pretendard',
  fontWeight: 400,
  fill: '#2D2D2D',
  selectable: true,
  evented: true,
  editable: true,
  borderColor: '#7B68EE',
  borderDashArray: null,
  stroke: '#7B68EE',
  strokeWidth: 2,
  cursorColor: '#2D2D2D',
  cursorWidth: 1,
});

canvas.add(itext);
itext.enterEditing();  // 편집 모드 진입
canvas.renderAll();
```

---

### 5. INVALID (유효성 실패 상태)

텍스트 길이 초과 또는 유효성 검증 실패 상태.

**시각적 표현:**
- 배경 박스: 연한 빨강 (rgba(255, 77, 79, 0.1))
- 테두리: 2px solid #FF4D4F (error)
- 글자 수 카운터: 빨간색 배경 (#FF4D4F), 흰색 텍스트
- 경고 메시지: "15자를 초과했습니다" (아래쪽)

**CSS:**
```css
.text-invalid {
  background: rgba(255, 77, 79, 0.1);
  border: 2px solid #FF4D4F;
  border-radius: 4px;
  padding: 6px 8px;
}

.char-counter-invalid {
  background: #FF4D4F;
  color: #FFFFFF;
  border-radius: 4px;
  padding: 4px 8px;
  font-weight: 600;
}

.error-message {
  color: #FF4D4F;
  font-size: 12px;
  margin-top: 4px;
}
```

---

## 글자 수 카운터

### 위치 및 스타일

**위치:** 선택된 텍스트 상단 우측

```
┌─────────────────────────────────────┐
│ headline 텍스트                 [12/15] │  ← 카운터 위치
│ 1줄 텍스트                           │
│                                     │
└─────────────────────────────────────┘
```

**HTML:**
```html
<div class="char-counter">
  <span class="current-count">12</span>
  <span class="separator">/</span>
  <span class="max-count">15</span>
</div>
```

**CSS:**
```css
.char-counter {
  position: absolute;
  top: -28px;                        /* 텍스트 박스 상단 위에 표시 */
  right: 0;
  background: #F8F7FF;               /* surface */
  border: 1px solid #E5E7EB;         /* border */
  border-radius: 4px;
  padding: 4px 8px;
  display: flex;
  gap: 4px;
  font-family: 'Pretendard';
  font-size: 12px;
  font-weight: 500;
  color: #6B7280;                    /* text_secondary */
  white-space: nowrap;
  pointer-events: none;              /* 상호작용 불가 */
  z-index: 1000;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); /* shadow[small] */
  transition: all 0.2s ease;
}

.char-counter.warning {
  background: #FFFBE6;               /* 경고 배경 (연한 노랑) */
  border-color: #FAAD14;             /* warning */
  color: #FAAD14;
  font-weight: 600;
}

.char-counter.error {
  background: #FFF1F0;               /* 에러 배경 (연한 빨강) */
  border-color: #FF4D4F;             /* error */
  color: #FF4D4F;
  font-weight: 600;
}

.current-count {
  font-weight: 600;
  color: inherit;
}

.separator {
  opacity: 0.6;
}

.max-count {
  font-weight: 400;
  opacity: 0.8;
}
```

### 상태별 카운터 표시

| 상태 | 현재/최대 | 배경색 | 텍스트색 | 설명 |
|------|---------|--------|---------|------|
| 정상 | 12 / 15 | #F8F7FF | #6B7280 | 50% 미만 |
| 경고 | 14 / 15 | #FFFBE6 | #FAAD14 | 90% 이상 |
| 에러 | 16 / 15 | #FFF1F0 | #FF4D4F | 초과 |

**구현:**
```typescript
function updateCharCounter(
  currentLength: number,
  maxLength: number
): 'normal' | 'warning' | 'error' {
  const percentage = (currentLength / maxLength) * 100;

  if (currentLength > maxLength) {
    return 'error';
  } else if (percentage >= 90) {
    return 'warning';
  } else {
    return 'normal';
  }
}
```

---

## 글자 수 제한

각 텍스트 필드별 최대 글자 수:

| 필드 | 최대 글자 수 | 예시 | 설명 |
|------|-----------|------|------|
| headline | 15자 | "일상 속 스트레스" | 제목 필드 |
| body | 50자 | "우리 모두 경험하는 스트레스를 어떻게 관리할까요?" | 본문 필드 |
| sub_text | 30자 | "공감하고 해결책을 찾아봅시다" | 부제 필드 |

**유효성 검사 로직:**

```typescript
interface TextFieldConfig {
  name: 'headline' | 'body' | 'sub_text';
  maxLength: number;
  placeholder?: string;
}

const fieldConfigs: Record<string, TextFieldConfig> = {
  headline: { name: 'headline', maxLength: 15, placeholder: 'headline을 입력하세요' },
  body: { name: 'body', maxLength: 50, placeholder: 'body 텍스트를 입력하세요' },
  sub_text: { name: 'sub_text', maxLength: 30, placeholder: 'sub_text를 입력하세요' },
};

function validateText(text: string, maxLength: number): {
  isValid: boolean;
  errorMessage?: string;
} {
  if (text.length > maxLength) {
    return {
      isValid: false,
      errorMessage: `${maxLength}자를 초과했습니다 (현재: ${text.length}자)`,
    };
  }
  return { isValid: true };
}
```

---

## 키보드 단축키

### 텍스트 편집 중 (EDITING 상태)

| 단축키 | 동작 | 설명 |
|--------|------|------|
| **Enter** | 편집 완료 + 저장 | 텍스트 확정 |
| **Escape** | 편집 취소 | 원본 텍스트로 복구 |
| **Tab** | 다음 텍스트 요소로 이동 | 다음 텍스트 포커스 |
| **Shift+Tab** | 이전 텍스트 요소로 이동 | 이전 텍스트 포커스 |
| **Ctrl+A / Cmd+A** | 전체 선택 | 텍스트 전체 선택 |
| **Ctrl+Z / Cmd+Z** | 실행 취소 | (Out of Scope - 미구현) |
| **Ctrl+C / Cmd+C** | 복사 | 기본 브라우저 기능 |
| **Ctrl+V / Cmd+V** | 붙여넣기 | 기본 브라우저 기능 |
| **Ctrl+X / Cmd+X** | 잘라내기 | 기본 브라우저 기능 |

**구현:**

```typescript
function setupKeyboardHandlers(
  itext: fabric.IText,
  onSave: () => void,
  onCancel: () => void,
  onNextField: () => void,
  onPrevField: () => void
) {
  itext.on('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevField();
      } else {
        onNextField();
      }
    }
  });
}
```

---

## 클릭 동작 상세

### 1회 클릭 (선택)

```typescript
textObject.on('mousedown', (e: Event) => {
  // 이미 선택되어 있지 않으면 선택
  if (canvas.getActiveObject() !== textObject) {
    canvas.setActiveObject(textObject);
    canvas.renderAll();

    // 글자 수 카운터 표시
    updateCharCounter(textObject.text?.length || 0, maxLength);
  }
});
```

**상태 변화:**
- DEFAULT → SELECTED
- 글자 수 카운터 표시 시작

### 2회 클릭 (더블클릭)

```typescript
let lastClickTime = 0;
textObject.on('mousedown', (e: Event) => {
  const currentTime = new Date().getTime();
  const timeDiff = currentTime - lastClickTime;

  if (timeDiff < 300) {
    // 더블클릭 감지
    if (textObject instanceof fabric.IText) {
      textObject.enterEditing();
      canvas.renderAll();
    }
  }

  lastClickTime = currentTime;
});

// 또는 Fabric.js의 double:tap 이벤트 사용
textObject.on('double:tap', () => {
  if (textObject instanceof fabric.IText) {
    textObject.enterEditing();
    canvas.renderAll();
  }
});
```

**상태 변화:**
- SELECTED → EDITING
- 커서 표시
- 키보드 입력 활성화

### 외부 클릭 (편집 완료)

```typescript
canvas.on('mouse:down', (options: fabric.IEvent<MouseEvent>) => {
  // 선택된 오브젝트가 IText이고 편집 중인 경우
  const activeObject = canvas.getActiveObject();
  if (
    activeObject &&
    activeObject instanceof fabric.IText &&
    activeObject.isEditing
  ) {
    // 클릭한 오브젝트가 현재 편집 중인 텍스트가 아닌 경우
    if (options.target !== activeObject) {
      activeObject.exitEditing();

      // 텍스트 검증 및 저장
      validateAndSave(activeObject);

      // 글자 수 카운터 숨김
      hideCharCounter();

      canvas.renderAll();
    }
  }
});
```

**상태 변화:**
- EDITING → SELECTED (다른 텍스트 선택) 또는 DEFAULT (외부 클릭)

---

## 실시간 업데이트

### 텍스트 입력 시 동작

```typescript
itext.on('text:changed', () => {
  const currentLength = itext.text?.length || 0;

  // 1. 글자 수 카운터 업데이트
  updateCharCounter(currentLength, maxLength);

  // 2. 유효성 검사
  const validation = validateText(itext.text || '', maxLength);
  if (!validation.isValid) {
    itext.set({ stroke: '#FF4D4F' });
    showErrorMessage(validation.errorMessage);
  } else {
    itext.set({ stroke: '#7B68EE' });
    hideErrorMessage();
  }

  // 3. 캔버스 렌더링
  canvas.renderAll();

  // 4. 부모 상태 업데이트 (Zustand)
  updateCardStore({
    cards: [
      ...cards.slice(0, selectedIndex),
      {
        ...cards[selectedIndex],
        text: {
          ...cards[selectedIndex].text,
          [fieldName]: itext.text,
        },
      },
      ...cards.slice(selectedIndex + 1),
    ],
  });
});
```

---

## 저장 및 취소

### 저장 (Enter 또는 외부 클릭)

```typescript
async function saveEdit(itext: fabric.IText) {
  // 1. 유효성 검사
  const validation = validateText(itext.text || '', maxLength);
  if (!validation.isValid) {
    console.error(validation.errorMessage);
    return;
  }

  // 2. 상태 업데이트
  itext.exitEditing();

  // 3. 자동저장 트리거 (디바운스 1초)
  triggerAutoSave();

  // 4. edit_logs에 기록
  logEdit({
    field_path: `cards[${selectedIndex}].text.${fieldName}`,
    old_value: originalText,
    new_value: itext.text,
  });

  // 5. 토스트 메시지
  showToast('텍스트가 저장되었습니다', 'success');

  // 6. 캔버스 렌더링
  canvas.renderAll();
}
```

### 취소 (Escape)

```typescript
function cancelEdit(itext: fabric.IText, originalText: string) {
  // 1. 텍스트 복구
  itext.set({ text: originalText });

  // 2. 편집 모드 종료
  itext.exitEditing();

  // 3. Zustand 상태 복구 (변경 사항 무시)
  restorePreviousState();

  // 4. 토스트 메시지
  showToast('편집이 취소되었습니다', 'info');

  // 5. 캔버스 렌더링
  canvas.renderAll();
}
```

---

## 여러 텍스트 요소 간 네비게이션

Tab 키로 다음 텍스트 요소로 이동:

```typescript
const textOrder = ['headline', 'body', 'sub_text'];  // 탭 순서

function navigateToNextField(currentField: string) {
  const currentIndex = textOrder.indexOf(currentField);
  const nextIndex = (currentIndex + 1) % textOrder.length;
  const nextFieldName = textOrder[nextIndex];

  // 현재 필드 저장
  const currentIText = getTextObjectByName(currentField);
  if (currentIText?.isEditing) {
    saveEdit(currentIText);
  }

  // 다음 필드로 이동
  const nextIText = getTextObjectByName(nextFieldName);
  if (nextIText instanceof fabric.IText) {
    canvas.setActiveObject(nextIText);
    nextIText.enterEditing();
    canvas.renderAll();
  }
}

function navigateToPrevField(currentField: string) {
  const currentIndex = textOrder.indexOf(currentField);
  const prevIndex = (currentIndex - 1 + textOrder.length) % textOrder.length;
  const prevFieldName = textOrder[prevIndex];

  // 현재 필드 저장
  const currentIText = getTextObjectByName(currentField);
  if (currentIText?.isEditing) {
    saveEdit(currentIText);
  }

  // 이전 필드로 이동
  const prevIText = getTextObjectByName(prevFieldName);
  if (prevIText instanceof fabric.IText) {
    canvas.setActiveObject(prevIText);
    prevIText.enterEditing();
    canvas.renderAll();
  }
}
```

---

## 선택 상태 UI 컴포넌트

### 텍스트 편집 패널 (우측)

텍스트가 선택된 경우, 우측 StylePanel에 "텍스트 편집" 섹션 표시:

```html
<div class="text-editor-panel" v-if="selectedText">
  <h4>텍스트 편집</h4>

  <div class="form-group">
    <label for="text-input">헤드라인 텍스트</label>
    <input
      id="text-input"
      type="text"
      v-model="selectedText.text"
      maxlength="15"
      @change="saveEdit"
      @keydown.enter="saveEdit"
      @keydown.escape="cancelEdit"
    />
    <div class="char-counter">
      <span class="current">{{ selectedText.text.length }}</span>
      <span>/</span>
      <span class="max">15</span>
    </div>
  </div>

  <div class="text-properties">
    <label>글자 크기</label>
    <input
      type="range"
      min="16"
      max="72"
      v-model.number="selectedText.fontSize"
      @change="updateTextStyle"
    />

    <label>글자 색상</label>
    <input
      type="color"
      v-model="selectedText.color"
      @change="updateTextStyle"
    />
  </div>

  <div class="button-group">
    <button @click="resetEdit" class="secondary">초기화</button>
    <button @click="saveEdit" class="primary">저장</button>
  </div>
</div>
```

---

## 접근성 고려사항

### 스크린 리더 지원

```html
<div
  class="text-item"
  role="region"
  aria-live="polite"
  aria-label="카드 제목 텍스트"
>
  <span class="text-content">{{ headline }}</span>
  <span class="char-counter" aria-label="글자 수: 12 / 15">
    12 / 15
  </span>
</div>

<!-- 편집 모드 -->
<textarea
  role="textbox"
  aria-label="카드 제목 편집"
  aria-describedby="char-counter"
  aria-invalid={!isValid}
  aria-errormessage={errorId}
>
  {{ headline }}
</textarea>
```

### 포커스 관리

```typescript
// 편집 시작 시 포커스 설정
itext.enterEditing();
canvas._textareaElement?.focus();  // IText 내부 textarea에 포커스

// 편집 완료 시 포커스 복귀
itext.exitEditing();
canvas.defaultCursor = 'default';
```

---

## 모바일 고려사항

모바일 디바이스에서의 텍스트 편집:

```typescript
// 터치 이벤트 처리
canvas.on('touch:gesture', (e) => {
  if (e.touches.length === 1) {
    // 싱글 터치 = 클릭
    const target = e.target;
    if (target instanceof fabric.IText) {
      canvas.setActiveObject(target);
      canvas.renderAll();
    }
  } else if (e.touches.length === 2) {
    // 더블 터치 = 더블클릭 (편집 시작)
    const target = e.target;
    if (target instanceof fabric.IText) {
      target.enterEditing();
      canvas.renderAll();
    }
  }
});

// 소프트 키보드 자동 열기
function showKeyboard(itext: fabric.IText) {
  const textarea = canvas._textareaElement;
  if (textarea) {
    textarea.focus();
    textarea.click();
  }
}
```

---

## 성능 최적화

### 렌더링 디바운싱

텍스트 변경 시마다 렌더링하지 않고 디바운스 적용:

```typescript
const debouncedRender = debounce(() => {
  canvas.renderAll();
}, 100);  // 100ms

itext.on('text:changed', () => {
  updateCharCounter(itext.text?.length || 0, maxLength);
  debouncedRender();
});
```

### 자동저장 디바운싱

편집 완료 후 1초 대기 후 저장:

```typescript
let autoSaveTimer: NodeJS.Timeout | null = null;

function triggerAutoSave() {
  // 이전 타이머 취소
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  // 새 타이머 설정 (1초)
  autoSaveTimer = setTimeout(() => {
    saveToSupabase();
  }, 1000);
}
```

---

## 에러 처리

### 유효성 검사 에러

```typescript
try {
  const validation = validateText(text, maxLength);
  if (!validation.isValid) {
    throw new Error(validation.errorMessage);
  }

  // 저장 로직
  await saveEdit(itext);
} catch (error) {
  showErrorMessage(error.message);
  // 에러 상태 유지, 사용자가 수정할 때까지 대기
}
```

### 네트워크 에러

```typescript
async function saveToSupabase() {
  try {
    const response = await supabase
      .from('card_specs')
      .update({ spec: updatedSpec })
      .eq('id', cardId);

    if (response.error) {
      throw response.error;
    }

    showToast('저장되었습니다', 'success');
  } catch (error) {
    showToast('저장에 실패했습니다. 다시 시도하세요.', 'error');
    // 재시도 버튼 제공
  }
}
```

---

## 토스트 메시지

텍스트 편집 관련 토스트:

| 이벤트 | 메시지 | 유형 | 지속 |
|--------|--------|------|------|
| 저장 완료 | "텍스트가 저장되었습니다" | success | 2초 |
| 편집 취소 | "편집이 취소되었습니다" | info | 2초 |
| 길이 초과 | "15자를 초과했습니다" | error | 3초 |
| 저장 실패 | "저장에 실패했습니다" | error | 3초 |

---

## 테스트 체크리스트

- [ ] 1회 클릭 → 텍스트 선택 + 글자 수 카운터 표시
- [ ] 2회 클릭 → 편집 모드 진입 + 커서 표시
- [ ] Enter → 편집 완료 + 저장
- [ ] Escape → 편집 취소 + 원본 복구
- [ ] Tab → 다음 텍스트 필드로 이동
- [ ] 글자 수 초과 → INVALID 상태 + 경고 색상
- [ ] 자동저장 → 1초 디바운스 후 Supabase 저장
- [ ] edit_logs → 변경 사항 기록
- [ ] 모바일 → 터치 입력 처리

---

## 참고 링크

- **Fabric.js IText:** http://fabricjs.com/docs/classes/IText.html
- **토큰 참조:** `/product_team/design_system/tokens.yaml`
- **Canvas Editor UX Flow:** `/design_specs/canvas_editor_ux_flow.md`

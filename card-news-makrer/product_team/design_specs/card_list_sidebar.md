# T-D02: CardList 사이드바 컴포넌트 명세

_작성자: 제품 디자인 에이전트 (AGENT 0-D) | 작성일: 2026-03-09_

---

## 개요

CardList는 좌측 사이드바 컴포넌트로, card_spec.json의 모든 카드를 썸네일 형식으로 표시합니다. 사용자는 카드를 클릭하여 중앙 캔버스에 표시할 카드를 선택하고, 드래그앤드롭으로 카드 순서를 변경할 수 있습니다.

---

## 컴포넌트 구조

### HTML 레이아웃

```
<aside class="card-list-sidebar">
  <div class="card-list-header">
    <h3>카드 리스트</h3>
    <span class="card-count">{totalCards}</span>
  </div>

  <div class="card-list-container">
    {/* dnd-kit Sortable context */}
    <ul class="card-list" role="list">
      {cards.map((card, index) => (
        <li key={card.id} class="card-item {state}">
          <div class="card-thumbnail-wrapper">
            <img
              class="card-thumbnail"
              src={thumbnail_url}
              alt={`Card ${index + 1}: ${card.text.headline}`}
            />
            {card.qc_status && (
              <div class="qc-badge" title={card.qc_status.message}>
                {qc_icon}
              </div>
            )}
          </div>
          <div class="card-info">
            <p class="card-title">{card.text.headline}</p>
            <p class="card-subtitle">{index + 1} / {totalCards}</p>
          </div>
          <div class="card-actions">
            <button class="drag-handle" aria-label="Reorder">⋮⋮</button>
          </div>
        </li>
      ))}
    </ul>
  </div>

  <div class="card-list-footer">
    <p class="reorder-hint">🖱️ 드래그하여 순서 변경</p>
  </div>
</aside>
```

---

## Props & State

### Props (부모 컴포넌트에서 전달)

```typescript
interface CardListProps {
  cards: CardSpec[];           // card_spec.json의 cards 배열
  selectedCardId: string;      // 현재 선택된 카드의 ID
  onSelectCard: (id: string) => void;      // 카드 선택 핸들러
  onReorderCards: (newOrder: CardSpec[]) => void; // 드래그앤드롭 완료 핸들러
  editMode: boolean;           // 편집 모드 여부
  isLoading: boolean;          // 초기 로딩 상태
}
```

### 로컬 상태 (Zustand Store)

```typescript
interface CardListState {
  selectedIndex: number;                    // 선택된 카드 인덱스
  draggedCardId: string | null;             // 드래그 중인 카드 ID
  hoverCardId: string | null;               // 호버 중인 카드 ID
  scrollPosition: number;                   // 스크롤 위치 (상태 복구용)

  setSelectedIndex: (index: number) => void;
  setDraggedCardId: (id: string | null) => void;
  setHoverCardId: (id: string | null) => void;
}
```

---

## 시각 스타일 명세

### 컨테이너 (Sidebar)

```css
.card-list-sidebar {
  width: 200px;                    /* 고정 폭 */
  background: #FFFFFF;             /* 기본 배경 */
  border-right: 1px solid #E5E7EB; /* 경계선 */
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100vh;                   /* 전체 높이 */
}
```

**토큰 참조:**
- 배경: white (#FFFFFF)
- 경계선: border color (#E5E7EB)
- 폭: 200px (고정)

### 헤더 영역

```css
.card-list-header {
  padding: 16px;                   /* spacing[3] */
  background: #F8F7FF;             /* surface */
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-list-header h3 {
  font: 600 14px / 1.4 Pretendard;  /* body weight bold */
  color: #2D2D2D;                  /* text_primary */
  margin: 0;
}

.card-count {
  font: 500 12px / 1.4 Pretendard;  /* caption */
  color: #6B7280;                  /* text_secondary */
  background: #E5E7EB;
  padding: 2px 8px;
  border-radius: 12px;             /* border_radius[full] */
  display: inline-block;
}
```

### 카드 아이템 (기본 상태)

```css
.card-item {
  list-style: none;
  padding: 8px;                    /* spacing[1] */
  display: flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;
  transition: background 0.2s ease;
  border-left: 3px solid transparent;

  /* 순환 포커스 */
  &:focus-within {
    outline: 2px solid #7B68EE;    /* primary */
    outline-offset: -2px;
  }
}
```

### 카드 썸네일

```css
.card-thumbnail-wrapper {
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
}

.card-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;              /* border_radius[small] */
  border: 1px solid #E5E7EB;
  background: #F8F7FF;
}

/* 선택 상태 링 */
.card-item.selected .card-thumbnail {
  border: 2px solid #7B68EE;       /* primary */
  box-shadow: 0 0 0 2px rgba(123, 104, 238, 0.2);
}

/* 호버 상태 */
.card-item.hover .card-thumbnail {
  border-color: #7B68EE;
  opacity: 0.9;
}
```

### QC 배지 (검수 상태)

QC 배지는 AGENT 7(QA Editor)의 검수 결과를 시각화합니다.

```css
.qc-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  border: 2px solid white;
  cursor: help;
}

/* 경고 상태 */
.qc-badge.warning {
  background: #FAAD14;             /* warning */
  color: white;
}

/* 에러 상태 */
.qc-badge.error {
  background: #FF4D4F;             /* error */
  color: white;
}

/* 성공 상태 */
.qc-badge.success {
  background: #52C41A;             /* success */
  color: white;
}
```

**QC 배지 종류:**
- ⚠️ (warning, 24px): 컨텐츠 경고 (예: 글자 수 초과, 문법 오류)
- ❌ (error, 24px): 심각한 에러 (예: 이미지 로드 실패)
- ✓ (success, 24px): 검수 통과 (선택 사항, 표시 안 함)

### 카드 정보 영역

```css
.card-info {
  flex: 1;
  min-width: 0;                    /* 텍스트 오버플로우 처리 */
  padding: 0 4px;
}

.card-title {
  font: 500 13px / 1.3 Pretendard;
  color: #2D2D2D;                  /* text_primary */
  margin: 0 0 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-subtitle {
  font: 400 11px / 1.3 Pretendard;
  color: #6B7280;                  /* text_secondary */
  margin: 0;
  white-space: nowrap;
}
```

### 드래그 핸들 버튼

```css
.card-actions {
  display: flex;
  gap: 4px;
  opacity: 0;                      /* 기본 숨김 */
  transition: opacity 0.2s ease;
}

.card-item:hover .card-actions,
.card-item.drag-active .card-actions {
  opacity: 1;
}

.drag-handle {
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid #E5E7EB;
  border-radius: 4px;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B7280;
  transition: all 0.2s ease;
  padding: 0;

  &:hover {
    background: #F8F7FF;
    border-color: #7B68EE;
    color: #7B68EE;
  }

  &:active {
    cursor: grabbing;
  }
}

.drag-handle::before {
  content: "⋮⋮";
  font-size: 12px;
  line-height: 1;
  letter-spacing: -2px;
}
```

---

## 상태 매트릭스

### 카드 아이템 상태

| 상태 | 조건 | 배경색 | 테두리색 | 커서 | 설명 |
|------|------|--------|---------|------|------|
| Default | 초기 상태 | transparent | transparent | pointer | 기본 상태 |
| Hover | 마우스 오버 | #F8F7FF (surface) | #E5E7EB | pointer | 호버 피드백 |
| Selected | 현재 선택된 카드 | #EEE7FF (primary 10%) | #7B68EE (2px left) | pointer | 진한 강조색 |
| Dragging | 드래그 중 | #E5E7EB (50% opacity) | #7B68EE (dashed 2px) | grabbing | 드래그 상태 |
| Disabled | 편집 불가능 | transparent | transparent | not-allowed | 로딩/저장 중 |

**CSS 구현:**

```css
.card-item {
  background: transparent;
  border-left: 3px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.card-item:hover {
  background: #F8F7FF;
}

.card-item.selected {
  background: rgba(123, 104, 238, 0.08);  /* primary 8% */
  border-left-color: #7B68EE;
}

.card-item.dragging {
  background: rgba(229, 231, 235, 0.5);
  border-left: 3px dashed #7B68EE;
  opacity: 0.7;
}

.card-item.disabled {
  pointer-events: none;
  opacity: 0.5;
}
```

---

## 드래그앤드롭 인터랙션

### dnd-kit 구성

**라이브러리:** dnd-kit v8+

```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// CardList 컴포넌트 내부
const sensors = useSensors(
  useSensor(PointerSensor, {
    distance: 8,                   // 8px 이동 시 드래그 시작
  }),
  useSensor(KeyboardSensor),       // 키보드 지원
);

<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
  <SortableContext
    items={cards.map(c => c.id)}
    strategy={verticalListSortingStrategy}
  >
    {/* CardItem 컴포넌트들 */}
  </SortableContext>
</DndContext>
```

### 드래그 비주얼 피드백

```
[드래그 시작]
└─► 원본 아이템: opacity 50%, border dashed
    대상 위치 인디케이터: 파란색 가로선 (2px, #7B68EE)

[드래그 오버]
└─► 호버 카드: background highlight (#F8F7FF)
    인디케이터 위치: 마우스 따라 이동

[드래그 해제]
└─► 배열 재정렬
    Zustand store 업데이트
    자동저장 트리거
    토스트: "카드 순서가 변경되었습니다"
```

### 드래그 힌트 텍스트

```css
.card-list-footer {
  padding: 12px 16px;
  background: #F8F7FF;
  border-top: 1px solid #E5E7EB;
  text-align: center;
}

.reorder-hint {
  font: 400 12px / 1.4 Pretendard;
  color: #6B7280;
  margin: 0;
}
```

---

## 썸네일 렌더링 규칙

### 썸네일 생성 방식

CardList에 표시되는 56×56px 썸네일은 두 가지 방식으로 생성됩니다:

#### 옵션 1: 서버 사이드 생성 (권장, 추후)
- 카드 저장 시 Vercel에서 server-side rendering으로 PNG 생성
- Supabase Storage에 저장
- CardList에서 URL로 로드

#### 옵션 2: 클라이언트 사이드 미리보기 (MVP)
- Canvas API를 사용하여 canvas를 이미지로 변환
- `canvas.toDataURL('image/webp', 0.6)` → base64
- 렌더링 시점: 카드 선택 해제, 또는 저장 완료 후

```typescript
// 클라이언트 사이드 썸네일 생성
async function generateThumbnail(canvas: fabric.Canvas): Promise<string> {
  // 1. 캔버스를 56×56으로 축소
  const thumbnail = new fabric.Canvas('temp-canvas', {
    width: 56,
    height: 56,
  });

  // 2. 원본 객체를 축소 복사
  const json = canvas.toJSON();
  const scaled = scaleJSON(json, 56 / 1080); // 약 5.2% 스케일

  // 3. 렌더링
  thumbnail.loadFromJSON(scaled, () => {
    thumbnail.renderAll();
  });

  // 4. WebP로 인코딩 (JPG 대비 40% 더 작음)
  return thumbnail.toDataURL({
    format: 'webp',
    quality: 0.6,
  });
}
```

### 썸네일 레이아웃 규칙

- **배경:** 카드 배경 이미지 또는 solid color
- **텍스트:** 표시하지 않음 (너무 작음)
- **오버레이:** 표시하지 않음
- **픽셀 크기:** 56×56px (CSS에서는 의도적으로 약간 크게 표시 가능 - border 고려)

---

## 키보드 접근성

### 포커스 관리

```
Tab 이동 순서:
[카드 리스트 헤더]
  ↓
[첫 번째 카드 아이템]
  ↓
[다음 카드 아이템들]
  ↓
[마지막 카드 다음: 캔버스 영역으로 이동]
```

### 키보드 단축키

| 단축키 | 동작 | 조건 |
|--------|------|------|
| Enter / Space | 카드 선택 | 포커스된 카드 |
| ArrowUp / ArrowDown | 카드 이동 (포커스만) | 포커스된 카드 |
| Ctrl+ArrowUp (or Shift+ArrowUp) | 카드 순서 변경 (드래그 효과) | 포커스된 카드 |
| Ctrl+ArrowDown (or Shift+ArrowDown) | 카드 순서 변경 (드래그 효과) | 포커스된 카드 |

---

## 반응형 레이아웃

### Desktop (1200px+)
- CardList 폭: 200px (고정)
- 아이템 높이: 72px
- 썸네일: 56×56px
- 텍스트: 표시

### Tablet (768px ~ 1199px)
```css
@media (max-width: 1199px) {
  .card-list-sidebar {
    width: 160px;
  }

  .card-thumbnail-wrapper {
    width: 48px;
    height: 48px;
  }

  .card-item {
    padding: 6px;
  }

  .card-title {
    font-size: 12px;
  }

  .card-subtitle {
    display: none;
  }
}
```

### Mobile (< 768px)
```css
@media (max-width: 767px) {
  .card-list-sidebar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 80px;
    border-right: none;
    border-top: 1px solid #E5E7EB;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .card-list-header {
    display: none;
  }

  .card-list-container {
    flex: 1;
    overflow-x: auto;
  }

  .card-list {
    flex-direction: row;
    gap: 8px;
  }

  .card-item {
    min-width: 60px;
  }

  .card-info {
    display: none;
  }
}
```

---

## 스크롤 동작

### 무한 스크롤 (카드 많을 때)

카드가 20개 이상인 경우:

```css
.card-list-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;

  /* 스크롤바 스타일 */
  scrollbar-width: thin;
  scrollbar-color: #D1D5DB #F8F7FF;
}

/* Webkit (Chrome, Safari) */
.card-list-container::-webkit-scrollbar {
  width: 6px;
}

.card-list-container::-webkit-scrollbar-track {
  background: #F8F7FF;
}

.card-list-container::-webkit-scrollbar-thumb {
  background: #D1D5DB;
  border-radius: 3px;
}

.card-list-container::-webkit-scrollbar-thumb:hover {
  background: #9CA3AF;
}
```

### 선택 카드 자동 스크롤

카드를 선택할 때, 해당 카드가 보이도록 자동 스크롤:

```typescript
useEffect(() => {
  const selectedElement = document.querySelector(
    `[data-card-id="${selectedCardId}"]`
  );
  if (selectedElement) {
    selectedElement.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }
}, [selectedCardId]);
```

---

## 로딩 상태 (LOADING)

초기 로드 중 CardList 표시:

```css
.card-item-skeleton {
  padding: 8px;
  display: flex;
  gap: 8px;
  align-items: center;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.card-item-skeleton .thumbnail {
  width: 56px;
  height: 56px;
  background: #E5E7EB;
  border-radius: 4px;
}

.card-item-skeleton .info {
  flex: 1;
}

.card-item-skeleton .title {
  width: 100%;
  height: 14px;
  background: #E5E7EB;
  border-radius: 4px;
  margin-bottom: 4px;
}

.card-item-skeleton .subtitle {
  width: 60%;
  height: 12px;
  background: #E5E7EB;
  border-radius: 4px;
}
```

---

## 접근성 속성

```html
<!-- 완전한 마크업 예시 -->
<aside
  class="card-list-sidebar"
  role="complementary"
  aria-label="카드 리스트"
>
  <div class="card-list-header">
    <h3 id="card-list-title">카드 리스트</h3>
    <span class="card-count" aria-live="polite">
      {totalCards}개
    </span>
  </div>

  <ul
    class="card-list"
    role="list"
    aria-labelledby="card-list-title"
  >
    <li
      key={card.id}
      class="card-item"
      role="option"
      aria-selected={isSelected}
      data-card-id={card.id}
      tabindex={isSelected ? 0 : -1}
      onClick={() => onSelectCard(card.id)}
    >
      {/* 내용 */}
    </li>
  </ul>

  <div class="card-list-footer">
    <p class="reorder-hint">
      🖱️ 드래그하여 순서 변경
    </p>
  </div>
</aside>
```

---

## 성능 최적화

### 가상화 (100개 카드 이상)

카드가 100개 이상인 경우, React Window를 사용하여 가상화:

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={cards.length}
  itemSize={72}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <CardItem card={cards[index]} />
    </div>
  )}
</FixedSizeList>
```

### 메모이제이션

```typescript
const CardItem = React.memo(
  ({ card, isSelected, onSelect }) => (
    // 렌더링 로직
  ),
  (prevProps, nextProps) => {
    return (
      prevProps.card.id === nextProps.card.id &&
      prevProps.isSelected === nextProps.isSelected
    );
  }
);
```

---

## 에러 상태

### 썸네일 로드 실패

```css
.card-thumbnail.error {
  background: #FFE7E7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

/* HTML */
<img
  src={url}
  onError={(e) => {
    e.target.classList.add('error');
    e.target.textContent = '❌';
  }}
/>
```

---

## 토스트 메시지

| 이벤트 | 토스트 | 유형 | 지속 |
|--------|--------|------|------|
| 카드 선택 | - (토스트 없음) | - | - |
| 순서 변경 완료 | "카드 순서가 변경되었습니다" | success | 2초 |
| 순서 변경 실패 | "순서 변경에 실패했습니다" | error | 3초 |

---

## 참고 및 링크

- **dnd-kit 문서:** https://docs.dndkit.com
- **접근성 (ARIA):** https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
- **토큰 참조:** `/product_team/design_system/tokens.yaml`

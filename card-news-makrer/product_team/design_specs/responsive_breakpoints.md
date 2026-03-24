# T-D07: 반응형 브레이크포인트 정의

_작성자: 제품 디자인 에이전트 (AGENT 0-D) | 작성일: 2026-03-09_

---

## 개요

캔버스 에디터는 기본적으로 3컬럼 레이아웃(CardList 256px | Canvas 가변 | StylePanel 288px)으로 설계되었습니다. 본 문서는 데스크톱부터 모바일까지 다양한 화면 크기에서 최적의 사용자 경험을 제공하기 위한 반응형 브레이크포인트, 컴포넌트 변형, 상호작용 패턴을 정의합니다.

---

## 1. 브레이크포인트 정의

### 1.1 4가지 반응형 브레이크포인트

| 브레이크포인트 | 화면 너비 | 레이아웃 | 주요 특징 |
|-------------|---------|--------|--------|
| **Desktop Large** (xl) | ≥1440px | 3컬럼 | 풀 레이아웃, 최적 편집 환경 |
| **Desktop** (lg) | 1024~1439px | 3컬럼 | 컴포넌트 약간 압축 |
| **Tablet** (md) | 768~1023px | 2컬럼 | StylePanel 숨김, 하단 탭/플로팅 패널 |
| **Mobile** (sm) | < 768px | 1컬럼 | 카드리스트 가로 스크롤, 읽기 전용 모드 |
| **Mobile Minimum** | ≥375px | 1컬럼 | iPhone SE 최소 지원 |

### 1.2 Tailwind CSS 브레이크포인트 매핑

```javascript
// tailwind.config.ts
export default {
  theme: {
    screens: {
      'sm': '375px',      // Mobile minimum (iPhone SE)
      'md': '768px',      // Tablet portrait
      'lg': '1024px',     // Laptop / Tablet landscape
      'xl': '1440px',     // Desktop large
      '2xl': '1920px',    // Ultra-wide (future)
    },
  },
};
```

**사용 패턴:**
```jsx
// Responsive 클래스 예시
<div className="w-full md:w-[200px] lg:w-[256px]">
  CardList sidebar
</div>
```

---

## 2. Desktop Large (≥1440px) — 풀 레이아웃

### 2.1 레이아웃 그리드

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (전체 폭, 64px)                                        │
├─────────────┬──────────────────────────┬──────────────────┤
│             │                          │                  │
│ CardList    │      Canvas              │   StylePanel     │
│ 256px       │   (가변, 중앙 정렬)       │    288px         │
│ (고정)      │   max-width: 600px       │    (고정)        │
│             │   aspect-ratio: 1/1      │                  │
│             │                          │                  │
│             │   1080×1080 카드         │                  │
│             │                          │                  │
│             │                          │                  │
│             │                          │                  │
├─────────────┼──────────────────────────┼──────────────────┤
│ FOOTER (전체 폭, 40px)                                      │
└─────────────┴──────────────────────────┴──────────────────┘
```

**CSS Grid 템플릿:**
```css
.editor-container {
  display: grid;
  grid-template-columns: 256px 1fr 288px;
  gap: 0;
  height: 100vh;

  /* 헤더와 푸터는 전체 폭 */
  grid-template-rows: 64px 1fr 40px;
  grid-auto-flow: dense;
}

/* 각 컴포넌트 배치 */
.header {
  grid-column: 1 / -1;
  grid-row: 1;
}

.card-list {
  grid-column: 1;
  grid-row: 2;
  overflow-y: auto;
  border-right: 1px solid #E5E7EB;
}

.canvas-area {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 24px;
  background: #F8F7FF;
}

.style-panel {
  grid-column: 3;
  grid-row: 2;
  overflow-y: auto;
  border-left: 1px solid #E5E7EB;
}

.footer {
  grid-column: 1 / -1;
  grid-row: 3;
}
```

**컴포넌트 크기:**
- **CardList**: 256px (고정)
- **Canvas**: 가변 (중앙 정렬, 최대 600px)
- **StylePanel**: 288px (고정)
- **Canvas 내부**: 1080×1080px (CSS로 스케일 조정)

**타이포그래피 크기:**
- **헤더 제목**: 18px Bold
- **CardList 텍스트**: 13px Regular (title), 11px Regular (subtitle)
- **StylePanel 섹션**: 14px Bold (헤더), 12px Regular (본문)

---

## 3. Desktop (1024~1439px) — 3컬럼 압축

### 3.1 레이아웃 그리드

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (전체 폭, 64px)                                       │
├──────────┬─────────────────────────────┬──────────────────┤
│          │                             │                  │
│CardList  │      Canvas                 │ StylePanel       │
│200px     │   (가변, 중앙 정렬)          │  240px           │
│(고정)    │   max-width: 500px          │  (고정)          │
│          │                             │                  │
│          │   1080×1080 카드            │                  │
│          │   (약간 축소됨)             │                  │
│          │                             │                  │
├──────────┼─────────────────────────────┼──────────────────┤
│ FOOTER (전체 폭, 40px)                                      │
└──────────┴─────────────────────────────┴──────────────────┘
```

**CSS Grid 템플릿:**
```css
@media (min-width: 1024px) and (max-width: 1439px) {
  .editor-container {
    grid-template-columns: 200px 1fr 240px;
  }

  .canvas-area {
    max-width: 500px;
    padding: 20px;
  }

  .canvas-wrapper {
    width: 480px;
    height: 480px;
  }

  canvas {
    width: 100%;
    height: 100%;
  }
}
```

**컴포넌트 크기:**
- **CardList**: 200px (고정, 256px에서 축소)
- **Canvas**: 가변 (최대 500px)
- **StylePanel**: 240px (고정, 288px에서 축소)

**컴포넌트 변형:**
- **CardList 썸네일**: 48×48px (56×56에서 축소)
- **CardList 글자**: 12px (13px에서 축소)
- **CardList 자막**: 숨김
- **StylePanel 색상칩**: 48×48px (56×56에서 축소)
- **StylePanel 레이아웃칩**: 50×50px (60×60에서 축소)

---

## 4. Tablet (768~1023px) — 2컬럼, StylePanel 숨김

### 4.1 레이아웃 그리드

```
┌──────────────────────────────────────┐
│ HEADER (전체 폭, 64px)                │
├──────────┬────────────────────────┤
│          │                        │
│ CardList │      Canvas            │
│ 200px    │   (가변, 중앙 정렬)     │
│ (고정)   │   max-width: 450px    │
│          │   1080×1080 카드      │
│          │   (축소됨)             │
│          │                        │
│          │ [StylePanel 버튼]      │
│          │ 🎨 스타일 조정 (플로팅) │
│          │                        │
│          │                        │
├──────────┴────────────────────────┤
│ FOOTER (전체 폭, 40px)              │
└──────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Style Panel (Bottom Sheet / Modal)  │
│ ─────────────────────────────────── │
│ [색상 팔레트]                        │
│ [레이아웃 선택]                      │
│ [폰트 크기]                         │
│ [오버레이 투명도]                    │
│ [배경 유형]                         │
│                                    │
│         [닫기]                      │
└─────────────────────────────────────┘
```

**CSS Grid 템플릿:**
```css
@media (min-width: 768px) and (max-width: 1023px) {
  .editor-container {
    grid-template-columns: 200px 1fr;
    grid-template-rows: 64px 1fr 40px;
  }

  .card-list {
    grid-column: 1;
    grid-row: 2;
    width: 200px;
  }

  .canvas-area {
    grid-column: 2;
    grid-row: 2;
    max-width: 450px;
    padding: 20px;
  }

  .style-panel {
    display: none;
    /* 플로팅 버튼으로 접근 또는 모달로 표시 */
  }

  .style-panel-modal {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: auto;
    max-height: 80vh;
    background: white;
    border-top: 1px solid #E5E7EB;
    border-radius: 16px 16px 0 0;
    padding: 24px 16px;
    overflow-y: auto;
    z-index: 50;
    animation: slideUp 0.3s ease-out;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

**StylePanel 접근 방식 (2가지):**

#### 옵션 1: 플로팅 버튼 + 하단 시트
```jsx
// Canvas 영역 우하단에 떠있는 버튼
<button
  className="fixed bottom-20 right-6 md:hidden lg:hidden"
  onClick={() => setShowStylePanel(true)}
  aria-label="스타일 조정"
>
  🎨 스타일
</button>

// 하단 시트 모달
{showStylePanel && (
  <StylePanelBottomSheet
    onClose={() => setShowStylePanel(false)}
  />
)}
```

#### 옵션 2: 우측 플로팅 패널
```jsx
// 우측에 떠있는 반투명 패널
<StylePanelFloating
  visible={showStylePanel}
  position="right"
  width="100%"
  maxWidth="320px"
/>
```

**컴포넌트 크기:**
- **CardList**: 200px (고정)
- **Canvas**: 가변 (최대 450px)
- **StylePanel**: 숨김 (모달/플로팅으로 접근)

**Canvas 변형:**
- **캔버스 크기**: 410×410px (내부 1080×1080에서 약 38% 스케일)
- **캔버스 외부 패딩**: 20px
- **최대 너비**: 450px

**CardList 변형:**
- **아이템 높이**: 60px (72px에서 축소)
- **썸네일**: 48×48px
- **텍스트**: 12px (제목만, 자막 숨김)
- **드래그 핸들**: 표시됨

**Touch 인터랙션:**
- **스크롤 감도**: 증가 (모바일 친화적)
- **탭 대상 크기**: 최소 44×44px (모두 충족)
- **드래그 시작**: 거리 기준 8px (모바일에 최적화)

---

## 5. Mobile (< 768px) — 1컬럼, 읽기 전용 모드

### 5.1 레이아웃 그리드 (뷰어 모드)

```
┌────────────────────────────────┐
│ HEADER (전체 폭, 56px)         │
│ [← 뒤로가기] [제목] [메뉴]    │
├────────────────────────────────┤
│                                │
│  CardList (가로 스크롤)        │
│  [□][□][□][□][□]              │ (높이: 72px)
│                                │
├────────────────────────────────┤
│                                │
│     Canvas (1컬럼)             │
│                                │
│  ┌──────────────────────────┐ │
│  │   1080×1080 카드         │ │
│  │   (전체 폭 - 32px)       │ │
│  │   (가로 가운데 정렬)     │ │
│  │                          │ │
│  │   aspect-ratio: 1/1      │ │
│  │                          │ │
│  └──────────────────────────┘ │
│                                │
│ ⓘ 모바일에서는 읽기 전용      │
│   데스크톱에서 편집하세요      │
│                                │
├────────────────────────────────┤
│ FOOTER (전체 폭, 40px)        │
│ [← 목록으로]  [공유]           │
└────────────────────────────────┘

┌────────────────────────────────┐
│ Style Panel (Bottom Drawer)    │
│ ─────────────────────────────── │
│ 🎨 스타일 조정                 │
│ ─────────────────────────────── │
│ [색상 팔레트]                  │
│ [레이아웃 선택]                │
│ [폰트 크기]                    │
│ [오버레이 투명도]              │
│ [배경 유형]                    │
│                                │
│ [닫기]                        │
└────────────────────────────────┘
```

**CSS Grid 템플릿:**
```css
@media (max-width: 767px) {
  .editor-container {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 56px auto 1fr 40px;
    gap: 0;
    height: 100vh;
    overflow: hidden;
  }

  .header {
    grid-column: 1;
    grid-row: 1;
    height: 56px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #E5E7EB;
  }

  /* CardList → 가로 스크롤 네비게이션 */
  .card-list {
    grid-column: 1;
    grid-row: 2;
    width: 100%;
    height: 72px;
    display: flex;
    flex-direction: row;
    border-right: none;
    border-bottom: 1px solid #E5E7EB;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 8px 8px;
    gap: 8px;
  }

  .card-list-header {
    display: none;
  }

  .card-list-container {
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .card-item {
    min-width: 56px;
    height: 56px;
    flex-shrink: 0;
    flex-direction: column;
    padding: 4px;
  }

  .card-thumbnail-wrapper {
    width: 48px;
    height: 48px;
  }

  .card-info {
    display: none;
  }

  /* Canvas Area */
  .canvas-area {
    grid-column: 1;
    grid-row: 3;
    width: 100%;
    padding: 16px;
    overflow-y: auto;
    overflow-x: hidden;
    background: white;
  }

  .canvas-wrapper {
    width: calc(100% - 32px);
    max-width: 100%;
    aspect-ratio: 1;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  canvas {
    width: 100%;
    height: 100%;
    max-width: 400px;
    max-height: 400px;
  }

  /* 읽기 전용 알림 */
  .editor-readonly-notice {
    display: block;
    margin-top: 16px;
    padding: 12px 16px;
    background: #FEF3C7;
    border: 1px solid #F59E0B;
    border-radius: 8px;
    font-size: 12px;
    color: #92400E;
    text-align: center;
  }

  /* StylePanel → 숨김 (모달로 접근) */
  .style-panel {
    display: none;
  }

  .footer {
    grid-column: 1;
    grid-row: 4;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
    height: 40px;
    border-top: 1px solid #E5E7EB;
  }
}
```

### 5.2 모바일 전용 상호작용

#### CardList 가로 스크롤 네비게이션

```jsx
<div className="card-list-mobile">
  <button
    className="card-item"
    onClick={() => selectCard(index)}
    key={card.id}
  >
    <img src={thumbnail} alt={`Card ${index + 1}`} />
  </button>
</div>
```

**스타일:**
```css
.card-item {
  min-width: 56px;
  height: 56px;
  flex-shrink: 0;
  padding: 4px;
  background: transparent;
  border: 1px solid #E5E7EB;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-item.selected {
  border: 2px solid #7B68EE;
  box-shadow: 0 0 0 2px rgba(123, 104, 238, 0.2);
}

.card-item img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 2px;
}
```

#### StylePanel Bottom Drawer (모바일)

```jsx
// Bottom drawer 구현
<Drawer
  open={showStylePanel}
  onOpenChange={setShowStylePanel}
  position="bottom"
  className="mobile-style-drawer"
>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>스타일 조정</DrawerTitle>
      <DrawerClose />
    </DrawerHeader>
    <DrawerBody>
      {/* StylePanel 컨텐츠 */}
    </DrawerBody>
  </DrawerContent>
</Drawer>
```

**Drawer 스타일:**
```css
.mobile-style-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 80vh;
  border-radius: 16px 16px 0 0;
  border: 1px solid #E5E7EB;
  background: white;
  animation: slideUp 0.3s ease-out;
}

.mobile-style-drawer .drawer-header {
  padding: 12px 16px;
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mobile-style-drawer .drawer-body {
  padding: 16px;
  overflow-y: auto;
}
```

### 5.3 모바일 읽기 전용 모드

**편집 비활성화:**
```typescript
// useCardEditor.ts
const isReadOnlyMode = windowWidth < 768;

if (isReadOnlyMode) {
  // 모든 편집 기능 비활성화
  disableTextEditing = true;
  disableStylePanel = true;
  disableCardReordering = true;
  showReadOnlyNotice = true;
}
```

**안내 메시지:**
```jsx
{isReadOnlyMode && (
  <div className="editor-readonly-notice">
    <svg className="icon" role="img" aria-label="정보">
      <use href="#info-icon" />
    </svg>
    <span>
      모바일에서는 읽기 전용 모드입니다.
      데스크톱에서 편집하세요.
    </span>
  </div>
)}
```

**최소 너비 지원 (375px):**
```css
@media (max-width: 374px) {
  /* iPhone SE 이하 크기 */
  .canvas-area {
    padding: 8px;
  }

  .canvas-wrapper {
    width: calc(100% - 16px);
  }

  .header {
    height: 48px;
    padding: 0 12px;
  }

  .card-item {
    min-width: 48px;
    height: 48px;
  }
}
```

---

## 6. CSS Custom Properties (동적 사이징)

### 6.1 반응형 변수 정의

```css
:root {
  /* Breakpoint values */
  --bp-sm: 375px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1440px;

  /* Desktop Large (≥1440px) */
  --sidebar-width-desktop-lg: 256px;
  --panel-width-desktop-lg: 288px;
  --canvas-max-width-desktop-lg: 600px;
  --card-list-item-height: 72px;
  --card-thumbnail-size: 56px;
  --color-chip-size: 56px;
  --layout-chip-size: 60px;
}

@media (min-width: 1024px) and (max-width: 1439px) {
  :root {
    /* Desktop (1024~1439px) */
    --sidebar-width-desktop: 200px;
    --panel-width-desktop: 240px;
    --canvas-max-width-desktop: 500px;
    --card-list-item-height: 64px;
    --card-thumbnail-size: 48px;
    --color-chip-size: 48px;
    --layout-chip-size: 50px;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  :root {
    /* Tablet (768~1023px) */
    --sidebar-width-tablet: 200px;
    --canvas-max-width-tablet: 450px;
    --card-list-item-height: 60px;
    --card-thumbnail-size: 48px;
    --color-chip-size: 40px;
    --layout-chip-size: 45px;
  }
}

@media (max-width: 767px) {
  :root {
    /* Mobile (< 768px) */
    --canvas-max-width-mobile: calc(100% - 32px);
    --card-list-item-height: 56px;
    --card-thumbnail-size: 48px;
    --color-chip-size: 40px;
    --layout-chip-size: 45px;
  }
}
```

### 6.2 컴포넌트에서의 활용

```css
/* CardList */
.card-list-sidebar {
  width: var(--sidebar-width-desktop-lg);
  transition: width 0.3s ease;
}

/* Canvas Wrapper */
.canvas-wrapper {
  max-width: var(--canvas-max-width-desktop-lg);
  transition: max-width 0.3s ease;
}

/* CardItem */
.card-item {
  height: var(--card-list-item-height);
  transition: height 0.3s ease;
}

/* Color Chip */
.color-chip {
  width: var(--color-chip-size);
  height: var(--color-chip-size);
  transition: width 0.3s ease, height 0.3s ease;
}
```

---

## 7. 브레이크포인트 전환 애니메이션

### 7.1 레이아웃 전환 (0.3초)

```css
/* 부드러운 전환 애니메이션 */
.editor-container {
  transition: grid-template-columns 0.3s ease;
}

.card-list {
  transition: width 0.3s ease;
}

.canvas-area {
  transition: max-width 0.3s ease, padding 0.3s ease;
}

.style-panel {
  transition: opacity 0.3s ease, visibility 0.3s ease;
}
```

### 7.2 컴포넌트 숨김/표시 (0.2초)

```css
/* Tablet에서 Desktop으로 전환 시 StylePanel 표시 */
@media (min-width: 1024px) {
  .style-panel {
    opacity: 1;
    visibility: visible;
    transition: opacity 0.2s ease, visibility 0.2s ease;
  }

  .style-panel-modal {
    display: none;
  }
}

@media (max-width: 1023px) {
  .style-panel {
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease;
  }
}
```

### 7.3 모달 전환 애니메이션

```css
/* Bottom Sheet/Modal 진입 */
@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Bottom Sheet/Modal 종료 */
@keyframes slideDown {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(100%);
    opacity: 0;
  }
}

.modal-enter {
  animation: slideUp 0.3s ease-out forwards;
}

.modal-exit {
  animation: slideDown 0.3s ease-out forwards;
}
```

---

## 8. 타이포그래피 스케일

### 8.1 브레이크포인트별 폰트 크기

| 요소 | Desktop Large | Desktop | Tablet | Mobile |
|------|:---:|:---:|:---:|:---:|
| **Header Title** | 18px | 18px | 16px | 16px |
| **Header Subtitle** | 14px | 14px | 12px | 12px |
| **CardList Title** | 13px | 12px | 12px | - |
| **CardList Subtitle** | 11px | - | - | - |
| **StylePanel Section** | 14px Bold | 14px Bold | 12px Bold | 12px Bold |
| **StylePanel Label** | 12px | 12px | 11px | 11px |
| **Canvas (1080×1080)** | 48~64px | 48~64px | 48~64px | 48~64px |
| **Footer Text** | 12px | 12px | 11px | 11px |

**CSS 구현:**
```css
/* Header Title */
.header-title {
  font-size: 18px;
}

@media (max-width: 1023px) {
  .header-title {
    font-size: 16px;
  }
}

/* CardList Text */
.card-title {
  font-size: 13px;
}

@media (max-width: 1439px) {
  .card-title {
    font-size: 12px;
  }
}

@media (max-width: 767px) {
  .card-title {
    display: none;
  }
}
```

---

## 9. Touch vs Mouse 인터랙션 차이

### 9.1 Touch 최적화 (Mobile/Tablet)

| 인터랙션 | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| **탭 대상 최소 크기** | 44×44px | 44×44px | 32×32px |
| **드래그 시작 거리** | 12px | 10px | 8px |
| **스크롤 감도** | 높음 (관성 스크롤) | 중간 | 낮음 |
| **호버 피드백** | 없음 (long press) | 약간 | 강함 |
| **더블클릭** | 줌 활성화 | 가능 | 일반 사용 |
| **우클릭 컨텍스트** | 길게 누르기 | 우클릭 | 우클릭 |

**CSS 구현:**
```css
/* Touch-friendly 버튼 크기 */
button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}

/* 호버 상태 조건부 적용 */
@media (hover: hover) {
  /* 마우스 있는 기기 */
  button:hover {
    background-color: #F0F0F0;
    transition: background 0.15s ease;
  }
}

@media (hover: none) {
  /* 터치 기기 */
  button:hover {
    background-color: transparent;
  }

  button:active {
    background-color: #E5E7EB;
  }
}

/* 더블탭 줌 비활성화 (모바일) */
@media (max-width: 767px) {
  input, button, a {
    touch-action: manipulation;
  }
}
```

### 9.2 포인터 이벤트 조정

```typescript
// hooks/useResponsiveInteraction.ts
export const useResponsiveInteraction = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const touchCheck = () => {
      setIsTouchDevice(
        () =>
          window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
          navigator.maxTouchPoints > 0
      );
    };

    touchCheck();
    window.addEventListener('resize', touchCheck);
    return () => window.removeEventListener('resize', touchCheck);
  }, []);

  return {
    isTouchDevice,
    dragStartDistance: isTouchDevice ? 12 : 8,
    tooltipDelay: isTouchDevice ? 500 : 200,
  };
};
```

---

## 10. 헤더/푸터 반응형 변형

### 10.1 Header 레이아웃 변경

**Desktop Large (≥1440px)**
```
[← 뒤로] [제목: 주제명] [상태 배지: draft] [... 더보기]
```

**Desktop (1024~1439px)**
```
[←] [제목] [배지] [...]
```

**Tablet (768~1023px)**
```
[←] [짧은 제목] [상태]
[... 메뉴]
```

**Mobile (< 768px)**
```
[←] [축약된 제목]
```

**CSS Grid:**
```css
/* Desktop Large */
.header {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 16px;
  align-items: center;
  padding: 0 24px;
}

/* Tablet/Mobile */
@media (max-width: 1023px) {
  .header {
    grid-template-columns: auto 1fr auto;
    gap: 12px;
    padding: 0 16px;
  }

  .header-subtitle {
    display: none;
  }
}

@media (max-width: 767px) {
  .header {
    height: 56px;
    grid-template-columns: auto 1fr auto;
    gap: 8px;
    padding: 0 12px;
  }

  .header-title {
    font-size: 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
```

### 10.2 Footer 변형

**Desktop Large**
```
[←] [자동저장 상태] [버전] [승인/반려 버튼]
```

**Mobile**
```
[←] [상태]  [버튼]
```

```css
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
}

@media (max-width: 767px) {
  .footer {
    padding: 0 16px;
    gap: 8px;
  }

  .footer-version {
    display: none;
  }

  .footer-buttons {
    display: flex;
    gap: 8px;
  }

  .footer-buttons button {
    flex: 1;
    min-width: 80px;
  }
}
```

---

## 11. Canvas 반응형 스케일 규칙

### 11.1 Canvas 크기 계산

**원본 크기:** 1080×1080px (내부 좌표계)
**표시 크기:** 브레이크포인트별로 다름 (외부 CSS)

| 브레이크포인트 | 최대 너비 | 계산 | 실제 픽셀 |
|-------------|---------|------|----------|
| Desktop Large | 600px | min(600px, 가용 폭) | 600×600px |
| Desktop | 500px | min(500px, 가용 폭) | 500×500px |
| Tablet | 450px | min(450px, 가용 폭) | 450×450px |
| Mobile | calc(100%-32px) | min(calc(100%-32px), 400px) | 300~368px |

**CSS 구현:**
```css
.canvas-wrapper {
  width: 100%;
  max-width: 600px;
  aspect-ratio: 1 / 1;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 항상 1:1 비율 유지 */
canvas {
  width: 100%;
  height: 100%;
  max-width: 600px;
  max-height: 600px;
  display: block;
}

@media (max-width: 1439px) {
  .canvas-wrapper {
    max-width: 500px;
  }

  canvas {
    max-width: 500px;
    max-height: 500px;
  }
}

@media (max-width: 1023px) {
  .canvas-wrapper {
    max-width: 450px;
  }

  canvas {
    max-width: 450px;
    max-height: 450px;
  }
}

@media (max-width: 767px) {
  .canvas-wrapper {
    width: calc(100% - 32px);
    max-width: 100%;
  }

  canvas {
    width: 100%;
    height: 100%;
    max-width: 400px;
    max-height: 400px;
  }
}
```

### 11.2 Canvas 내부 텍스트 스케일

Canvas 내부의 텍스트는 항상 1080×1080 기준입니다. CSS 스케일은 전체 캔버스에만 적용되므로, 텍스트 크기는 자동으로 조정됩니다.

```javascript
// Fabric.js에서는 스케일 비율로 조정
const scaleRatio = actualWidth / 1080;

// 예: 48px 텍스트 @ 500px canvas
// 500 / 1080 ≈ 0.463
// 48px × 0.463 ≈ 22px (화면상 크기)
```

---

## 12. 접근성 - 모든 브레이크포인트에서 보장

### 12.1 대화형 요소 최소 크기

**WCAG 2.5.5 Target Size 요구사항:**

```css
/* 모든 브레이크포인트에서 최소 44×44px */
button, a, input, textarea, select {
  min-width: 44px;
  min-height: 44px;
  padding: 12px 16px; /* 또는 패딩으로 충분히 확보 */
}

/* 예외: 아이콘 버튼 (둥근) */
.icon-button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* CardList 아이템 (모바일에서도 충분함) */
.card-item {
  min-height: 56px; /* 모바일에서도 44px 초과 */
  min-width: 56px;
}
```

### 12.2 포커스 관리 (모든 크기)

```css
/* 모든 인터랙티브 요소에 명확한 포커스 표시 */
:focus-visible {
  outline: 2px solid #7B68EE;
  outline-offset: 2px;
}

/* 모바일 키보드 네비게이션 */
@media (hover: none) {
  /* 터치 기기에서는 focus 상태 강조 */
  *:focus-visible {
    outline-width: 3px;
    outline-color: #5945C4;
  }
}
```

### 12.3 색상 대비 유지

모든 브레이크포인트에서 WCAG AA 준수:
- 텍스트 vs 배경: 4.5:1
- UI 요소: 3:1

```css
/* 텍스트 대비 */
.text-primary { /* #2D2D2D on #FFFFFF = 13.2:1 ✓ */
  color: #2D2D2D;
}

.text-secondary { /* #6B7280 on #FFFFFF = 5.1:1 ✓ */
  color: #6B7280;
}

/* 배경 대비 */
.button-primary { /* #FFFFFF text on #7B68EE = 5.8:1 ✓ */
  background-color: #7B68EE;
  color: #FFFFFF;
}
```

### 12.4 aria-label & aria-description 반응형 적용

```jsx
// 모바일에서는 더 간결한 라벨
const ariaLabel = isMobile
  ? "스타일 조정"
  : "현재 카드의 스타일을 조정합니다";

<button aria-label={ariaLabel}>🎨</button>
```

---

## 13. 네비게이션 변경 (모든 브레이크포인트)

### 13.1 Tab 순서 (Desktop Large)

```
Header → CardList Items (순서대로) → Canvas → StylePanel → Footer
```

### 13.2 Tab 순서 (Tablet)

```
Header → CardList Items → Canvas → Footer → Modal (StylePanel, 열려있으면)
```

### 13.3 Tab 순서 (Mobile)

```
Header → CardList (가로 스크롤) → Canvas → Footer → Drawer (StylePanel, 열려있으면)
```

**구현:**
```jsx
// 동적 tabindex 관리
<StylePanel
  tabIndex={showStylePanel ? 0 : -1}
  aria-hidden={!showStylePanel}
/>
```

---

## 14. 최소 너비 지원 (375px - iPhone SE)

### 14.1 극저해상도 최적화

```css
@media (max-width: 374px) {
  /* 375px 이하 */
  .editor-container {
    grid-template-rows: 48px auto 1fr 40px;
  }

  .header {
    height: 48px;
    padding: 0 12px;
    font-size: 15px;
  }

  .card-list {
    height: 64px;
  }

  .card-item {
    min-width: 48px;
    height: 48px;
  }

  .card-thumbnail-wrapper {
    width: 40px;
    height: 40px;
  }

  .canvas-wrapper {
    width: calc(100% - 24px);
    max-width: 340px;
  }

  .style-panel-modal {
    max-height: 75vh;
  }

  /* 간격 축소 */
  .card-list {
    padding: 6px 4px;
    gap: 6px;
  }

  .canvas-area {
    padding: 12px;
  }

  button {
    padding: 10px 12px;
    font-size: 12px;
  }
}
```

### 14.2 스케일 다운 전략

```javascript
// useResponsiveLayout.ts
const getLayoutConfig = (width: number) => {
  if (width < 375) {
    return {
      cardListHeight: 64,
      cardItemSize: 48,
      padding: 12,
      fontSize: { header: 15, body: 11 },
    };
  } else if (width < 768) {
    return {
      cardListHeight: 72,
      cardItemSize: 56,
      padding: 16,
      fontSize: { header: 16, body: 12 },
    };
  }
  // ...
};
```

---

## 15. 반응형 정렬 및 여백

### 15.1 Padding/Margin 규칙

| 요소 | Desktop Large | Desktop | Tablet | Mobile |
|-----|:---:|:---:|:---:|:---:|
| **Main Container** | 24px | 20px | 16px | 12px |
| **Card Item Padding** | 8px | 6px | 6px | 4px |
| **Canvas Area** | 24px | 20px | 20px | 16px |
| **Section Margin** | 20px | 16px | 16px | 12px |

**CSS:**
```css
/* Desktop Large */
.container {
  padding: 24px;
}

/* Desktop */
@media (max-width: 1439px) {
  .container {
    padding: 20px;
  }
}

/* Tablet */
@media (max-width: 1023px) {
  .container {
    padding: 16px;
  }
}

/* Mobile */
@media (max-width: 767px) {
  .container {
    padding: 12px;
  }
}

/* CSS 변수로 통일 */
:root {
  --spacing-main: 24px;
}

@media (max-width: 1439px) {
  :root {
    --spacing-main: 20px;
  }
}

.container {
  padding: var(--spacing-main);
}
```

---

## 16. 모바일 안내 및 제약사항

### 16.1 모바일 전용 UI 요소

**읽기 전용 모드 안내:**
```jsx
{isMobileSize && (
  <Alert variant="info" className="my-4">
    <Info className="h-4 w-4" />
    <AlertTitle>모바일 보기</AlertTitle>
    <AlertDescription>
      모바일 환경에서는 카드를 보기만 할 수 있습니다.
      편집은 데스크톱에서 진행하세요.
    </AlertDescription>
  </Alert>
)}
```

**Desktop 전환 가이드:**
```jsx
<div className="mobile-notice">
  <span className="icon">💡</span>
  <p>데스크톱에서 편집하려면 화면을 가로로 돌려주세요.</p>
  <a href="#" className="link">데스크톱 버전으로 열기</a>
</div>
```

### 16.2 orientation 대응 (회전 감지)

```css
/* Portrait 모드 */
@media (orientation: portrait) {
  .editor-container {
    grid-template-rows: 56px auto 1fr 40px;
  }
}

/* Landscape 모드 (태블릿/폰) */
@media (orientation: landscape) {
  .editor-container {
    grid-template-rows: 48px 1fr 40px;
  }

  .card-list {
    display: none; /* 또는 축소 */
  }

  /* Canvas 확대 */
  .canvas-wrapper {
    max-width: 100%;
  }
}
```

**JavaScript로 orientation 감지:**
```typescript
useEffect(() => {
  const handleOrientationChange = () => {
    setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
  };

  window.addEventListener('orientationchange', handleOrientationChange);
  return () => window.removeEventListener('orientationchange', handleOrientationChange);
}, []);
```

---

## 17. 성능 최적화 (반응형 관련)

### 17.1 Media Query 최소화

```css
/* ❌ 과도한 media query */
@media (min-width: 375px) { /* 불필요 */ }
@media (min-width: 500px) { /* 불필요 */ }
@media (min-width: 768px) { /* ✓ 필요 */ }

/* ✓ 효율적인 breakpoint */
@media (max-width: 767px) { /* Mobile */ }
@media (min-width: 768px) and (max-width: 1023px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
```

### 17.2 CSS Container Queries (향후)

```css
/* Tailwind config: @tailwindcss/container-queries 설치 필요 */
@supports (container-type: inline-size) {
  .style-panel {
    container-type: inline-size;
  }

  .color-chip {
    width: 100cqw; /* 컨테이너 너비 기준 */
  }
}
```

### 17.3 JavaScript 재계산 최소화

```typescript
// ❌ 매번 재계산
const isTablet = window.innerWidth < 1024;

// ✓ 메모이제이션
const isTablet = useMemo(() => {
  return window.matchMedia('(max-width: 1023px)').matches;
}, []);

// ✓ useCallback으로 최적화
const updateLayout = useCallback(() => {
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  // 레이아웃 업데이트
}, []);
```

---

## 18. 검수 체크리스트

### 18.1 각 브레이크포인트별 테스트

- [ ] **Desktop Large (≥1440px)**
  - [ ] 3컬럼 레이아웃 정상 표시
  - [ ] CardList 256px 고정
  - [ ] Canvas 최대 600px
  - [ ] StylePanel 288px 고정
  - [ ] 모든 섹션 펼침 상태

- [ ] **Desktop (1024~1439px)**
  - [ ] 3컬럼 레이아웃 유지
  - [ ] CardList 200px로 축소
  - [ ] Canvas 최대 500px
  - [ ] StylePanel 240px로 축소
  - [ ] 컬러칩 48×48px로 축소

- [ ] **Tablet (768~1023px)**
  - [ ] 2컬럼 레이아웃 (CardList + Canvas만)
  - [ ] StylePanel 숨김 (모달/플로팅)
  - [ ] Canvas 최대 450px
  - [ ] 플로팅 버튼으로 StylePanel 접근 가능
  - [ ] Touch 인터랙션 최적화

- [ ] **Mobile (< 768px)**
  - [ ] 1컬럼 레이아웃
  - [ ] CardList → 가로 스크롤 네비게이션 (72px 높이)
  - [ ] Canvas 중앙 정렬
  - [ ] StylePanel → 하단 드로어
  - [ ] 읽기 전용 모드 활성화
  - [ ] 최소 너비 375px 지원

### 18.2 접근성 검증

- [ ] 모든 버튼/링크: 최소 44×44px
- [ ] 포커스 표시: 명확한 outline (2px)
- [ ] 색상 대비: 4.5:1 이상
- [ ] 키보드 네비게이션: Tab 순서 올바름
- [ ] ARIA 라벨: 반응형 적용

### 18.3 성능 검증

- [ ] 브레이크포인트 전환: 부드러움 (0.3초)
- [ ] 모달/드로어: 빠른 전환 (0.3초)
- [ ] 스크롤 성능: 프레임 드롭 없음
- [ ] JavaScript 재계산: 최소화

### 18.4 크로스 브라우저 테스트

| 브라우저 | Desktop | Tablet | Mobile |
|---------|:---:|:---:|:---:|
| Chrome | ✓ | ✓ | ✓ |
| Safari | ✓ | ✓ | ✓ |
| Firefox | ✓ | ✓ | ✓ |
| Edge | ✓ | ✓ | ✓ |

---

## 19. 디바이스별 테스트 환경

### 19.1 물리 기기

| 기기 | 화면 크기 | 브레이크포인트 | 테스트 사항 |
|-----|---------|-------------|---------|
| iPhone SE | 375×667 | Mobile Min | 극저해상도 최적화 |
| iPhone 13 | 390×844 | Mobile | 일반 모바일 |
| iPad (6th) | 768×1024 | Tablet | 태블릿 포트레이트 |
| iPad Pro | 1024×1366 | Tablet/Desktop | 태블릿 랜드스케이프 |
| MacBook Pro 13" | 1440×900 | Desktop Large | 풀 레이아웃 |
| Monitor 27" | 1920×1080 | Desktop Large | 초고해상도 |

### 19.2 Chrome DevTools 브레이크포인트

```javascript
// DevTools Console에서 확인
Object.keys(window.matchMedia) // media query 확인

// 브레이크포인트 테스트
window.matchMedia('(max-width: 767px)').matches // Mobile?
window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches // Tablet?
window.matchMedia('(min-width: 1024px)').matches // Desktop?
```

---

## 20. 구현 체크리스트

- [ ] CSS Grid 템플릿 정의 (각 브레이크포인트)
- [ ] CSS Custom Properties 선언 (동적 사이징)
- [ ] Tailwind Config 업데이트 (breakpoint)
- [ ] Media Query 추가 (모든 컴포넌트)
- [ ] 반응형 애니메이션 구현 (transition/animation)
- [ ] Touch 이벤트 최적화 (drag threshold)
- [ ] 모바일 모드 UI 추가 (readonly notice, bottom drawer)
- [ ] 접근성 검증 (target size, focus, contrast)
- [ ] 성능 프로파일링 (DevTools)
- [ ] 크로스 브라우저 테스트 (Chrome, Safari, Firefox)
- [ ] 실기기 테스트 (iPhone, iPad)

---

## 21. 참고 자료

| 자료 | 링크 |
|-----|-----|
| **WCAG 2.1 Target Size** | https://www.w3.org/WAI/WCAG21/Understanding/target-size.html |
| **Tailwind CSS Responsive** | https://tailwindcss.com/docs/responsive-design |
| **CSS Media Queries** | https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries |
| **prefers-reduced-motion** | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion |
| **Fabric.js Scaling** | http://fabricjs.com/ |
| **Bottom Sheet Pattern** | https://www.smashingmagazine.com/2020/11/bottom-sheets-web/ |

---

## 22. 향후 확장

- [ ] **Dark Mode**: 반응형 다크 색상 팔레트
- [ ] **Ultra-wide (2560px+)**: 추가 컬럼 또는 사이드 패널
- [ ] **Accessibility Mode**: 높은 대비, 큰 글씨
- [ ] **Print Styles**: 카드 출력 최적화
- [ ] **Foldable Devices**: 접힘 화면 대응

---

_마지막 업데이트: 2026-03-09_
_담당자: AGENT 0-D (제품 디자인 에이전트)_

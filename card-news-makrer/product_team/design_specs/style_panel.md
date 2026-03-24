# T-D05: 스타일 패널 컴포넌트 명세

_작성자: 제품 디자인 에이전트 (AGENT 0-D) | 작성일: 2026-03-09_

---

## 개요

스타일 패널(Style Panel)은 캔버스 에디터의 우측에 고정되는 사이드바 패널로, 현재 선택된 카드의 스타일 속성들을 실시간으로 조정할 수 있습니다. 사용자는 색상 팔레트, 레이아웃 선택, 폰트 크기, 오버레이 투명도, 배경 유형을 이 패널에서 제어합니다.

---

## 1. 패널 레이아웃 및 구조

### 1.1 전체 패널 사이즈

| 속성 | 값 |
|------|-----|
| 너비 | 280px (고정) |
| 높이 | 100vh (full height) |
| 위치 | 우측 고정 (right: 0) |
| 배경색 | #FFFFFF (white) |
| 테두리 | 좌측 1px solid #E5E7EB |
| 오버플로우 | scroll (y축만) |

### 1.2 패널 내부 구조

```
┌────────────────────────┐
│  Style Panel Header    │  (32px, 패딩 16px)
│  스타일 조정            │
├────────────────────────┤
│  Section 1:            │
│  Color Palette         │  (섹션 높이: auto, 패딩 16px)
│  4개 색상 칩 + 클릭    │
├────────────────────────┤
│  Section 2:            │
│  Layout Selector       │  (섹션 높이: auto)
│  6개 레이아웃 칩       │
├────────────────────────┤
│  Section 3:            │
│  Font Size             │  (섹션 높이: auto)
│  Headline Size Slider  │
│  Body Size Slider      │
├────────────────────────┤
│  Section 4:            │
│  Overlay Opacity       │  (섹션 높이: auto)
│  투명도 슬라이더        │
│  (0.0 ~ 1.0)          │
├────────────────────────┤
│  Section 5:            │
│  Background Type       │  (섹션 높이: auto)
│  Toggle: Gradient      │
│          / Solid       │
│          / Image       │
├────────────────────────┤
│  [패딩: 하단 32px]      │
└────────────────────────┘
```

### 1.3 섹션 공통 스타일

- **섹션 헤더**: 14px font-weight 600, color #2D2D2D, 좌측 패딩 16px, 상단 마진 20px (첫 섹션은 0)
- **섹션 본문**: 패딩 12px 16px
- **섹션 구분선**: 1px solid #F0F0F0

---

## 2. 컬러 팔레트 섹션

### 2.1 목적

카드의 주요 색상을 빠르게 변경할 수 있는 색상 칩 모음입니다. 색상을 클릭하면 현재 선택된 카드의 헤드라인, 본문, 배경 색상을 변경합니다.

### 2.2 기본 팔레트 (4가지)

| 팔레트명 | 색상 코드 | 설명 |
|---------|----------|------|
| calm | #7B9EBD | 차분한 파란색 |
| warm | #E8A87C | 따뜻한 주황색 |
| nature | #7CB88E | 자연스러운 초록색 |
| soft | #B39DDB | 부드러운 보라색 |

### 2.3 색상 칩 UI

```
┌─ Color Palette ─────────────────┐
│                                 │
│  ┌────────┐  ┌────────┐        │
│  │ calm   │  │ warm   │        │
│  │ #7B9EBD│  │ #E8A87C│        │
│  └────────┘  └────────┘        │
│                                 │
│  ┌────────┐  ┌────────┐        │
│  │ nature │  │ soft   │        │
│  │ #7CB88E│  │ #B39DDB│        │
│  └────────┘  └────────┘        │
│                                 │
└─────────────────────────────────┘
```

**색상 칩 스펙:**
- 크기: 56px × 56px
- 배치: 2열 그리드 (gap: 12px)
- border-radius: 8px
- cursor: pointer
- 호버 상태: scale(1.05), box-shadow 2px 4px 12px rgba(0,0,0,0.1)
- 선택 상태: 2px solid #7B68EE (primary) 테두리, scale(1.05)

### 2.4 인터랙션

**클릭 시:**
1. 색상 칩이 선택 상태로 표시 (테두리 강조)
2. 카드 spec의 `palette` 필드 업데이트
3. 캔버스에 즉시 반영 (실시간 미리보기)
4. Zustand store에 변경사항 기록
5. 자동저장 디바운스 시작

**이전 선택 색상:**
- 선택했던 색상 칩에는 계속 테두리 유지
- 새 색상 선택 시 이전 테두리 제거

### 2.5 상태별 스타일

| 상태 | 스타일 |
|------|--------|
| Normal | 배경색 + 기본 그림자 |
| Hover | scale(1.05) + 강한 그림자 |
| Active (선택됨) | 2px primary 테두리 + scale(1.05) |
| Disabled | opacity 0.5 + cursor not-allowed |

---

## 3. 레이아웃 선택 섹션

### 3.1 목적

카드의 텍스트 및 배경 배치 방식을 선택합니다. 6가지 레이아웃 중 하나를 선택하면 즉시 캔버스에 반영됩니다.

### 3.2 레이아웃 타입

| 레이아웃명 | 코드 | 설명 |
|----------|------|------|
| Center | center | 텍스트 중앙 정렬 (표지, 강조용) |
| Top Left | top_left | 좌상단 텍스트, 우측 이미지 |
| Top Right | top_right | 우상단 텍스트, 좌측 이미지 |
| Bottom Left | bottom_left | 하단 좌측 텍스트, 상단 이미지 |
| Bottom Right | bottom_right | 하단 우측 텍스트, 상단 이미지 |
| Split | split | 좌측 이미지, 우측 텍스트 분할 |

### 3.3 레이아웃 선택 UI

```
┌─ Layout Selector ───────────────┐
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │Center│ │Top-L │ │Top-R │   │
│  │  ■   │ │  L   │ │  R   │   │
│  │  ■   │ │■    ■│ │■    ■│   │
│  │  ■   │ │      │ │      │   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │Bot-L │ │Bot-R │ │Split │   │
│  │      │ │      │ │■    ■│   │
│  │■    ■│ │■    ■│ │      │   │
│  │  ■   │ │  ■   │ │      │   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
└─────────────────────────────────┘
```

**레이아웃 칩 스펙:**
- 크기: 60px × 60px
- 배치: 3열 그리드 (gap: 10px)
- border-radius: 6px
- 배경: #F8F7FF (surface)
- 테두리: 1px solid #E5E7EB
- 내부 아이콘: 간단한 도형 표시 (■ = 텍스트, ▲ = 이미지)
- cursor: pointer
- 호버 상태: 배경색 #F0ECFF, 테두리 #D9D0E8
- 선택 상태: 2px solid #7B68EE 테두리, 배경색 #F7F3FF

### 3.4 인터랙션

**레이아웃 칩 클릭 시:**
1. 해당 레이아웃 칩이 활성화 상태로 표시
2. 선택된 카드의 `layout` 필드 업데이트
3. 캔버스의 텍스트 배치 즉시 변경 (레이아웃 규칙 적용)
4. Zustand store 업데이트
5. 자동저장 디바운스 시작

### 3.5 상태별 스타일

| 상태 | 스타일 |
|------|--------|
| Normal | 기본 배경 + 1px 테두리 |
| Hover | 밝은 배경 (#F0ECFF) + 테두리 강조 |
| Active (선택됨) | 2px primary 테두리 + 밝은 배경 |
| Disabled | opacity 0.4 + cursor not-allowed |

---

## 4. 폰트 크기 섹션

### 4.1 목적

카드의 헤드라인과 본문 텍스트 크기를 개별적으로 조정합니다.

### 4.2 Headline 크기 슬라이더

**범위:** 32px ~ 64px
**기본값:** 48px

```
┌─ Headline Size ─────────────────┐
│                                 │
│  ◄─────────●────────────────►  │
│   32px             48px  64px   │
│                                 │
│  현재값: 48px  [텍스트 입력]    │
│                                 │
└─────────────────────────────────┘
```

**슬라이더 스펙:**
- 높이: 24px (thumb 크기 포함)
- 트랙 색: #E5E7EB
- Thumb 색: #7B68EE (primary)
- Thumb 크기: 18px × 18px, border-radius 50%
- Thumb 호버: scale(1.2), box-shadow 0 2px 8px rgba(123, 104, 238, 0.3)
- input 타입: range
- step: 1
- 실시간 업데이트

**텍스트 입력:**
- 타입: number input
- 너비: 50px
- 유효 범위: 32 ~ 64
- 포커스 시 전체 텍스트 선택
- 범위 벗어난 값 입력 시 경고 토스트 표시

### 4.3 Body 크기 슬라이더

**범위:** 20px ~ 40px
**기본값:** 32px

```
┌─ Body Size ─────────────────────┐
│                                 │
│  ◄──────────────●──────────────►│
│   20px         32px      40px   │
│                                 │
│  현재값: 32px  [텍스트 입력]    │
│                                 │
└─────────────────────────────────┘
```

**슬라이더 스펙:**
- Headline 슬라이더와 동일 스타일
- step: 1
- 실시간 업데이트

### 4.4 인터랙션

**슬라이더 드래그 시:**
1. 실시간으로 캔버스의 텍스트 크기 변경
2. 현재값 표시 (px 단위)
3. 드래그 완료 시 자동저장 시작
4. Zustand store 업데이트

**텍스트 입력 시:**
1. Enter 키 또는 포커스 아웃 시 적용
2. 범위 검증 (32 ~ 64 for headline, 20 ~ 40 for body)
3. 범위 외 값 입력 시:
   - 토스트 경고: "폰트 크기는 범위 내여야 합니다"
   - 이전 값으로 복원
   - 자동저장 스킵

### 4.5 상태별 스타일

| 상태 | 스타일 |
|------|--------|
| Normal | 기본 트랙 + thumb |
| Hover | thumb scale(1.2) + 그림자 |
| Active (드래그) | thumb 강조색 (#5945C4) |
| Disabled | opacity 0.4 + cursor not-allowed |

---

## 5. 오버레이 투명도 섹션

### 5.1 목적

배경 이미지 위의 오버레이 투명도를 조정합니다. 실시간 미리보기를 통해 배경이 얼마나 투명하게 보이는지 확인할 수 있습니다.

### 5.2 슬라이더 UI

```
┌─ Overlay Opacity ───────────────┐
│                                 │
│  투명 ◄──────●─────► 불투명     │
│   0.0       0.5      1.0        │
│                                 │
│  현재값: 0.3 (30%)              │
│  [텍스트 입력 0.0 ~ 1.0]         │
│                                 │
│  [미리보기 박스]                 │
│  ┌────────────────────────────┐ │
│  │ 오버레이 적용 미리보기       │ │
│  │ (배경 이미지 + 현재 투명도) │ │
│  └────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

**슬라이더 스펙:**
- 범위: 0.0 ~ 1.0
- 기본값: 0.3
- step: 0.01 (정밀도)
- 높이: 24px
- 트랙 색: #E5E7EB
- Thumb 색: #7B68EE
- 실시간 캔버스 업데이트

**수치 표시:**
- 형식: "0.3 (30%)"
- 폰트 크기: 12px, color #6B7280
- 텍스트 입력: number 타입, min 0, max 1, step 0.01

**미리보기 박스:**
- 크기: 전체 너비 - 32px (패딩 고려), 높이 80px
- 배경: 현재 카드의 배경 이미지 (더미 표시 또는 실제 로드)
- 오버레이: 적용된 투명도로 검은색 오버레이 표시
- border-radius: 6px
- border: 1px solid #E5E7EB

### 5.3 인터랙션

**슬라이더 드래그 시:**
1. 실시간으로 캔버스의 오버레이 투명도 변경
2. 미리보기 박스도 동시에 업데이트
3. 수치 표시 실시간 갱신
4. 드래그 완료 시 자동저장 시작

**텍스트 입력 시:**
1. Enter 또는 포커스 아웃 시 적용
2. 범위 검증 (0.0 ~ 1.0)
3. 범위 외 값 입력 시 경고 토스트
4. 유효한 값: 소수점 둘째 자리까지 반올림

### 5.4 상태별 스타일

| 상태 | 스타일 |
|------|--------|
| Normal | 기본 슬라이더 |
| Hover | thumb scale(1.2) + 그림자 |
| Active (드래그) | thumb #5945C4 강조 |
| Disabled | opacity 0.4 |

---

## 6. 배경 유형 선택 섹션

### 6.1 목적

카드 배경의 표시 방식을 선택합니다. 그래디언트, 단색, 또는 이미지 중 하나를 선택할 수 있습니다.

### 6.2 배경 유형 옵션

| 타입 | 코드 | 설명 |
|------|------|------|
| Gradient | gradient | 팔레트 색상 기반 그래디언트 |
| Solid | solid | 팔레트 색상 단색 |
| Image | image | URL 기반 이미지 |

### 6.3 UI 구성

```
┌─ Background Type ───────────────┐
│                                 │
│  ◯ Gradient  ◉ Solid  ◯ Image   │
│                                 │
│  ┌─ 그래디언트 설정 (숨김) ─────┐│
│  │ (선택 시 펼침)              ││
│  └────────────────────────────┘│
│                                 │
│  ┌─ 단색 설정 ──────────────────┐│
│  │                              ││
│  │ 색상: [컬러 픽커]             ││
│  │ opacity: [슬라이더]           ││
│  │                              ││
│  └────────────────────────────┘│
│                                 │
│  ┌─ 이미지 설정 (숨김) ────────┐│
│  │ (선택 시 펼침)              ││
│  └────────────────────────────┘│
│                                 │
└─────────────────────────────────┘
```

### 6.4 라디오 버튼 스펙

**라디오 버튼:**
- 크기: 16px × 16px (원형)
- 선택되지 않음: 테두리 2px #BFBFBF, 배경 transparent
- 선택됨: 테두리 2px #7B68EE, 중심 filled #7B68EE
- 레이블: 12px, color #2D2D2D, margin-left 8px
- 호버: 커서 pointer, 테두리 색 진하게

**라디오 그룹 배치:**
- 좌우 정렬 (flex row)
- gap: 24px

### 6.5 Solid (단색) 설정 섹션

**컬러 픽커:**
- 타입: HTML color input
- 크기: 48px × 48px
- border-radius: 6px
- border: 1px solid #E5E7EB
- 선택 색상 표시
- 호버: scale(1.05)

**Opacity 슬라이더:**
- 범위: 0.0 ~ 1.0
- 기본값: 1.0
- step: 0.01

**인터랙션:**
1. Solid 라디오 버튼 선택 시 섹션 펼침
2. 컬러 픽커 클릭 → 색상 선택 모달 (OS 기본)
3. Opacity 슬라이더 드래그 → 실시간 미리보기
4. 모든 변경 후 자동저장 시작

### 6.6 Gradient (그래디언트) 설정 섹션

**Out of Scope (MVP):**
이 섹션은 향후 확장을 위해 예약되어 있습니다. 현재 버전에서는 라디오 버튼만 표시하고, 선택 불가 상태로 유지합니다.

```
◯ Gradient (비활성화)
레이블 옆에 작은 배지: "곧 출시 예정"
```

### 6.7 Image (이미지) 설정 섹션

**Out of Scope (MVP):**
이 섹션도 향후 확장을 위해 예약되어 있습니다.

```
◯ Image (비활성화)
레이블 옆에 작은 배지: "곧 출시 예정"
```

### 6.8 상태별 스타일

| 상태 | 스타일 |
|------|--------|
| 라디오 버튼 Normal | 테두리 #BFBFBF |
| 라디오 버튼 Hover | 테두리 진하게 |
| 라디오 버튼 Selected | 테두리 + 중심 filled #7B68EE |
| 설정 섹션 Expanded | max-height 500px, 애니메이션 0.3s ease-in-out |
| 설정 섹션 Collapsed | max-height 0, overflow hidden |
| 비활성 라디오 버튼 | opacity 0.5, cursor not-allowed |

---

## 7. 패널 상태 관리

### 7.1 활성화 / 비활성화 조건

**활성화:**
- 카드가 선택되었을 때 (selectedCardIndex >= 0)
- 에디터 모드가 'edit' 또는 'approve'일 때

**비활성화:**
- 카드가 선택되지 않았을 때
- 에디터 모드가 'view'일 때 (읽기 전용)
- 저장 중일 때 (autoSaveStatus === 'saving')

### 7.2 비활성화 시 UI 표현

- 패널 전체: opacity 0.6
- 모든 인터랙티브 요소: pointer-events none, cursor not-allowed
- 텍스트 색상: #9CA3AF (회색)

```
┌─ Style Panel (비활성화) ────────┐
│ <흐릿한 배경>                     │
│                                 │
│ Color Palette ...               │
│ Layout Selector ...             │
│ Font Size ...                   │
│ (모든 요소가 희미하게)             │
│                                 │
│ "카드를 선택하세요"              │
│ (중앙 안내 메시지)               │
│                                 │
└─────────────────────────────────┘
```

### 7.3 로딩 상태

**저장 중 (autoSaveStatus === 'saving'):**
- 모든 입력 요소 비활성화 (disabled)
- 패널 위 로딩 인디케이터 표시
- 스피너 + "저장 중..." 텍스트

**저장 완료 (autoSaveStatus === 'saved'):**
- 2초간 "저장됨 ✓" 메시지 표시
- 그 후 자동으로 'idle' 상태로 전환

**저장 실패 (autoSaveStatus === 'error'):**
- 패널 상단에 에러 토스트 표시
- "저장 실패. 인터넷 연결을 확인하세요. [재시도]"
- 사용자가 수정을 계속할 수 있음 (재시도 후 다시 저장 시도)

---

## 8. 반응형 레이아웃

### 8.1 Desktop (1200px+)

- 패널 너비: 280px (고정)
- 모든 섹션 표시
- 스크롤 가능

### 8.2 Tablet (768px ~ 1199px)

- 패널 너비: 240px
- 색상 칩 크기: 48px × 48px로 축소
- 레이아웃 칩 크기: 50px × 50px로 축소
- 폰트 크기 조정: 12px로 축소

### 8.3 Mobile (< 768px)

**Out of Scope (MVP):**
현재는 데스크톱 우선 설계이며, 모바일 버전은 추후 구현됩니다. 모바일에서는 패널이 모달 형식으로 표시될 예정입니다.

---

## 9. 컴포넌트 계층 구조 (Component Hierarchy)

```
StylePanel
├── PanelHeader
│   ├── Title ("스타일 조정")
│   └── HelpIcon (optional)
│
├── ColorPaletteSection
│   ├── SectionTitle
│   └── ColorChips (4개)
│       ├── ColorChip (calm)
│       ├── ColorChip (warm)
│       ├── ColorChip (nature)
│       └── ColorChip (soft)
│
├── LayoutSelectorSection
│   ├── SectionTitle
│   └── LayoutChips (6개)
│       ├── LayoutChip (center)
│       ├── LayoutChip (top_left)
│       ├── LayoutChip (top_right)
│       ├── LayoutChip (bottom_left)
│       ├── LayoutChip (bottom_right)
│       └── LayoutChip (split)
│
├── FontSizeSection
│   ├── SectionTitle
│   ├── HeadlineSlider
│   │   ├── Label
│   │   ├── Slider (32~64px)
│   │   └── NumberInput
│   └── BodySlider
│       ├── Label
│       ├── Slider (20~40px)
│       └── NumberInput
│
├── OverlayOpacitySection
│   ├── SectionTitle
│   ├── OpacitySlider
│   │   ├── Slider (0.0~1.0)
│   │   └── NumberInput
│   └── PreviewBox
│
├── BackgroundTypeSection
│   ├── SectionTitle
│   ├── RadioGroup (3개)
│   │   ├── Radio (gradient) - disabled
│   │   ├── Radio (solid) - active
│   │   └── Radio (image) - disabled
│   ├── SolidSettingsPanel (expanded)
│   │   ├── ColorPicker
│   │   └── OpacitySlider
│   ├── GradientSettingsPanel (collapsed)
│   └── ImageSettingsPanel (collapsed)
│
└── AutoSaveIndicator
    ├── LoadingSpinner (saving)
    └── StatusText
```

---

## 10. Props & State 정의

### 10.1 StylePanel Props

```typescript
interface StylePanelProps {
  isEnabled: boolean;              // 패널 활성화 여부
  selectedCard: Card | null;       // 선택된 카드 데이터
  autoSaveStatus: AutoSaveStatus;  // 저장 상태
  lastError: string | null;        // 마지막 에러 메시지
  onColorChange: (palette: string) => void;
  onLayoutChange: (layout: string) => void;
  onHeadlineSizeChange: (size: number) => void;
  onBodySizeChange: (size: number) => void;
  onOverlayOpacityChange: (opacity: number) => void;
  onBackgroundTypeChange: (type: 'gradient' | 'solid' | 'image') => void;
  onSolidColorChange: (color: string) => void;
  onSolidOpacityChange: (opacity: number) => void;
}
```

### 10.2 ColorChip State

```typescript
interface ColorChipState {
  isSelected: boolean;
  hoverScale: number;
}
```

### 10.3 Slider State

```typescript
interface SliderState {
  isDragging: boolean;
  currentValue: number;
  displayValue: string;
}
```

---

## 11. 접근성 (Accessibility)

### 11.1 WCAG 2.1 AA 준수

**키보드 네비게이션:**
- Tab 순서: 색상 칩 → 레이아웃 칩 → 슬라이더 → 라디오 버튼
- Enter/Space: 버튼, 칩, 라디오 버튼 활성화
- 화살표 키: 슬라이더 값 조정 (±1), 라디오 버튼 선택

**포커스 관리:**
- 모든 인터랙티브 요소: focus-visible 2px #7B68EE 테두리
- 포커스 아웃라인: offset 2px

**ARIA 레이블:**
- 섹션 헤더: `<h3 id="color-palette-section">`
- 색상 칩: `aria-label="calm palette (#7B9EBD)"`
- 레이아웃 칩: `aria-label="center layout"`, `aria-pressed="true|false"`
- 슬라이더: `aria-label="headline font size"`, `aria-valuemin="32"`, `aria-valuemax="64"`, `aria-valuenow={value}`, `aria-valuetext="48px"`
- 라디오 버튼: `aria-label="background type: solid"`

**색상 대비:**
- 텍스트 vs 배경: 4.5:1 (일반 텍스트)
- UI 요소 테두리: 3:1 (최소)

**스크린 리더 지원:**
- 상태 변경 시 aria-live="polite" 메시지
  - "색상 팔레트가 calm으로 변경되었습니다"
  - "레이아웃이 center로 변경되었습니다"
  - "저장 완료"

### 11.2 모션 및 애니메이션

**prefers-reduced-motion 지원:**
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

## 12. 인터랙션 플로우

### 12.1 색상 변경 플로우

```
사용자가 색상 칩 클릭
        ↓
ColorChip onClick 트리거
        ↓
onColorChange(palette) 콜백 실행
        ↓
Zustand store: updateCardStyle() 호출
        ↓
카드 spec.palette 업데이트
        ↓
Zustand: performAutoSave() 디바운스 시작
        ↓
(1초 후) Supabase 저장
        ↓
edit_logs 기록
        ↓
캔버스 실시간 업데이트 (re-render)
        ↓
패널 저장 상태 표시 ("저장됨 ✓")
```

### 12.2 레이아웃 변경 플로우

```
사용자가 레이아웃 칩 클릭
        ↓
LayoutChip onClick 트리거
        ↓
onLayoutChange(layout) 콜백 실행
        ↓
Zustand store: updateCardStyle() 호출
        ↓
카드 spec.layout 업데이트
        ↓
자동저장 → Supabase 저장 → edit_logs 기록
        ↓
캔버스: 텍스트 배치 규칙 재적용
        ↓
실시간 미리보기 업데이트
```

### 12.3 폰트 크기 변경 플로우

```
사용자가 슬라이더 드래그
        ↓
슬라이더 value 변경 (실시간)
        ↓
onHeadlineSizeChange(size) 콜백 실행 (드래그 중)
        ↓
카드 spec.style.headline_size 임시 업데이트
        ↓
캔버스 텍스트 크기 실시간 반영
        ↓
[드래그 완료]
        ↓
Zustand: updateCardStyle() 호출
        ↓
자동저장 → Supabase 저장
        ↓
최종 저장 상태 표시
```

---

## 13. 에러 처리 및 엣지 케이스

### 13.1 에러 시나리오

**카드가 선택되지 않음:**
- 패널 비활성화 (opacity 0.6)
- 중앙에 "카드를 선택하세요" 메시지 표시

**저장 실패:**
- 상단에 에러 토스트 표시
- "[재시도]" 버튼 제공
- 사용자는 계속 편집 가능 (변경사항 로컬 유지)
- 재시도 후 성공 시 "저장됨 ✓" 표시

**유효하지 않은 폰트 크기 입력:**
- 예: headline 크기에 "100" 입력
- 토스트 경고: "헤드라인 크기는 32~64px 범위여야 합니다"
- 입력 필드 값 초기화 (이전 값으로)

**네트워크 타임아웃:**
- 10초 이상 응답 없음 → 에러 토스트 + "[재시도]" 버튼
- 패널은 계속 상호작용 가능

### 13.2 엣지 케이스

**케이스 1: 슬라이더 drag 중 카드 변경**
- 다른 카드를 선택하면 drag 상태 유지 (이전 카드에 적용)
- 새 카드 선택 후 패널 값이 새 카드의 값으로 업데이트

**케이스 2: 색상 칩 연속 클릭**
- 디바운싱 없음 (즉시 반영)
- 마지막 클릭이 최종 색상으로 적용

**케이스 3: 패널 스크롤 중 저장 완료**
- 스크롤 위치 유지
- 상단에 저장 상태 토스트 표시

**케이스 4: 오버레이 투명도를 1.0으로 설정**
- 배경 이미지가 완전히 불투명하게 보임
- 미리보기 박스도 배경 이미지만 표시

---

## 14. 애니메이션 및 전환

### 14.1 슬라이더 Thumb 호버 애니메이션

```css
.slider-thumb {
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
}

.slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 2px 8px rgba(123, 104, 238, 0.3);
}
```

### 14.2 색상 칩 선택 애니메이션

```css
.color-chip {
  transition: transform 0.15s ease-out, border-color 0.15s ease-out;
}

.color-chip:hover {
  transform: scale(1.05);
}

.color-chip.active {
  border: 2px solid #7B68EE;
  transform: scale(1.05);
}
```

### 14.3 섹션 확장/축소 애니메이션 (BackgroundType)

```css
.settings-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
}

.settings-panel.expanded {
  max-height: 500px;
}
```

### 14.4 저장 상태 토스트 페이드인

```css
.toast {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 15. 디자인 토큰 참조

| 토큰 | 값 |
|------|-----|
| primary | #7B68EE |
| success | #52C41A |
| error | #FF4D4F |
| warning | #FAAD14 |
| surface | #F8F7FF |
| border | #E5E7EB |
| text-primary | #2D2D2D |
| text-secondary | #6B7280 |
| text-tertiary | #9CA3AF |
| font-family | Pretendard, sans-serif |
| border-radius | 8px (panels), 6px (chips) |
| shadow-sm | 0 1px 2px rgba(0, 0, 0, 0.05) |
| shadow-md | 0 4px 6px rgba(0, 0, 0, 0.1) |

---

## 16. 개발 체크리스트

- [ ] StylePanel.tsx 컴포넌트 생성
- [ ] ColorPaletteSection.tsx 구현
- [ ] LayoutSelectorSection.tsx 구현
- [ ] FontSizeSection.tsx 구현 (슬라이더 + 텍스트 입력)
- [ ] OverlayOpacitySection.tsx 구현 (슬라이더 + 미리보기)
- [ ] BackgroundTypeSection.tsx 구현 (라디오 + 단색 설정)
- [ ] Zustand store와 연동 (updateCardStyle, recordEdit)
- [ ] 실시간 캔버스 업데이트 로직
- [ ] 자동저장 상태 표시
- [ ] 접근성 테스트 (포커스, ARIA, 색상 대비)
- [ ] 반응형 레이아웃 (tablet breakpoint 테스트)
- [ ] 에러 토스트 통합 (Sonner 또는 shadcn/ui Toast)
- [ ] 성능 최적화 (슬라이더 드래그 debounce)

---

## 17. 참고 링크

- **Zustand Store:** `/canvas_editor/stores/useCardStore.ts`
- **Card Canvas Rendering:** `/product_team/design_specs/card_canvas_rendering.md`
- **UX Flow:** `/product_team/design_specs/canvas_editor_ux_flow.md`
- **Design Tokens:** `/product_team/design_system/tokens.yaml`
- **shadcn/ui Slider:** https://ui.shadcn.com/docs/components/slider
- **shadcn/ui Radio Group:** https://ui.shadcn.com/docs/components/radio-group

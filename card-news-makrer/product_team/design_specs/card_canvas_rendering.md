# T-D03: 카드 캔버스 렌더링 규칙

_작성자: 제품 디자인 에이전트 (AGENT 0-D) | 작성일: 2026-03-09_

---

## 개요

카드뉴스는 1080×1080px의 정사각형 형식(인스타그램 표준)으로 렌더링됩니다. card_spec.json의 구조를 따라 Fabric.js로 캔버스에 표시하고, 브라우저에서 CSS scale로 축소하여 표시합니다.

---

## 캔버스 크기 & 스케일링

### 내부 캔버스 크기 (Fabric.js)
```
너비: 1080px
높이: 1080px
DPI: 72 (웹 표준)
```

### 브라우저 표시 크기

| 화면 크기 | 표시 크기 | Scale 값 | 설명 |
|----------|---------|---------|------|
| Desktop (1200px+) | 540px | 0.5 (50%) | 캔버스 최대 너비 |
| Tablet (768~1199px) | 360px | 0.333 (33.3%) | 반응형 축소 |
| Mobile (< 768px) | 100% viewport | auto | 전체 폭 |

**CSS 구현:**

```css
.canvas-container {
  width: 100%;
  max-width: 540px;
  margin: 0 auto;
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

.canvas-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 100%;  /* 1:1 aspect ratio */
}

canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: scale(0.5);  /* 또는 transform-origin 사용 */
  transform-origin: top left;
  image-rendering: high-quality;
}

@media (max-width: 1199px) {
  canvas {
    transform: scale(0.333);
  }
}

@media (max-width: 767px) {
  .canvas-container {
    max-width: 100%;
  }

  canvas {
    transform: scale(calc(100vw / 1080));
  }
}
```

---

## card_spec.json 구조와 렌더링 매핑

### card_spec 샘플 (참고용)

```json
{
  "id": "2026-03-09-001",
  "topic": "마음의 건강과 일상의 스트레스",
  "cards": [
    {
      "id": "card_1",
      "layout": "center",
      "background": {
        "type": "image",
        "url": "https://images.unsplash.com/photo-..."
      },
      "overlay": {
        "color": "#000000",
        "opacity": 0.3
      },
      "text": {
        "headline": "일상 속 스트레스",
        "body": "우리 모두 경험하는 스트레스를 어떻게 관리할까요?",
        "sub_text": "공감하고 해결책을 찾아봅시다"
      },
      "palette": "calm",
      "qc_status": {
        "status": "passed",
        "message": null
      }
    }
  ]
}
```

---

## 레이아웃 타입별 렌더링 규칙

각 레이아웃 타입은 텍스트 요소들의 배치 위치와 크기를 정의합니다.

### 1. CENTER 레이아웃

**목적:** 표지, 강조 메시지용

```
┌─────────────────────────────────────┐
│                                     │
│         [배경 이미지]                │
│         (오버레이)                   │
│                                     │
│                                     │
│                                     │
│        ┌─────────────────┐          │
│        │  headline       │          │
│        │ (중앙 상단)      │          │
│        └─────────────────┘          │
│                                     │
│        ┌─────────────────┐          │
│        │ body            │          │
│        │ (중앙)          │          │
│        └─────────────────┘          │
│                                     │
│        ┌─────────────────┐          │
│        │ sub_text        │          │
│        │ (중앙 하단)      │          │
│        └─────────────────┘          │
│                                     │
└─────────────────────────────────────┘
```

**텍스트 배치 상세:**

```javascript
const centerLayout = {
  headline: {
    left: 540,                    // 중앙 (1080 / 2)
    top: 350,                     // 상단에서 350px
    width: 900,                   // 전체 너비의 83% (200px 마진)
    height: 150,                  // 충분한 높이
    fontSize: 48,                 // 큰 제목
    fontWeight: 700,              // Bold
    textAlign: "center",
    fill: "#FFFFFF",              // 배경 이미지 위에 흰색
  },
  body: {
    left: 540,
    top: 530,                     // headline 하단 180px
    width: 900,
    height: 180,
    fontSize: 32,
    fontWeight: 400,              // Regular
    textAlign: "center",
    fill: "#FFFFFF",
  },
  sub_text: {
    left: 540,
    top: 750,                     // body 하단 220px
    width: 900,
    height: 100,
    fontSize: 22,
    fontWeight: 400,
    textAlign: "center",
    fill: "#FFFFFF",
    opacity: 0.85,
  },
};

// CSS 기준으로 변환:
// Fabric.js 좌표 → textAlign + position
// left: 540 + width: 900 = 중앙 정렬 (originX: "center" 사용)
```

**Fabric.js 구현:**

```typescript
const headline = new fabric.Textbox(text.headline, {
  left: 540,
  top: 350,
  width: 900,
  textAlign: 'center',
  originX: 'center',
  fontSize: 48,
  fontFamily: 'Pretendard',
  fontWeight: 'bold',
  fill: '#FFFFFF',
  lineHeight: 1.2,
  wordWrap: true,
});

canvas.add(headline);
```

---

### 2. TOP_LEFT 레이아웃

**목적:** 부제 또는 중요 정보 강조

```
┌─────────────────────────────────────┐
│ ┌──────────────────┐                │
│ │ headline         │                │
│ │ (좌상단)         │                │
│ └──────────────────┘                │
│                                     │
│ ┌──────────────────┐                │
│ │ body             │    [배경       │
│ │ (좌측)           │     이미지]    │
│ │                  │    (오버레이)   │
│ └──────────────────┘                │
│                                     │
│ ┌──────────────────┐                │
│ │ sub_text         │                │
│ │ (좌하단)         │                │
│ └──────────────────┘                │
│                                     │
└─────────────────────────────────────┘
```

**텍스트 배치:**

```javascript
const topLeftLayout = {
  headline: {
    left: 80,                     // 좌측 마진 80px
    top: 120,                     // 상단 마진 120px
    width: 450,                   // 좌측 절반 너비
    height: 150,
    fontSize: 42,
    fontWeight: 700,
    textAlign: "left",
    fill: "#FFFFFF",
  },
  body: {
    left: 80,
    top: 310,
    width: 450,
    height: 200,
    fontSize: 28,
    fontWeight: 400,
    textAlign: "left",
    fill: "#FFFFFF",
  },
  sub_text: {
    left: 80,
    top: 800,
    width: 450,
    height: 80,
    fontSize: 20,
    fontWeight: 400,
    textAlign: "left",
    fill: "#FFFFFF",
    opacity: 0.85,
  },
};
```

---

### 3. TOP_RIGHT 레이아웃

**목적:** TOP_LEFT와 대칭

```
┌─────────────────────────────────────┐
│                ┌──────────────────┐  │
│                │ headline         │  │
│                │ (우상단)         │  │
│                └──────────────────┘  │
│                                      │
│   [배경              ┌──────────────┐ │
│    이미지]           │ body         │ │
│   (오버레이)         │ (우측)       │ │
│                      │              │ │
│                      └──────────────┘ │
│                ┌──────────────────┐  │
│                │ sub_text         │  │
│                │ (우하단)         │  │
│                └──────────────────┘  │
│                                      │
└─────────────────────────────────────┘
```

**텍스트 배치:**

```javascript
const topRightLayout = {
  headline: {
    left: 1000,                   // 우측 마진 80px (1080 - 80)
    top: 120,
    width: 450,
    height: 150,
    fontSize: 42,
    fontWeight: 700,
    textAlign: "right",
    fill: "#FFFFFF",
    originX: "right",             // 우측 정렬을 위해 필요
  },
  body: {
    left: 1000,
    top: 310,
    width: 450,
    height: 200,
    fontSize: 28,
    fontWeight: 400,
    textAlign: "right",
    fill: "#FFFFFF",
    originX: "right",
  },
  sub_text: {
    left: 1000,
    top: 800,
    width: 450,
    height: 80,
    fontSize: 20,
    fontWeight: 400,
    textAlign: "right",
    fill: "#FFFFFF",
    opacity: 0.85,
    originX: "right",
  },
};
```

---

### 4. BOTTOM_LEFT 레이아웃

**목적:** 이미지 상단 절반 표시, 텍스트 하단

```
┌─────────────────────────────────────┐
│                                      │
│        [배경 이미지]                 │
│        (오버레이)                    │
│                                      │
│                                      │
├─────────────────────────────────────┤
│                                      │
│ ┌──────────────────┐                 │
│ │ headline         │                 │
│ │ (좌하단)         │                 │
│ └──────────────────┘                 │
│                                      │
│ ┌──────────────────┐                 │
│ │ body             │                 │
│ │ (좌측)           │                 │
│ └──────────────────┘                 │
│                                      │
│ ┌──────────────────┐                 │
│ │ sub_text         │                 │
│ └──────────────────┘                 │
└─────────────────────────────────────┘
```

**텍스트 배치:**

```javascript
const bottomLeftLayout = {
  headline: {
    left: 80,
    top: 620,                     // 하단 영역 시작 (1080 * 57%)
    width: 450,
    height: 100,
    fontSize: 38,
    fontWeight: 700,
    textAlign: "left",
    fill: "#2D2D2D",              // 밝은 배경 위에 검은색
  },
  body: {
    left: 80,
    top: 750,
    width: 450,
    height: 150,
    fontSize: 24,
    fontWeight: 400,
    textAlign: "left",
    fill: "#2D2D2D",
  },
  sub_text: {
    left: 80,
    top: 920,
    width: 450,
    height: 80,
    fontSize: 18,
    fontWeight: 400,
    textAlign: "left",
    fill: "#6B7280",
  },
};
```

---

### 5. BOTTOM_RIGHT 레이아웃

**목적:** BOTTOM_LEFT와 대칭

[구조는 TOP_RIGHT와 유사하되 위치가 하단]

```javascript
const bottomRightLayout = {
  headline: {
    left: 1000,
    top: 620,
    width: 450,
    height: 100,
    fontSize: 38,
    fontWeight: 700,
    textAlign: "right",
    fill: "#2D2D2D",
    originX: "right",
  },
  // ... body, sub_text 유사하게
};
```

---

### 6. SPLIT 레이아웃

**목적:** 이미지와 텍스트를 좌우 분할

```
┌────────────────────┬─────────────────┐
│                    │                 │
│   [배경 이미지]    │  headline       │
│   (좌측 50%)       │  (우측)         │
│   (오버레이)       │                 │
│                    │  body           │
│                    │                 │
│                    │  sub_text       │
│                    │                 │
│                    │                 │
└────────────────────┴─────────────────┘
```

**배경 분할:**
- 좌측 0~540px: 배경 이미지 (오버레이 포함)
- 우측 540~1080px: 흰색 또는 팔레트 색상

**텍스트 배치:**

```javascript
const splitLayout = {
  headline: {
    left: 810,                    // 우측 중앙 (540 + 270)
    top: 150,
    width: 420,
    height: 150,
    fontSize: 40,
    fontWeight: 700,
    textAlign: "left",
    fill: "#2D2D2D",
    originX: "center",
  },
  body: {
    left: 810,
    top: 350,
    width: 420,
    height: 200,
    fontSize: 26,
    fontWeight: 400,
    textAlign: "left",
    fill: "#2D2D2D",
    originX: "center",
  },
  sub_text: {
    left: 810,
    top: 800,
    width: 420,
    height: 100,
    fontSize: 18,
    fontWeight: 400,
    textAlign: "left",
    fill: "#6B7280",
    originX: "center",
  },
};
```

---

## 배경 이미지 렌더링

### 이미지 로드 및 적용

```typescript
// Fabric.js에서 배경 이미지 설정
async function setBackgroundImage(
  canvas: fabric.Canvas,
  imageUrl: string
) {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      fabric.Image.fromURL(
        imageUrl,
        (image) => {
          // 이미지를 캔버스 크기에 맞게 조정
          image.scaleToWidth(1080);
          image.scaleToHeight(1080);

          canvas.setBackgroundImage(image, canvas.renderAll.bind(canvas), {
            top: canvas.height / 2,
            left: canvas.width / 2,
            originX: 'center',
            originY: 'center',
          });

          resolve(image.getElement() as HTMLImageElement);
        },
        {},
        { crossOrigin: 'anonymous' }
      );
    });
  } catch (error) {
    console.error('Failed to load background image:', error);
    // Fallback: solid color
    canvas.setBackgroundColor('#F8F7FF', canvas.renderAll.bind(canvas));
  }
}
```

### 오버레이 처리

배경 이미지 위에 반투명 오버레이 추가:

```typescript
function addOverlay(
  canvas: fabric.Canvas,
  color: string,        // e.g. "#000000"
  opacity: number       // 0.0 ~ 1.0
) {
  const overlay = new fabric.Rect({
    left: 0,
    top: 0,
    width: 1080,
    height: 1080,
    fill: color,
    opacity: opacity,
    selectable: false,
    evented: false,
  });

  canvas.sendToBack();
  canvas.renderAll();
}
```

**오버레이 기본값:**
- 색상: #000000 (검은색)
- 투명도: 0.3 (30%)

---

## 폰트 & 텍스트 렌더링

### 폰트 로드

```typescript
// Pretendard 웹폰트 프리로드 (HTML <head>)
<link
  rel="preload"
  as="font"
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
  type="font/woff2"
  crossorigin
/>

// 또는 CSS
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

// Fabric.js에서 폰트 설정
fabric.Object.prototype.fontFamily = 'Pretendard';
```

### 텍스트 스타일 맵핑

| 텍스트 필드 | 폰트 크기 | 폰트 두께 | 줄 높이 | 최대 글자 수 |
|-----------|----------|---------|--------|-----------|
| headline | 48px (CENTER) / 42px (TOP_*) / 40px (SPLIT) | 700 Bold | 1.2 | 15자 |
| body | 32px (CENTER) / 28px (TOP_*) / 26px (SPLIT) | 400 Regular | 1.5 | 50자 |
| sub_text | 22px (CENTER) / 20px (TOP_*) / 18px (SPLIT) | 400 Regular | 1.4 | 30자 |

### 텍스트 색상

```javascript
// 컨텐츠 팔레트별 기본 텍스트 색상

const palettes = {
  calm: {
    textColor: '#FFFFFF',           // 밝은 배경에 흰색 사용
    alternateColor: '#2D2D2D',     // 어두운 배경에 검은색
  },
  warm: {
    textColor: '#FFFFFF',
    alternateColor: '#2D2D2D',
  },
  nature: {
    textColor: '#FFFFFF',
    alternateColor: '#2D2D2D',
  },
  soft: {
    textColor: '#FFFFFF',
    alternateColor: '#2D2D2D',
  },
};

// 레이아웃별 기본 색상:
// - CENTER, TOP_LEFT, TOP_RIGHT: #FFFFFF (이미지 위에 강한 대비)
// - BOTTOM_LEFT, BOTTOM_RIGHT, SPLIT: #2D2D2D (밝은 배경)
```

---

## 텍스트 오버플로우 처리

### Fabric.js TextBox 설정

```typescript
const textBox = new fabric.Textbox(text, {
  width: 900,
  height: 180,
  fontSize: 32,
  wordWrap: true,
  breakWords: true,
  charSpacing: 0,           // Pretendard 기본
});

// 오버플로우 감지
textBox.on('changed', () => {
  if (textBox.height && textBox.height > textBox.maxHeight) {
    console.warn('Text overflow detected');
    // 글자 크기 축소 또는 엘립시스 처리
  }
});
```

### 엘립시스 처리 (3줄 이상)

```typescript
function truncateText(text: string, maxLines: number = 3): string {
  const lines = text.split('\n');
  if (lines.length > maxLines) {
    return lines.slice(0, maxLines).join('\n') + '...';
  }
  return text;
}
```

---

## 색상 팔레트 적용

card_spec의 `palette` 필드에 따라 배경 색상 결정:

```typescript
const paletteStyles = {
  calm: {
    bgColor: '#F0F4F8',
    primaryColor: '#7B9EBD',
    accentColor: '#4A7C9B',
  },
  warm: {
    bgColor: '#FFF5F0',
    primaryColor: '#E8A87C',
    accentColor: '#D4856B',
  },
  nature: {
    bgColor: '#F1F8E9',
    primaryColor: '#7CB88E',
    accentColor: '#4CAF50',
  },
  soft: {
    bgColor: '#F3E5F5',
    primaryColor: '#B39DDB',
    accentColor: '#9575CD',
  },
};

// SPLIT 레이아웃의 우측 배경색으로 사용
function applySplitBackground(
  canvas: fabric.Canvas,
  palette: string
) {
  const style = paletteStyles[palette] || paletteStyles.calm;

  const splitBg = new fabric.Rect({
    left: 540,
    top: 0,
    width: 540,
    height: 1080,
    fill: style.bgColor,
    selectable: false,
    evented: false,
  });

  canvas.sendToBack();
  canvas.add(splitBg);
}
```

---

## Fabric.js 캔버스 초기화 및 렌더링

### 캔버스 초기화

```typescript
const canvas = new fabric.Canvas('card-canvas', {
  width: 1080,
  height: 1080,
  backgroundColor: '#FFFFFF',
  selection: true,
  preserveObjectStacking: true,
  enableRetinaScaling: false,  // 성능 최적화
});

// 배경 이미지 로드
await setBackgroundImage(canvas, card.background.url);

// 오버레이 추가
addOverlay(canvas, card.overlay.color, card.overlay.opacity);

// 텍스트 추가
const layout = getLayoutRules(card.layout);
const textElements = createTextElements(card.text, layout);
textElements.forEach(el => canvas.add(el));

// 최종 렌더링
canvas.renderAll();
```

### 렌더링 최적화

```typescript
// Fabric.js 성능 최적화
canvas.renderOnAddRemove = false;  // 자동 렌더링 비활성화
canvas.stateful = false;            // 상태 저장 비활성화

// 배치 처리
canvas.forEachObject(obj => {
  obj.selectable = false;
  obj.evented = false;
});

// 수동 렌더링
canvas.renderAll();

// 복원
canvas.renderOnAddRemove = true;
canvas.stateful = true;
```

---

## 동적 텍스트 업데이트

편집 시 텍스트 변경:

```typescript
function updateText(
  canvas: fabric.Canvas,
  fieldPath: string,     // e.g. "headline"
  newText: string
) {
  const textObject = canvas.getObjects().find(
    obj => obj.name === fieldPath
  );

  if (textObject && textObject instanceof fabric.Textbox) {
    textObject.set({ text: newText });
    canvas.renderAll();
  }
}
```

---

## 캔버스 내보내기

최종 이미지로 내보내기 (서버 사이드):

```typescript
// 클라이언트에서 canvas.toDataURL() 호출
const imageData = canvas.toDataURL({
  format: 'png',
  quality: 1.0,
  multiplier: 1,
});

// 또는 PDF 포맷 (jspdf 라이브러리)
import jsPDF from 'jspdf';

const pdf = new jsPDF({
  orientation: 'portrait',
  unit: 'px',
  format: [1080, 1080],
});

pdf.addImage(imageData, 'PNG', 0, 0, 1080, 1080);
pdf.save('card-news.pdf');
```

---

## QC 배지 표시 (AGENT 7 연동)

card_spec.qc_status에 따라 캔버스에 배지 표시:

```typescript
function addQCBadge(
  canvas: fabric.Canvas,
  qcStatus: { status: string; message?: string }
) {
  if (qcStatus.status === 'passed') {
    return; // 배지 표시 안 함
  }

  const badgeIcon = qcStatus.status === 'warning' ? '⚠️' : '❌';
  const badgeColor = qcStatus.status === 'warning' ? '#FAAD14' : '#FF4D4F';

  const badge = new fabric.Text(badgeIcon, {
    left: 1020,
    top: 20,
    fontSize: 48,
    fill: badgeColor,
    selectable: false,
    evented: false,
  });

  canvas.add(badge);
  canvas.renderAll();
}
```

---

## 접근성 & 의미론

캔버스 요소들에 accessbility 속성 추가:

```typescript
const headline = new fabric.Textbox(text, {
  // ...
  name: 'headline',
  role: 'heading',
  ariaLabel: `카드 제목: ${text}`,
});
```

HTML canvas 대체 텍스트:

```html
<canvas
  id="card-canvas"
  width="1080"
  height="1080"
  role="img"
  aria-label="카드뉴스 미리보기"
>
  카드뉴스 이미지 미리보기
</canvas>
```

---

## 성능 지표

### 렌더링 성능 목표

- **첫 렌더링:** < 500ms (카드 로드 후)
- **텍스트 편집 응답:** < 100ms
- **캔버스 리드로:** < 200ms
- **메모리 사용:** < 50MB (카드 5개 기준)

### 성능 모니터링

```typescript
// Performance API 사용
const startTime = performance.now();

canvas.renderAll();

const endTime = performance.now();
console.log(`Render time: ${endTime - startTime}ms`);

// 또는 Fabric.js 이벤트
canvas.on('after:render', () => {
  console.log('Canvas rendered');
});
```

---

## 에러 처리

### 이미지 로드 실패

```typescript
async function setBackgroundImage(imageUrl: string) {
  try {
    const img = await loadImage(imageUrl);
    canvas.setBackgroundImage(img, ...);
  } catch (error) {
    console.error('Image load failed:', error);
    // Fallback: 팔레트 색상으로 배경 설정
    const paletteColor = paletteStyles[card.palette].bgColor;
    canvas.setBackgroundColor(paletteColor, canvas.renderAll.bind(canvas));
  }
}
```

### 텍스트 오버플로우

```typescript
function validateTextLength(text: string, max: number): boolean {
  if (text.length > max) {
    console.warn(`Text exceeds limit: ${text.length} / ${max}`);
    return false;
  }
  return true;
}
```

---

## 참고 링크

- **Fabric.js 문서:** http://fabricjs.com/docs/
- **캔버스 API:** https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **Pretendard 폰트:** https://www.npmjs.com/package/pretendard
- **토큰 참조:** `/product_team/design_system/tokens.yaml`

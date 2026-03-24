# UI 컴포넌트 명세

_관리: 프로덕트 디자이너 (AGENT 0-D)_

## 캔버스 에디터 컴포넌트

### CardCanvas
- **파일:** `canvas_editor/frontend/components/CardCanvas.jsx`
- **역할:** Fabric.js 기반 카드 미리보기 & 편집 캔버스
- **Props:** `cardSpec`, `selectedCardIndex`, `onUpdate`
- **크기:** 1080x1080 (미리보기 시 축소 렌더링)
- **인터랙션:** 텍스트 클릭 → 인라인 편집, 배경 더블클릭 → 교체 패널

### CardList
- **파일:** `canvas_editor/frontend/components/CardList.jsx`
- **역할:** 카드 썸네일 리스트 (좌측 패널)
- **Props:** `cards`, `selectedIndex`, `onSelect`, `onReorder`
- **인터랙션:** 클릭 선택, 드래그앤드롭 순서 변경

### StylePanel
- **파일:** `canvas_editor/frontend/components/StylePanel.jsx`
- **역할:** 선택된 카드의 스타일 편집 (우측 패널)
- **Props:** `selectedCard`, `onStyleChange`
- **기능:** 컬러 팔레트, 폰트, 레이아웃 변경

### ImageReplacementPanel
- **파일:** `canvas_editor/frontend/components/ImageReplacementPanel.jsx`
- **역할:** 배경 이미지 교체 패널
- **Props:** `cardId`, `currentSrc`, `onReplace`
- **상태:** `idle` | `dragging` | `previewing` | `loading`
- **드롭존 크기:** 280x280px
- **지원 포맷:** PNG, JPG, WEBP

### ExportButton
- **파일:** `canvas_editor/frontend/components/ExportButton.jsx`
- **역할:** 승인 & 업로드 버튼
- **Props:** `cardSpec`, `onApprove`
- **상태:** `idle` | `exporting` | `approved`

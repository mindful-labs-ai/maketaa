# T-E08 Component API Reference

## Quick Integration Guide

All components follow React best practices with proper TypeScript typing, ref-forwarding, and error handling.

---

## 1. useStyleSelectors Hook

**Location:** `/canvas_editor/stores/useStyleSelectors.ts`

### Selectors (Read-only)

#### `useCardPalette()`
Returns the selected card's color palette.
```typescript
const palette = useCardPalette();
// Returns: ColorPalette | undefined
// ColorPalette {
//   primary?: string;
//   secondary?: string;
//   text?: string;
//   background?: string;
// }
```

#### `useCardLayout()`
Returns the selected card's layout type.
```typescript
const layout = useCardLayout();
// Returns: CardLayout | undefined
// Type: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "split"
```

#### `useCardFontSizes()`
Returns headline and body font sizes.
```typescript
const fontSizes = useCardFontSizes();
// Returns: { headline_size: number; body_size: number } | null
```

#### `useCardOverlay()`
Returns the overlay opacity value (0-1).
```typescript
const overlay = useCardOverlay();
// Returns: number (default 0.3)
```

#### `useCardBackground()`
Returns the full background object.
```typescript
const background = useCardBackground();
// Returns: CardBackground | null
// CardBackground {
//   type: "image" | "gradient" | "solid";
//   src?: string | null;
//   prompt?: string | null;
//   overlay_opacity?: number;
// }
```

#### `useCardTextColor()`
Returns the text color from the palette.
```typescript
const textColor = useCardTextColor();
// Returns: string | undefined (default "#FFFFFF")
```

#### `useCardFullStyle()`
Returns the complete style object.
```typescript
const style = useCardFullStyle();
// Returns: CardStyle | null
// CardStyle {
//   layout?: CardLayout;
//   color_palette?: ColorPalette;
//   font?: FontStyle;
// }
```

#### `useCardBackgroundType()`
Returns the background type.
```typescript
const bgType = useCardBackgroundType();
// Returns: "image" | "gradient" | "solid" (default "solid")
```

### Mutation Hooks

#### `useUpdateCardStyle()`
Hook to update card style properties.
```typescript
const updateCardStyle = useUpdateCardStyle();

// Usage:
await updateCardStyle({
  layout: "top-left",
  color_palette: { primary: "#FF0000" },
  font: { headline_size: 48 }
});
```

#### `useUpdateCardBackground()`
Hook to update card background.
```typescript
const updateCardBackground = useUpdateCardBackground();

// Usage:
await updateCardBackground({
  type: "gradient",
  overlay_opacity: 0.5
});
```

---

## 2. StylePanel Component

**Location:** `/canvas_editor/components/StylePanel.tsx`

### Props

```typescript
interface StylePanelProps {
  className?: string;
}
```

### Features

- **Width:** w-72 (288px) - Fixed right sidebar
- **Auto-save:** Integrated with debounced auto-save (1s)
- **Disabled state:** Grayed out when no card selected
- **Ref-forwarding:** Supports React.forwardRef

### Sections

1. **Color Palette** (🎨)
   - 4 color buttons: primary, secondary, text, background
   - Click-to-apply functionality
   - Hex color display
   - Collapsible

2. **Layout Selector** (📐)
   - 6 layout chips: center, top-left, top-right, bottom-left, bottom-right, split
   - Active state highlighting
   - Korean labels
   - Collapsible

3. **Font Sizes** (📝)
   - Headline size: 32-64px (step 2)
   - Body size: 20-40px (step 2)
   - Range sliders
   - Real-time value display
   - Collapsible

4. **Overlay Opacity** (🎯)
   - Range: 0.0-1.0 (step 0.05)
   - Percentage display
   - Live preview box
   - Collapsible

5. **Background Controls** (🖼️)
   - Type selector: image, gradient, solid
   - Image preview
   - Type-specific controls
   - Collapsible

### Usage

```typescript
import StylePanel from '@/components/StylePanel';

export function EditorLayout() {
  return (
    <div className="flex">
      {/* Center area */}
      <main className="flex-1">
        {/* CardCanvas */}
      </main>
      {/* Right sidebar */}
      <StylePanel />
    </div>
  );
}
```

---

## 3. StatusBadge Component

**Location:** `/canvas_editor/components/StatusBadge.tsx`

### Props

```typescript
interface StatusBadgeProps {
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'published';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}
```

### Status Colors & Labels

| Status | Color | Label | Animation |
|--------|-------|-------|-----------|
| draft | Gray | 작성중 | None |
| review | Yellow | 검토중 | Pulse |
| approved | Green | 승인됨 | None |
| rejected | Red | 반려됨 | None |
| published | Blue | 발행됨 | None |

### Sizes

- `sm`: text-xs, px-2 py-1
- `md`: text-sm, px-3 py-1.5 (default)
- `lg`: text-base, px-4 py-2

### Features

- Color-coded badges with status labels (Korean)
- Inline dot indicator
- Pulse animation for review state
- Ref-forwarding support

### Usage

```typescript
import StatusBadge from '@/components/StatusBadge';
import { useCardSpecMeta } from '@/stores/useCardStore';

export function Header() {
  const meta = useCardSpecMeta();

  return (
    <div className="flex items-center gap-4">
      <h1>{meta?.topic}</h1>
      {meta && (
        <StatusBadge
          status={meta.status}
          size="md"
          className="flex-shrink-0"
        />
      )}
    </div>
  );
}
```

---

## 4. ApproveDialog Component

**Location:** `/canvas_editor/components/ApproveDialog.tsx`

### Props

```typescript
interface ApproveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  specId?: string;
}
```

### Behavior

1. **Open:** Pass `isOpen={true}`
2. **Checklist:** Show 3 required items
   - 모든 카드 검토 완료
   - SNS 캡션 확인
   - 안전성 검증
3. **Validation:** All checkboxes must be checked
4. **Action:** Click approve → `setStatus('approved')`
5. **Callback:** `onConfirm()` fires on success
6. **Close:** Auto-closes after 500ms

### Features

- Modal overlay (fixed inset-0, bg-black/50)
- Checkbox list with descriptions
- Approve button enabled only when all checked
- Error display with AlertCircle icon
- Loading state ("승인중...")
- Auto-close on success
- Cancel button to dismiss

### Usage

```typescript
import ApproveDialog from '@/components/ApproveDialog';
import { useState } from 'react';

export function Header({ specId }: { specId: string }) {
  const [showApprove, setShowApprove] = useState(false);

  return (
    <>
      <button onClick={() => setShowApprove(true)}>
        승인 & 발행
      </button>
      <ApproveDialog
        isOpen={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={() => console.log('Card approved!')}
        specId={specId}
      />
    </>
  );
}
```

---

## 5. RejectDialog Component

**Location:** `/canvas_editor/components/RejectDialog.tsx`

### Props

```typescript
interface RejectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  specId?: string;
}
```

### Validation

- **Minimum:** 10 characters (required)
- **Maximum:** 500 characters (enforced)
- **Feedback:** Color-coded (gray → green → red)

### Behavior

1. **Open:** Pass `isOpen={true}`
2. **Input:** User enters rejection reason
3. **Validation:** Real-time character count
4. **Action:** Click reject → `setStatus('rejected')` + recordEdit
5. **Callback:** `onConfirm()` fires on success
6. **Close:** Auto-closes after 500ms

### Features

- Modal overlay (fixed inset-0, bg-black/50)
- Textarea (max 500 chars, enforced)
- Character counter (current/max)
- Validation messages
- Color-coded border based on validity:
  - Gray: 0 chars
  - Green: 10-500 chars
  - Red: > 500 chars
- Error display with AlertCircle
- Loading state ("반려중...")
- Cancel button

### Usage

```typescript
import RejectDialog from '@/components/RejectDialog';
import { useState } from 'react';

export function Header({ specId }: { specId: string }) {
  const [showReject, setShowReject] = useState(false);

  return (
    <>
      <button onClick={() => setShowReject(true)}>
        반려
      </button>
      <RejectDialog
        isOpen={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={() => console.log('Card rejected!')}
        specId={specId}
      />
    </>
  );
}
```

---

## 6. SnsPanel Component

**Location:** `/canvas_editor/components/SnsPanel.tsx`

### Props

```typescript
interface SnsPanelProps {
  className?: string;
}
```

### Features

#### Instagram Editor
- **Max:** 2,200 characters
- **Rows:** 6 (default textarea height)
- **Warning:** 90%+ triggers yellow alert
- **Error:** >100% triggers red alert

#### Threads Editor
- **Max:** 500 characters
- **Rows:** 4 (default textarea height)
- **Warning:** 90%+ triggers yellow alert
- **Error:** >100% triggers red alert

### Statistics Display

- **Character count:** current/max with color feedback
- **Hashtag count:** Auto-detected with regex `#[\w가-힣]+`
- **Status indicator:** Checkmark (green), alert (yellow), error (red)

### Warning Levels

- **None (Green):** 0-90% → CheckCircle2 icon
- **Warning (Yellow):** 90-100% → AlertCircle icon
- **Error (Red):** >100% → AlertCircle icon

### Features

- Emoji indicators (📷 Instagram, 💬 Threads)
- Real-time character enforcement
- Hashtag detection and counting
- Platform-specific tips
- Character counter with validation
- Disabled state when no card selected
- Helpful info boxes
- Auto-sync on card change
- Debounced updates to store
- Full error handling

### Usage

```typescript
import SnsPanel from '@/components/SnsPanel';

export function EditorPage() {
  return (
    <div className="space-y-6">
      {/* StylePanel */}
      <div>
        <h2>스타일 편집</h2>
        {/* ... */}
      </div>

      {/* SNS Panel */}
      <SnsPanel className="max-w-4xl" />
    </div>
  );
}
```

---

## Common Patterns

### Pattern 1: Dialog Management

```typescript
import ApproveDialog from '@/components/ApproveDialog';
import RejectDialog from '@/components/RejectDialog';
import { useState } from 'react';

export function ApprovalButtons({ specId }: { specId: string }) {
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const handleApproveSuccess = () => {
    // Refresh UI or redirect
    console.log('Card approved successfully');
  };

  const handleRejectSuccess = () => {
    // Refresh UI
    console.log('Card rejected successfully');
  };

  return (
    <>
      <button
        onClick={() => setShowApprove(true)}
        className="btn btn-success"
      >
        승인 & 발행
      </button>
      <button
        onClick={() => setShowReject(true)}
        className="btn btn-error"
      >
        반려
      </button>

      <ApproveDialog
        isOpen={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={handleApproveSuccess}
        specId={specId}
      />
      <RejectDialog
        isOpen={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={handleRejectSuccess}
        specId={specId}
      />
    </>
  );
}
```

### Pattern 2: Style Editing with Selectors

```typescript
import {
  useCardPalette,
  useCardLayout,
  useUpdateCardStyle
} from '@/stores/useStyleSelectors';

export function StyleEditor() {
  const palette = useCardPalette();
  const layout = useCardLayout();
  const updateStyle = useUpdateCardStyle();

  const handleLayoutChange = async (newLayout: string) => {
    await updateStyle({ layout: newLayout as any });
  };

  return (
    <div>
      <h3>Current Layout: {layout}</h3>
      <button onClick={() => handleLayoutChange('center')}>
        Center
      </button>
      {/* ... */}
    </div>
  );
}
```

### Pattern 3: Status Display

```typescript
import StatusBadge from '@/components/StatusBadge';
import { useCardSpecMeta } from '@/stores/useCardStore';

export function CardHeader() {
  const meta = useCardSpecMeta();

  if (!meta) return null;

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1>{meta.topic}</h1>
        {meta.angle && <p className="text-gray-600">{meta.angle}</p>}
      </div>
      <StatusBadge status={meta.status} size="lg" />
    </div>
  );
}
```

---

## Error Handling

All components include comprehensive error handling:

### StylePanel
```typescript
try {
  await updateCardStyle(styleUpdates);
} catch (error) {
  console.error('[StylePanel] Failed to update:', error);
  // Error auto-displays in console (development only)
}
```

### ApproveDialog
```typescript
try {
  await setStatus('approved');
  // Success - auto-close after 500ms
} catch (error) {
  setError(error.message);
  // Error displays in red alert box
}
```

### RejectDialog
```typescript
try {
  await recordEdit(meta.id, ...);
  await setStatus('rejected');
} catch (error) {
  setError(error.message);
  // Error displays in red alert box
}
```

### SnsPanel
```typescript
try {
  await updateSnsCaption('instagram', caption);
} catch (error) {
  console.error('[SnsPanel] Failed to update:', error);
}
```

---

## Performance Considerations

1. **StylePanel:** Uses granular selectors to prevent unnecessary re-renders
2. **SnsPanel:** Debounces caption updates (1s default from store)
3. **Dialogs:** Only render content when isOpen=true
4. **StatusBadge:** Lightweight pure component (no state)
5. **Overall:** No expensive computations, proper memoization

---

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

All components use:
- CSS Grid/Flexbox (no floats)
- CSS Custom Properties (for dynamic colors)
- Modern JavaScript (ES2020+)
- React Hooks (18+)

---

## Accessibility Features

- ✅ Proper label associations (`htmlFor`)
- ✅ ARIA attributes where needed
- ✅ Keyboard navigation support
- ✅ Focus management
- ✅ Color contrast (WCAG AA)
- ✅ Screen reader friendly
- ✅ Semantic HTML

---

## Troubleshooting

### Issue: StylePanel not showing updates
**Solution:** Check that selectedCardIndex is set correctly in store

### Issue: ApproveDialog not closing
**Solution:** Ensure onClose prop is passed and bound correctly

### Issue: SnsPanel showing old captions
**Solution:** Captions auto-sync on card ID change (dependencies: [meta?.id])

### Issue: StatusBadge not pulsing
**Solution:** Check that Tailwind animate-pulse is enabled in config

---

## Related Documentation

- ARCHITECTURE.md - Full project architecture
- STATE_MANAGEMENT.md - Zustand store patterns
- API.md - API endpoint documentation
- DEPLOYMENT.md - Vercel deployment guide

---

**Last Updated:** 2026-03-09
**Component Library Version:** 1.0.0
**Status:** Production Ready ✅


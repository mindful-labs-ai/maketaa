# Canvas Editor MVP - Code Quality Review

**Date:** 2026-03-16
**Reviewer:** Claude Code (code-reviewer agent)
**Scope:** 8 core files (pages, middleware, components)

---

## Review Summary

| Metric | Value |
|--------|-------|
| **Files Reviewed** | 8 (+2 store files for context) |
| **Total Issues** | 23 |
| **CRITICAL** | 3 |
| **HIGH (Major)** | 7 |
| **MEDIUM (Minor)** | 8 |
| **LOW (Info)** | 5 |

**Verdict: REQUEST CHANGES** -- CRITICAL/HIGH issues must be resolved before production release.

---

## CRITICAL Issues

### [CRITICAL-1] Zustand store mutates state objects directly (data corruption risk)

**File:** `stores/useCardStore.ts:158`, `:198`, `:246`, `:298`, `:389`
**Category:** Logic Defect / State Management

Zustand (without Immer middleware) expects immutable updates. The store directly mutates the `card` object obtained from `get()` before calling `set()`:

```typescript
// Line 158 - updateCardText
const card = cardSpec.cards[cardIndex];
card.text = { ...card.text, [field]: value };  // MUTATES existing object

set((state) => ({
  cardSpec: state.cardSpec,  // Returns SAME reference -> Zustand may skip re-render
  ...
}));
```

The same pattern repeats in `updateCardStyle` (line 198), `updateCardBackground` (line 246), `reorderCards` (line 298), and `setStatus` (line 389).

Because `set()` returns the same `cardSpec` reference, Zustand's shallow equality check may skip notifying subscribers. This leads to:
- Canvas not re-rendering after text/style edits (intermittent)
- Stale data being auto-saved to Supabase

**Fix:** Create new object references at every level of mutation:

```typescript
updateCardText: async (cardIndex, field, value) => {
  const { cardSpec } = get();
  if (!cardSpec || cardIndex >= cardSpec.cards.length) throw new Error('Invalid card index');

  const oldValue = cardSpec.cards[cardIndex].text[field] || '';
  const updatedCards = cardSpec.cards.map((card, i) =>
    i === cardIndex ? { ...card, text: { ...card.text, [field]: value } } : card
  );

  set({
    cardSpec: { ...cardSpec, cards: updatedCards },
    unsavedChanges: true,
    editCount: get().editCount + 1,
  });
  // ...
};
```

Alternatively, add `immer` middleware to the store to allow direct mutations safely:
```typescript
import { immer } from 'zustand/middleware/immer';
const useCardStore = create<CardStoreState>()(immer((set, get) => ({ ... })));
```

---

### [CRITICAL-2] Fabric.js canvas event listener leaks on re-render

**File:** `components/CardCanvasClient.tsx:199`
**Category:** Memory Leak

The `mouse:down` event handler is registered inside `renderCard()`, which runs on every `useEffect` re-execution (triggered whenever `card` or `onTextClick` changes). However, the cleanup function at line 216-218 only calls `fabricCanvas.dispose()`.

The problem: if `onTextClick` changes identity on every parent render (which it does, since `handleTextClick` in `editor/[id]/page.tsx:94` is not memoized with `useCallback`), the entire canvas is destroyed and re-created on every parent re-render. This causes:

1. Visible flicker on every re-render
2. Potential memory leaks if `dispose()` doesn't fully clean up background image references
3. Unnecessary network requests to re-fetch background images

**Fix (two-part):**

Part A - Memoize callbacks in `editor/[id]/page.tsx`:
```typescript
const handleTextClick = useCallback((fieldName: string) => {
  if (fieldName === 'headline' || fieldName === 'body' || fieldName === 'sub_text') {
    setEditingField(fieldName);
  }
}, []);
```

Part B - Separate event binding from canvas initialization in `CardCanvasClient.tsx`:
```typescript
// Keep event listener in a separate useEffect that only depends on onTextClick
useEffect(() => {
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;

  const handler = (e: fabric.TEvent) => {
    const target = e.target as any;
    if (target?.data?.fieldName) onTextClick?.(target.data.fieldName);
  };
  canvas.on('mouse:down', handler);
  return () => { canvas.off('mouse:down', handler); };
}, [onTextClick]);
```

---

### [CRITICAL-3] Middleware blocks login page access entirely

**File:** `middleware.ts:12-14`
**Category:** Logic Defect

```typescript
if (request.nextUrl.pathname === '/login') {
  return NextResponse.redirect(new URL('/', request.url));
}
```

The middleware unconditionally redirects `/login` to `/`. This means:
- If the auth gate is ever re-enabled, users cannot reach the login page
- The `login/page.tsx` component is dead code -- it can never be rendered
- The `/auth/callback` magic-link redirect flow (which needs to land on `/login` with a hash token) is broken

**Fix:** Either remove the redirect entirely (and the login page if not needed), or make it conditional:
```typescript
// Only redirect authenticated users away from login
if (request.nextUrl.pathname === '/login') {
  // Check for auth cookie/header here
  // If authenticated: redirect to '/'
  // If not: NextResponse.next()
}
```

---

## HIGH Issues

### [HIGH-1] `forwardRef<any>` defeats TypeScript safety on CardCanvasClient

**File:** `components/CardCanvasClient.tsx:41`
**Category:** Type Safety

```typescript
const CardCanvasClient = React.forwardRef<any, CardCanvasClientProps>(
```

Using `any` as the ref type eliminates all type checking on ref usage. If a parent passes a ref and tries to call methods on it, there will be no compile-time protection.

**Fix:**
```typescript
const CardCanvasClient = React.forwardRef<HTMLDivElement, CardCanvasClientProps>(
```
Or if the ref is not used externally (which it appears not to be -- the `ref` parameter is never used inside the component body), remove `forwardRef` entirely and make it a plain function component.

---

### [HIGH-2] `as any` type assertions suppress type checking in StylePanel

**File:** `components/StylePanel.tsx:137`, `components/StylePanel.tsx:176`
**Category:** Type Safety

```typescript
layout: newLayout as any,      // line 137
type: type as any,              // line 176
```

These bypass the `CardLayout` and `CardBackground['type']` type checks. If `LAYOUT_TYPES` or `BACKGROUND_TYPES` constants contain an invalid value, no error will be raised.

**Fix:** Use the proper types:
```typescript
layout: newLayout as CardLayout,
type: type as CardBackground['type'],
```
Or better, type the constants themselves:
```typescript
const LAYOUT_TYPES: CardLayout[] = ['center', 'top-left', ...];
const BACKGROUND_TYPES: CardBackground['type'][] = ['image', 'gradient', 'solid'];
```

---

### [HIGH-3] `backgroundUpdates: any` in store action signature

**File:** `stores/useCardStore.ts:53`
**Category:** Type Safety

```typescript
updateCardBackground: (cardIndex: number, backgroundUpdates: any) => Promise<void>;
```

This allows callers to pass arbitrary objects without validation. The `useUpdateCardBackground` wrapper in `useStyleSelectors.ts:174` types it as `Partial<CardBackground>`, but the underlying store action accepts anything.

**Fix:**
```typescript
updateCardBackground: (cardIndex: number, backgroundUpdates: Partial<CardBackground>) => Promise<void>;
```

---

### [HIGH-4] `handleModalSave` silently swallows errors

**File:** `app/editor/[id]/page.tsx:103-104`
**Category:** Error Handling

```typescript
updateCardText(selectedCardIndex, fieldName, value).catch((err) => {
  console.error('[EditorPage] Failed to update card text:', err);
});
```

When `updateCardText` fails, the user sees no feedback. The modal has already closed (line 94 in `TextEditModal.tsx`), and the text appears to revert without explanation.

**Fix:** Show a user-visible error notification:
```typescript
updateCardText(selectedCardIndex, fieldName, value).catch((err) => {
  console.error('[EditorPage] Failed to update card text:', err);
  setError('Failed to save text. Please try again.');
  // or use a toast notification system
});
```

---

### [HIGH-5] Dashboard `statusConfig` object recreated every render

**File:** `app/page.tsx:70-99`
**Category:** Performance

`statusConfig` contains JSX (React elements via `<Clock />`, `<AlertCircle />`, etc.) and is recreated on every render. Each render produces new React element references for the icons, which can cause unnecessary re-renders in child components that receive these as props.

**Fix:** Move `statusConfig` outside the component as a module-level constant, or wrap it in `useMemo`:
```typescript
const statusConfig = useMemo(() => ({
  draft: { badge: '...', icon: <Clock size={16} />, ... },
  // ...
}), []);
```

---

### [HIGH-6] Login page accesses `window` unconditionally (SSR crash risk)

**File:** `app/login/page.tsx:26`
**Category:** Logic Defect

```typescript
const hasHashToken = window.location.hash?.includes('access_token');
```

Although the file has `'use client'`, Next.js may still attempt server-side rendering of client components during build or initial page load. Accessing `window` directly in `useEffect` is safe, but this specific `useEffect` runs on mount so it should be fine at runtime. However, if Next.js ever pre-renders this component (e.g., during static generation), it will throw `ReferenceError: window is not defined`.

**Fix:** Add a guard:
```typescript
const hasHashToken = typeof window !== 'undefined' &&
  window.location.hash?.includes('access_token');
```

---

### [HIGH-7] `onTextClick` in CardCanvasClient dep array causes full canvas rebuild

**File:** `components/CardCanvasClient.tsx:219`
**Category:** Performance

```typescript
}, [card, onTextClick]);
```

The `useEffect` dependency array includes `onTextClick`. Since the parent does not memoize `handleTextClick`, it changes identity every render, causing the entire Fabric.js canvas (including image loading) to be destroyed and recreated.

This is part of the CRITICAL-2 issue but worth noting separately: even after fixing the event listener leak, the `card` object from Zustand selector also returns the same mutable reference (due to CRITICAL-1), so changes triggered by style edits may not properly trigger canvas updates.

**Fix:** After fixing CRITICAL-1 (immutable state) and CRITICAL-2 (separating event binding), the dep array should only contain `card`:
```typescript
}, [card]);
```

---

## MEDIUM Issues

### [MEDIUM-1] Filter buttons recompute counts on every render

**File:** `app/page.tsx:174`
**Category:** Performance

```typescript
{specs.filter((s) => s.status === status).length}
```

This filter runs for each of the 4 status buttons on every render. For small datasets this is negligible, but it could be memoized:

**Fix:**
```typescript
const statusCounts = useMemo(() => {
  const counts: Record<string, number> = {};
  specs.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });
  return counts;
}, [specs]);
```

---

### [MEDIUM-2] No error recovery UI in dashboard after load failure

**File:** `app/page.tsx:194-204`
**Category:** UX

The error state shows a message but provides no "retry" button. The user must manually refresh the page.

**Fix:** Add a retry button:
```tsx
<button onClick={() => { setError(null); /* re-trigger loadSpecs */ }}>
  다시 시도
</button>
```

---

### [MEDIUM-3] `LAYOUT_POSITIONS` missing type safety for `card.style?.layout`

**File:** `components/CardCanvasClient.tsx:113-114`
**Category:** Type Safety

```typescript
const positionConfig = LAYOUT_POSITIONS[card.style?.layout || 'center'];
```

If `card.style?.layout` has a value not in `LAYOUT_POSITIONS` (e.g., a future new layout type), `positionConfig` will be `undefined`, causing `baseX` and `baseY` to be `NaN`.

**Fix:**
```typescript
const layoutKey = card.style?.layout || 'center';
const positionConfig = LAYOUT_POSITIONS[layoutKey] ?? LAYOUT_POSITIONS['center'];
```

---

### [MEDIUM-4] TextEditModal Escape key conflicts with editor page Escape handler

**File:** `components/TextEditModal.tsx:82-88` vs `app/editor/[id]/page.tsx:83-84`
**Category:** Logic Defect

Both the TextEditModal and the EditorPage register `keydown` listeners for `Escape`. When the modal is open and the user presses Escape:
1. The modal's listener fires `onClose()` (closes modal)
2. The editor's listener fires `setEditingField(null)` (also tries to close)

While functionally this works (both close the modal), the editor's handler should check if a modal is open before processing Escape, or the modal should call `e.stopPropagation()`.

**Fix:** In TextEditModal, stop propagation:
```typescript
if (e.key === 'Escape') {
  e.stopPropagation();
  onClose();
}
```

---

### [MEDIUM-5] Canvas accessibility -- no keyboard/screen reader support

**File:** `components/CardCanvasClient.tsx` (entire file)
**Category:** Accessibility (a11y)

The `<canvas>` element has no `aria-label`, no fallback content, and text objects are only clickable via mouse. Screen readers cannot access any content rendered on the canvas.

**Fix:**
```tsx
<canvas
  ref={canvasRef}
  aria-label={`Card canvas: ${card.text?.headline || 'untitled'}`}
  role="img"
  tabIndex={0}
>
  {/* Fallback for screen readers */}
  {card.text?.headline && <p>{card.text.headline}</p>}
  {card.text?.body && <p>{card.text.body}</p>}
</canvas>
```

---

### [MEDIUM-6] Preset palette click does not include `try/catch`

**File:** `components/StylePanel.tsx:313-321`
**Category:** Error Handling

The preset palette `onClick` calls `updateCardStyle()` directly without `try/catch`, unlike all other handlers in the same component.

```typescript
onClick={() =>
  updateCardStyle({
    color_palette: { ... },
  })
}
```

**Fix:** Wrap in try/catch consistent with other handlers, or extract a shared `handlePresetSelect` function.

---

### [MEDIUM-7] `params.id as string` unsafe type assertion

**File:** `app/editor/[id]/page.tsx:27`
**Category:** Type Safety

```typescript
const specId = params.id as string;
```

`useParams()` returns `Record<string, string | string[]>`. If the route had catch-all segments, `params.id` could be an array. The assertion hides this.

**Fix:**
```typescript
const rawId = params.id;
const specId = Array.isArray(rawId) ? rawId[0] : rawId;
if (!specId) { /* handle missing id */ }
```

---

### [MEDIUM-8] Color text input has no validation

**File:** `components/StylePanel.tsx:233`
**Category:** Input Validation

```tsx
<input
  type="text"
  value={palette.primary || ''}
  onChange={(e) => handlePaletteColorClick('primary', e.target.value)}
/>
```

Users can type any arbitrary string (e.g., "hello") as a color value. This will be saved to the database and cause rendering issues on the canvas.

**Fix:** Validate hex color format before applying:
```typescript
const isValidHex = /^#([0-9A-Fa-f]{3}){1,2}$/.test(value);
if (isValidHex) handlePaletteColorClick('primary', value);
```

---

## LOW Issues

### [LOW-1] `console.error` / `console.warn` left in production code

**Files:** Multiple locations across all reviewed files
**Category:** Code Quality

Production code should use a structured logging library or at minimum a log-level-gated wrapper, not raw `console.error`/`console.warn`.

**Fix:** Create a logger utility: `lib/logger.ts` that only logs in development.

---

### [LOW-2] `group-hover` class used without `group` parent

**File:** `app/page.tsx:267`
**Category:** CSS Bug

```tsx
className="text-gray-400 group-hover:text-gray-600 transition-colors"
```

The arrow icon uses `group-hover:text-gray-600` but the parent `<button>` does not have the `group` class. The hover effect will never trigger.

**Fix:** Add `group` class to the parent button at line 239:
```tsx
<button
  key={spec.id}
  onClick={() => handleCardClick(spec.id)}
  className="group bg-white rounded-lg ..."
>
```

---

### [LOW-3] Mixed language in UI text

**Files:** Multiple (page.tsx, login/page.tsx, TextEditModal.tsx, etc.)
**Category:** UX Consistency

Some UI text is in Korean ("카드 스펙 불러오는 중..."), some in English ("Loading editor...", "No cards to display"). This should be consistent, or better yet, use an i18n library.

---

### [LOW-4] `disabled` attribute on "새 카드 만들기" button with `alert()` handler

**File:** `app/page.tsx:147-149`
**Category:** Code Quality

```tsx
<button onClick={handleCreateNew} disabled>
```

The button is permanently disabled and `handleCreateNew` calls `alert()`. This is placeholder code that should be cleaned up or replaced with a proper disabled state without the handler.

---

### [LOW-5] CardList sidebar uses fixed `h-screen` that may clip in editor layout

**File:** `components/CardList.tsx:239`
**Category:** Layout

```tsx
<div className="w-72 h-screen bg-gray-50 ...">
```

The CardList uses `h-screen` but it is nested inside a flex container with a Header and Footer in `editor/[id]/page.tsx:140`. This can cause the sidebar to overflow the visible area by the height of the header + footer.

**Fix:** Use `h-full` instead of `h-screen` to respect the parent flex container:
```tsx
<div className="w-72 h-full bg-gray-50 ...">
```

---

## Positive Observations

1. **Well-organized code structure:** Files are clearly separated by responsibility, with consistent section comments (`// ======`) that improve readability.

2. **Good error handling pattern in async operations:** Most async functions (data loading, API calls) use proper try/catch/finally with loading states and error messages.

3. **Zustand store is well-architected:** The separation of selectors (`useStyleSelectors.ts`) from the main store, and the auto-save debounce pattern, are solid architectural choices.

4. **TextEditModal has excellent UX details:** Proper focus management, Cmd/Ctrl+Enter shortcut, character counter with limit validation, overlay click-to-close, and aria attributes.

5. **DnD implementation in CardList is clean:** Good use of `@dnd-kit` with proper sensor configuration and the sortable pattern.

6. **Collapsible sections in StylePanel:** Good use of composition with the `CollapsibleSection` helper component.

7. **Type definitions are thorough:** The `types/index.ts` file provides comprehensive type coverage for the entire data model.

---

## Priority Remediation Plan

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | CRITICAL-1: Zustand state mutation | Medium | Fixes data corruption, stale renders |
| P0 | CRITICAL-2: Canvas event listener leak | Low | Fixes memory leak, flicker |
| P0 | CRITICAL-3: Middleware blocks login | Low | Fixes dead login flow |
| P1 | HIGH-1: `forwardRef<any>` | Low | Type safety |
| P1 | HIGH-2: `as any` assertions | Low | Type safety |
| P1 | HIGH-3: `backgroundUpdates: any` | Low | Type safety |
| P1 | HIGH-4: Silent error swallowing | Low | User feedback |
| P1 | HIGH-5: statusConfig per-render | Low | Performance |
| P1 | HIGH-6: SSR window access | Low | Build safety |
| P1 | HIGH-7: Canvas rebuild on every render | Low | Performance |
| P2 | MEDIUM-1 through MEDIUM-8 | Low-Med | Quality/UX |
| P3 | LOW-1 through LOW-5 | Low | Polish |

---

## Recommendation

**REQUEST CHANGES** -- The three CRITICAL issues (Zustand direct mutation, canvas memory leak, middleware login block) require fixes before this code can be considered production-ready. The HIGH issues should be addressed in the same sprint. MEDIUM and LOW issues can be scheduled for subsequent iterations.

---

*Review generated by Claude Code (code-reviewer agent) on 2026-03-16*

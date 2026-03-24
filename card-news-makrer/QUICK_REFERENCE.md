# Canvas Editor MVP - Quick Reference Guide

_For developers needing to extend or integrate the Canvas Editor_

---

## 1. Loading a Card Spec

### From a Component
```typescript
import { useCardStore } from '@/stores/useCardStore';
import { getCardSpecById } from '@/lib/api';

export function MyComponent() {
  const loadSpec = useCardStore((state) => state.loadSpec);

  useEffect(() => {
    const fetchSpec = async () => {
      const record = await getCardSpecById('2026-03-09-001');
      loadSpec(record.spec);
    };
    fetchSpec();
  }, [loadSpec]);
}
```

---

## 2. Editing Card Text

### Update Headline
```typescript
const updateCardText = useCardStore((state) => state.updateCardText);

// Card index 0, update headline to new text
await updateCardText(0, 'headline', '새로운 제목');
```

### Validate Text Before Saving
```typescript
import { validateHeadline, validateBody } from '@/lib/validators';

const validation = validateHeadline('My Headline');
if (!validation.valid) {
  console.error(validation.message);
}
```

---

## 3. Changing Card Style

### Update Colors
```typescript
const updateCardStyle = useCardStore((state) => state.updateCardStyle);

await updateCardStyle(0, {
  color_palette: {
    primary: '#7B9EBD',
    secondary: '#B8D4E3',
    text: '#2D2D2D',
  },
});
```

### Change Layout
```typescript
await updateCardStyle(0, {
  layout: 'top-left', // or 'center', 'top-right', etc.
});
```

### Adjust Font Size
```typescript
await updateCardStyle(0, {
  font: {
    headline_size: 48,
    body_size: 24,
  },
});
```

---

## 4. Reordering Cards

### Drag-and-Drop (Automatic)
The CardList component handles drag-and-drop automatically with dnd-kit.

### Programmatic Reorder
```typescript
const reorderCards = useCardStore((state) => state.reorderCards);

// Move card from index 2 to index 0
await reorderCards(2, 0);
```

---

## 5. Approving/Rejecting

### Approve (Trigger Publishing)
```typescript
import { approveCardSpec } from '@/lib/api';
import { useCardStore } from '@/stores/useCardStore';

const specId = '2026-03-09-001';
const setStatus = useCardStore((state) => state.setStatus);

const handleApprove = async () => {
  await approveCardSpec(specId);
  await setStatus('approved');
};
```

### Reject with Reason
```typescript
import { rejectCardSpec } from '@/lib/api';

const handleReject = async (reason: string) => {
  await rejectCardSpec(specId, reason);
  await setStatus('draft');
};
```

---

## 6. Recording Edits

### Automatic (Built-in)
Every action in the store automatically records edits to `edit_logs`:
- `updateCardText()` → logs field_path, old_value, new_value
- `reorderCards()` → logs card order change
- `updateCardStyle()` → logs style changes

### Manual Edit Logging
```typescript
import { recordEdit } from '@/lib/api';

await recordEdit(
  '2026-03-09-001',        // spec_id
  'cards[0].text.headline', // field_path
  'Old headline',           // old_value
  'New headline',           // new_value
  'User corrected typo'     // reason (optional)
);
```

---

## 7. Fetching Edit History

```typescript
import { getEditLogs } from '@/lib/api';

const logs = await getEditLogs('2026-03-09-001');
logs.forEach(log => {
  console.log(`${log.editor} changed ${log.field_path}:`);
  console.log(`  From: ${log.old_value}`);
  console.log(`  To: ${log.new_value}`);
});
```

---

## 8. SNS Caption Management

### Update Instagram Caption
```typescript
const updateSnsCaption = useCardStore((state) => state.updateSnsCaption);

await updateSnsCaption('instagram', '새로운 인스타그램 캡션 텍스트...');
```

### Update Threads Caption
```typescript
await updateSnsCaption('threads', '스레드 게시 텍스트...');
```

---

## 9. Rendering a Card on Canvas

### Component Usage
```typescript
import CardCanvas from '@/components/CardCanvas';

const card = cardSpec.cards[0];

<CardCanvas
  card={card}
  onTextClick={(fieldName) => {
    console.log('User clicked:', fieldName);
    // Open edit modal
  }}
/>
```

### Canvas Configuration
The canvas automatically:
- Scales to 1080×1080 internally
- Displays at responsive size via CSS
- Loads background images with overlay
- Renders text with proper fonts
- Detects clicks on text fields

---

## 10. State Selectors (Performance)

### Use Entire Spec
```typescript
const cardSpec = useCardStore((state) => state.cardSpec);
```

### Use Selected Card Only
```typescript
import { useSelectedCard } from '@/stores/useCardStore';
const card = useSelectedCard(); // null if none selected
```

### Use All Cards
```typescript
import { useAllCards } from '@/stores/useCardStore';
const cards = useAllCards();
```

### Use Auto-Save Status
```typescript
import { useAutoSaveStatus } from '@/stores/useCardStore';
const { status, error } = useAutoSaveStatus();
if (status === 'saving') { /* show spinner */ }
if (status === 'error') { /* show error */ }
```

---

## 11. API CRUD Examples

### Fetch Single Spec
```typescript
import { getCardSpecById } from '@/lib/api';

try {
  const record = await getCardSpecById('2026-03-09-001');
  console.log(record.spec); // CardSpec object
} catch (error) {
  console.error('Failed to load spec');
}
```

### Create New Spec
```typescript
import { createCardSpec } from '@/lib/api';

const newSpec: CardSpec = {
  meta: { /* ... */ },
  cards: [ /* ... */ ],
  sns: { /* ... */ },
};

const record = await createCardSpec(newSpec);
console.log('Created:', record.id);
```

### Update Spec
```typescript
import { updateCardSpec } from '@/lib/api';

await updateCardSpec('2026-03-09-001', {
  meta: {
    status: 'approved', // Change status
  },
});
```

### Delete Spec
```typescript
import { deleteCardSpec } from '@/lib/api';

await deleteCardSpec('2026-03-09-001');
```

---

## 12. Validation Examples

### Validate Entire Spec
```typescript
import { validateCardSpec } from '@/lib/validators';

const result = validateCardSpec(cardSpec);
if (!result.valid) {
  console.error('Invalid spec:', result.error);
}
```

### Validate Text Fields
```typescript
import { validateHeadline, validateBody } from '@/lib/validators';

const h = validateHeadline('My Title');
const b = validateBody('My long body text');

if (!h.valid) console.error(h.message);
if (!b.valid) console.error(b.message);
```

### Validate Color
```typescript
import { validateHexColor } from '@/lib/validators';

if (!validateHexColor('#7B9EBD')) {
  console.error('Invalid color');
}
```

---

## 13. Type Definitions

### CardSpec Type
```typescript
interface CardSpec {
  meta: CardSpecMeta;
  cards: Card[];
  sns: SnsConfig;
}
```

### Card Type
```typescript
interface Card {
  index: number;
  role: CardRole;
  text: CardText;
  style: CardStyle;
  background: CardBackground;
}
```

### Available Types
All types are imported from `@/lib/supabase`:
```typescript
import type {
  CardSpec,
  Card,
  CardText,
  CardStyle,
  CardBackground,
  CardRole,
  CardLayout,
  ColorPalette,
  FontStyle,
  SnsConfig,
} from '@/lib/supabase';
```

---

## 14. Constants Reference

### Text Limits
```typescript
import { TEXT_LIMITS } from '@/lib/constants';

TEXT_LIMITS.headline // 15
TEXT_LIMITS.body     // 50
TEXT_LIMITS.sub_text // -1 (unlimited)
```

### Card Roles
```typescript
import { CARD_ROLES } from '@/lib/constants';

CARD_ROLES.cover     // '표지'
CARD_ROLES.empathy   // '공감'
CARD_ROLES.cause     // '원인'
// ... etc
```

### Layout Types
```typescript
import { LAYOUT_TYPES } from '@/lib/constants';

LAYOUT_TYPES // ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'split']
```

### Color Palettes
```typescript
import { COLOR_PALETTES } from '@/lib/constants';

COLOR_PALETTES.calm     // { primary: '#7B9EBD', ... }
COLOR_PALETTES.warm     // { primary: '#E8A87C', ... }
COLOR_PALETTES.nature   // { primary: '#7CB88E', ... }
COLOR_PALETTES.soft     // { primary: '#B39DDB', ... }
```

---

## 15. Utility Functions

### Debounce
```typescript
import { debounce } from '@/lib/utils';

const debouncedSearch = debounce((query: string) => {
  // Search after 500ms of no typing
}, 500);
```

### Format Date
```typescript
import { formatDate } from '@/lib/utils';

const readable = formatDate('2026-03-09T10:30:00+09:00');
// → "2026년 3월 9일 오전 10:30"
```

### Deep Clone
```typescript
import { deepClone } from '@/lib/utils';

const copy = deepClone(cardSpec);
// Fully independent copy
```

### Get Contrast Color
```typescript
import { getContrastColor } from '@/lib/utils';

const textColor = getContrastColor('#7B9EBD');
// → '#FFFFFF' (white text for better contrast)
```

---

## 16. Error Handling

### Handle API Errors
```typescript
import { getErrorMessage } from '@/lib/api';

try {
  await updateCardSpec(id, updates);
} catch (error) {
  const message = getErrorMessage(error);
  console.error(message); // User-friendly message
}
```

### Handle Supabase Errors
```typescript
import { handleSupabaseError } from '@/lib/supabase';

try {
  // Supabase operation
} catch (error) {
  const message = handleSupabaseError(error);
  toast.error(message);
}
```

---

## 17. Environment Variables

### Required
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Optional
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_DEBUG=false
```

### Accessing in Code
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const isDebug = process.env.NEXT_PUBLIC_DEBUG === 'true';
```

---

## 18. Common Workflows

### Complete Edit Workflow
```typescript
const updateCardText = useCardStore((state) => state.updateCardText);
const autoSaveStatus = useCardStore((state) => state.autoSaveStatus);

// User edits text
await updateCardText(cardIndex, 'headline', 'New Title');

// Check save status
if (autoSaveStatus === 'saving') {
  // Show spinner
} else if (autoSaveStatus === 'saved') {
  // Show success
} else if (autoSaveStatus === 'error') {
  // Show error
}
```

### Approve & Publish Workflow
```typescript
import { approveCardSpec } from '@/lib/api';

const handleApprove = async () => {
  try {
    const record = await approveCardSpec(specId);
    // Record status change
    await setStatus('approved');
    // Trigger publishing (external service)
  } catch (error) {
    toast.error('Approval failed');
  }
};
```

### Card Selection Workflow
```typescript
const selectCard = useCardStore((state) => state.selectCard);
const selectedCard = useSelectedCard();

const handleSelectCard = (index: number) => {
  selectCard(index);
  // Component re-renders with new selected card
};
```

---

## 19. Performance Tips

### Prevent Unnecessary Re-renders
```typescript
// Use selectors, not entire store
const selectedCard = useCardStore((state) => {
  if (!state.cardSpec) return null;
  return state.cardSpec.cards[state.selectedCardIndex];
});
// Component only re-renders when selectedCard changes
```

### Batch Multiple Updates
```typescript
import { batch } from '@/lib/utils';

const updates = [
  () => updateCardText(0, 'headline', 'Title'),
  () => updateCardStyle(0, { layout: 'center' }),
  () => updateCardText(1, 'headline', 'Title 2'),
];

await batch(updates, 100); // 100ms between operations
```

### Retry Failed Operations
```typescript
import { retry } from '@/lib/utils';

const result = await retry(
  () => updateCardSpec(id, updates),
  3,        // max attempts
  1000      // base delay
);
```

---

## 20. Debugging Tips

### Check Store State
```typescript
const state = useCardStore.getState();
console.log('Current spec:', state.cardSpec);
console.log('Selected card:', state.selectedCardIndex);
console.log('Auto-save status:', state.autoSaveStatus);
```

### Enable Debug Logging
```bash
# In .env.local
NEXT_PUBLIC_DEBUG=true
```

### Check Edit Logs
```typescript
const logs = await getEditLogs(specId);
console.table(logs); // Pretty print in DevTools
```

### Verify Supabase Connection
```typescript
import { isAuthenticated } from '@/lib/supabase';

const authed = await isAuthenticated();
console.log('Authenticated:', authed);
```

---

## Quick Command Reference

```bash
# Development
npm run dev              # Start dev server

# Build & Deploy
npm run build            # Production build
npm start                # Run production

# Code Quality
npm run type-check       # TypeScript check
npm run lint             # ESLint check
npm run format           # Format code

# Database
npm run db:migrate       # Apply migrations
npm run db:seed          # Seed sample data
```

---

## Common Error Solutions

### "Supabase connection failed"
- Check `NEXT_PUBLIC_SUPABASE_URL` in .env.local
- Verify Supabase project is active
- Check network connectivity

### "RLS policy error"
- Ensure user is authenticated
- Check RLS policies in Supabase dashboard
- Verify owner_id matches auth.uid()

### "Canvas not rendering"
- Check browser console for errors
- Verify Fabric.js is loaded (dynamic import)
- Check background image URL is accessible

### "Edit not saving"
- Check auto-save status indicator
- Verify Supabase connection
- Check browser network tab

---

_Last Updated: 2026-03-09_
_For more details, see ARCHITECTURE.md_

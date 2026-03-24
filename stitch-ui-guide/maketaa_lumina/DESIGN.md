# Design System Specification: The Ethereal Professional

## 1. Overview & Creative North Star: "The Digital Curator"
This design system moves beyond the standard SaaS "dashboard" aesthetic to embrace an editorial, high-end AI experience. Our Creative North Star is **The Digital Curator**: a workspace that feels like a quiet, high-tech gallery rather than a cluttered tool. 

We break the "template" look by prioritizing **intentional asymmetry** and **tonal depth**. By utilizing expansive white space (the "breathing room") and replacing rigid structural lines with subtle shifts in surface luminance, we create an interface that feels intelligent, responsive, and premium. The goal is a "soft-brutalist" efficiency—where every element is necessary and every transition is fluid.

---

## 2. Color Architecture
Our palette is rooted in deep obsidian tones, punctuated by a high-energy brand gradient.

### Core Palette
- **App Background:** `#0A0A0F` (The foundation of the "void")
- **Surface Tiers:** 
    - `surface-1`: `#12121A` (Primary layout containers)
    - `surface-2`: `#1A1A25` (Nested cards and interactive elements)
    - `surface-3`: `#232330` (Hover states and elevated modals)
- **Brand Accent:** Linear Gradient (135°) from `#7C5CFC` to `#5B8DEF`
- **Text:** 
    - Primary: `#F0F0F5` (High legibility)
    - Secondary: `#9898A8` (Metadata and descriptions)
    - Tertiary: `#5A5A6E` (Disabled or placeholder states)

### The "No-Line" Rule
To achieve a high-end feel, **1px solid borders are prohibited for sectioning.** Boundaries must be defined solely through:
1. **Background Color Shifts:** A `surface-2` sidebar sitting directly on a `surface-1` main stage.
2. **Nesting:** Using the `surface-container` tiers (Lowest to Highest) to create physical layers. Think of the UI as stacked sheets of tinted glass—the inner-most content should always feel the "closest" to the light.

### The Glass & Gradient Rule
For floating elements (modals, dropdowns, or hovering tooltips), use **Glassmorphism**. Apply a semi-transparent version of `surface-3` with a `20px` backdrop-blur. This integrates the element into the layout rather than "pasting" it on top.

---

## 3. Typography: The Editorial Voice
We use **Pretendard** as our sole typeface. Its modern, sans-serif construction provides a clean, neutral canvas for AI-generated content while maintaining professional authority.

| Level | Token | Font | Size | Weight | Tracking |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Pretendard | 3.5rem | 700 | -0.02em |
| **Headline** | `headline-md` | Pretendard | 1.75rem | 600 | -0.01em |
| **Title** | `title-sm` | Pretendard | 1rem | 600 | 0 |
| **Body** | `body-md` | Pretendard | 0.875rem | 400 | 0 |
| **Label** | `label-sm` | Pretendard | 0.6875rem | 500 | 0.05em |

**Editorial Strategy:** Use `display-lg` sparingly for high-impact marketing moments. For the core application, the contrast between `headline-md` (Primary Text) and `body-md` (Secondary Text) creates a hierarchy that guides the user’s eye without the need for icons or bullets.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than drop shadows.

- **The Layering Principle:** Stack `surface-container-lowest` cards on a `surface-container-low` section to create a soft, natural lift.
- **Ambient Shadows:** When a shadow is strictly required for accessibility (e.g., a floating Action Button), use a diffused `24px` blur at 6% opacity using a tinted version of the surface color—never pure black.
- **The "Ghost Border":** For input fields or high-density grids where separation is vital, use a "Ghost Border": the `border-subtle` (`#2A2A3A`) at **40% opacity**. This provides a hint of structure without interrupting the visual flow.

---

## 5. Components & Interaction Patterns

### Buttons
*   **Primary:** Uses the Brand Gradient. Text is `#F0F0F5`. 4px internal glow (top-down) for a tactile feel.
*   **Secondary:** `surface-2` background. Ghost Border applied.
*   **Tertiary:** Ghost Border only, no background fill.

### Input Fields
*   **Base State:** `surface-1` background, Ghost Border.
*   **Focus State:** Border becomes the primary brand color (`#7C5CFC`), with a `2px` outer "bloom" (glow) of the same color at 15% opacity.
*   **Layout:** Labels must sit 8px above the field in `label-sm` (Tertiary Text color).

### Cards & Lists
*   **The No-Divider Rule:** Forbid the use of divider lines between list items. Use **Vertical White Space** (Spacing Token `4`: 1.4rem) or subtle background shifts on hover to separate content. 
*   **Radius:** Cards use `radius-lg` (12px). Small UI elements (chips/buttons) use `radius-md` (8px).

### AI-Specific Components
*   **The "Insight" Module:** A special container using a subtle 5% opacity brand gradient background to signify AI-generated suggestions.
*   **Prompt Bar:** A floating, glassmorphic input centered at the bottom of the viewport, using `surface-3` with high backdrop-blur to signify its "global" importance.

---

## 6. Do’s and Don’ts

### Do
*   **DO** use the 4px grid system for all padding and margins to ensure mathematical harmony.
*   **DO** use Lucide React icons at a consistent 2px stroke. Icons should always be paired with text in `secondary` or `tertiary` colors.
*   **DO** favor asymmetrical layouts—place your primary CTA slightly off-center or use varying column widths to create a custom, editorial feel.

### Don't
*   **DON'T** use 100% opaque, high-contrast borders. It breaks the "glass" metaphor.
*   **DON'T** crowd the interface. If a screen feels busy, increase the spacing between `surface` layers before adding more dividers.
*   **DON'T** use standard grey shadows. Always tint shadows with the background hue to maintain the deep, dark-mode atmosphere.
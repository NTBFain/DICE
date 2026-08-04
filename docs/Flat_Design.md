# Universal Web Design Specification & Accessibility Guidelines
A Reusable Design System Standard for Inclusive, Barrier-Free Web Applications

---

## 1. Core Philosophy & Universal Design Integration
This design specification defines a universal, framework-agnostic standard for building web interfaces based on the **7 Principles of Universal Design** and **WCAG 2.2 AAA/AA Accessibility Standards**.

The primary objective is to guarantee equal access, seamless navigation, and optimal user experience across all digital products—regardless of user abilities, age, assistive technologies (screen readers, eye-trackers, keyboard-only controls), network conditions, or device types.

### The 7 Universal Design Principles for Web Interfaces:
1. **Equitable Use (การใช้งานอย่างเท่าเทียม):** Every feature must provide an identical or equivalent experience for all users (e.g., text alternatives for images, screen-reader landmark structures, multi-modal feedback).
2. **Flexibility in Use (ความยืดหยุ่นในการใช้งาน):** Accommodate individual preferences and adaptive settings (light/dark modes, font scaling up to 200%, motion reduction, high-contrast modes).
3. **Simple and Intuitive Use (ความเรียบง่ายและเข้าใจง่าย):** Predictable navigation, clean information architecture, clear visual hierarchy, eliminating unnecessary cognitive load.
4. **Perceptible Information (ข้อมูลที่รับรู้ได้ง่าย):** Multi-sensory communication (combining text, icons, and colors), AAA contrast ratios, legible typography, and ARIA live regions for dynamic updates.
5. **Tolerance for Error (ความผิดพลาดต่ำ):** Safeguard users against accidental destructive actions (confirmation prompts, undo windows, clear error identification and inline recovery instructions).
6. **Low Physical Effort (การออกแรงน้อย):** Generous click/touch targets (minimum 44x44px / 48x48px), full keyboard accessibility, logical tab sequences, and avoidance of complex gesture requirements.
7. **Size and Space for Approach and Use (ขนาดและพื้นที่ที่เหมาะสม):** Responsive layout reflow without horizontal scrolling, adaptive spacing, comfortable reading line lengths, and flexible container bounds.

---

## 2. Inclusive Color System & Contrast Standards
All color tokens strictly satisfy **WCAG 2.2 Level AA / AAA standards** for contrast ratios:
- **Normal Body Text:** Minimum **4.5:1** (AA) / **7:1** (AAA) against background.
- **Large Text (>= 24px or 18px Bold):** Minimum **3:1** (AA) / **4.5:1** (AAA).
- **UI Components & Graphical Controls:** Minimum **3:1** against adjacent colors.

### 2.1 Color Tokens & Palettes

#### Light Mode
*   **Canvas Background:** `#FFFFFF` or `#FDFDFD` (High-clarity canvas).
*   **Surface / Card Background:** `#F4F4F6` (Subtle boundary separation with >= 15:1 text contrast).
*   **Text Primary:** `#111111` (Ink Black) — **18.1:1** contrast ratio (Exceeds AAA).
*   **Text Secondary:** `#4A4A4A` (Deep Graphite) — **7.2:1** contrast ratio (AAA Compliant).
*   **Structural Borders:** `#CCCCCC` (Solid border) — **3.2:1** UI component contrast.
*   **Primary Accent:** `#002BDC` or `#1D4ED8` — Contrast ratio >= **7:1** against white.
*   **Focus Ring Outline:** `#002BDC` or `#111111` (3px width, 2px offset).

#### Dark Mode
*   **Canvas Background:** `#09090B` or `#121214` (Eye-strain-free background).
*   **Surface / Card Background:** `#18181B` or `#1F1F23`.
*   **Text Primary:** `#F4F4F5` (Zinc White) — **16.5:1** contrast ratio (Exceeds AAA).
*   **Text Secondary:** `#D1D5DB` (Light Zinc) — **10.5:1** contrast ratio (AAA Compliant).
*   **Structural Borders:** `#3F3F46` (Crisp Zinc) — **3.5:1** UI component contrast.
*   **Primary Accent:** `#60A5FA` or `#E2B857` — Contrast ratio >= **7:1** against dark canvas.
*   **Focus Ring Outline:** `#FACC15` or `#FFFFFF` (3px width, 2px offset).

### 2.2 Color-Blind Safe & Multi-Modal Status Rules
*   **Dual-Coding Rule:** Information MUST NEVER be conveyed by color alone. Every status, warning, or badge must combine **Color + Icon + Text Label**:
    *   **Success / Active:** Green background + Checkmark `✓` + Label `[Active / Success]`
    *   **Warning / Pending:** Amber background + Alert triangle `⚠️` + Label `[Warning / Pending]`
    *   **Error / Destructive:** Red background + Cross `✕` + Label `[Error / Failed]`
    *   **Info / Neutral:** Blue/Gray background + Info `ℹ` + Label `[Info]`

---

## 3. Accessible Typography & Scaling
Typography acts as the structural foundation of the interface. It must scale gracefully and remain readable across all device sizes and browser zoom levels.

### 3.1 Typography Guidelines
*   **Base Font Size:** `1rem` (16px minimum). Never use text smaller than 14px (`0.875rem`).
*   **Fluid Headings:** Use CSS `clamp()` for responsive, unclipped headings:
    ```css
    h1 { font-size: clamp(2rem, 4vw, 3.5rem); line-height: 1.2; }
    h2 { font-size: clamp(1.5rem, 3vw, 2.25rem); line-height: 1.3; }
    h3 { font-size: clamp(1.25rem, 2vw, 1.75rem); line-height: 1.4; }
    ```
*   **Body Line Height & Line Length:** Minimum line-height `1.5` (150%). Limit body text width to **60–75 characters per line** (`max-width: 65ch`) for comfortable scanning.
*   **Tabular Numbers for Data:** Apply `font-variant-numeric: tabular-nums` to financial tables, counters, or timers to prevent horizontal layout jitter during updates.
*   **Zoom & Reflow Support (WCAG 1.4.10):** Layout must support **200% browser zoom** without text overlapping, clipping, or inducing horizontal scrolling.

---

## 4. Universal Layout Architecture & UI Components

### 4.1 Touch Targets & Spacing (Low Physical Effort)
*   **Minimum Target Size:** All interactive elements (buttons, links, inputs, checkboxes, icon toggles) MUST have a minimum clickable/touchable boundary of **44x44px** (preferably **48x48px**).
*   **Spacing Between Controls:** Maintain at least **8px** of clear space between adjacent interactive touch targets to prevent accidental taps.

### 4.2 Form Controls & Labels
*   **Explicit Label Linkage:** Every input field must be programmatically paired with a `<label>` via `for="id"` or enclosed within the label element.
*   **Helper & Error Text:** Link helper descriptions and error messages using `aria-describedby="helper-id"` and indicate invalid inputs with `aria-invalid="true"`.

### 4.3 Images & Media Accessibility
*   **Mandatory Alt Text:** Every non-decorative image must include a descriptive `alt` attribute (e.g., `alt="Summary chart showing quarterly revenue growth"`). Decorative images must use `alt=""` or `aria-hidden="true"`.
*   **Audio/Video Alternatives:** Videos must provide captions (`<track kind="captions">`) and audio transcripts where applicable.

---

## 5. Keyboard Navigation & Focus Indicators

### 5.1 Focus Ring Standard
*   **Mandatory Focus Rings:** Never set `outline: none` or `outline: 0` without providing a custom high-contrast focus indicator.
*   **Focus Ring Style:**
    ```css
    :focus-visible {
      outline: 3px solid var(--accent-color);
      outline-offset: 2px;
      border-radius: 2px;
    }
    ```

### 5.2 Navigation & Modal Behavior
*   **Logical Tab Order:** Ensure the interactive tab sequence matches the visual reading order (`tabindex="0"` for custom interactive controls; avoid `tabindex > 0`).
*   **Modal Focus Lock:** Dialogs and drawers MUST trap keyboard focus inside while active and restore focus to the triggering element upon closing.
*   **Escape Key Exit:** All modals, dropdowns, and overlays must close immediately when the `Escape` key is pressed.

---

## 6. Motion Sensitivity & Reduced Motion

Respect user OS settings for reduced motion (`prefers-reduced-motion`).

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- Avoid auto-playing looping animations, flashing elements (> 3 flashes/sec), or parallax scrolling that causes vestibular motion sickness.

---

## 7. Assistive Technology & ARIA Standards

1.  **HTML5 Landmark Regions:** Structure pages cleanly using semantic tags:
    - `<header>` (Site Banner)
    - `<nav>` (Primary Navigation)
    - `<main>` (Core Page Content)
    - `<aside>` (Sidebar / Auxiliary Content)
    - `<footer>` (Footer Information)
2.  **Dynamic Content (ARIA Live):** Use `aria-live="polite"` for asynchronous updates (toasts, live counters, search results) so screen readers announce changes without interrupting active focus.
3.  **Headings Hierarchy:** Maintain strict sequential heading levels (`<h1>` -> `<h2>` -> `<h3>`). Never skip heading levels for visual styling.

---

## 8. Error Prevention & User Recovery

1.  **High-Stakes Confirmation:** Critical or irreversible actions (deleting data, making financial transactions, sending broadcast messages) must require an explicit double-confirmation step (modal or typed verification).
2.  **Undo Grace Period:** Provide a short undo window (e.g., 5-10 seconds) for accidental actions like deleting items or sending messages.
3.  **Clear Validation Feedback:** Display inline validation error messages directly adjacent to the input field, formatted with clear text and error icons.

---

## 9. Universal Web Accessibility Checklist (Anti-Patterns to Ban)

- ❌ **NO Color-Only Indicators:** Always combine Color + Icon + Text Label.
- ❌ **NO Tiny Text:** Baseline text starts at 16px (`1rem`); minimum text size is 14px (`0.875rem`).
- ❌ **NO Hidden Focus Rings:** Always provide a high-visibility 3px `:focus-visible` ring.
- ❌ **NO Low Contrast:** Ensure text contrast ratio is >= 4.5:1 (AA) or >= 7:1 (AAA).
- ❌ **NO Sub-standard Touch Targets:** All interactive controls must be at least 44x44px.
- ❌ **NO Horizontal Scroll on Zoom:** Layout must reflow smoothly up to 200% zoom.
- ❌ **NO Flashing or Jarring Motion:** Respect `prefers-reduced-motion` settings.
---
version: gamma
name: Mysun-soft-mobile-workout-design-system
description: |
  A soft mobile workout logging system for a woman in her 20s who uses the app frequently on a phone.
  The product should feel calm, personal, and polished rather than aggressive or commercial.
  It keeps quick workout logging as the first priority, but replaces stark Nike-style black/gray contrast
  with warm neutrals, softer surfaces, compact controls, and gentle success states.

colors:
  ink: "#242124"
  canvas: "#fffdfb"
  warm-surface: "#f8f4f0"
  warm-surface-pressed: "#f2e8e3"
  charcoal: "#4b4541"
  mute: "#7a7470"
  hairline: "#ded4cf"
  hairline-soft: "#eadfda"
  success: "#2f8c63"
  success-surface: "#edf8f1"
  danger: "#c84653"
  blush: "#f7dde2"
  blush-ink: "#8f4b5a"

typography:
  font-stack:
    primary: "Pretendard Variable"
    fallback: "Pretendard, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, system-ui, sans-serif"
    rule: "Korean-first font stack. Do not let Inter lead the stack because Korean and numeric rhythm becomes inconsistent."
  screen-title:
    fontSize: 38px
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: 0
  section-title:
    fontSize: 24px
    fontWeight: 650
    lineHeight: 1.22
    letterSpacing: 0
  row-title:
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: 0
  body:
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.55
    letterSpacing: 0
  caption:
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0
  numeric:
    fontVariantNumeric: tabular-nums
    usage: "Stats, percentages, duration, set count, reps, and volume values."

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  screen-x: 16px
  mobile-section: 24px

radius:
  soft: 14px
  input: 24px
  pill: 9999px
  sheet: 18px

components:
  action-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    height: 48px
    borderRadius: "{radius.pill}"
  action-secondary:
    backgroundColor: "{colors.warm-surface}"
    textColor: "{colors.ink}"
    height: 40px
    borderRadius: "{radius.pill}"
  search-input:
    backgroundColor: "{colors.warm-surface}"
    textColor: "{colors.ink}"
    height: 48px
    borderRadius: "{radius.input}"
  routine-tabs:
    backgroundColor: "{colors.warm-surface}"
    height: 40px
    borderRadius: "{radius.pill}"
    behavior: horizontal-scroll
  sub-tabs:
    backgroundColor: transparent
    height: 32px
    borderBottom: "1px solid {colors.hairline-soft}"
    behavior: horizontal-scroll
  exercise-row:
    backgroundColor: "{colors.canvas}"
    border: "1px solid {colors.hairline-soft}"
    minHeight: 72px
    borderRadius: "{radius.soft}"
  exercise-row-selected:
    backgroundColor: "{colors.success-surface}"
    border: "1px solid #b9dfc5"
    leftIndicator: "4px {colors.success}"
  bottom-sheet:
    backgroundColor: "{colors.canvas}"
    borderRadius: "18px 18px 0 0"
    maxHeight: "92svh"
    footer: sticky
  bottom-nav:
    backgroundColor: "{colors.canvas}"
    safeAreaPadding: true
    activePill: "{colors.ink}"
---

## Product Principle

Mysun should feel like a personal workout companion, not a campaign page. The app is still fast and compact, but the visual tone is warmer: soft ivory background, warm-gray panels, rounded exercise rows, and muted status colors. The design should support repeated daily use without feeling harsh.

## Tone Direction

1. Avoid a pure black/white retail look as the default surface language.
2. Use dark ink only for primary actions, selected tabs, and major contrast anchors.
3. Use warm surfaces for cards, search, inactive tabs, and secondary controls.
4. Use green only for completed or selected states.
5. Avoid decorative pink overload. Blush is allowed only as a subtle accent, not the main UI color.

## Mobile Record Tab Rules

1. The exercise list is the add interface.
2. Exercise rows should be compact but not rigid: 14px radius, warm border, enough vertical breathing room.
3. Record formula, impact ratio, rest time, and helper text belong in the input modal, not the list.
4. Memo and save actions stay near the exercise-add header so the user does not scroll to the bottom to save.
5. Selected exercises use a soft green surface and a small left indicator.

## Modal Rules

Input and memo modals are bottom sheets on mobile. Header is fixed, content scrolls, and footer actions remain reachable. Modal corners can be slightly softer than flat cards because bottom sheets are transient surfaces.

## Card Rules

Cards should feel light and tactile. Use warm-gray fill, subtle borders, and 12-14px radius. Avoid heavy shadows, hard rectangles, and oversized black blocks. Large black panels should be rare and reserved for important summary or account states.

After the mobile polish pass, large black panels should be avoided even more aggressively. Use warm ivory cards with a thin ring and soft shadow for account, saved-workout, and coach-note surfaces. Reserve dark ink for primary action buttons, selected tabs, and small navigation anchors.

## Home / Log / Member Rules

Home should motivate without covering the photo. Goals appear as a thin progress strip above the summary tabs. Log and member pages use the same card rhythm: one card equals one decision. Do not duplicate totals when detailed lists already explain the record.

## Typography Rules

Use Pretendard Variable as the primary UI font. Screen titles can be confident, but not shouted: avoid `font-black`; use bold or semibold depending on hierarchy. Numeric values use tabular numbers so workout counts, time, percentages, and set values align cleanly in cards and lists. Compact panels, rows, tabs, and bottom navigation use 12-16px typography with 0 letter spacing.

## Fixed Implementation Tokens

The app must use shared mobile tokens before per-screen styling. These values are now treated as implementation rules, not suggestions:

- Mobile header height: 56px.
- Horizontal screen padding: 16px.
- Main tab height: 40px.
- Sub tab height: 36px.
- Input/control height: 48px.
- Exercise row minimum height: 76px.
- Standard card radius: 14px.
- Panel radius: 18px.
- Bottom sheet radius: 22px top corners.
- Primary action position: near the current decision area, not at the bottom after long lists.

Core reusable classes:

- `.mysun-section` for mobile page padding and bottom navigation clearance.
- `.mysun-card` for white content cards.
- `.mysun-panel` for warm grouped surfaces.
- `.mysun-sticky-actions` for record-page memo/save actions.
- `.mysun-tabbar` and `.mysun-tab` for routine tabs.
- `.mysun-subtabbar` for secondary category filters.
- `.mysun-exercise-row` for exercise list rows.
- `.mysun-bottom-sheet` and `.mysun-sheet-footer` for modal input flows.

Any new screen should reuse these classes first. Only add one-off Tailwind classes when the shared rule cannot express the layout.

## Mobile Wireframe Priority

Redesign work should happen in this order:

1. Record tab
   - Header and date inputs.
   - Sticky memo/save action strip.
   - Search.
   - Main routine tabs.
   - Sub tabs.
   - Exercise rows.
   - Bottom-sheet exercise input.
   - Saved workout feedback.
2. Home tab
   - Photo hero.
   - Small weekly goal strip below the hero content, not over the face or main subject.
   - Summary range tabs.
   - Summary cards.
   - Recent record.
   - Muscle impact section.
3. Login tab
   - Photo first.
   - `For mysun` only as emotional copy.
   - Auth card.
   - Login/signup segmented control.
   - Inputs.
   - Primary submit.

Do not redesign all tabs at once. Each pass should pick one screen, align it to the shared classes, run validation, and only then move to the next screen.

## Core Screen Acceptance Checklist

- No horizontal overflow at mobile width.
- Primary action is visible near the current task.
- Every touch target is at least 44px high.
- Tabs use one shared height and selected state.
- Exercise rows use one shared row shape.
- Modal input uses bottom sheet structure with sticky footer.
- Empty and error states use Korean recovery copy.
- A screen can be scanned in 5 seconds: title, current task, next action, saved state.


## Copy And Icon Rules

- Korean microcopy should be short, direct, and supportive. Avoid technical wording in primary actions.
- Icons are used as secondary cues beside text labels, especially in bottom navigation and compact action buttons.
- Exercise list cards should prioritize name, body-part context, rest time, and input state. Long formulas stay inside the entry modal.
- Saved exercise states use soft green emphasis and a clear check cue so selected items remain visible while moving across routine tabs.


## Mobile PWA Quality Rules

- All primary taps should have at least a 44px touch target and immediate pressed feedback.
- Network failures should never expose raw database or server messages to users. Show a short Korean recovery action instead.
- Destructive actions require confirmation before data is removed.
- PWA assets must include a manifest, 192px and 512px icons, portrait orientation, and a standalone display mode.
- Heavy hero images should prefer WebP with JPG fallback. Secondary muscle-card images should lazy-load.

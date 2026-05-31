---
version: beta
name: Mysun-mobile-workout-design-system
description: |
  A Nike-inspired mobile workout logging system for fast daily use. The interface keeps the Nike black, white, and soft-gray discipline, but adapts it from commerce to a high-frequency mobile utility: compact exercise rows, flat surfaces, pill actions, bottom-sheet modals, and photography-led motivation.

colors:
  ink: "#111111"
  canvas: "#ffffff"
  soft-cloud: "#f5f5f5"
  charcoal: "#39393b"
  mute: "#707072"
  hairline: "#cacacb"
  hairline-soft: "#e5e5e5"
  success: "#007d48"
  success-surface: "#eaf8ef"
  danger: "#d30005"

typography:
  screen-title:
    fontSize: 40px
    fontWeight: 900
    lineHeight: 1.0
    letterSpacing: 0
  section-title:
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0
  row-title:
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: 0
  body:
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
  caption:
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  screen-x: 16px
  mobile-section: 24px

radius:
  none: 0px
  input: 24px
  pill: 9999px
  sheet: 16px

components:
  action-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    height: 48px
    borderRadius: "{radius.pill}"
  action-secondary:
    backgroundColor: "{colors.soft-cloud}"
    textColor: "{colors.ink}"
    height: 40px
    borderRadius: "{radius.pill}"
  search-input:
    backgroundColor: "{colors.soft-cloud}"
    textColor: "{colors.ink}"
    height: 48px
    borderRadius: "{radius.input}"
  routine-tabs:
    backgroundColor: "{colors.soft-cloud}"
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
    borderRadius: "{radius.none}"
  exercise-row-selected:
    backgroundColor: "{colors.success-surface}"
    border: "1px solid #a9d8b8"
    leftIndicator: "4px {colors.success}"
  bottom-sheet:
    backgroundColor: "{colors.canvas}"
    borderRadius: "16px 16px 0 0"
    maxHeight: "92svh"
    footer: sticky
  bottom-nav:
    backgroundColor: "{colors.canvas}"
    safeAreaPadding: true
    activePill: "{colors.ink}"
---

## Product Principle

Mysun is a high-frequency mobile logging tool. The user should be able to open the record tab, find an exercise, enter numbers, and save without reading long descriptions in the list. The app uses Nike-inspired restraint: black primary actions, white canvas, soft gray staging surfaces, and strong typography. It does not copy Nike commerce cards directly because workout logging is a utility workflow, not a product grid.

## Mobile Record Tab Rules

1. The exercise list itself is the add interface. Do not wrap search, tabs, and rows in a large "운동 추가" card.
2. Exercise rows must stay compact: exercise name, category/primary body part, selected state, and the input action. Record formula, impact ratio, rest time, and helper text belong in the input modal.
3. Routine tabs use a horizontal pill rail. Sub-tabs use a smaller 32px rail with a bottom divider.
4. Save and memo actions stay near the top while browsing, but the exercise input modal owns the final per-exercise save.
5. Selected exercises use success green only as a state signal. Avoid using green as decoration.

## Modal Rules

Input modals are bottom sheets on mobile. Header is fixed, content scrolls, and the save/delete footer is sticky at the bottom with safe-area padding. The save button should always be reachable without scrolling through helper text.

## Card Rules

Use flat cards. Avoid shadows except where a browser surface needs separation. Prefer hairline borders and soft-gray sections. Exercise list rows use square or very small radius geometry; pill shapes are reserved for buttons and chips.

## Home / Log / Member Rules

Home, log, and member cards should use the same flat panel language. A card should summarize one decision or one record. Avoid repeating totals when the child list already explains the session.

## Typography Rules

Large titles are allowed only for screen titles such as "오늘 운동" and "운동 요약". Compact panels, rows, tabs, and bottom navigation use 12-16px typography. Do not use viewport-based font sizing.

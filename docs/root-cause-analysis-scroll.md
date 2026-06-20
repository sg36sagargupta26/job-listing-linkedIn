# Root Cause Analysis: Panel Scroll Failure

**Issue:** The floating panel on LinkedIn/Naukri job pages could not scroll. Content overflowed beyond the panel's visible area with no scrollbar.

**Date:** June 2026  
**Status:** Resolved

---

## Timeline of Failed Attempts

| Attempt | Approach | Why it Failed |
|---------|----------|---------------|
| 1 | `overflow-y: auto` on body + `flex: 1` | Flex child with `flex-basis: auto` sized to content, not container |
| 2 | Added `overflow: hidden` on panel | Removed in subsequent edit while trying alternative fix |
| 3 | `flex: 1 1 0` + `min-height: 0` | `overflow: hidden` missing on panel → panel grew past `max-height` |
| 4 | CSS Grid `grid-template-rows: auto 1fr` | Same issue — no `overflow: hidden` on parent to clip |
| 5 | Added `overflow: hidden` back | Introduced duplicate `const panel` → JS syntax error → button disappeared |
| 6 | Fixed syntax error | Grid layout + `overflow: hidden` on panel still didn't constrain the `1fr` row reliably |
| 7 | `stopPropagation` + `stopImmediatePropagation` + `capture: true` | Event handling wasn't the root cause — the body simply had no height constraint |

---

## Root Cause

The body element `#jm-panel-body` **never had a constrained height**. 

Every approach (flex `1fr`, grid `1fr`, `min-height: 0`) relied on the **parent panel** to provide a height boundary. But these dynamic layout values are unreliable when:

1. The parent has `max-height` but no explicit `height`
2. The parent itself is `position: fixed`
3. The parent's `overflow: hidden` is missing or the flex/grid algorithm doesn't properly clip children

In all failed attempts, the browser computed the body's height as `auto` (based on content), meaning `overflow-y: auto` never triggered a scrollbar — there was nothing to overflow *from the browser's perspective*, even though the *visual* panel was clipped.

```
┌─────────────────────────┐
│ Panel (max-height:520)  │  ← visually clipped at 520px
│ overflow: hidden        │
│                         │
│ ┌─────────────────────┐ │
│ │ Body (height: auto) │ │  ← computed height = content (e.g. 800px)
│ │ overflow-y: auto    │ │     browser sees: 800px fits, no overflow, no scrollbar
│ │                     │ │     user sees: content cut off
│ │ ...content...       │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

---

## Solution

**Give the body an explicit pixel `max-height`** — bypass flex/grid entirely.

```css
/* Before (broken) */
#jm-panel-body {
  overflow-y: auto;
  flex: 1 1 0;      /* or grid 1fr */
  min-height: 0;    /* doesn't help without parent height constraint */
}

/* After (fixed) */
#jm-panel-body {
  overflow-y: auto;
  max-height: 478px;  /* explicit — browser MUST constrain to this */
}
```

The 478px value is derived from the panel's `max-height` (520px) minus the header height (~42px):

```
520px (panel max-height)
- 42px (header: 12px padding-top + ~18px line-height + 12px padding-bottom)
= 478px (body max-height)
```

With `max-height: 478px` explicitly set, the browser is forced to treat content beyond 478px as overflow, and `overflow-y: auto` correctly renders a scrollbar.

---

## Key Lesson

> **Dynamic layout values (`flex: 1`, `grid: 1fr`, `min-height: 0`) only constrain children when the parent has a definite height.** A `max-height` on the parent is not a definite height — it's an upper bound, not an actual size. The child sees the parent's height as `auto` (content-based), so `1fr` or `flex: 1` resolves to the child's own content size.

**When you need a scrollable child inside a `max-height` constrained parent, use an explicit pixel/computed value on the child — don't rely on flex or grid to do the math.**

### Reliable Patterns for "Header + Scrollable Body"

| Pattern | Works? | Notes |
|---------|--------|-------|
| Parent: `height: 520px`, Child: `flex: 1` + `overflow-y: auto` | ✅ | Definite parent height |
| Parent: `max-height: 520px`, Child: `flex: 1` + `overflow-y: auto` | ❌ | No definite parent height |
| Parent: `max-height: 520px` + `overflow: hidden`, Child: `max-height: 478px` + `overflow-y: auto` | ✅ | Explicit child height |
| Parent: `max-height: 520px` + `overflow: hidden`, Child: `height: calc(100% - 42px)` + `overflow-y: auto` | ✅ | `100%` resolves when parent has `overflow: hidden` |

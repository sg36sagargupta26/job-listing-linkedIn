# Root Cause Analysis: Panel Scroll Failure

**Issue:** The floating panel on LinkedIn/Naukri job pages could not scroll. Content overflowed beyond the panel's visible area with no scrollbar.

**Date:** June 2026  
**Status:** Resolved

---

## Timeline of Failed Attempts

### Attempt 1: Flex with `overflow-y: auto`

**CSS:**
```css
#jm-panel {
  display: flex;
  flex-direction: column;
  max-height: 520px;
}
#jm-panel-body {
  overflow-y: auto;
  flex: 1;
}
```

**Expectation:** `flex: 1` would make the body fill remaining space after the header, and `overflow-y: auto` would show a scrollbar when content exceeded that space.

**Reality:** No scrollbar. The body grew to its content height (~800px) and was visually clipped by the panel, but `overflow-y: auto` never triggered because the body's computed height was `auto` (equal to content).

**Why:** `flex: 1` is shorthand for `flex: 1 1 0%` OR `flex: 1 1 auto` depending on the browser. With `max-height` on the parent (not a definite `height`), the flex container's size is content-based, so the child resolves to its own content size.

**Lesson:** Flex `1` needs a parent with a definite height to work.

---

### Attempt 2: Add `overflow: hidden` on panel

**CSS change:**
```css
#jm-panel {
  overflow: hidden;  /* added */
}
```

**Expectation:** `overflow: hidden` on the panel would force it to respect `max-height: 520px`, creating a clipping boundary that the body could overflow within.

**Reality:** This was actually the right direction — but it was accidentally removed in the next edit while trying a different flex approach. The fix was undone before it could be verified.

**Lesson:** `overflow: hidden` on the parent is necessary, but not sufficient alone — the child still needs a height constraint.

---

### Attempt 3: `flex: 1 1 0` with `min-height: 0`

**CSS:**
```css
#jm-panel-body {
  overflow-y: auto;
  flex: 1 1 0;       /* changed from flex: 1 1 auto */
  min-height: 0;
}
```

**Expectation:** `flex-basis: 0` tells the flex item to start from zero and only take the space distributed by the container. `min-height: 0` allows it to shrink below its content size. Together, the body would be constrained to the panel's space.

**Reality:** No scrollbar. At this point, `overflow: hidden` had been removed from the panel (Attempt 2's fix was undone), so the panel grew past 520px. The body had no actual constraint.

**Why:** Without `overflow: hidden` on the parent, the parent's `max-height` is not enforced as a layout boundary. The flex container just expands.

**Lesson:** `flex-basis: 0` + `min-height: 0` is the correct flex incantation, but it's useless without a constrained parent.

---

### Attempt 4: Switch to CSS Grid

**CSS:**
```css
#jm-panel {
  display: grid;
  grid-template-rows: auto 1fr;
  max-height: 520px;
}
#jm-panel-body {
  overflow-y: auto;
  min-height: 0;
}
```

**Expectation:** Grid's `1fr` is often more reliable than flex for "header + scrollable body" layouts. The `1fr` row should take the remaining space.

**Reality:** Same as flex — no scrollbar. `overflow: hidden` was still missing from the panel, so the grid container grew to fit content.

**Why:** Grid has the same fundamental requirement as flex: the container must have a definite size for `1fr` to resolve to a constrained value. `max-height` alone doesn't provide a definite size.

**Lesson:** The flex vs grid debate was a red herring. The issue was always the missing height constraint.

---

### Attempt 5: Re-add `overflow: hidden` — Syntax Error

**CSS:** `overflow: hidden` re-added to `#jm-panel`.  
**JS change:** Added a wheel event listener on the panel to block scroll propagation:
```js
const panel = root.querySelector("#jm-panel");
panel.addEventListener("wheel", ...);
```

**Reality:** The extension broke entirely — the blue button disappeared.

**Why:** The JS file already had `const panel` declared earlier (line 270) for the click handler. Adding another `const panel` on line 290 caused a `SyntaxError: Identifier 'panel' has already been declared`. The entire content script failed to load.

**Lesson:** Always check for duplicate variable declarations when adding code. A quick `grep -n "const panel"` would have caught this.

---

### Attempt 6: Grid + `overflow: hidden` (syntax fixed)

**CSS:**
```css
#jm-panel {
  display: grid;
  grid-template-rows: auto 1fr;
  max-height: 520px;
  overflow: hidden;   /* re-added */
}
```

**Expectation:** With `overflow: hidden`, the grid container would be clipped at 520px, and the `1fr` row would be forced to fit within that boundary.

**Reality:** Button returned but scrolling still didn't work. The grid container was visually clipped at 520px, but the body's `1fr` row still resolved to content-based height because `max-height` is not a definite height for the grid sizing algorithm.

**Why — the CSS spec detail:** Per the CSS Grid specification, when a grid container has `max-height` but no explicit `height`, the grid first sizes all tracks based on their content. The `max-height` is applied *after* track sizing as a clamping step — it clips the visual output but doesn't feed back into track sizes. So the `1fr` row is sized to fit content, then the result is visually clipped. This is the same behavior as flex.

**Lesson:** Even with `overflow: hidden`, flex/grid dynamic units don't work with `max-height`. An explicit value is required.

---

### Attempt 7: Event Handling (wrong diagnosis)

**JS change:**
```js
// capture phase + stopImmediatePropagation to intercept before page handlers
panelBody.addEventListener("wheel", (e) => {
  e.stopImmediatePropagation();
}, { capture: true, passive: false });
```

**Expectation:** The issue was LinkedIn/Naukri capturing wheel events before our panel. Using `capture: true` would intercept first, and `stopImmediatePropagation` would kill the page's handlers.

**Reality:** No change. Scrolling still didn't work.

**Why:** The events were never the problem. The panel body simply had no constrained height — it had nothing to scroll *within*. The browser saw a div with `height: auto` (matching content) and `overflow-y: auto` — since content fit, no overflow, no scrollbar, no scroll events to handle.

**Lesson:** Before debugging event handlers, verify the element actually has a scrollable container. Check computed height in DevTools.

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

# Implementation Plan - Subcategory Hierarchy Layout

## Overview
Update the active tier subcategories layout in `src/App.tsx` to establish a clearer visual hierarchy:
1. **First 2 Subcategories**: Displayed full-width as primary featured cards.
2. **Subsequent Subcategories**: Displayed in a responsive 2-column grid layout per row, with smaller sizing and slightly reduced text opacity.
3. **Applicability**: Applies to all three master tiers (Technique, Repertoire, Improvisation).

## Proposed Changes

### `src/App.tsx`
- Modify the subcategories rendering logic inside the main content area:
  - Separate `currentTierItems` into primary items (first 2 items) and secondary items (index >= 2).
  - Render primary items as full-width cards.
  - Render secondary items in a 2-column grid (`grid grid-cols-1 sm:grid-cols-2 gap-3`) with compact padding, smaller title/category text, and reduced text opacity (`text-neutral-400` or `opacity-80`).
  - Preserve long-press locking, click-to-view modal, and 0.25s hold interactions for all subcategory cards.

## Verification Plan
- Run `compile_applet` and `lint_applet` to confirm zero build/type errors.
- Verify visually across all three tiers (Technique, Repertoire, Improvisation).

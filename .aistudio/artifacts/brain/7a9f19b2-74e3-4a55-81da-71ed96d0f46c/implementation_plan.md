# Implementation Plan - Position Page Number to the Right of Repertoire Source Container

## Objective
Move the page number display from next to the lesson item name to inline on the right side of the repertoire source (subcategory) container, formatted as a minimal badge with bold page number, in both practice item cards and the item detail modal.

## Proposed Changes

### `src/App.tsx`
1. **Practice Item Cards**:
   - Update the card layout so the subcategory container (`item.category`) and `item.pageNumber` are placed in a flex row (`flex items-center justify-between gap-2 mb-1.5`).
   - Style `item.pageNumber` as a minimal badge (e.g. `text-xs font-mono-sub font-bold px-2 py-0.5 rounded-md` with subtle background and text color matching the theme).
   - Place `item.name` on the next line below the subcategory/page header row, without `item.pageNumber` next to it.

2. **Item Detail Modal**:
   - Apply the same layout to the detail modal header section: place `selectedItemForModal.category` and `selectedItemForModal.pageNumber` in a flex row (`flex items-center justify-between gap-2 mb-2`), followed by `selectedItemForModal.name` and description below.

## Verification Plan
- Compile applet with `compile_applet`.
- Verify linting with `lint_applet`.
- Test visually in preview that page numbers appear correctly to the right of repertoire source containers.

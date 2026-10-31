# Implementation Plan - Minimalist Speaker Play Button & Visual Note Sequencer

## User Review Required
> [!IMPORTANT]
> Please review the proposed changes for the minimalist play button and interactive visual note sequencer.

- **Minimalist Play Button**: Updated in the item detail modal between the "See [Subcategory]" button and the Close button to be a borderless, containerless light grey speaker icon (`Volume2` or `Music`) with no text.
- **Visual Note Sequencer**: Added inside the individual item note editor view (when viewing an item from the See All list). Features a grid of note buttons (C3 to C5) and timing/duration selectors where users can build sequences step-by-step visually, preview them, and save them.

## Proposed Changes

### 1. Minimalist Play Button (`src/App.tsx`)
- Replace the "Play Exercise" text button in the item detail modal with a borderless, containerless light grey speaker icon (`Volume2` or `Music`).

### 2. Visual Note Sequencer Component (`src/components/NoteSequencer.tsx`)
- Create an interactive step sequencer component with note buttons (C, C#, D, D#, E, F, F#, G, G#, A, A#, B across octaves 3-5), step order arrangement, and note value/duration selectors.
- Integrated into the individual item note editor modal.

### 3. Integration & Persistence
- Connect sequencer output to the note sequence string format and save to persistent storage (`pd_cached_csv_items`).

## Verification Plan
- **Compilation & Linting**: Run `compile_applet` and `lint_applet` to verify TypeScript types and build success.
- **Manual Verification**: Test clicking the minimalist speaker icon to play exercise, and test building custom note sequences in the visual sequencer grid.

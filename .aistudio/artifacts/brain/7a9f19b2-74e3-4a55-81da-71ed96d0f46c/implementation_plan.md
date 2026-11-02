# Implementation Plan - Accurate Baked-in Musical Sequences for All Default Practice Items

## User Review Required
> [!IMPORTANT]
> Please review the proposed music sequences to be baked into `src/data/pianoData.ts` for all default practice items.

- **Key & Scale Accuracy**:
  - For key items (e.g., C Major, G Major, F Major scale/exercises), notes will follow their exact scale in their respective key, structured as 8 eighth notes ascending plus the upper tonic on step 9.
  - For chord progressions / specific chords, notes will reflect the chords in their correct key.
  - For general technical patterns, pentatonics, modes, and intervals, notes will use C tonic as the reference.
- **Permanent Baking**: All sequences will be baked directly into `src/data/pianoData.ts` so that every practice item across Technique, Repertoire, and Improvisation opens with precise, musically correct sequencer data.

## Proposed Changes

### 1. Update `src/data/pianoData.ts`
- Populate accurate `notes` strings for all default practice items across all categories (Scales, Scale Patterns, Arpeggios, Chords, Cadences, Repertoire fundamentals, Improvisation modes, etc.).
- Ensure scale items follow 8-note ascending + upper tonic structure.

### 2. Verification
- Run `compile_applet` and `lint_applet` to verify build success.
- Test opening various practice items in the app to verify their sequencers accurately display the baked-in musical sequences.

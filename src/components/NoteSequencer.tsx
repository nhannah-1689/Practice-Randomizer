import React, { useState } from 'react';

interface NoteSequencerProps {
  notesString: string;
  onChange: (notes: string) => void;
  isDarkMode: boolean;
}

const PITCHES = [
  'C5', 'B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'E4', 'D#4', 'D4', 'C#4',
  'C4', 'B3', 'A#3', 'A3', 'G#3', 'G3', 'F#3', 'F3', 'E3', 'D#3', 'D3', 'C#3', 'C3'
];
const STEPS_COUNT = 16;

export default function NoteSequencer({ notesString, onChange, isDarkMode }: NoteSequencerProps) {
  const [grid, setGrid] = useState<number[][]>(() => {
    const initial: number[][] = Array.from({ length: STEPS_COUNT }, () => Array(PITCHES.length).fill(0));
    if (notesString && notesString.trim()) {
      const parts = notesString.split(/[\s,]+/).filter(Boolean);
      parts.forEach((note, idx) => {
        if (idx < STEPS_COUNT) {
          const pIndex = PITCHES.indexOf(note);
          if (pIndex !== -1) {
            initial[idx][pIndex] = 1;
          }
        }
      });
    }
    return initial;
  });

  const updateAndSave = (updated: number[][]) => {
    setGrid(updated);
    const notesList: string[] = [];
    updated.forEach(stepCol => {
      stepCol.forEach((val, pIdx) => {
        if (val > 0) {
          notesList.push(PITCHES[pIdx]);
        }
      });
    });
    const newNotesStr = notesList.join(', ');
    onChange(newNotesStr);
  };

  const handleCellClick = (step: number, pitchIdx: number) => {
    const currentVal = grid[step][pitchIdx];
    // Cycle: 0 -> 1 (eighth note) -> 2 (quarter note, double duration) -> 0 (off)
    const nextVal = (currentVal + 1) % 3;

    const updated = grid.map((sCol, sIdx) => {
      if (sIdx === step) {
        const newCol = [...sCol];
        newCol[pitchIdx] = nextVal;
        return newCol;
      }
      return sCol;
    });

    updateAndSave(updated);
  };

  return (
    <div className={`p-3 rounded-xl border select-none ${isDarkMode ? 'bg-[#121212] border-[#2A2A30]' : 'bg-slate-50 border-slate-200'}`}>
      {/* Sequencer Grid with Left Pitch Column */}
      <div className="overflow-x-auto pb-2 no-scrollbar">
        <div className="flex items-start gap-1 min-w-[580px]">
          {/* Pitch labels column vertically on the left (C3 to C5 chromatic) */}
          <div className="flex flex-col gap-0.5 w-12 shrink-0 pt-0.5">
            {PITCHES.map((pitch) => (
              <div
                key={pitch}
                className="h-6 flex items-center justify-center text-[10px] font-mono font-bold text-neutral-300 border border-[#33333D] rounded bg-[#1A1A1E]"
              >
                {pitch}
              </div>
            ))}
          </div>

          {/* 16 Step columns with thin grey vertical divider between 8th and 9th eighth notes */}
          <div className="flex-1 grid grid-cols-16 gap-0.5">
            {Array.from({ length: STEPS_COUNT }).map((_, stepIdx) => {
              const isHalfwayDivider = stepIdx === 7;
              return (
                <div
                  key={stepIdx}
                  className={`flex flex-col gap-0.5 ${
                    isHalfwayDivider ? 'border-r-2 border-neutral-400/80 pr-1 mr-0.5' : ''
                  }`}
                >
                  {PITCHES.map((pitch, pIdx) => {
                    const val = grid[stepIdx][pIdx];
                    const isActive = val > 0;
                    const isQuarter = val === 2;
                    return (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleCellClick(stepIdx, pIdx)}
                        className={`h-6 rounded transition-all cursor-pointer border ${
                          isQuarter
                            ? 'bg-amber-500 border-amber-400 shadow-md'
                            : isActive
                              ? 'bg-blue-500 border-blue-400 shadow-md scale-95'
                              : isDarkMode
                                ? 'bg-[#1E1E24] border-[#2A2A32] hover:border-neutral-500'
                                : 'bg-white border-slate-300 hover:border-slate-400'
                        }`}
                        title={`${pitch} - Step ${stepIdx + 1} (${isQuarter ? 'Quarter Note' : isActive ? 'Eighth Note' : 'Off'})`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

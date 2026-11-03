import React, { useState, useEffect } from 'react';

interface NoteSequencerProps {
  notesString: string;
  onChange: (notes: string) => void;
  isDarkMode: boolean;
  playingStepIndex?: number | null;
}

const PITCHES = [
  { key: 'C5', display: 'C5' },
  { key: 'B4', display: 'B4' },
  { key: 'A#4', display: 'A#/Bb4' },
  { key: 'A4', display: 'A4' },
  { key: 'G#4', display: 'G#/Ab4' },
  { key: 'G4', display: 'G4' },
  { key: 'F#4', display: 'F#/Gb4' },
  { key: 'F4', display: 'F4' },
  { key: 'E4', display: 'E4' },
  { key: 'D#4', display: 'D#/Eb4' },
  { key: 'D4', display: 'D4' },
  { key: 'C#4', display: 'C#/Db4' },
  { key: 'C4', display: 'C4' },
  { key: 'B3', display: 'B3' },
  { key: 'A#3', display: 'A#/Bb3' },
  { key: 'A3', display: 'A3' },
  { key: 'G#3', display: 'G#/Ab3' },
  { key: 'G3', display: 'G3' },
  { key: 'F#3', display: 'F#/Gb3' },
  { key: 'F3', display: 'F3' },
  { key: 'E3', display: 'E3' },
  { key: 'D#3', display: 'D#/Eb3' },
  { key: 'D3', display: 'D3' },
  { key: 'C#3', display: 'C#/Db3' },
  { key: 'C3', display: 'C3' },
];
const STEPS_COUNT = 16;

function parseNotesToGrid(str: string): number[][] {
  const initial: number[][] = Array.from({ length: STEPS_COUNT }, () => Array(PITCHES.length).fill(0));
  if (str && str.trim()) {
    if (str.includes(';')) {
      const steps = str.split(';');
      steps.forEach((stepStr, stepIdx) => {
        if (stepIdx < STEPS_COUNT && stepStr.trim()) {
          const notes = stepStr.split(',').map(n => n.trim()).filter(Boolean);
          notes.forEach(note => {
            const pIndex = PITCHES.findIndex(p => p.key.toLowerCase() === note.toLowerCase());
            if (pIndex !== -1) {
              initial[stepIdx][pIndex] = 1;
            }
          });
        }
      });
    } else {
      const parts = str.split(/[\s,]+/).filter(Boolean);
      parts.forEach((note, idx) => {
        if (idx < STEPS_COUNT) {
          const pIndex = PITCHES.findIndex(p => p.key.toLowerCase() === note.toLowerCase());
          if (pIndex !== -1) {
            initial[idx][pIndex] = 1;
          }
        }
      });
    }
  }
  return initial;
}

export default function NoteSequencer({ notesString, onChange, isDarkMode, playingStepIndex }: NoteSequencerProps) {
  const [grid, setGrid] = useState<number[][]>(() => parseNotesToGrid(notesString));

  useEffect(() => {
    setGrid(parseNotesToGrid(notesString));
  }, [notesString]);

  const updateAndSave = (updated: number[][]) => {
    setGrid(updated);
    const stepStrs: string[] = [];
    updated.forEach(stepCol => {
      const stepNotes: string[] = [];
      stepCol.forEach((val, pIdx) => {
        if (val > 0) {
          stepNotes.push(PITCHES[pIdx].key);
        }
      });
      stepStrs.push(stepNotes.join(', '));
    });
    while (stepStrs.length > 0 && !stepStrs[stepStrs.length - 1].trim()) {
      stepStrs.pop();
    }
    const newNotesStr = stepStrs.join(';');
    onChange(newNotesStr);
  };

  const handleCellClick = (step: number, pitchIdx: number) => {
    const currentVal = grid[step][pitchIdx];
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
    <div className={`p-4 rounded-xl border select-none h-full flex flex-col ${isDarkMode ? 'bg-[#121212] border-[#2A2A30]' : 'bg-slate-50 border-slate-200'}`}>
      {/* Sequencer Grid with Left Enharmonic Pitch Column */}
      <div className="flex-1 overflow-auto pb-4 no-scrollbar">
        <div className="flex items-start gap-2 min-w-[720px]">
          {/* Pitch labels column vertically on the left with enharmonics */}
          <div className="flex flex-col gap-1 w-24 shrink-0 pt-0.5 sticky left-0 z-10">
            {PITCHES.map((pitch) => (
              <div
                key={pitch.key}
                className="h-8 flex items-center justify-center text-xs font-mono font-bold text-neutral-200 border border-[#33333D] rounded bg-[#1A1A1E] shadow-sm"
              >
                {pitch.display}
              </div>
            ))}
          </div>

          {/* 16 Step columns with thin grey vertical divider between 8th and 9th eighth notes */}
          <div className="flex-1 grid grid-cols-16 gap-1">
            {Array.from({ length: STEPS_COUNT }).map((_, stepIdx) => {
              const isHalfwayDivider = stepIdx === 7;
              const isPlaying = playingStepIndex === stepIdx;
              return (
                <div
                  key={stepIdx}
                  className={`flex flex-col gap-1 p-0.5 rounded transition-colors ${
                    isPlaying ? 'bg-emerald-500/20 ring-2 ring-emerald-400' : ''
                  } ${isHalfwayDivider ? 'border-r-2 border-neutral-400/80 pr-1.5 mr-0.5' : ''}`}
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
                        className={`h-8 w-full rounded transition-all cursor-pointer border ${
                          isQuarter
                            ? 'bg-amber-500 border-amber-400 shadow-md'
                            : isActive
                              ? 'bg-blue-500 border-blue-400 shadow-md scale-95'
                              : isDarkMode
                                ? 'bg-[#1E1E24] border-[#2A2A32] hover:border-neutral-500'
                                : 'bg-white border-slate-300 hover:border-slate-400'
                        }`}
                        title={`${pitch.display} - Step ${stepIdx + 1} (${isQuarter ? 'Quarter Note' : isActive ? 'Eighth Note' : 'Off'})`}
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

// Web Audio API clean piano tone synthesizer
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

const NOTE_FREQS: Record<string, number> = {
  'C': 16.35, 'C#': 17.32, 'Db': 17.32, 'D': 18.35, 'D#': 19.45, 'Eb': 19.45,
  'E': 20.60, 'F': 21.83, 'F#': 23.12, 'Gb': 23.12, 'G': 24.50, 'G#': 25.96,
  'Ab': 25.96, 'A': 27.50, 'A#': 29.14, 'Bb': 29.14, 'B': 30.87
};

export function noteToFreq(noteStr: string): number {
  const trimmed = noteStr.trim();
  const match = trimmed.match(/^([A-G][b#]?)(-?[0-9])$/i);
  if (!match) {
    const num = parseFloat(trimmed);
    return isNaN(num) ? 261.63 : num;
  }
  const [, noteName, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const baseFreq = NOTE_FREQS[noteName.toUpperCase()] || 16.35;
  return baseFreq * Math.pow(2, octave);
}

export function playPianoNote(frequency: number, duration: number = 0.8, delay: number = 0): void {
  try {
    const ctx = getAudioContext();
    const startTime = ctx.currentTime + delay;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.4, startTime + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(frequency, startTime);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2, startTime);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.15, startTime);

    osc1.connect(gainNode);
    osc2.connect(gain2);
    gain2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  } catch (err) {
    console.warn('Audio playback notice:', err);
  }
}

export function playPianoSequence(
  noteSequence: string,
  tempoMs: number = 350,
  onStepCallback?: (index: number) => void
): () => void {
  if (!noteSequence || !noteSequence.trim()) {
    noteSequence = 'C4, E4, G4, C5';
  }

  const notes = noteSequence.split(/[\s,]+/).filter(Boolean);
  const timeouts: any[] = [];

  notes.forEach((note, index) => {
    const freq = noteToFreq(note);
    playPianoNote(freq, 1.2, (index * tempoMs) / 1000);

    if (onStepCallback) {
      const t = setTimeout(() => {
        onStepCallback(index);
      }, index * tempoMs);
      timeouts.push(t);
    }
  });

  // Clear highlight after sequence finishes
  const clearT = setTimeout(() => {
    if (onStepCallback) onStepCallback(-1);
  }, notes.length * tempoMs + 300);
  timeouts.push(clearT);

  return () => {
    timeouts.forEach(clearTimeout);
    if (onStepCallback) onStepCallback(-1);
  };
}

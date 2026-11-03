// Web Audio API clean piano tone synthesizer with polyphonic mastering compressor bus
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;

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

function getMasterBus(): { gain: GainNode; comp: DynamicsCompressorNode } {
  const ctx = getAudioContext();
  if (!masterGain || !compressor) {
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, ctx.currentTime);
    compressor.knee.setValueAtTime(40, ctx.currentTime);
    compressor.ratio.setValueAtTime(12, ctx.currentTime);
    compressor.attack.setValueAtTime(0.002, ctx.currentTime);
    compressor.release.setValueAtTime(0.2, ctx.currentTime);

    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.55, ctx.currentTime);

    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);
  }
  return { gain: masterGain, comp: compressor };
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
    gainNode.gain.exponentialRampToValueAtTime(0.35, startTime + 0.025);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(frequency, startTime);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2, startTime);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.12, startTime);

    osc1.connect(gainNode);
    osc2.connect(gain2);
    gain2.connect(gainNode);

    const bus = getMasterBus();
    gainNode.connect(bus.comp);

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

  const timeouts: any[] = [];

  if (noteSequence.includes(';')) {
    const steps = noteSequence.split(';');
    steps.forEach((stepStr, stepIdx) => {
      if (stepStr.trim()) {
        const notes = stepStr.split(',').map(n => n.trim()).filter(Boolean);
        notes.forEach(note => {
          const freq = noteToFreq(note);
          playPianoNote(freq, 1.2, (stepIdx * tempoMs) / 1000);
        });
      }
      if (onStepCallback) {
        const t = setTimeout(() => {
          onStepCallback(stepIdx);
        }, stepIdx * tempoMs);
        timeouts.push(t);
      }
    });

    const totalSteps = steps.length;
    const clearT = setTimeout(() => {
      if (onStepCallback) onStepCallback(-1);
    }, totalSteps * tempoMs + 400);
    timeouts.push(clearT);
  } else {
    // Legacy flat comma-separated list
    const notes = noteSequence.split(/[\s,]+/).filter(Boolean);
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

    const clearT = setTimeout(() => {
      if (onStepCallback) onStepCallback(-1);
    }, notes.length * tempoMs + 400);
    timeouts.push(clearT);
  }

  return () => {
    timeouts.forEach(clearTimeout);
    if (onStepCallback) onStepCallback(-1);
  };
}

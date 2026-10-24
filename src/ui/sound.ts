export interface SoundPlayer {
  unlock(): void;
  correct(): void;
  wrong(): void;
  levelUp(): void;
  setMuted(m: boolean): void;
}

export function createSilentSound(): SoundPlayer {
  const noop = () => {};
  return { unlock: noop, correct: noop, wrong: noop, levelUp: noop, setMuted: noop };
}

type Note = { freq: number; endFreq?: number; start: number; dur: number; type: OscillatorType; gain: number };

declare global {
  interface Window { webkitAudioContext?: typeof AudioContext }
}

function defaultCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext ?? window.webkitAudioContext;
}

const E5 = 659.25, G5 = 783.99, C5 = 523.25;

/**
 * Synthesized sound effects via Web Audio (spec §9). Silent until `unlock()` is
 * called from a user gesture (iOS autoplay rules) and while muted.
 */
export function createSound(ctor: typeof AudioContext | undefined = defaultCtor()): SoundPlayer {
  let ctx: AudioContext | null = null;
  let muted = false;

  function play(notes: Note[]) {
    if (!ctx || muted) return;
    try {
      const t0 = ctx.currentTime;
      for (const n of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = n.type;
        const start = t0 + n.start, end = start + n.dur;
        osc.frequency.setValueAtTime(n.freq, start);
        if (n.endFreq) osc.frequency.linearRampToValueAtTime(n.endFreq, end);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(n.gain, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(end + 0.02);
      }
    } catch {
      // Audio is a nicety; never let it break the app.
    }
  }

  return {
    unlock() {
      if (!ctor) return;
      try {
        ctx ??= new ctor();
        void ctx.resume?.();
      } catch {
        ctx = null;
      }
    },
    correct() {
      play([
        { freq: E5, start: 0, dur: 0.09, type: 'sine', gain: 0.25 },
        { freq: G5, start: 0.09, dur: 0.16, type: 'sine', gain: 0.25 },
      ]);
    },
    levelUp() {
      play([
        { freq: C5, start: 0, dur: 0.1, type: 'sine', gain: 0.25 },
        { freq: E5, start: 0.1, dur: 0.1, type: 'sine', gain: 0.25 },
        { freq: G5, start: 0.2, dur: 0.1, type: 'sine', gain: 0.25 },
        { freq: C5 * 2, start: 0.3, dur: 0.25, type: 'sine', gain: 0.25 },
      ]);
    },
    wrong() {
      play([{ freq: 220, endFreq: 180, start: 0, dur: 0.2, type: 'triangle', gain: 0.15 }]);
    },
    setMuted(m) {
      muted = m;
    },
  };
}

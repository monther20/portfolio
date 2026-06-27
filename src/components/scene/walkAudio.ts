/**
 * walkAudio.ts — a tiny synthesized footstep using the Web Audio API, so the
 * walking sound works with no audio asset. Swap `playFootstep` for an
 * <audio>/AudioBuffer clip later if you want a recorded step.
 *
 * Audio can only start after a user gesture; the AudioContext is created lazily
 * on the first call (the first wheel/scroll counts as a gesture).
 */

let ctx: AudioContext | null = null;
let lastPlay = 0;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function setWalkMuted(value: boolean) {
  muted = value;
}

/** Create/resume the audio context from within a user gesture (e.g. door click). */
export function primeWalkAudio() {
  getCtx();
}

/** Play one soft footstep. Rate-limited so fast scrolls don't machine-gun. */
export function playFootstep(volume = 0.16) {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;

  const now = ac.currentTime;
  if (now - lastPlay < 0.085) return; // min gap between steps
  lastPlay = now;

  const dur = 0.13;
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    // noise that decays quickly = a soft "thud"
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2);
  }

  const src = ac.createBufferSource();
  src.buffer = buffer;

  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 300 + Math.random() * 160; // slight per-step variation

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);

  src.connect(lp);
  lp.connect(gain);
  gain.connect(ac.destination);

  src.start(now);
  src.stop(now + dur);
}

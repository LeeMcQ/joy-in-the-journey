/* ================================================================== */
/*  Joy in the Journey — Audio Engine                                 */
/*  Subtle, reverent sounds for a Bible study experience.             */
/*  All sounds generated via Web Audio API — zero external files.     */
/* ================================================================== */

let _ctx: AudioContext | null = null;
let _enabled = true;

/** Get or create AudioContext (handles iOS restrictions) */
function getCtx(): AudioContext | null {
  if (!_enabled) return null;
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch { return null; }
  }
  // iOS requires resume after user gesture
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

/** Master volume (0-1) */
const MASTER = 0.15;

/** Enable/disable all sounds */
export function setSoundEnabled(on: boolean) { _enabled = on; }
export function isSoundEnabled() { return _enabled; }

/* ── Helper: play a note ──────────────────────────────── */

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = MASTER,
  delay = 0,
) {
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const t = ctx.currentTime + delay;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  osc.start(t);
  osc.stop(t + duration + 0.01);
}

/* ── Signature motif: 5-note "Joy" theme ──────────────── */
/* Notes: C5 → E5 → G5 → A5 → C6 (ascending major + brightness) */

export function playSignatureMotif() {
  const notes = [523.25, 659.25, 783.99, 880.0, 1046.5];
  notes.forEach((f, i) => playTone(f, 0.25, "sine", MASTER * 0.8, i * 0.12));
}

/* ================================================================== */
/*  Sound effects — ordered by importance                             */
/* ================================================================== */

/** 1. Tab switch — soft click (like turning a Bible page) */
export function playTabSwitch() {
  const ctx = getCtx();
  if (!ctx) return;
  // White noise burst + low thump
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = MASTER * 0.3;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2000;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
}

/** 2. Answer saved — warm ascending two-note chime */
export function playAnswerSaved() {
  playTone(659.25, 0.15, "sine", MASTER * 0.5, 0);    // E5
  playTone(783.99, 0.2, "sine", MASTER * 0.4, 0.08);   // G5
}

/** 3. Study complete — triumphant 4-note ascending fanfare */
export function playStudyComplete() {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => {
    playTone(f, 0.3, "sine", MASTER * 0.6, i * 0.15);
    playTone(f * 1.5, 0.3, "sine", MASTER * 0.2, i * 0.15); // fifth overtone
  });
}

/** 4. Bookmark toggle — gentle pluck */
export function playBookmark() {
  playTone(880, 0.12, "triangle", MASTER * 0.4);
  playTone(1318.5, 0.08, "sine", MASTER * 0.2, 0.03);
}

/** 5. Highlight colour pick — soft "pop" */
export function playHighlight() {
  playTone(1200, 0.06, "sine", MASTER * 0.3);
  playTone(1600, 0.04, "sine", MASTER * 0.15, 0.03);
}

/** 6. Scripture popup open — resonant bell tone (like a church bell, softly) */
export function playScriptureOpen() {
  playTone(523.25, 0.5, "sine", MASTER * 0.3);          // C5 fundamental
  playTone(1046.5, 0.3, "sine", MASTER * 0.1, 0.01);    // C6 overtone
}

/** 7. Error/warning — gentle descending minor second */
export function playError() {
  playTone(440, 0.15, "triangle", MASTER * 0.3);
  playTone(415.3, 0.2, "triangle", MASTER * 0.25, 0.1);
}

/** 8. Navigation forward — quick ascending whoosh */
export function playNavForward() {
  playTone(400, 0.08, "sine", MASTER * 0.2);
  playTone(600, 0.06, "sine", MASTER * 0.15, 0.04);
}

/** 9. Navigation back — quick descending whoosh */
export function playNavBack() {
  playTone(600, 0.08, "sine", MASTER * 0.2);
  playTone(400, 0.06, "sine", MASTER * 0.15, 0.04);
}

/* ── Haptic feedback (where supported) ────────────────── */

export function hapticLight() {
  navigator?.vibrate?.(10);
}

export function hapticMedium() {
  navigator?.vibrate?.(25);
}

export function hapticSuccess() {
  navigator?.vibrate?.([15, 50, 15]);
}

/* ── Combined feedback helpers ────────────────────────── */

export function feedbackTabSwitch() { playTabSwitch(); hapticLight(); }
export function feedbackSave() { playAnswerSaved(); hapticLight(); }
export function feedbackComplete() { playStudyComplete(); hapticSuccess(); }
export function feedbackBookmark() { playBookmark(); hapticLight(); }
export function feedbackHighlight() { playHighlight(); hapticLight(); }
export function feedbackScripture() { playScriptureOpen(); hapticLight(); }

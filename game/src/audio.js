// Midnight Ramen Bar — audio: tiny WebAudio blips, no audio files.
// One clear job: every sound the game makes, synthesized at runtime.

let ctx = null;
let muted = false;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function blip(freq, dur, type = 'sine', vol = 0.12, slideTo = null) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  pickup() { blip(520, 0.08, 'triangle', 0.1); },
  pour() { blip(300, 0.25, 'sine', 0.1, 520); },
  chop() { blip(180, 0.06, 'square', 0.07); },
  noodleStart() { blip(440, 0.12, 'triangle', 0.1, 660); },
  perfectPull() { blip(660, 0.1, 'sine', 0.14); setTimeout(() => blip(880, 0.16, 'sine', 0.14), 90); },
  badPull() { blip(220, 0.2, 'sawtooth', 0.08, 140); },
  topping() { blip(740, 0.07, 'triangle', 0.1); },
  serve() {
    blip(523, 0.1, 'triangle', 0.12);
    setTimeout(() => blip(659, 0.1, 'triangle', 0.12), 90);
    setTimeout(() => blip(784, 0.18, 'triangle', 0.12), 180);
  },
  denied() { blip(160, 0.15, 'square', 0.08); },
  ticket() { blip(980, 0.09, 'sine', 0.09); setTimeout(() => blip(1170, 0.09, 'sine', 0.07), 110); },
  walkout() { blip(330, 0.3, 'sawtooth', 0.08, 180); },
  bell() { blip(1240, 0.3, 'sine', 0.1); setTimeout(() => blip(1560, 0.35, 'sine', 0.08), 120); },
  tick() { blip(1050, 0.04, 'square', 0.05); },
};

/**
 * AudioEngine – procedural ambient audio using the Web Audio API.
 *
 * Each scene exposes a set of "layers". Base layers run continuously;
 * detail layers are randomly triggered on configurable intervals.
 *
 * All sounds are synthesised in‑browser – no external audio files needed.
 */

import type { SceneDef } from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Linear ramp a param to value over `time` seconds from now. */
function ramp(param: AudioParam, value: number, ctx: AudioContext, time = 0.05) {
  param.cancelScheduledValues(ctx.currentTime);
  param.setValueAtTime(param.value, ctx.currentTime);
  param.linearRampToValueAtTime(value, ctx.currentTime + time);
}

/** Create a white-noise AudioBuffer (1 s, loopable). */
function makeNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * seconds, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** Create a pink‑noise AudioBuffer (approximation via 3-pole IIR). */
function makePinkNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * seconds, sr);
  const data = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) / 9;
    b6 = white * 0.115926;
  }
  return buf;
}

// ─── per-layer node graph ─────────────────────────────────────────────────────

interface LayerNodes {
  gainNode: GainNode;
  stop: () => void;
  /** For detail layers only – start the random-trigger loop. */
  startTriggerLoop?: () => void;
  stopTriggerLoop?: () => void;
}

// ─── scene-specific synths ────────────────────────────────────────────────────

function buildForestWind(ctx: AudioContext, dest: AudioNode): LayerNodes {
  const noiseBuffer = makePinkNoiseBuffer(ctx, 4);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  filter.Q.value = 0.4;

  // slow LFO on filter frequency to simulate gusts
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 150;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  const gain = ctx.createGain();
  source.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  source.start();
  lfo.start();

  return {
    gainNode: gain,
    stop: () => { try { source.stop(); lfo.stop(); } catch {/* ignore */} },
  };
}

function buildForestLeaves(ctx: AudioContext, dest: AudioNode): LayerNodes {
  const noiseBuffer = makeNoiseBuffer(ctx, 2);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2500;
  filter.Q.value = 0.5;

  const filter2 = ctx.createBiquadFilter();
  filter2.type = 'lowpass';
  filter2.frequency.value = 8000;

  const gain = ctx.createGain();
  source.connect(filter);
  filter.connect(filter2);
  filter2.connect(gain);
  gain.connect(dest);
  source.start();

  return { gainNode: gain, stop: () => { try { source.stop(); } catch {/* */} } };
}

function buildForestStream(ctx: AudioContext, dest: AudioNode): LayerNodes {
  const noiseBuffer = makeNoiseBuffer(ctx, 2);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  filter.Q.value = 0.6;

  const gain = ctx.createGain();
  source.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  source.start();

  return { gainNode: gain, stop: () => { try { source.stop(); } catch {/* */} } };
}

function buildBird1(ctx: AudioContext, dest: AudioNode, vol: number): LayerNodes {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  let rafId: ReturnType<typeof setTimeout> | null = null;

  const chirp = () => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.connect(env);
    env.connect(gain);

    const baseFreq = 2200 + Math.random() * 800;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.3, ctx.currentTime + 0.08);
    osc.frequency.linearRampToValueAtTime(baseFreq, ctx.currentTime + 0.15);

    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
    env.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);

    // 2-3 chirp sequence
    const repeats = Math.floor(Math.random() * 3) + 1;
    for (let r = 1; r < repeats; r++) {
      const delay = r * 0.22;
      const osc2 = ctx.createOscillator();
      const env2 = ctx.createGain();
      osc2.connect(env2);
      env2.connect(gain);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq + Math.random() * 200 - 100, ctx.currentTime + delay);
      env2.gain.setValueAtTime(0, ctx.currentTime + delay);
      env2.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.02);
      env2.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 0.18);
      osc2.start(ctx.currentTime + delay);
      osc2.stop(ctx.currentTime + delay + 0.25);
    }
  };

  let running = false;
  const loop = () => {
    if (!running) return;
    chirp();
    const next = 4000 + Math.random() * 8000;
    rafId = setTimeout(loop, next);
  };

  return {
    gainNode: gain,
    stop: () => { running = false; if (rafId) clearTimeout(rafId); },
    startTriggerLoop: () => { running = true; loop(); },
    stopTriggerLoop: () => { running = false; if (rafId) clearTimeout(rafId); },
  };
}

function buildBird2(ctx: AudioContext, dest: AudioNode, vol: number): LayerNodes {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  let rafId: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  const chirp = () => {
    const notes = [1800, 2000, 2400, 1600];
    const base = notes[Math.floor(Math.random() * notes.length)];
    for (let i = 0; i < 4; i++) {
      const t = ctx.currentTime + i * 0.16;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.connect(env);
      env.connect(gain);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(base + i * 80, t);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(vol * 0.8, t + 0.03);
      env.gain.linearRampToValueAtTime(0, t + 0.12);
      osc.start(t);
      osc.stop(t + 0.15);
    }
  };

  const loop = () => {
    if (!running) return;
    chirp();
    rafId = setTimeout(loop, 8000 + Math.random() * 14000);
  };

  return {
    gainNode: gain,
    stop: () => { running = false; if (rafId) clearTimeout(rafId); },
    startTriggerLoop: () => { running = true; loop(); },
    stopTriggerLoop: () => { running = false; if (rafId) clearTimeout(rafId); },
  };
}

// ── café ──────────────────────────────────────────────────────────────────────

function buildCafeChatter(ctx: AudioContext, dest: AudioNode): LayerNodes {
  const pinkBuf = makePinkNoiseBuffer(ctx, 4);
  const source = ctx.createBufferSource();
  source.buffer = pinkBuf;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 600;
  filter.Q.value = 0.4;

  const filter2 = ctx.createBiquadFilter();
  filter2.type = 'lowpass';
  filter2.frequency.value = 3000;

  const gain = ctx.createGain();
  source.connect(filter);
  filter.connect(filter2);
  filter2.connect(gain);
  gain.connect(dest);
  source.start();

  return { gainNode: gain, stop: () => { try { source.stop(); } catch {/* */} } };
}

function buildCafeMusic(ctx: AudioContext, dest: AudioNode): LayerNodes {
  // Gentle pad: multiple detuned oscillators
  const frequencies = [261.63, 329.63, 392.0, 523.25]; // C4 major chord
  const oscs: OscillatorNode[] = [];
  const gain = ctx.createGain();
  gain.connect(dest);

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * (1 + (i % 2 === 0 ? 0.002 : -0.002));
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.12;
    osc.connect(oscGain);
    oscGain.connect(gain);
    osc.start();
    oscs.push(osc);
  });

  return {
    gainNode: gain,
    stop: () => oscs.forEach(o => { try { o.stop(); } catch {/* */} }),
  };
}

function buildCafeMachine(ctx: AudioContext, dest: AudioNode, vol: number): LayerNodes {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  let rafId: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  const trigger = () => {
    const noiseBuf = makeNoiseBuffer(ctx, 1);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300 + Math.random() * 200;
    filter.Q.value = 1;

    const env = ctx.createGain();
    src.connect(filter);
    filter.connect(env);
    env.connect(gain);

    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.1);
    env.gain.setValueAtTime(vol, ctx.currentTime + 0.6);
    env.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);

    src.start();
    src.stop(ctx.currentTime + 1.0);
  };

  const loop = () => {
    if (!running) return;
    trigger();
    rafId = setTimeout(loop, 10000 + Math.random() * 15000);
  };

  return {
    gainNode: gain,
    stop: () => { running = false; if (rafId) clearTimeout(rafId); },
    startTriggerLoop: () => { running = true; loop(); },
    stopTriggerLoop: () => { running = false; if (rafId) clearTimeout(rafId); },
  };
}

function buildCafeClink(ctx: AudioContext, dest: AudioNode, vol: number): LayerNodes {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  let rafId: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  const trigger = () => {
    const freq = 1800 + Math.random() * 600;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.connect(env);
    env.connect(gain);
    osc.type = 'sine';
    osc.frequency.value = freq;

    env.gain.setValueAtTime(vol, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.55);
  };

  const loop = () => {
    if (!running) return;
    trigger();
    rafId = setTimeout(loop, 5000 + Math.random() * 10000);
  };

  return {
    gainNode: gain,
    stop: () => { running = false; if (rafId) clearTimeout(rafId); },
    startTriggerLoop: () => { running = true; loop(); },
    stopTriggerLoop: () => { running = false; if (rafId) clearTimeout(rafId); },
  };
}

function buildCafeDoor(ctx: AudioContext, dest: AudioNode, vol: number): LayerNodes {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  let rafId: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  const trigger = () => {
    const tones = [880, 1108, 1318]; // A5, C#6, E6 – pleasant bell chord
    tones.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.12;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.connect(env);
      env.connect(gain);
      osc.type = 'sine';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(vol * 0.7, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.start(t);
      osc.stop(t + 1.25);
    });
  };

  const loop = () => {
    if (!running) return;
    trigger();
    rafId = setTimeout(loop, 20000 + Math.random() * 25000);
  };

  return {
    gainNode: gain,
    stop: () => { running = false; if (rafId) clearTimeout(rafId); },
    startTriggerLoop: () => { running = true; loop(); },
    stopTriggerLoop: () => { running = false; if (rafId) clearTimeout(rafId); },
  };
}

// ── rain ──────────────────────────────────────────────────────────────────────

function buildRainHeavy(ctx: AudioContext, dest: AudioNode): LayerNodes {
  const buf = makeNoiseBuffer(ctx, 2);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200;
  filter.Q.value = 0.3;

  const gain = ctx.createGain();
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start();

  return { gainNode: gain, stop: () => { try { src.stop(); } catch {/* */} } };
}

function buildRainWindow(ctx: AudioContext, dest: AudioNode): LayerNodes {
  const buf = makeNoiseBuffer(ctx, 2);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 3000;

  const gain = ctx.createGain();
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start();

  return { gainNode: gain, stop: () => { try { src.stop(); } catch {/* */} } };
}

function buildThunder(ctx: AudioContext, dest: AudioNode, vol: number): LayerNodes {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  let rafId: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  const trigger = () => {
    const duration = 2 + Math.random() * 2;
    const buf = makeNoiseBuffer(ctx, Math.ceil(duration) + 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 250;

    const env = ctx.createGain();
    src.connect(filter);
    filter.connect(env);
    env.connect(gain);

    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.03);
    env.gain.setValueAtTime(vol * 0.6, ctx.currentTime + 0.3);
    env.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    src.start();
    src.stop(ctx.currentTime + duration + 0.1);
  };

  const loop = () => {
    if (!running) return;
    trigger();
    rafId = setTimeout(loop, 15000 + Math.random() * 25000);
  };

  return {
    gainNode: gain,
    stop: () => { running = false; if (rafId) clearTimeout(rafId); },
    startTriggerLoop: () => { running = true; loop(); },
    stopTriggerLoop: () => { running = false; if (rafId) clearTimeout(rafId); },
  };
}

function buildDrip(ctx: AudioContext, dest: AudioNode, vol: number): LayerNodes {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  let rafId: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  const trigger = () => {
    const freq = 600 + Math.random() * 400;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.connect(env);
    env.connect(gain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, ctx.currentTime + 0.15);
    env.gain.setValueAtTime(vol, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  };

  const loop = () => {
    if (!running) return;
    trigger();
    rafId = setTimeout(loop, 2000 + Math.random() * 4000);
  };

  return {
    gainNode: gain,
    stop: () => { running = false; if (rafId) clearTimeout(rafId); },
    startTriggerLoop: () => { running = true; loop(); },
    stopTriggerLoop: () => { running = false; if (rafId) clearTimeout(rafId); },
  };
}

// ── study ─────────────────────────────────────────────────────────────────────

function buildStudyRoom(ctx: AudioContext, dest: AudioNode): LayerNodes {
  const buf = makePinkNoiseBuffer(ctx, 4);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;

  const gain = ctx.createGain();
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start();

  return { gainNode: gain, stop: () => { try { src.stop(); } catch {/* */} } };
}

function buildClock(ctx: AudioContext, dest: AudioNode, vol: number): LayerNodes {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  let rafId: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  const tick = () => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.connect(env);
    env.connect(gain);
    osc.type = 'square';
    osc.frequency.value = 1200;
    env.gain.setValueAtTime(vol * 0.5, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  };

  const loop = () => {
    if (!running) return;
    tick();
    rafId = setTimeout(loop, 1000);
  };

  return {
    gainNode: gain,
    stop: () => { running = false; if (rafId) clearTimeout(rafId); },
    startTriggerLoop: () => { running = true; loop(); },
    stopTriggerLoop: () => { running = false; if (rafId) clearTimeout(rafId); },
  };
}

function buildPageTurn(ctx: AudioContext, dest: AudioNode, vol: number): LayerNodes {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  let rafId: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  const trigger = () => {
    const buf = makeNoiseBuffer(ctx, 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.value = 8000;

    const env = ctx.createGain();
    src.connect(filter);
    filter.connect(filter2);
    filter2.connect(env);
    env.connect(gain);

    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.03);
    env.gain.linearRampToValueAtTime(vol * 0.6, ctx.currentTime + 0.15);
    env.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);

    src.start();
    src.stop(ctx.currentTime + 0.4);
  };

  const loop = () => {
    if (!running) return;
    trigger();
    rafId = setTimeout(loop, 8000 + Math.random() * 12000);
  };

  return {
    gainNode: gain,
    stop: () => { running = false; if (rafId) clearTimeout(rafId); },
    startTriggerLoop: () => { running = true; loop(); },
    stopTriggerLoop: () => { running = false; if (rafId) clearTimeout(rafId); },
  };
}

function buildPen(ctx: AudioContext, dest: AudioNode, vol: number): LayerNodes {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  let rafId: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  const trigger = () => {
    const strokes = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < strokes; i++) {
      const t = ctx.currentTime + i * (0.06 + Math.random() * 0.04);
      const buf = makeNoiseBuffer(ctx, 0.1);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 3000 + Math.random() * 2000;
      filter.Q.value = 2;
      const env = ctx.createGain();
      src.connect(filter);
      filter.connect(env);
      env.connect(gain);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(vol * 0.5, t + 0.01);
      env.gain.linearRampToValueAtTime(0, t + 0.06);
      src.start(t);
      src.stop(t + 0.08);
    }
  };

  const loop = () => {
    if (!running) return;
    trigger();
    rafId = setTimeout(loop, 5000 + Math.random() * 10000);
  };

  return {
    gainNode: gain,
    stop: () => { running = false; if (rafId) clearTimeout(rafId); },
    startTriggerLoop: () => { running = true; loop(); },
    stopTriggerLoop: () => { running = false; if (rafId) clearTimeout(rafId); },
  };
}

function buildOwl(ctx: AudioContext, dest: AudioNode, vol: number): LayerNodes {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  let rafId: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  const trigger = () => {
    // two-note hoo-hoo
    [0, 0.5].forEach((offset) => {
      const t = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.connect(env);
      env.connect(gain);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(270, t + 0.25);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(vol, t + 0.05);
      env.gain.linearRampToValueAtTime(0, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  };

  const loop = () => {
    if (!running) return;
    trigger();
    rafId = setTimeout(loop, 30000 + Math.random() * 30000);
  };

  return {
    gainNode: gain,
    stop: () => { running = false; if (rafId) clearTimeout(rafId); },
    startTriggerLoop: () => { running = true; loop(); },
    stopTriggerLoop: () => { running = false; if (rafId) clearTimeout(rafId); },
  };
}

// ─── builder map ──────────────────────────────────────────────────────────────

type BuilderFn = (ctx: AudioContext, dest: AudioNode, vol: number) => LayerNodes;

const LAYER_BUILDERS: Record<string, BuilderFn> = {
  forest_wind: (ctx, dest) => buildForestWind(ctx, dest),
  forest_leaves: (ctx, dest) => buildForestLeaves(ctx, dest),
  forest_stream: (ctx, dest) => buildForestStream(ctx, dest),
  forest_bird1: buildBird1,
  forest_bird2: buildBird2,

  cafe_chatter: (ctx, dest) => buildCafeChatter(ctx, dest),
  cafe_music: (ctx, dest) => buildCafeMusic(ctx, dest),
  cafe_machine: buildCafeMachine,
  cafe_clink: buildCafeClink,
  cafe_door: buildCafeDoor,

  rain_heavy: (ctx, dest) => buildRainHeavy(ctx, dest),
  rain_window: (ctx, dest) => buildRainWindow(ctx, dest),
  rain_thunder: buildThunder,
  rain_drip: buildDrip,

  study_room: (ctx, dest) => buildStudyRoom(ctx, dest),
  study_clock: buildClock,
  study_page: buildPageTurn,
  study_pen: buildPen,
  study_owl: buildOwl,
};

// ─── AudioEngine public API ───────────────────────────────────────────────────

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: Map<string, LayerNodes> = new Map();
  private currentSceneId: string | null = null;

  private ensureContext() {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  async loadScene(scene: SceneDef): Promise<void> {
    this.stopAll();
    const ctx = this.ensureContext();
    this.currentSceneId = scene.id;

    for (const layer of scene.layers) {
      const builder = LAYER_BUILDERS[layer.id];
      if (!builder) continue;

      const nodes = builder(ctx, this.masterGain!, layer.defaultVolume);
      nodes.gainNode.gain.value = layer.defaultVolume;

      if (layer.type === 'detail' && nodes.startTriggerLoop) {
        nodes.startTriggerLoop();
      }

      this.activeNodes.set(layer.id, nodes);
    }
  }

  setLayerVolume(layerId: string, volume: number) {
    const nodes = this.activeNodes.get(layerId);
    if (!nodes || !this.ctx) return;
    ramp(nodes.gainNode.gain, volume, this.ctx, 0.1);
  }

  pause() {
    this.ctx?.suspend();
  }

  resume() {
    this.ensureContext();
  }

  stopAll() {
    this.activeNodes.forEach((nodes) => {
      nodes.stopTriggerLoop?.();
      nodes.stop();
    });
    this.activeNodes.clear();
    this.currentSceneId = null;
  }

  get isRunning() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  get sceneId() {
    return this.currentSceneId;
  }
}

export const audioEngine = new AudioEngine();

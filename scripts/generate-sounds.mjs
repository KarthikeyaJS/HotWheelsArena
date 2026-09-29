#!/usr/bin/env node
/**
 * Synthesises the site's engine sound effects into public/sounds/ as
 * 16-bit mono 22,050 Hz PCM WAV files. No dependencies, fully deterministic
 * (seeded noise), so re-running produces byte-identical files.
 *
 *   rev.wav    ~1.2 s  engine rev: harmonic stack + firing-pulse modulation + pitch sweep + exhaust noise
 *   click.wav  ~80 ms  mechanical click (latch transient + metallic ping + low thump)
 *   start.wav  ~1.5 s  ignition: starter-motor crank → catch → settling idle
 *
 * Every sound is synthesised from scratch by this script, so the output is royalty-free.
 * Usage: `npm run sounds` (or `node scripts/generate-sounds.mjs [--out <dir>]`).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 22050;
const MAX_BYTES = 70 * 1024;
const TWO_PI = Math.PI * 2;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outFlagIndex = process.argv.indexOf('--out');
const outDir =
  outFlagIndex > -1 && process.argv[outFlagIndex + 1]
    ? resolve(process.argv[outFlagIndex + 1])
    : resolve(scriptDir, '..', 'public', 'sounds');

/* --------------------------------- helpers -------------------------------- */

/** Deterministic PRNG (mulberry32) → uniform [0, 1). */
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One-pole low-pass filter factory (cutoff in Hz). */
function createLowPass(cutoffHz) {
  const rc = 1 / (TWO_PI * cutoffHz);
  const dt = 1 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  let previous = 0;
  return (input) => {
    previous += alpha * (input - previous);
    return previous;
  };
}

/** One-pole high-pass filter factory (cutoff in Hz). */
function createHighPass(cutoffHz) {
  const rc = 1 / (TWO_PI * cutoffHz);
  const dt = 1 / SAMPLE_RATE;
  const alpha = rc / (rc + dt);
  let previousIn = 0;
  let previousOut = 0;
  return (input) => {
    previousOut = alpha * (previousOut + input - previousIn);
    previousIn = input;
    return previousOut;
  };
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

/** Soft saturation, keeps peaks rounded like an overdriven exhaust note. */
const saturate = (x, drive) => Math.tanh(x * drive) / Math.tanh(drive);

/** Scales the buffer so its peak sits at `peak` (0..1). */
function normalize(samples, peak = 0.89) {
  let max = 0;
  for (const value of samples) max = Math.max(max, Math.abs(value));
  if (max === 0) return samples;
  const gain = peak / max;
  for (let i = 0; i < samples.length; i += 1) samples[i] *= gain;
  return samples;
}

/** Short linear fades at both ends so playback never starts/stops with a click. */
function applyEdgeFades(samples, fadeInMs = 4, fadeOutMs = 12) {
  const fadeIn = Math.floor((fadeInMs / 1000) * SAMPLE_RATE);
  const fadeOut = Math.floor((fadeOutMs / 1000) * SAMPLE_RATE);
  for (let i = 0; i < fadeIn && i < samples.length; i += 1) samples[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut && i < samples.length; i += 1) {
    samples[samples.length - 1 - i] *= i / fadeOut;
  }
  return samples;
}

/** Encodes float samples (-1..1) as a 16-bit mono PCM WAV buffer. */
function encodeWav(samples) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // audio format: PCM
  buffer.writeUInt16LE(1, 22); // channels: mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const value = clamp(samples[i], -1, 1);
    buffer.writeInt16LE(Math.round(value < 0 ? value * 0x8000 : value * 0x7fff), 44 + i * 2);
  }
  return buffer;
}

/**
 * Engine voice: a harmonic stack driven by an integrated (continuous-phase) firing frequency,
 * with firing-pulse amplitude modulation for the "growl" and a touch of cylinder jitter.
 */
function createEngineVoice(random, { harmonics = 9, rolloff = 0.85, pulseDepth = 0.55 } = {}) {
  let phase = 0;
  let jitter = 0;
  const weights = Array.from({ length: harmonics }, (_, index) => 1 / Math.pow(index + 1, rolloff));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  return (firingHz) => {
    jitter = jitter * 0.995 + (random() - 0.5) * 0.02;
    phase += (TWO_PI * firingHz * (1 + jitter)) / SAMPLE_RATE;
    if (phase > TWO_PI * 1e6) phase -= TWO_PI * 1e6;
    let tone = 0;
    for (let k = 0; k < harmonics; k += 1) {
      // Odd harmonics slightly emphasised → rasp of a V8-style exhaust.
      const emphasis = k % 2 === 0 ? 1 : 0.8;
      tone += Math.sin(phase * (k + 1) + k * 0.7) * weights[k] * emphasis;
    }
    tone /= weightSum;
    // Firing pulses: amplitude swells once per combustion event.
    const pulse = 1 - pulseDepth + pulseDepth * Math.pow(0.5 + 0.5 * Math.cos(phase), 3);
    return tone * pulse;
  };
}

/* --------------------------------- sounds --------------------------------- */

function synthRev() {
  const duration = 1.2;
  const length = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(length);
  const random = createRandom(0x5eed_0001);
  const engine = createEngineVoice(random, { harmonics: 10, rolloff: 0.8, pulseDepth: 0.6 });
  const exhaustNoise = createLowPass(1400);
  const rumble = createLowPass(160);
  const dcBlock = createHighPass(30);

  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE;
    // Blip the throttle: idle → sharp climb → hold near redline → fall back.
    const climb = smoothstep(0.05, 0.55, t);
    const fall = smoothstep(0.72, 1.15, t);
    const firingHz = lerp(lerp(48, 205, climb), 70, fall);
    const load = climb * (1 - fall * 0.85);

    const tone = engine(firingHz);
    const noise = exhaustNoise(random() * 2 - 1) * (0.25 + load * 0.55);
    const sub = rumble(tone) * 1.8;

    const attack = smoothstep(0, 0.04, t);
    const release = 1 - smoothstep(0.95, 1.2, t);
    const envelope = attack * release * (0.55 + 0.45 * load);

    samples[i] = dcBlock(saturate((tone * 0.9 + sub + noise) * envelope, 1.8 + load * 1.4));
  }
  return applyEdgeFades(normalize(samples));
}

function synthClick() {
  const duration = 0.08;
  const length = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(length);
  const random = createRandom(0x5eed_0002);
  const bright = createHighPass(1800);
  const body = createLowPass(900);

  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE;
    // Latch transient: very short noise burst.
    const transient = bright(random() * 2 - 1) * Math.exp(-t / 0.0022);
    // Metallic ping: two inharmonic partials with fast decay.
    const ping =
      (Math.sin(TWO_PI * 2350 * t) * 0.6 + Math.sin(TWO_PI * 3710 * t + 0.4) * 0.35) *
      Math.exp(-t / 0.011);
    // Second, softer contact ~14 ms later (the switch settling).
    const t2 = t - 0.014;
    const settle = t2 > 0 ? bright(random() * 2 - 1) * Math.exp(-t2 / 0.0016) * 0.45 : 0;
    // Low thump of the housing.
    const thump = body(Math.sin(TWO_PI * 150 * t) * Math.exp(-t / 0.018));

    samples[i] = transient * 0.9 + ping * 0.5 + settle + thump * 0.8;
  }
  return applyEdgeFades(normalize(samples, 0.8), 0.3, 8);
}

function synthStart() {
  const duration = 1.5;
  const length = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(length);
  const random = createRandom(0x5eed_0003);
  const engine = createEngineVoice(random, { harmonics: 9, rolloff: 0.9, pulseDepth: 0.7 });
  const starterNoise = createLowPass(2600);
  const exhaustNoise = createLowPass(900);
  const dcBlock = createHighPass(28);
  const catchTime = 0.68;
  let starterPhase = 0;

  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE;

    // 1) Starter motor: geared whine whose pitch rises as it spins up, chopped by compression
    //    strokes ("rr-rr-rr") that speed up slightly as the engine turns over.
    const starterGate = 1 - smoothstep(catchTime - 0.02, catchTime + 0.1, t);
    const whineHz = lerp(190, 320, smoothstep(0, 0.4, t));
    starterPhase += (TWO_PI * whineHz) / SAMPLE_RATE;
    const whine =
      (Math.sin(starterPhase) * 0.6 +
        Math.sin(starterPhase * 2 + 0.3) * 0.25 +
        Math.sin(starterPhase * 3 + 1.1) * 0.12) *
      0.5;
    const crankRate = lerp(6.5, 9.5, smoothstep(0, catchTime, t));
    const compression = Math.pow(0.5 + 0.5 * Math.sin(TWO_PI * crankRate * t), 2);
    const crank =
      (whine * (0.35 + 0.65 * compression) + starterNoise(random() * 2 - 1) * 0.35 * compression) *
      starterGate *
      smoothstep(0, 0.03, t);

    // 2) Catch: the engine fires, flares, then settles into a lumpy idle.
    const running = smoothstep(catchTime - 0.03, catchTime + 0.05, t);
    const flare = Math.exp(-Math.max(0, t - catchTime) / 0.16);
    const firingHz = lerp(38, 118, flare) + Math.sin(TWO_PI * 2.1 * t) * 1.8;
    const tone = engine(firingHz);
    const noise = exhaustNoise(random() * 2 - 1) * (0.2 + 0.4 * flare);
    const idleEnvelope = running * (0.6 + 0.4 * flare) * (1 - smoothstep(1.35, 1.5, t) * 0.6);
    const idle = saturate((tone + noise) * idleEnvelope, 1.6 + flare);

    samples[i] = dcBlock(crank * 0.75 + idle);
  }
  return applyEdgeFades(normalize(samples));
}

/* ---------------------------------- main ---------------------------------- */

const SOUNDS = [
  { file: 'rev.wav', synth: synthRev },
  { file: 'click.wav', synth: synthClick },
  { file: 'start.wav', synth: synthStart },
];

mkdirSync(outDir, { recursive: true });
let failed = false;
for (const { file, synth } of SOUNDS) {
  const wav = encodeWav(synth());
  const target = join(outDir, file);
  writeFileSync(target, wav);
  const seconds = (wav.length - 44) / 2 / SAMPLE_RATE;
  const withinBudget = wav.length <= MAX_BYTES;
  if (!withinBudget) failed = true;
  console.log(
    `${withinBudget ? '✔' : '✖'} ${file.padEnd(10)} ${seconds.toFixed(2)} s  ${(wav.length / 1024).toFixed(1)} KB`,
  );
}
if (failed) {
  console.error(`One or more sounds exceed the ${MAX_BYTES / 1024} KB budget.`);
  process.exit(1);
}
console.log(`Sounds written to ${outDir}`);

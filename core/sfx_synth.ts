// Placeholder SFX, ported from in-house numpy synthesis (no samples): ding, cha-ching, bass hit, clank, whoosh.
// Pure functions returning Float32Array mono samples so they are unit-testable without Web Audio.
export type Synth = (sr: number) => Float32Array;
let seed = 3; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const buf = (d: number, sr: number) => new Float32Array(Math.floor(d * sr));
const env = (x: number, a: number, dec: number) => Math.min(1, x / a) * Math.exp(-x * dec);
export function ding(f: number, d: number, sr: number) { const o = buf(d, sr); for (let i = 0; i < o.length; i++) { const x = i / sr; o[i] = (Math.sin(2 * Math.PI * f * x) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * x) + 0.2 * Math.sin(2 * Math.PI * f * 5.4 * x)) * env(x, 0.002, 4); } return o; }
export function bass(d: number, sr: number) { const o = buf(d, sr); let ph = 0; for (let i = 0; i < o.length; i++) { const x = i / sr; ph += 2 * Math.PI * (90 * Math.exp(-x * 3) + 38) / sr; o[i] = Math.tanh(2.2 * Math.sin(ph)) * env(x, 0.003, 4); } return o; }
export function clank(d: number, sr: number) { const o = buf(d, sr); for (let i = 0; i < o.length; i++) { const x = i / sr; let s = 0; for (const [f, k] of [[523, 9], [1347, 12], [2210, 16], [3100, 20]]) s += Math.sin(2 * Math.PI * f * x) * Math.exp(-x * k); o[i] = s * 0.35 * Math.min(1, x / 0.001); } return o; }
export function whoosh(d: number, sr: number, rise = true) { // filtered noise with sin^2 envelope; moving-average width sweeps
  const n = buf(d, sr); for (let i = 0; i < n.length; i++) n[i] = gauss(); const o = buf(d, sr); let acc = 0; const pre = new Float32Array(n.length + 1);
  for (let i = 0; i < n.length; i++) pre[i + 1] = (acc += n[i]);
  for (let i = 0; i < n.length; i++) { const fr = i / n.length, k = Math.max(1, Math.round(rise ? 60 + (6 - 60) * fr : 6 + (60 - 6) * fr)); const a = Math.max(0, i - (k >> 1)), b = Math.min(n.length, a + k);
    o[i] = (pre[b] - pre[a]) / (b - a) * Math.sin(Math.PI * (i / sr) / d) ** 2 * 2.5; } return o; }
export function chaching(sr: number) { const o = buf(1.2, sr); const c = Math.floor(0.12 * sr); for (let i = 0; i < c; i++) o[i] += gauss() * env(i / sr, 0.001, 30) * 0.8;
  const mix = (s: Float32Array, at: number) => { const k = Math.floor(at * sr); for (let i = 0; i < s.length && k + i < o.length; i++) o[k + i] += s[i]; };
  mix(ding(2637, 1.0, sr), 0.08); mix(ding(3520, 0.9, sr), 0.2); for (let i = 0; i < o.length; i++) o[i] *= 0.6; return o; }
const gain = (s: Float32Array, g: number) => { for (let i = 0; i < s.length; i++) s[i] *= g; return s; };
const sum = (...ss: Float32Array[]) => { const o = new Float32Array(Math.max(...ss.map((s) => s.length))); for (const s of ss) for (let i = 0; i < s.length; i++) o[i] += s[i]; return o; };
// event -> placeholder sound. Real licensed files later replace entries via AudioCore.load(name, url).
/** notes played one after another (step s apart), each a decaying ding; the last rings for tail s */
export function arp(fs: number[], step: number, sr: number, tail = 0.45) { const o = buf(step * (fs.length - 1) + tail, sr); fs.forEach((f, k) => { const d = ding(f, k === fs.length - 1 ? tail : step * 2.5, sr), at = Math.floor(k * step * sr); for (let i = 0; i < d.length && at + i < o.length; i++) o[at + i] += d[i] * 0.8; }); return o; }
export const SFX: Record<string, Synth> = {
  hit: (sr) => gain(clank(0.18, sr), 0.5),
  lasthit: (sr) => sum(gain(ding(1760, 0.5, sr), 0.45), gain(bass(0.35, sr), 0.6)),
  kill: (sr) => gain(bass(0.4, sr), 0.7),
  secure: (sr) => gain(chaching(sr), 0.8),
  deny: (sr) => sum(gain(bass(0.45, sr), 0.7), gain(ding(880, 0.4, sr), 0.35)),
  lost: (sr) => gain(whoosh(0.35, sr, false), 0.35),
  miss: (sr) => gain(whoosh(0.16, sr, true), 0.25),
  countdown: (sr) => gain(ding(880, 0.25, sr), 0.35),
  go: (sr) => gain(ding(1320, 0.4, sr), 0.45),
  // #57 reward sounds. streakN: a rising pentatonic arpeggio, one note longer per tier (3 s, 6 s, 9 s, 12 s, 15 s+).
  ...Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`streak${n}`, (sr: number) => gain(arp([880, 987.77, 1108.73, 1318.51, 1479.98, 1760].slice(0, n + 1), 0.07, sr), 0.4)])),
  combo2: (sr) => gain(arp([1318.51, 1760], 0.06, sr), 0.35), combo3: (sr) => gain(arp([1108.73, 1318.51, 1760], 0.06, sr), 0.38), combo4: (sr) => gain(arp([880, 1108.73, 1318.51, 1760, 2217.46], 0.055, sr), 0.3),
  knock: (sr) => sum(gain(clank(0.25, sr), 0.4), gain(ding(660, 0.3, sr), 0.3)),
  peek: (sr) => gain(whoosh(0.12, sr, true), 0.12),
  best: (sr) => gain(arp([659.25, 830.61, 987.77, 1318.51, 1661.22, 1975.53], 0.09, sr, 0.9), 0.45),
  done: (sr) => gain(arp([880, 1318.51], 0.12, sr, 0.6), 0.35),
};

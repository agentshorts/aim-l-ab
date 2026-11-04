import { SFX } from "./sfx_synth";
// Small Web Audio core: one interactive-latency context, buffers built up front, master gain, mute. Event names map to buffers.
export class AudioCore {
  ctx: AudioContext | null = null; master: GainNode | null = null; buffers = new Map<string, AudioBuffer>(); volume = 0.6; muted = false; played: string[] = [];
  init() { if (this.ctx || typeof AudioContext === "undefined") return; this.ctx = new AudioContext({ latencyHint: "interactive" }); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination); this.apply();
    for (const [k, f] of Object.entries(SFX)) { const s = f(this.ctx.sampleRate); const b = this.ctx.createBuffer(1, s.length, this.ctx.sampleRate); b.copyToChannel(s as Float32Array<ArrayBuffer>, 0); this.buffers.set(k, b); } }
  unlock() { this.init(); if (this.ctx?.state === "suspended") this.ctx.resume(); } // call from a user gesture (Start click)
  async load(name: string, url: string) { this.init(); if (!this.ctx) return; const r = await fetch(url); this.buffers.set(name, await this.ctx.decodeAudioData(await r.arrayBuffer())); }
  set(volume: number, muted: boolean) { this.volume = Math.min(1, Math.max(0, volume)); this.muted = muted; this.apply(); }
  private apply() { if (this.master) this.master.gain.value = this.muted ? 0 : this.volume; }
  /** #57 streak hum: a soft sustained chord (root, fifth, octave, sine) that rises in pitch and loudness with the streak.
   * level 0..1 (0 fades it out). Pitch steps up the major pentatonic so every step sounds consonant. */
  private humNodes: { osc: OscillatorNode[]; g: GainNode } | null = null; humLevel = 0;
  hum(level: number) { level = Math.max(0, Math.min(1, level)); this.humLevel = level; if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime, { freq, gain } = humParams(level);
    if (!this.humNodes) { if (level <= 0) return; const g = this.ctx.createGain(); g.gain.value = 0; const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800; g.connect(lp).connect(this.master);
      const osc = [1, 1.5, 2].map((m, i) => { const o = this.ctx!.createOscillator(); o.type = "sine"; o.frequency.value = freq * m; const og = this.ctx!.createGain(); og.gain.value = [1, 0.45, 0.25][i]; o.connect(og).connect(g); o.start(); return o; });
      this.humNodes = { osc, g }; }
    const n = this.humNodes; n.g.gain.setTargetAtTime(this.muted ? 0 : gain, t, 0.08); n.osc.forEach((o, i) => o.frequency.setTargetAtTime(freq * [1, 1.5, 2][i], t, 0.15));
    if (level <= 0) { const old = n; this.humNodes = null; setTimeout(() => old.osc.forEach((o) => { try { o.stop(); } catch {} }), 600); } }
  play(name: string, gain = 1) { this.played.push(name); if (this.played.length > 200) this.played.shift(); const b = this.buffers.get(name); if (!this.ctx || !b || this.muted) return;
    const s = this.ctx.createBufferSource(); s.buffer = b; if (gain !== 1) { const g = this.ctx.createGain(); g.gain.value = gain; s.connect(g).connect(this.master!); } else s.connect(this.master!); s.start(); }
}

/** #57: hum pitch steps through the A major pentatonic (A3 B3 C#4 E4 F#4 A4) as level rises; gain 0.03 to 0.11 (soft under the SFX). */
export const HUM_STEPS = [220, 246.94, 277.18, 329.63, 369.99, 440];
export function humParams(level: number) { const i = Math.min(HUM_STEPS.length - 1, Math.floor(level * HUM_STEPS.length)); return { freq: HUM_STEPS[i], gain: level <= 0 ? 0 : 0.03 + 0.08 * level, step: i }; }

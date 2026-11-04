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
  play(name: string, gain = 1) { this.played.push(name); if (this.played.length > 200) this.played.shift(); const b = this.buffers.get(name); if (!this.ctx || !b || this.muted) return;
    const s = this.ctx.createBufferSource(); s.buffer = b; if (gain !== 1) { const g = this.ctx.createGain(); g.gain.value = gain; s.connect(g).connect(this.master!); } else s.connect(this.master!); s.start(); }
}

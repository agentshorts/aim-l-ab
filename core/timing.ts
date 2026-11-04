export class FrameStats {
  private last = 0; samples: number[] = [];
  tick(now: number) { if (this.last) this.samples.push(now - this.last); this.last = now; if (this.samples.length > 5000) this.samples.shift(); }
  summary() {
    const s = [...this.samples].sort((a, b) => a - b); const n = s.length || 1;
    return { n: s.length, mean: s.reduce((a, b) => a + b, 0) / n, p99: s[Math.floor(n * 0.99)] ?? 0, max: s[n - 1] ?? 0 };
  }
}
export function loop(fn: (dt: number, now: number) => void, stats: FrameStats) {
  let prev = performance.now();
  const f = (now: number) => { stats.tick(now); fn(Math.min(0.05, (now - prev) / 1000), now); prev = now; requestAnimationFrame(f); };
  requestAnimationFrame(f);
}

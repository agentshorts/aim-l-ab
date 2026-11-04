export function pct(a: number[], p: number) { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; }
export class FrameStats {
  private last = 0; samples: number[] = [];
  tick(now: number) { if (this.last) this.samples.push(now - this.last); this.last = now; if (this.samples.length > 6000) this.samples.splice(0, 3000); }
  reset() { this.samples = []; this.last = 0; }
  summary() {
    const s = this.samples, n = s.length || 1, mean = s.reduce((a, b) => a + b, 0) / n, med = pct(s, 0.5);
    const sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
    return { n: s.length, mean, p50: med, p99: pct(s, 0.99), max: Math.max(0, ...s), sd, hitches: s.filter((x) => x > med * 1.5).length, hz: mean ? 1000 / mean : 0 };
  }
}
// rAF loop; dt clamped so a tab switch does not teleport the sim
export function loop(fn: (dt: number, now: number) => void, stats: FrameStats) {
  let prev = performance.now(), id = 0, on = true;
  const f = (now: number) => { if (!on) return; stats.tick(now); fn(Math.min(0.05, Math.max(0, now - prev) / 1000), now); prev = now; id = requestAnimationFrame(f); };
  id = requestAnimationFrame(f); return () => { on = false; cancelAnimationFrame(id); };
}

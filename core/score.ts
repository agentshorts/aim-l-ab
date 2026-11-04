export class Score {
  c: Record<string, number> = {}; errs: number[] = [];
  add(k: string, n = 1) { this.c[k] = (this.c[k] || 0) + n; }
  err(ms: number) { this.errs.push(ms); }
  meanAbsErr() { return this.errs.length ? this.errs.reduce((a, b) => a + Math.abs(b), 0) / this.errs.length : 0; }
}

// tiny line chart for session history
export function lineChart(cv: HTMLCanvasElement, ys: number[], opts: { color?: string; label?: string; best?: number } = {}) {
  const dpr = devicePixelRatio || 1, W = cv.clientWidth || 300, H = cv.clientHeight || 120; cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext("2d")!; g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
  g.strokeStyle = "#2e3d42"; g.strokeRect(0.5, 0.5, W - 1, H - 1); g.fillStyle = "#93a39f"; g.font = "11px system-ui";
  if (!ys.length) { g.fillText("no sessions yet", 10, H / 2); return; }
  const lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1, px = (i: number) => 8 + (i / Math.max(1, ys.length - 1)) * (W - 16), py = (v: number) => H - 14 - ((v - lo) / span) * (H - 30);
  g.fillText(`${opts.label || ""} min ${lo.toFixed(1)} max ${hi.toFixed(1)}`, 8, 12);
  g.strokeStyle = opts.color || "#e8a93c"; g.lineWidth = 2; g.beginPath(); ys.forEach((v, i) => (i ? g.lineTo(px(i), py(v)) : g.moveTo(px(i), py(v)))); g.stroke();
  g.fillStyle = opts.color || "#e8a93c"; ys.forEach((v, i) => { g.beginPath(); g.arc(px(i), py(v), 2.5, 0, 7); g.fill(); });
}

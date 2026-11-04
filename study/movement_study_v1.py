"""Movement study v1: estimate how targets move in high-elo Deadlock fight clips.
READ ONLY on the clips: only cv2.VideoCapture reads them. All outputs go to OUT.
Everything here is an ESTIMATE from screen motion (see specs/movement_study_v1.md).
Usage: python movement_study_v1.py --clips DIR --out DIR [--n 40] [--max-minutes 40] [--sheet]
"""
import argparse, json, os, random, time, glob, math
import numpy as np, cv2

W = 480  # analysis width (16:9 -> 270 high)
HFOV = 90.0  # ESTIMATE: assumed horizontal FOV of the stream view, deg
DEG_PER_PX = HFOV / W  # small-angle approximation near the center

def red_bars(hsv):
    """Enemy anchors: thin saturated red horizontal marks (enemy HP bar segments and the red status tag under enemy names). Returns list of (cx, cy, w)."""
    h, s, v = cv2.split(hsv)
    m = (((h < 8) | (h > 172)) & (s > 140) & (v > 110)).astype(np.uint8) * 255
    H_, W_ = m.shape
    m[: int(H_ * 0.13)] = 0           # team portraits / top bar
    m[int(H_ * 0.62):] = 0            # own HUD, abilities, webcam
    m[:, : int(W_ * 0.03)] = 0; m[:, int(W_ * 0.97):] = 0
    m[int(H_ * 0.42):, int(W_ * 0.72):] = 0  # minimap and webcam (red map markers)
    m[int(H_ * 0.45):, : int(W_ * 0.28)] = 0  # own health and stamina HUD
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (7, 1)))
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    out = []
    for i in range(1, n):
        x, y, w, hh, a = st[i]
        if 10 <= w <= 70 and 1 <= hh <= 5 and w / max(hh, 1) >= 4 and a >= 0.6 * w * hh:
            out.append((float(cen[i][0]), float(cen[i][1]), int(w)))
    return out

def analyze(path, step=2):
    cap = cv2.VideoCapture(path); fps = cap.get(cv2.CAP_PROP_FPS) or 60.0
    dt = step / fps; prev = None; rows = []; i = 0
    while True:
        ok = cap.grab()
        if not ok: break
        if i % step: i += 1; continue
        ok, fr = cap.retrieve(); i += 1
        if not ok: break
        sm = cv2.resize(fr, (W, W * fr.shape[0] // fr.shape[1]), interpolation=cv2.INTER_AREA)
        g = cv2.cvtColor(sm, cv2.COLOR_BGR2GRAY).astype(np.float32)
        Hh = g.shape[0]; band = g[int(Hh * 0.14): int(Hh * 0.5), int(W * 0.05): int(W * 0.95)]
        bars = red_bars(cv2.cvtColor(sm, cv2.COLOR_BGR2HSV))
        cam_dx = cam_dy = 0.0; div = 0.0
        if prev is not None:
            (dx, dy), resp = cv2.phaseCorrelate(prev[0], band, cv2.createHanningWindow(band.shape[::-1], cv2.CV_32F))
            if resp > 0.05: cam_dx, cam_dy = -dx, -dy  # scene shifts left when camera turns right
            small_p = cv2.resize(prev[1], (160, 90)); small = cv2.resize(g, (160, 90))
            fl = cv2.calcOpticalFlowFarneback(small_p, small, None, 0.5, 2, 9, 2, 5, 1.1, 0)
            fl[..., 0] -= fl[..., 0].mean(); fl[..., 1] -= fl[..., 1].mean()  # remove rotation (pure shift)
            yy, xx = np.mgrid[0:90, 0:160]; rx, ry = xx - 80, yy - 45; r = np.hypot(rx, ry) + 1e-6
            ring = (r > 15) & (r < 44) & (yy < 60)
            div = float(((fl[..., 0] * rx + fl[..., 1] * ry) / r)[ring].mean())  # radial outflow = forward speed proxy
        rows.append({"t": round((i - 1) / fps, 4), "cam_dx": cam_dx, "cam_dy": cam_dy, "div": div, "bars": bars})
        prev = (band, g)
    cap.release()
    return {"fps": fps, "dt": dt, "rows": rows}

def summarize(a):
    rows, dt = a["rows"], a["dt"]; n = len(rows)
    if n < 30: return {"fight": False, "reason": "short"}
    yaw = np.array([r["cam_dx"] for r in rows]) * DEG_PER_PX / dt          # deg/s camera yaw rate
    div = np.array([r["div"] for r in rows]) / dt                            # px/s radial outflow (160 px wide grid)
    nb = np.array([len(r["bars"]) for r in rows])
    near = np.array([any(abs(b[0] - W / 2) < W * 0.3 for b in r["bars"]) for r in rows])
    fight_frac = float(near.mean())
    s = {"frames": n, "fight_frac": round(fight_frac, 3), "fight": fight_frac >= 0.25}
    # target angular velocity: track the bar nearest the screen center frame to frame
    tw, ts = [], []
    for k in range(1, n):
        a0, a1 = rows[k - 1]["bars"], rows[k]["bars"]
        if not a0 or not a1: continue
        p = min(a1, key=lambda b: abs(b[0] - W / 2))
        q = min(a0, key=lambda b: math.hypot(b[0] - p[0], b[1] - p[1]))
        if math.hypot(q[0] - p[0], q[1] - p[1]) > 25 or abs(q[2] - p[2]) > 12: continue
        bar_v = (p[0] - q[0]) * DEG_PER_PX / dt
        tw.append(yaw[k] + bar_v); ts.append(rows[k]["t"])
    tw = np.array(tw); ts = np.array(ts)
    if len(tw) >= 20:
        sm = np.convolve(tw, np.ones(3) / 3, mode="same")
        dead = 8.0  # deg/s dead band before a direction counts
        sign = np.where(sm > dead, 1, np.where(sm < -dead, -1, 0)); last, lt, rev = 0, None, []
        for t, sg in zip(ts, sign):
            if sg == 0: continue
            if last and sg != last and lt is not None: rev.append(t - lt)
            if sg != last: lt = t
            last = sg
        s["target_ang_speed_deg_s"] = {"p50": round(float(np.percentile(abs(sm), 50)), 1), "p90": round(float(np.percentile(abs(sm), 90)), 1)}
        s["reversal_intervals_s"] = [round(float(x), 3) for x in rev if 0.08 < x < 4]
        s["tracked_frames"] = int(len(tw))
    # own-movement bursts from radial outflow (forward speed proxy)
    thr = np.percentile(div, 50) + 3 * (np.percentile(div, 75) - np.percentile(div, 25) + 1e-6)
    hi = div > thr; bursts = []; k = 0
    while k < n:
        if hi[k]:
            j = k
            while j < n and hi[j]: j += 1
            bursts.append((rows[k]["t"], (j - k) * dt, float(np.abs(yaw[k:j]).mean()))); k = j
        else: k += 1
    s["dash_like"] = [b for b in bursts if 0.15 <= b[1] <= 0.9]      # dash duration band 0.62-0.72 s plus detection slack
    s["sustained"] = [b for b in bursts if b[1] > 1.5 and b[2] < 60]  # zipline-like: long fast forward, little turning
    s["dur_s"] = round(n * dt, 2); s["yaw_p90_deg_s"] = round(float(np.percentile(abs(yaw), 90)), 1)
    return s

def sheet(path, a, out_png):
    cap = cv2.VideoCapture(path); fps = a["fps"]; tiles = []
    for t in np.linspace(1, a["rows"][-1]["t"] - 1, 6):
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000); ok, fr = cap.read()
        if not ok: continue
        sm = cv2.resize(fr, (W, W * fr.shape[0] // fr.shape[1]))
        for b in red_bars(cv2.cvtColor(sm, cv2.COLOR_BGR2HSV)): cv2.rectangle(sm, (int(b[0] - b[2] / 2) - 2, int(b[1]) - 4), (int(b[0] + b[2] / 2) + 2, int(b[1]) + 4), (0, 255, 0), 1)
        tiles.append(sm)
    cap.release()
    if len(tiles) == 6: cv2.imwrite(out_png, np.vstack([np.hstack(tiles[:3]), np.hstack(tiles[3:])]))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--clips"); ap.add_argument("--out"); ap.add_argument("--n", type=int, default=40)
    ap.add_argument("--max-minutes", type=float, default=40); ap.add_argument("--sheet", action="store_true"); ap.add_argument("--seed", type=int, default=7)
    o = ap.parse_args(); os.makedirs(o.out, exist_ok=True); t0 = time.time()
    files = sorted(f for f in glob.glob(os.path.join(o.clips, "**", "*.mp4"), recursive=True) if "_preview" not in f)
    by = {}
    for f in files: by.setdefault(os.path.basename(os.path.dirname(f)), []).append(f)
    rnd = random.Random(o.seed); pick = []
    per = max(1, o.n // len(by))
    for k in sorted(by): pick += rnd.sample(by[k], min(per, len(by[k])))
    rest = [f for f in files if f not in pick]; rnd.shuffle(rest); pick += rest[: max(0, o.n - len(pick))]
    ck = os.path.join(o.out, "checkpoint_v1.json"); done = json.load(open(ck)) if os.path.exists(ck) else {}
    json.dump({"sample": pick, "seed": o.seed}, open(os.path.join(o.out, "sample_v1.json"), "w"), indent=1)
    for f in pick:
        if f in done: continue
        if (time.time() - t0) / 60 > o.max_minutes: print("time budget hit, rerun to resume"); break
        a = analyze(f); s = summarize(a); s["clip"] = os.path.relpath(f, o.clips); done[f] = s
        if o.sheet: sheet(f, a, os.path.join(o.out, "sheets_v1", os.path.basename(f) + ".jpg")) if os.makedirs(os.path.join(o.out, "sheets_v1"), exist_ok=True) is None else None
        json.dump(done, open(ck, "w"))
        print(f"{len(done)}/{len(pick)} {s['clip']} fight={s.get('fight')} frac={s.get('fight_frac')} {time.time() - t0:.0f}s", flush=True)
    print("remaining:", len([f for f in pick if f not in done]))

if __name__ == "__main__": main()

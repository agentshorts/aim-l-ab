"""Movement study v2: estimate how targets move in high-elo Deadlock fight clips.
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

def lobby_frac(path):
    """Queue/lobby check: share of 3 probe frames with the green FINDING MATCH banner in the top-left."""
    c = cv2.VideoCapture(path); hits = 0
    for ms in (3000, 10000, 18000):
        c.set(cv2.CAP_PROP_POS_MSEC, ms); ok, fr = c.read()
        if not ok: continue
        H, W2 = fr.shape[:2]; hsv = cv2.cvtColor(fr[: int(H * 0.15), : int(W2 * 0.3)], cv2.COLOR_BGR2HSV)
        hits += (cv2.inRange(hsv, (40, 120, 150), (85, 255, 255)) > 0).mean() > 0.02
    return float(hits) / 3

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
        act = float(np.abs(g - prev[1]).mean()) if prev is not None else 0.0
        rows.append({"t": round((i - 1) / fps, 4), "cam_dx": cam_dx, "cam_dy": cam_dy, "div": div, "act": act})
        prev = (band, g)
    cap.release()
    return {"fps": fps, "dt": dt, "rows": rows, "lobby": lobby_frac(path)}

def summarize(a):
    rows, dt = a["rows"], a["dt"]; n = len(rows)
    if n < 60: return {"fight": False, "reason": "short"}
    t = np.array([r["t"] for r in rows]); yaw = np.array([r["cam_dx"] for r in rows]) * DEG_PER_PX / dt  # deg/s camera yaw
    div = np.array([r["div"] for r in rows]) / dt; act = np.array([r["act"] for r in rows])
    # fight filter (ESTIMATE): not queue/lobby, mostly live view (not shop/scoreboard/death cam), and active aiming
    fw = act > 1.5; still = float(np.mean(~fw)); aim = float(np.mean(np.abs(yaw) > 20))
    s = {"frames": n, "dur_s": round(n * dt, 2), "lobby": a["lobby"], "still_frac": round(still, 2), "aim_frac": round(aim, 2)}
    s["fight"] = a["lobby"] == 0 and still < 0.25 and aim >= 0.05
    if not s["fight"]: return s
    # target motion ESTIMATE: in fight windows the camera follows the target, so yaw rate ~ target angular velocity
    sm = np.convolve(yaw, np.ones(5) / 5, "same"); dead = 10.0; last, lt, rev = 0, None, []
    for tt, v, f in zip(t, sm, fw):
        if not f: last, lt = 0, None; continue
        sg = 1 if v > dead else -1 if v < -dead else 0
        if sg == 0: continue
        if last and sg != last and lt is not None: rev.append(tt - lt)
        if sg != last: lt = tt
        last = sg
    s["track_speed_deg_s"] = {"p50": round(float(np.percentile(np.abs(sm[fw]), 50)), 1), "p90": round(float(np.percentile(np.abs(sm[fw]), 90)), 1)}
    s["reversal_intervals_s"] = [round(float(x), 3) for x in rev if 0.1 < x < 4]
    # own-movement bursts from radial outflow (forward speed proxy), fight windows only
    d = div[fw]; thr = np.percentile(d, 50) + 3 * (np.percentile(d, 75) - np.percentile(d, 25) + 1e-6)
    hi = (div > thr) & fw; bursts = []; k = 0
    while k < n:
        if hi[k]:
            j = k
            while j < n and hi[j]: j += 1
            bursts.append((float(t[k]), (j - k) * dt, float(np.abs(yaw[k:j]).mean()))); k = j
        else: k += 1
    s["dash_like"] = [b for b in bursts if 0.15 <= b[1] <= 0.9]
    s["sustained"] = [b for b in bursts if b[1] > 1.5 and b[2] < 60]
    # vertical camera bob (jump proxy): pitch-rate sign flip up then down within 0.3 to 0.9 s while yaw is calm
    vy = np.convolve(np.array([r["cam_dy"] for r in rows]) * DEG_PER_PX / dt, np.ones(5) / 5, "same"); jumps = 0; k = 0
    while k < n - 1:
        if fw[k] and vy[k] < -25:
            j = k
            while j < n and t[j] - t[k] < 0.9 and vy[j] < 25: j += 1
            if j < n and 0.3 <= t[j] - t[k] <= 0.9 and vy[j] >= 25: jumps += 1; k = j
        k += 1
    s["jump_like"] = jumps
    return s

def sheet(path, a, out_png):
    cap = cv2.VideoCapture(path); fps = a["fps"]; tiles = []
    for t in np.linspace(1, a["rows"][-1]["t"] - 1, 6):
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000); ok, fr = cap.read()
        if not ok: continue
        sm = cv2.resize(fr, (W, W * fr.shape[0] // fr.shape[1]))
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
    ck = os.path.join(o.out, "checkpoint_v2.json"); done = json.load(open(ck)) if os.path.exists(ck) else {}
    json.dump({"sample": pick, "seed": o.seed}, open(os.path.join(o.out, "sample_v2.json"), "w"), indent=1)
    for f in pick:
        if f in done: continue
        if (time.time() - t0) / 60 > o.max_minutes: print("time budget hit, rerun to resume"); break
        a = analyze(f); s = summarize(a); s["clip"] = os.path.relpath(f, o.clips); done[f] = s
        if o.sheet: sheet(f, a, os.path.join(o.out, "sheets_v2", os.path.basename(f) + ".jpg")) if os.makedirs(os.path.join(o.out, "sheets_v2"), exist_ok=True) is None else None
        json.dump(done, open(ck, "w"), default=lambda o: o.item() if hasattr(o, "item") else str(o))
        print(f"{len(done)}/{len(pick)} {s['clip']} fight={s.get('fight')} still={s.get('still_frac')} aim={s.get('aim_frac')} lobby={s.get('lobby')} {time.time() - t0:.0f}s", flush=True)
    print("remaining:", len([f for f in pick if f not in done]))

if __name__ == "__main__": main()

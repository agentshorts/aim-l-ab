import json, numpy as np
d = json.load(open(r"run_v2\checkpoint_v2.json")); f = [s for s in d.values() if s.get("fight")]
rev = np.array([x for s in f for x in s["reversal_intervals_s"]]); mins = sum(s["dur_s"] for s in f) / 60
dash = [b for s in f for b in s["dash_like"]]; sus = [b for s in f for b in s["sustained"]]
out = {"version": "v1", "ESTIMATED": True, "clips_sampled": len(d), "clips_fight": len(f), "fight_minutes": round(mins, 2),
 "rejected": {s["clip"]: {k: s.get(k) for k in ("lobby", "still_frac", "aim_frac")} for s in d.values() if not s.get("fight")},
 "reversal_interval_s": {"n": int(len(rev)), **{f"p{q}": round(float(np.percentile(rev, q)), 3) for q in (10, 25, 50, 75, 90)}},
 "reversals_per_min": round(len(rev) / mins, 1),
 "track_speed_deg_s_p50_median": round(float(np.median([s["track_speed_deg_s"]["p50"] for s in f])), 1),
 "track_speed_deg_s_p90_median": round(float(np.median([s["track_speed_deg_s"]["p90"] for s in f])), 1),
 "dash_like_per_min": round(len(dash) / mins, 2), "dash_like_dur_s_p50": round(float(np.median([b[1] for b in dash])), 3) if dash else None,
 "sustained_per_min": round(len(sus) / mins, 2), "sustained_dur_s_p50": round(float(np.median([b[1] for b in sus])), 2) if sus else None,
 "jump_like_per_min": round(sum(s["jump_like"] for s in f) / mins, 2)}
json.dump(out, open("movement_stats_v1.json", "w"), indent=1); print(json.dumps(out, indent=1))

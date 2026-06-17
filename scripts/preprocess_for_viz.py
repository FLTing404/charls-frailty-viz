#!/usr/bin/env python3
"""
Preprocess CHARLS multi-domain longitudinal data for the visual analytics system.
Merges across domains by ID+wave, derives composite scores, and outputs
web-optimized JSON files for the React frontend.
"""

import json
import sys
from pathlib import Path
from collections import defaultdict
import math

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_JSON = BASE_DIR / "data_json"
OUTPUT_DIR = BASE_DIR / "viz-app" / "public" / "data"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def load_json(rel_path):
    path = DATA_JSON / rel_path
    if not path.exists():
        print(f"  ⚠ Missing: {rel_path}")
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def safe_float(v, default=None):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default

def safe_int(v, default=None):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return default

# ── 1. Load all data ─────────────────────────────────────────────────

print("=" * 60)
print("CHARLS Data Preprocessing for Visual Analytics")
print("=" * 60)

# ACE data (one-time, use after_pca version which has ace_sum)
ace_data = {}
for row in load_json("charls_ace/charls_ace_after_pca.json"):
    pid = str(row.get("ID", "")).strip()
    if pid and pid != "nan":
        ace_data[pid] = {
            "ace_sum": safe_float(row.get("ace_sum"), 0),
            "famfin": safe_float(row.get("famfin")),
            "starv": row.get("starv"),
            "lonely": row.get("lonely"),
            "nnbully": row.get("nnbully"),
            "schoolbully": row.get("schoolbully"),
            "padiv": row.get("padiv"),
            "momdepres": row.get("momdepres"),
            "daddepres": row.get("daddepres"),
        }
print(f"  ACE: {len(ace_data)} individuals")

# ── Load wave-structured data ──

def load_wave_data(rel_glob, id_col="ID", wave_col="wave", extra_parse=None):
    """Load multi-wave data indexed by (id, wave)."""
    result = defaultdict(dict)  # id -> {wave: record}
    path = DATA_JSON / rel_glob
    # Find actual files
    files = sorted(DATA_JSON.glob(rel_glob))
    if not files:
        # Try exact path
        if path.exists():
            files = [path]
    for fp in files:
        data = load_json(str(fp.relative_to(DATA_JSON)))
        if not data:
            continue
        for row in data:
            pid = str(row.get(id_col, "")).strip()
            if not pid or pid == "nan":
                continue
            w = row.get(wave_col)
            # Try to extract wave from filename if not in row
            if w is None or w == "nan" or (isinstance(w, float) and math.isnan(w)):
                # Try to infer from filename
                fname = fp.stem
                for yr in ["2011", "2013", "2015", "2018", "2020"]:
                    if yr in fname:
                        w = int(yr)
                        break
            if w is None:
                continue
            w = int(float(w)) if not isinstance(w, int) else w

            rec = {k: v for k, v in row.items()}
            if extra_parse:
                extra_parse(rec)
            result[pid][w] = rec
    return dict(result)

# Frailty
frailty_data = defaultdict(dict)
for fp in sorted((DATA_JSON / "charls_frailty").glob("*.json")):
    fname = fp.stem
    for yr in ["2011", "2013", "2015", "2018"]:
        if yr in fname:
            wave = int(yr)
            break
    else:
        continue
    for row in load_json(str(fp.relative_to(DATA_JSON))):
        pid = str(row.get("ID", "")).strip()
        if not pid or pid == "nan":
            continue
        frailty_data[pid][wave] = {
            "FI": safe_float(row.get("FI")),
            "frailty_cat": row.get("frailty_cat"),
            "frailty": safe_int(row.get("frailty")),
            "deficit_sum": safe_float(row.get("deficit_sum")),
            "cognition": safe_float(row.get("cognition")),
        }
frailty_data = dict(frailty_data)
print(f"  Frailty: {len(frailty_data)} individuals across waves")

# SES
ses_data = defaultdict(dict)
for fp in sorted((DATA_JSON / "charls_socialeconomic_status").glob("*.json")):
    fname = fp.stem
    for yr in ["2011", "2013", "2015", "2018"]:
        if yr in fname:
            wave = int(yr)
            break
    else:
        continue
    for row in load_json(str(fp.relative_to(DATA_JSON))):
        pid = str(row.get("ID", "")).strip()
        if not pid or pid == "nan":
            continue
        ses_data[pid][wave] = {
            "raeducl": safe_float(row.get("raeducl")),
            "atotb": safe_float(row.get("atotb")),
            "lbrf_c": str(row.get("lbrf_c", "")),
            "hukou": str(row.get("hukou", "")),
        }
ses_data = dict(ses_data)
print(f"  SES: {len(ses_data)} individuals across waves")

# Depression (cognitive + depression items)
dep_data = defaultdict(dict)
for fp in sorted((DATA_JSON / "charls_depression_cognition_by_wave").glob("*.json")):
    fname = fp.stem
    for yr in ["2011", "2013", "2015", "2018", "2020"]:
        if yr in fname:
            wave = int(yr)
            break
    else:
        continue
    for row in load_json(str(fp.relative_to(DATA_JSON))):
        pid = str(row.get("ID", "")).strip()
        if not pid or pid == "nan":
            continue
        # Count depression symptoms (CESD items: D1-D10 or named columns)
        dep_score = 0
        dep_items = []
        for key in row:
            if key.startswith("D") and key[1:].isdigit():
                v = safe_float(row[key], 0)
                if v and v > 0:
                    dep_score += 1
                    dep_items.append(key)
            elif "情绪低落" in key or "费劲" in key or "睡眠不好" in key or "愉快" in key or "孤单" in key or "烦恼" in key or "集中精力" in key or "充满希望" in key:
                v = safe_float(row[key], 0)
                if v and v > 0:
                    dep_score += 1

        # Cognitive score (word recall)
        cog_score = 0
        for key in row:
            if key.startswith("C") and key[1:].isdigit():
                v = safe_float(row[key], 0)
                if v and v > 0:
                    cog_score += v
            elif "单词记忆" in key:
                v = safe_float(row[key], 0)
                if v:
                    cog_score += v

        dep_data[pid][wave] = {
            "depression_score": dep_score,
            "cognition_score": safe_float(cog_score),
        }
dep_data = dict(dep_data)
print(f"  Depression/Cognition: {len(dep_data)} individuals across waves")

# Healthcare
hc_data = defaultdict(dict)
for fp in sorted((DATA_JSON / "charls_healthcare_system").glob("*.json")):
    fname = fp.stem
    for yr in ["2011", "2013", "2015", "2018"]:
        if yr in fname:
            wave = int(yr)
            break
    else:
        continue
    for row in load_json(str(fp.relative_to(DATA_JSON))):
        pid = str(row.get("ID", "")).strip()
        if not pid or pid == "nan":
            continue
        hc_data[pid][wave] = {
            "higov": safe_int(row.get("higov")),
            "hipriv": safe_int(row.get("hipriv")),
            "usualcare": safe_int(row.get("usualcare")),
            "oophos1y": safe_float(row.get("oophos1y")),
            "oopdoc1m": safe_float(row.get("oopdoc1m")),
            "caresat": safe_float(row.get("caresat")),
        }
hc_data = dict(hc_data)
print(f"  Healthcare: {len(hc_data)} individuals across waves")

# Social participation
soc_data = defaultdict(dict)
for fp in sorted((DATA_JSON / "charls_social_participation_by_wave").glob("socc_*.json")):
    fname = fp.stem
    for yr in ["2011", "2013", "2015", "2018"]:
        if yr in fname:
            wave = int(yr)
            break
    else:
        continue
    for row in load_json(str(fp.relative_to(DATA_JSON))):
        pid = str(row.get("id", row.get("ID", ""))).strip()
        if not pid or pid == "nan":
            continue
        # Social connection composite: sum of activity flags
        activities = ["interact_f", "majong_f", "provhelp_f", "sport_f",
                      "community_f", "volunteer_f", "sccare_f", "course_f",
                      "stock_f", "scinternet_f"]
        sc_score = 0
        for act in activities:
            v = safe_float(row.get(act), 0)
            if v and v > 0:
                sc_score += 1

        soc_data[pid][wave] = {
            "mstat": str(row.get("mstat", "")),
            "pcnt": safe_int(row.get("pcnt")),
            "kcnt": safe_int(row.get("kcnt")),
            "finhelp": safe_int(row.get("finhelp")),
            "nonfinhelp": safe_int(row.get("nonfinhelp")),
            "hhres": safe_int(row.get("hhres")),
            "social_connection_score": sc_score,
        }
soc_data = dict(soc_data)
print(f"  Social Participation: {len(soc_data)} individuals across waves")

# Sleep
sleep_data = defaultdict(dict)
for fp in sorted((DATA_JSON / "charls_sleep_by_wave").glob("*.json")):
    fname = fp.stem
    for yr in ["2011", "2013", "2015", "2018", "2020"]:
        if yr in fname:
            wave = int(yr)
            break
    else:
        continue
    for row in load_json(str(fp.relative_to(DATA_JSON))):
        pid = str(row.get("ID", "")).strip()
        if not pid or pid == "nan":
            continue
        sleep_data[pid][wave] = {
            "sleep": safe_float(row.get("sleep")),
            "cesd10": safe_float(row.get("cesd10")),
            "gender": safe_int(row.get("gender")),
            "rural": safe_int(row.get("rural")),
            "marry": safe_int(row.get("marry")),
        }
sleep_data = dict(sleep_data)
print(f"  Sleep: {len(sleep_data)} individuals across waves")

# Material circumstances
mc_data = defaultdict(dict)
for fp in sorted((DATA_JSON / "charls_material_circumstances").glob("*.json")):
    fname = fp.stem
    for yr in ["2015", "2018"]:
        if yr in fname:
            wave = int(yr)
            break
    else:
        continue
    for row in load_json(str(fp.relative_to(DATA_JSON))):
        pid = str(row.get("ID", "")).strip()
        if not pid or pid == "nan":
            continue
        # Material deprivation score (higher = worse)
        depriv = 0
        amenities = ["runwater", "shower", "gas", "cleancook", "telephone",
                     "internet", "aircleaner", "elevator", "ramp"]
        for am in amenities:
            v = row.get(am)
            if v is not None and str(v) in ("0", "noheat", "groud"):
                depriv += 1

        mc_data[pid][wave] = {
            "region": str(row.get("region", "")),
            "rural": safe_int(row.get("rural")),
            "material_deprivation": depriv,
            "bedrooms": safe_float(row.get("bedrooms")),
        }
mc_data = dict(mc_data)
print(f"  Material Circumstances: {len(mc_data)} individuals across waves")


# ── 2. Merge into unified longitudinal records ──────────────────────

print("\n🔗 Merging across domains...")

# Collect all IDs and waves
all_ids = set()
all_ids.update(ace_data.keys())
all_ids.update(frailty_data.keys())
all_ids.update(ses_data.keys())
all_ids.update(dep_data.keys())
all_ids.update(hc_data.keys())
all_ids.update(soc_data.keys())
all_ids.update(sleep_data.keys())

all_waves = [2011, 2013, 2015, 2018, 2020]

# Build participant records
participants = []
for pid in all_ids:
    ace = ace_data.get(pid, {})
    waves_data = []

    for w in all_waves:
        frailty = frailty_data.get(pid, {}).get(w, {})
        ses = ses_data.get(pid, {}).get(w, {})
        dep = dep_data.get(pid, {}).get(w, {})
        hc = hc_data.get(pid, {}).get(w, {})
        soc = soc_data.get(pid, {}).get(w, {})
        sleep = sleep_data.get(pid, {}).get(w, {})
        mc = mc_data.get(pid, {}).get(w, {})

        # Skip waves with no data at all
        has_data = any([frailty, ses, dep, hc, soc, sleep, mc])
        if not has_data:
            continue

        wave_rec = {
            "wave": w,
            "frailty": frailty,
            "ses": ses,
            "depression": dep,
            "healthcare": hc,
            "social": soc,
            "sleep": sleep,
            "material": mc,
        }
        waves_data.append(wave_rec)

    if not waves_data:
        continue

    # Compute summary metrics
    fi_values = [wd["frailty"].get("FI") for wd in waves_data
                 if wd["frailty"].get("FI") is not None]
    fi_trend = None
    if len(fi_values) >= 2:
        # Simple linear trend of FI over waves
        xs = list(range(len(fi_values)))
        n = len(xs)
        if n > 1:
            mean_x = sum(xs) / n
            mean_y = sum(fi_values) / n
            num = sum((xs[i] - mean_x) * (fi_values[i] - mean_y) for i in range(n))
            den = sum((x - mean_x) ** 2 for x in xs)
            fi_trend = round(num / den, 6) if den > 0 else 0

    # SES composite (z-score of education + log wealth)
    ses_values = [wd["ses"] for wd in waves_data if wd["ses"].get("raeducl") is not None]
    avg_edu = sum(s["raeducl"] for s in ses_values) / len(ses_values) if ses_values else None
    avg_wealth = sum(s["atotb"] for s in ses_values if s["atotb"] is not None) / len(ses_values) if ses_values else None

    # Determine baseline frailty status
    baseline_fi = next((wd["frailty"].get("FI") for wd in waves_data
                        if wd["frailty"].get("FI") is not None), None)

    participant = {
        "id": pid,
        "ace": ace,
        "waves": waves_data,
        "num_waves": len(waves_data),
        "fi_trend": fi_trend,
        "baseline_fi": baseline_fi,
        "avg_education": avg_edu,
        "avg_wealth": avg_wealth,
        "ace_sum": ace.get("ace_sum", 0) if ace else 0,
    }
    participants.append(participant)

# Sort by ID
participants.sort(key=lambda p: p["id"])

print(f"  Merged: {len(participants)} participants")

# ── 3. Derived aggregations ─────────────────────────────────────────

print("\n📊 Computing aggregations...")

# 3a. SES strata × Frailty (for View 1: Matrix)
# Create SES composite score
for p in participants:
    edu = p.get("avg_education") or 0
    wealth = p.get("avg_wealth") or 0
    log_wealth = math.log(wealth + 1) if wealth > 0 else 0
    p["ses_composite"] = round(edu * 0.5 + log_wealth * 0.5, 4) if (edu or log_wealth) else None

# 3b. Frailty trajectory clusters
from collections import Counter
frailty_by_wave = defaultdict(list)
for p in participants:
    for wd in p["waves"]:
        fi = wd["frailty"].get("FI")
        if fi is not None:
            frailty_by_wave[wd["wave"]].append(fi)

wave_frailty_stats = {}
for w in sorted(frailty_by_wave.keys()):
    vals = frailty_by_wave[w]
    wave_frailty_stats[str(w)] = {
        "mean": round(sum(vals) / len(vals), 4),
        "median": round(sorted(vals)[len(vals)//2], 4),
        "p25": round(sorted(vals)[len(vals)//4], 4),
        "p75": round(sorted(vals)[3*len(vals)//4], 4),
        "n": len(vals),
        "frail_pct": round(sum(1 for v in vals if v >= 0.25) / len(vals) * 100, 2),
    }

# 3c. SES × Frailty matrix
ses_bins = 5
# Compute SES percentiles
ses_vals = sorted([p["ses_composite"] for p in participants if p["ses_composite"] is not None])
if ses_vals:
    ses_breaks = [ses_vals[min(int(len(ses_vals) * i / ses_bins), len(ses_vals)-1)] for i in range(ses_bins + 1)]
    ses_breaks[-1] = ses_vals[-1] + 0.001  # ensure max included

ses_frailty_matrix = []
for i in range(ses_bins):
    lo, hi = ses_breaks[i], ses_breaks[i+1]
    bin_participants = [p for p in participants
                        if p["ses_composite"] is not None and lo <= p["ses_composite"] < hi]
    if not bin_participants:
        continue

    frail_count = sum(1 for p in bin_participants
                      if p["baseline_fi"] is not None and p["baseline_fi"] >= 0.25)
    pre_frail_count = sum(1 for p in bin_participants
                          if p["baseline_fi"] is not None and 0.1 <= p["baseline_fi"] < 0.25)
    robust_count = sum(1 for p in bin_participants
                       if p["baseline_fi"] is not None and p["baseline_fi"] < 0.1)

    ses_frailty_matrix.append({
        "ses_quintile": i + 1,
        "ses_range": [round(lo, 3), round(hi, 3)],
        "n": len(bin_participants),
        "frail_pct": round(frail_count / len(bin_participants) * 100, 2) if bin_participants else 0,
        "pre_frail_pct": round(pre_frail_count / len(bin_participants) * 100, 2) if bin_participants else 0,
        "robust_pct": round(robust_count / len(bin_participants) * 100, 2) if bin_participants else 0,
        "mean_fi": round(sum(p["baseline_fi"] for p in bin_participants
                            if p["baseline_fi"] is not None) / len(bin_participants), 4),
        "mean_ace": round(sum(p["ace_sum"] for p in bin_participants) / len(bin_participants), 2),
    })

# 3d. ACE → Mediation pathway data
ace_bins = 4  # 0, 1-2, 3-4, 5+
ace_groups = defaultdict(list)
for p in participants:
    ace = p.get("ace_sum", 0)
    if ace == 0:
        grp = "ACE=0"
    elif ace <= 2:
        grp = "ACE=1-2"
    elif ace <= 4:
        grp = "ACE=3-4"
    else:
        grp = "ACE≥5"
    ace_groups[grp].append(p)

mediation_data = []
for grp_name in ["ACE=0", "ACE=1-2", "ACE=3-4", "ACE≥5"]:
    grp_parts = ace_groups.get(grp_name, [])
    if not grp_parts:
        continue

    # Social connection scores
    sc_vals = []
    dep_vals = []
    fi_vals = []
    for p in grp_parts:
        for wd in p["waves"]:
            sc = wd["social"].get("social_connection_score")
            if sc is not None:
                sc_vals.append(sc)
            dep = wd["depression"].get("depression_score")
            if dep is not None:
                dep_vals.append(dep)
            fi = wd["frailty"].get("FI")
            if fi is not None:
                fi_vals.append(fi)

    mediation_data.append({
        "ace_group": grp_name,
        "n": len(grp_parts),
        "mean_social_connection": round(sum(sc_vals) / len(sc_vals), 2) if sc_vals else None,
        "mean_depression": round(sum(dep_vals) / len(dep_vals), 2) if dep_vals else None,
        "mean_frailty": round(sum(fi_vals) / len(fi_vals), 4) if fi_vals else None,
        "frail_pct": round(sum(1 for v in fi_vals if v >= 0.25) / len(fi_vals) * 100, 2) if fi_vals else None,
    })

# 3e. Regional frailty summary
region_data = defaultdict(lambda: {"fi_vals": [], "count": 0, "ace_vals": [], "ses_vals": []})
for p in participants:
    for wd in p["waves"]:
        region = wd["material"].get("region")
        if not region:
            continue
        fi = wd["frailty"].get("FI")
        if fi is not None:
            region_data[region]["fi_vals"].append(fi)
        region_data[region]["count"] += 1
    if p.get("ace_sum"):
        # Assign to earliest wave's region
        for wd in p["waves"]:
            r = wd["material"].get("region")
            if r:
                region_data[r]["ace_vals"].append(p["ace_sum"])
                break
    if p.get("ses_composite"):
        for wd in p["waves"]:
            r = wd["material"].get("region")
            if r:
                region_data[r]["ses_vals"].append(p["ses_composite"])
                break

region_summary = []
for region, d in region_data.items():
    fis = d["fi_vals"]
    region_summary.append({
        "region": region,
        "n_observations": d["count"],
        "mean_fi": round(sum(fis) / len(fis), 4) if fis else None,
        "frail_pct": round(sum(1 for v in fis if v >= 0.25) / len(fis) * 100, 2) if fis else None,
        "mean_ace": round(sum(d["ace_vals"]) / len(d["ace_vals"]), 2) if d["ace_vals"] else None,
        "mean_ses": round(sum(d["ses_vals"]) / len(d["ses_vals"]), 2) if d["ses_vals"] else None,
    })

# 3f. Risk factor profiles (for parallel sets / radar)
# Compare top vs bottom SES quintile
all_ses = sorted([p for p in participants if p["ses_composite"] is not None],
                 key=lambda p: p["ses_composite"])
n = len(all_ses)
if n >= 40:
    low_ses = all_ses[:n//5]
    high_ses = all_ses[-n//5:]

    risk_profiles = {}
    for label, group in [("Low SES (Q1)", low_ses), ("High SES (Q5)", high_ses)]:
        fi_vals = [p["baseline_fi"] for p in group if p["baseline_fi"] is not None]
        ace_vals = [p["ace_sum"] for p in group]
        dep_vals = []
        sc_vals = []
        hc_vals = []
        for p in group:
            for wd in p["waves"]:
                d = wd["depression"].get("depression_score")
                if d is not None:
                    dep_vals.append(d)
                s = wd["social"].get("social_connection_score")
                if s is not None:
                    sc_vals.append(s)
                h = wd["healthcare"].get("higov")
                if h is not None:
                    hc_vals.append(h)

        risk_profiles[label] = {
            "n": len(group),
            "mean_fi": round(sum(fi_vals) / len(fi_vals), 4) if fi_vals else None,
            "frail_pct": round(sum(1 for v in fi_vals if v >= 0.25) / len(fi_vals) * 100, 2) if fi_vals else None,
            "mean_ace": round(sum(ace_vals) / len(ace_vals), 2) if ace_vals else None,
            "mean_depression": round(sum(dep_vals) / len(dep_vals), 2) if dep_vals else None,
            "mean_social_connection": round(sum(sc_vals) / len(sc_vals), 2) if sc_vals else None,
            "gov_insurance_pct": round(sum(1 for v in hc_vals if v == 1) / len(hc_vals) * 100, 2) if hc_vals else None,
        }
else:
    risk_profiles = {}


# ── 4. Output ───────────────────────────────────────────────────────

print("\n💾 Writing output...")

def write_json(data, filename):
    path = OUTPUT_DIR / filename
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    sz = path.stat().st_size
    print(f"  ✓ {filename} ({sz/1024:.1f} KB)")

# Main dataset: all participants (for detail views)
# Split into chunks for web loading
chunk_size = 3000
chunks = [participants[i:i+chunk_size] for i in range(0, len(participants), chunk_size)]
for i, chunk in enumerate(chunks):
    write_json(chunk, f"participants_chunk_{i}.json")

# Metadata
meta = {
    "total_participants": len(participants),
    "num_chunks": len(chunks),
    "chunk_size": chunk_size,
    "waves": all_waves,
    "domains": ["ace", "frailty", "ses", "depression", "healthcare", "social", "sleep", "material"],
    "variable_descriptions": {
        "FI": "Frailty Index (0-1, ≥0.25 = frail)",
        "ace_sum": "ACE cumulative score (0-24)",
        "ses_composite": "SES composite (education + log wealth)",
        "social_connection_score": "Social activity count (0-10)",
        "depression_score": "CESD symptom count (0-10)",
        "fi_trend": "Linear slope of FI across waves",
        "frailty_cat": "robust / pre-frail / frail",
    }
}
write_json(meta, "metadata.json")

# Aggregated views
write_json(wave_frailty_stats, "wave_frailty_stats.json")
write_json(ses_frailty_matrix, "ses_frailty_matrix.json")
write_json(mediation_data, "mediation_pathway.json")
write_json(region_summary, "region_summary.json")
write_json(risk_profiles, "risk_profiles.json")

# Participant summary (minimal, for list/search)
participant_summary = []
for p in participants:
    participant_summary.append({
        "id": p["id"],
        "ace_sum": p["ace_sum"],
        "num_waves": p["num_waves"],
        "baseline_fi": p["baseline_fi"],
        "fi_trend": p["fi_trend"],
        "ses_composite": p["ses_composite"],
        "avg_education": p["avg_education"],
        "avg_wealth": p["avg_wealth"],
    })
write_json(participant_summary, "participant_summary.json")

# Variable dictionary (filtered to relevant)
variable_dict = load_json("variable_dictionary_flat.json")
write_json(variable_dict, "variable_dictionary.json")

print(f"\n✅ Preprocessing complete! Output: {OUTPUT_DIR}")
total_kb = sum(f.stat().st_size for f in OUTPUT_DIR.rglob("*.json")) / 1024
print(f"   Total: {total_kb:.0f} KB across {len(list(OUTPUT_DIR.rglob('*.json')))} files")

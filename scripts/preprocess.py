"""
AgeVital · CHARLS Preprocessing Pipeline
=========================================
Aggregates four-wave (2011/2013/2015/2018) CHARLS cleaned CSVs into compact JSON
files for the front-end dashboard. Uses only the Python standard library so it
runs out of the box on any Python 3.8+ environment.

Outputs (in agevital/data/):
  overview.json     : per-wave frailty/FI/sample summaries + global headline KPIs
  diseases.json     : 9-disease + ADL/IADL/physical prevalence per wave
  regions.json      : East/Mid/West/Northeast FI distribution per wave
  ridgeline.json    : FI kernel-density-ish histograms per wave (for ridgeline plot)
  sankey.json       : 2011 -> 2013 -> 2015 -> 2018 frailty-state transitions
  factors.json      : SES/Sleep/Social/Healthcare averaged by frailty category
  body.json         : 5-domain body-metaphor stats (head/chest/abdomen/limbs/whole)
  psu_box.json      : Box-plot quartiles by region x wave (FI distribution)
  age_cohort.json   : Cohort distribution by birth-year bands x frailty category
"""

import csv
import json
import math
import os
from collections import Counter, defaultdict
from statistics import mean, median, pstdev

# ---------------------------------------------------------------------------
BASE = os.path.join(os.path.dirname(__file__), "..", "清洗过后数据", "CHARLS")
OUT  = os.path.join(os.path.dirname(__file__), "..", "agevital", "data")
os.makedirs(OUT, exist_ok=True)

WAVES = [
    ("2011", "r1", 1),
    ("2013", "r2", 2),
    ("2015", "r3", 3),
    ("2018", "r4", 4),
]

# PSU 2-char prefix -> Region (built from mc_2018.csv but stable across waves)
PSU_REGION = {
    "01": "West", "03": "East", "04": "West", "05": "West", "06": "East",
    "07": "Mid",  "08": "West", "09": "East", "10": "West", "11": "East",
    "12": "West", "13": "West", "14": "Northeast", "15": "East",
    "16": "Northeast", "17": "Mid", "18": "East", "19": "East", "20": "East",
    "21": "Northeast", "24": "West", "26": "Mid", "27": "Mid", "28": "West",
    "29": "East", "32": "Mid", "33": "Mid", "34": "West",
}

# Frailty category color order (used by front-end)
CATS = ["robust", "pre-frail", "frail"]


# ---------------------------------------------------------------------------
# IO helpers
def load_csv(path):
    with open(path, "r", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def safe_float(v):
    try:
        if v in ("", "NA", None):
            return None
        return float(v)
    except (TypeError, ValueError):
        return None

def safe_int01(v):
    f = safe_float(v)
    if f is None:
        return None
    return 1 if f >= 1 else 0

def write_json(name, obj):
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  -> {name}  ({os.path.getsize(path)/1024:.1f} kB)")


# ---------------------------------------------------------------------------
# 1) Per-wave headline & frailty distribution -------------------------------
def build_overview():
    print("\n[1/9] overview.json")
    out = {"waves": [], "global": {}}
    total_n, total_cat = 0, Counter()
    for year, prefix, _ in WAVES:
        rows = load_csv(os.path.join(BASE, "charls_frailty", f"charls_frailty_{year}.csv"))
        cats = Counter(r["frailty_cat"] for r in rows)
        fis  = [safe_float(r["FI"]) for r in rows]
        fis  = [v for v in fis if v is not None]
        n    = len(rows)
        valid = cats["robust"] + cats["pre-frail"] + cats["frail"]
        out["waves"].append({
            "year": int(year),
            "n_total": n,
            "n_valid": valid,
            "n_na": cats["NA"],
            "cats": {c: cats[c] for c in CATS},
            "pct":  {c: round(cats[c]/valid*100, 2) if valid else 0 for c in CATS},
            "FI_mean":   round(mean(fis), 4) if fis else None,
            "FI_median": round(median(fis), 4) if fis else None,
            "FI_std":    round(pstdev(fis), 4) if len(fis) > 1 else 0,
            "FI_max":    round(max(fis), 4) if fis else None,
        })
        total_n  += n
        total_cat += cats
    # Global headlines (mirror the diabetes "Basic Data" big numbers)
    last = out["waves"][-1]
    out["global"] = {
        "n_unique_total":   total_n,
        "n_tracked":        out["waves"][1]["n_total"],
        "frail_rate_2018":  last["pct"]["frail"],
        "prefrail_rate_2018": last["pct"]["pre-frail"],
        "growth_frail_pct": round(out["waves"][-1]["pct"]["frail"] - out["waves"][0]["pct"]["frail"], 2),
        "fi_mean_2018":     last["FI_mean"],
    }
    write_json("overview.json", out)
    return out


# ---------------------------------------------------------------------------
# 2) Disease + ADL/IADL prevalence per wave --------------------------------
DOMAIN_LABELS = {
    "hibpe":   ("高血压",         "abdomen"),
    "diabe":   ("糖尿病",         "abdomen"),
    "hearte":  ("心脏病",         "chest"),
    "stroke":  ("中风",           "chest"),
    "cancre":  ("癌症",           "whole"),
    "arthre":  ("关节炎",         "limbs"),
    "lunge":   ("肺部疾病",       "chest"),
    "psyche":  ("心理疾病",       "head"),
    "memrye":  ("记忆相关疾病",   "head"),
}
ADL_LABELS = {
    "dressa": "穿衣", "batha": "洗澡", "eata": "进食", "beda": "起床", "toilta": "如厕",
}
IADL_LABELS = {
    "mealsa": "做饭", "shopa": "购物", "moneya": "理财", "medsa": "服药",
}
PHYS_LABELS = {
    "walk1kma": "走1km", "chaira": "起立", "climsa": "爬楼",
    "stoopa": "下蹲",   "armsa":  "抬臂", "lifta":  "提重",  "dimea": "捡硬币",
}

def build_diseases():
    print("\n[2/9] diseases.json")
    out = {"waves": []}
    for year, prefix, _ in WAVES:
        rows = load_csv(os.path.join(BASE, "charls_frailty", f"charls_frailty_{year}.csv"))
        wave = {"year": int(year), "diseases": [], "adl": [], "iadl": [], "phys": []}
        for k, (zh, _) in DOMAIN_LABELS.items():
            col = prefix + k
            vals = [safe_int01(r[col]) for r in rows]
            vals = [v for v in vals if v is not None]
            wave["diseases"].append({"key": k, "zh": zh, "prev": round(sum(vals)/len(vals)*100, 2) if vals else 0, "n": len(vals)})
        for tgt, src in [("adl", ADL_LABELS), ("iadl", IADL_LABELS), ("phys", PHYS_LABELS)]:
            for k, zh in src.items():
                col = prefix + k
                vals = [safe_int01(r[col]) for r in rows]
                vals = [v for v in vals if v is not None]
                wave[tgt].append({"key": k, "zh": zh, "prev": round(sum(vals)/len(vals)*100, 2) if vals else 0, "n": len(vals)})
        out["waves"].append(wave)
    write_json("diseases.json", out)
    return out


# ---------------------------------------------------------------------------
# 3) Region FI stats per wave (East/Mid/West/Northeast) ---------------------
def build_regions():
    print("\n[3/9] regions.json")
    out = {"waves": []}
    for year, prefix, _ in WAVES:
        rows = load_csv(os.path.join(BASE, "charls_frailty", f"charls_frailty_{year}.csv"))
        by_region = defaultdict(list)
        psu_fi = defaultdict(list)
        for r in rows:
            fi  = safe_float(r["FI"])
            if fi is None:
                continue
            p2  = r["ID"][:2]
            reg = PSU_REGION.get(p2)
            if reg:
                by_region[reg].append(fi)
                psu_fi[p2].append(fi)
        wave = {"year": int(year), "regions": [], "psu": []}
        for reg in ["East", "Mid", "West", "Northeast"]:
            vs = by_region.get(reg, [])
            if not vs:
                continue
            vs_sorted = sorted(vs)
            n = len(vs_sorted)
            def q(p):
                idx = max(0, min(n-1, int(round(p*(n-1)))))
                return vs_sorted[idx]
            wave["regions"].append({
                "region": reg,
                "n": n,
                "mean":  round(mean(vs), 4),
                "median":round(median(vs), 4),
                "q1":    round(q(0.25), 4),
                "q3":    round(q(0.75), 4),
                "min":   round(q(0.05), 4),
                "max":   round(q(0.95), 4),
                "frail_rate": round(sum(1 for v in vs if v >= 0.25)/n*100, 2),
            })
        # Top 10 PSU by FI for bubble plot
        psu_summary = []
        for p, vs in psu_fi.items():
            psu_summary.append({
                "code": p,
                "region": PSU_REGION.get(p, "?"),
                "n": len(vs),
                "mean": round(mean(vs), 4),
                "frail_rate": round(sum(1 for v in vs if v >= 0.25)/len(vs)*100, 2),
            })
        wave["psu"] = sorted(psu_summary, key=lambda d: -d["mean"])
        out["waves"].append(wave)
    write_json("regions.json", out)
    return out


# ---------------------------------------------------------------------------
# 4) Ridgeline (FI histograms) ---------------------------------------------
def build_ridgeline():
    print("\n[4/9] ridgeline.json")
    bins = [round(0.025 + 0.05*i, 4) for i in range(20)]   # 0.025, 0.075, ... 0.975
    edges = [round(0.05*i, 4) for i in range(21)]
    out = {"bins": bins, "waves": []}
    for year, _, _ in WAVES:
        rows = load_csv(os.path.join(BASE, "charls_frailty", f"charls_frailty_{year}.csv"))
        fis = [safe_float(r["FI"]) for r in rows]
        fis = [v for v in fis if v is not None]
        hist = [0]*20
        for v in fis:
            idx = min(19, int(v/0.05))
            hist[idx] += 1
        total = sum(hist)
        out["waves"].append({"year": int(year), "density": [round(h/total, 4) for h in hist], "n": total})
    write_json("ridgeline.json", out)
    return out


# ---------------------------------------------------------------------------
# 5) Sankey: 2011 -> 2013 -> 2015 -> 2018 transitions ----------------------
def build_sankey():
    print("\n[5/9] sankey.json")
    cat_by_year = {}
    for year, _, _ in WAVES:
        rows = load_csv(os.path.join(BASE, "charls_frailty", f"charls_frailty_{year}.csv"))
        cat_by_year[year] = {r["ID"]: r["frailty_cat"] for r in rows}
    # Use tracked cohort (= 2013 IDs)
    tracked = set(cat_by_year["2013"].keys())
    # nodes: year_cat
    nodes_order = []
    name_to_idx = {}
    for year, _, _ in WAVES:
        for c in CATS + ["NA"]:
            name = f"{year}_{c}"
            name_to_idx[name] = len(nodes_order)
            nodes_order.append({"name": name, "year": int(year), "cat": c,
                                "label": f"{year}·{c}"})
    # links between consecutive waves
    links = []
    years = [w[0] for w in WAVES]
    for i in range(len(years)-1):
        y1, y2 = years[i], years[i+1]
        flow = Counter()
        for pid in tracked:
            c1 = cat_by_year[y1].get(pid, "NA")
            c2 = cat_by_year[y2].get(pid, "NA")
            flow[(c1, c2)] += 1
        for (c1, c2), v in flow.items():
            if v <= 0: continue
            links.append({
                "source": name_to_idx[f"{y1}_{c1}"],
                "target": name_to_idx[f"{y2}_{c2}"],
                "value":  v,
            })
    write_json("sankey.json", {"nodes": nodes_order, "links": links, "cohort_n": len(tracked)})


# ---------------------------------------------------------------------------
# 6) Factors: SES / Sleep / Social / Healthcare ----------------------------
def build_factors():
    print("\n[6/9] factors.json")
    # Load 2018 frailty as the categorical target (largest valid cohort with most factors)
    frailty = {r["ID"]: r["frailty_cat"] for r in load_csv(os.path.join(BASE, "charls_frailty", "charls_frailty_2018.csv"))}

    # SES 2018
    ses = {r["ID"]: r for r in load_csv(os.path.join(BASE, "charls_socialeconomic_status", "ses_2018.csv"))}
    # Sleep 2018
    sleep = {r["ID"]: r for r in load_csv(os.path.join(BASE, "charls_sleep_by_wave", "sleep_2018_all_variables.csv"))}
    # Social participation (constructed)
    soc = {r["id"]: r for r in load_csv(os.path.join(BASE, "charls_social_participation_by_wave", "CHARLS_SC_constructed.csv"))}
    # Healthcare 2018
    hs = {r["ID"]: r for r in load_csv(os.path.join(BASE, "charls_healthcare_system", "hs_2018.csv"))}

    factor_specs = [
        ("SES_edu",      lambda i: safe_float(ses.get(i, {}).get("raeducl"))),
        ("SES_wealth",   lambda i: math.log10(safe_float(ses.get(i, {}).get("atotb")) or 1) if safe_float(ses.get(i, {}).get("atotb")) and safe_float(ses.get(i, {}).get("atotb")) > 0 else None),
        ("Sleep_hours",  lambda i: safe_float(sleep.get(i, {}).get("sleep"))),
        ("CESD10",       lambda i: safe_float(sleep.get(i, {}).get("cesd10"))),
        ("SC_Total",     lambda i: safe_float(soc.get(i, {}).get("Z_SC_Total"))),
        ("SC_Engagement",lambda i: safe_float(soc.get(i, {}).get("Z_SC_Engagement"))),
        ("HC_Satisfact", lambda i: safe_float(hs.get(i, {}).get("caresat"))),
    ]

    out = {"factors": []}
    for label, fn in factor_specs:
        by_cat = defaultdict(list)
        for pid, cat in frailty.items():
            if cat not in CATS: continue
            v = fn(pid)
            if v is None: continue
            by_cat[cat].append(v)
        entry = {"name": label, "by_cat": {}}
        all_vals = []
        for c in CATS:
            vs = by_cat[c]
            all_vals += vs
            entry["by_cat"][c] = {"mean": round(mean(vs), 4) if vs else None, "n": len(vs)}
        entry["overall_mean"] = round(mean(all_vals), 4) if all_vals else None
        out["factors"].append(entry)
    write_json("factors.json", out)


# ---------------------------------------------------------------------------
# 7) Body metaphor: 5-domain stats for 2018 -------------------------------
def build_body():
    print("\n[7/9] body.json")
    out = {"waves": []}
    for year, prefix, _ in WAVES:
        rows = load_csv(os.path.join(BASE, "charls_frailty", f"charls_frailty_{year}.csv"))
        domain_vals = defaultdict(list)
        # diseases -> body part
        for k, (zh, part) in DOMAIN_LABELS.items():
            col = prefix + k
            for r in rows:
                v = safe_int01(r[col])
                if v is not None:
                    domain_vals[part].append(v)
        # limbs ← ADL + physical
        for k in list(ADL_LABELS) + list(IADL_LABELS) + list(PHYS_LABELS):
            col = prefix + k
            for r in rows:
                v = safe_int01(r[col])
                if v is not None:
                    domain_vals["limbs"].append(v)
        # head ← cognition (< median = impaired)
        cogs = [safe_float(r["cognition"]) for r in rows]
        cogs = [v for v in cogs if v is not None]
        if cogs:
            cog_med = median(cogs)
            for v in cogs:
                domain_vals["head"].append(1 if v < cog_med * 0.5 else 0)
        # whole body: FI > 0.25 (= frail)
        for r in rows:
            fi = safe_float(r["FI"])
            if fi is not None:
                domain_vals["whole"].append(1 if fi >= 0.25 else 0)

        wave = {"year": int(year), "domains": []}
        for part in ["head", "chest", "abdomen", "limbs", "whole"]:
            vs = domain_vals[part]
            wave["domains"].append({
                "part": part,
                "prev": round(sum(vs)/len(vs)*100, 2) if vs else 0,
                "n":   len(vs),
            })
        out["waves"].append(wave)
    write_json("body.json", out)


# ---------------------------------------------------------------------------
# 8) Box-plot data: FI by region x wave (small multiples) ------------------
def build_psu_box():
    print("\n[8/9] psu_box.json")
    # already inside regions.json as the "regions" array — repackage for box plot
    regions = build_regions  # already done? to be safe, recompute
    out = {"waves": []}
    for year, _, _ in WAVES:
        rows = load_csv(os.path.join(BASE, "charls_frailty", f"charls_frailty_{year}.csv"))
        by_region = defaultdict(list)
        for r in rows:
            fi = safe_float(r["FI"])
            if fi is None: continue
            p2 = r["ID"][:2]
            reg = PSU_REGION.get(p2)
            if reg:
                by_region[reg].append(fi)
        wave = {"year": int(year), "boxes": []}
        for reg in ["East", "Mid", "West", "Northeast"]:
            vs = sorted(by_region.get(reg, []))
            n = len(vs)
            if n < 5: continue
            def q(p):
                idx = max(0, min(n-1, int(round(p*(n-1)))))
                return vs[idx]
            q1, q3 = q(0.25), q(0.75)
            iqr = q3 - q1
            lo  = max(0,  q1 - 1.5*iqr)
            hi  = min(1,  q3 + 1.5*iqr)
            outliers = [round(v, 4) for v in vs if v < lo or v > hi][:80]
            wave["boxes"].append({
                "region": reg, "n": n,
                "min": round(lo, 4), "q1": round(q1, 4), "median": round(q(0.5), 4),
                "q3": round(q3, 4), "max": round(hi, 4),
                "mean": round(mean(vs), 4),
                "outliers": outliers,
            })
        out["waves"].append(wave)
    write_json("psu_box.json", out)


# ---------------------------------------------------------------------------
# 9) Cohort distribution (proxy: stacked bar by FI quintile x year) -------
def build_cohort_bar():
    print("\n[9/9] age_cohort.json")
    # Use FI quintile bands as a proxy for "frailty severity" cohorts
    bands = [(0.0, 0.05, "Robust"), (0.05, 0.12, "Mild"), (0.12, 0.20, "Pre-Frail"),
             (0.20, 0.30, "Frail"), (0.30, 1.01, "Severe")]
    out = {"bands": [b[2] for b in bands], "by_year": []}
    for year, _, _ in WAVES:
        rows = load_csv(os.path.join(BASE, "charls_frailty", f"charls_frailty_{year}.csv"))
        fis  = [safe_float(r["FI"]) for r in rows]
        fis  = [v for v in fis if v is not None]
        counts = []
        for lo, hi, _ in bands:
            counts.append(sum(1 for v in fis if lo <= v < hi))
        out["by_year"].append({"year": int(year), "counts": counts})
    write_json("age_cohort.json", out)


# ---------------------------------------------------------------------------
def main():
    print("AgeVital · CHARLS preprocessing pipeline")
    print(f"Source : {BASE}")
    print(f"Output : {OUT}")
    build_overview()
    build_diseases()
    build_regions()
    build_ridgeline()
    build_sankey()
    build_factors()
    build_body()
    build_psu_box()
    build_cohort_bar()
    print("\nDone.")

if __name__ == "__main__":
    main()

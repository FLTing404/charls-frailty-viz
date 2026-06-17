#!/usr/bin/env python3
"""
Convert all data files from data/ into structured JSON for web visualization.
Output goes to data_json/ directory.
"""

import pandas as pd
import json
import os
import sys
from pathlib import Path
from collections import OrderedDict

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "data_json"

# ── helpers ──────────────────────────────────────────────────────────

def clean_value(v):
    """Replace NaN/NaT with None for valid JSON."""
    if pd.isna(v):
        return None
    if isinstance(v, float) and v == int(v):
        return int(v)
    if isinstance(v, float):
        return round(v, 6)
    if isinstance(v, pd.Timestamp):
        return str(v)
    return v

def df_to_records(df):
    """Convert DataFrame to list-of-dicts, cleaning values."""
    records = []
    for _, row in df.iterrows():
        rec = {str(k): clean_value(v) for k, v in row.items()}
        # Drop fully empty rows
        if all(v is None for v in rec.values()):
            continue
        records.append(rec)
    return records

def write_json(data, filename):
    """Write data to OUTPUT_DIR/filename with standard formatting."""
    path = OUTPUT_DIR / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  ✓ {filename} ({len(data)} records)" if isinstance(data, list) else f"  ✓ {filename}")
    return path


# ── 1. Master variable dictionary ───────────────────────────────────

def parse_variable_sheet(df_raw, sheet_name):
    """
    Parse a variable-dictionary sheet. Expected structure:
      Row 0: category headers (merged across variable-count columns)
      Row 1: sub-headers (Wave, Variable, Definition, Form, Values)
      Rows 2+: data rows
    Returns list of {category, wave, variable, definition, form, values}
    """
    # Figure out category blocks from row 0
    categories = []
    i = 0
    while i < len(df_raw.columns):
        cat = str(df_raw.iloc[0, i])
        if cat == "nan" or cat == "NaN":
            i += 1
            continue
        # Count how many columns this category spans
        j = i + 1
        while j < len(df_raw.columns) and (str(df_raw.iloc[0, j]) in ("nan", "NaN")):
            j += 1
        categories.append({"name": cat, "col_start": i, "col_end": j})
        i = j

    # Parse each category block
    all_vars = []
    for cat in categories:
        sub_headers = [str(df_raw.iloc[1, c]) for c in range(cat["col_start"], cat["col_end"])]
        # Map sub-header positions
        col_map = {}
        for idx, h in enumerate(sub_headers):
            h_clean = h.strip().lower()
            if h_clean in ("wave", "variable", "definition", "form", "values") or h == "Wave":
                col_map[h_clean] = cat["col_start"] + idx

        for row_idx in range(2, len(df_raw)):
            wave = df_raw.iloc[row_idx, cat["col_start"]]
            var = df_raw.iloc[row_idx, cat["col_start"] + 1] if cat["col_start"] + 1 < cat["col_end"] else None
            if pd.isna(wave) and pd.isna(var):
                continue

            entry = OrderedDict()
            entry["category"] = cat["name"]
            entry["wave"] = clean_value(wave)
            entry["variable"] = clean_value(var)

            if "definition" in col_map:
                entry["definition"] = clean_value(df_raw.iloc[row_idx, col_map["definition"]])
            if "form" in col_map:
                entry["form"] = clean_value(df_raw.iloc[row_idx, col_map["form"]])
            if "values" in col_map:
                entry["values"] = clean_value(df_raw.iloc[row_idx, col_map["values"]])

            # Skip rows with no meaningful content
            meaningful = sum(1 for k in ["variable", "definition", "form", "values"]
                           if entry.get(k) is not None)
            if meaningful == 0:
                continue

            all_vars.append(entry)

    return all_vars


def convert_master_excel():
    """Convert CHARLS_ELSA_HRS 变量汇总.xlsx to JSON."""
    print("\n📋 Master variable dictionary...")
    xls_path = DATA_DIR / "CHARLS_ELSA_HRS 变量汇总.xlsx"
    xls = pd.ExcelFile(xls_path)

    result = OrderedDict()
    for sn in xls.sheet_names:
        df_raw = pd.read_excel(xls, sn, header=None)
        vars_list = parse_variable_sheet(df_raw, sn)
        result[sn] = {
            "study": sn,
            "total_variables": len(vars_list),
            "variables": vars_list
        }
        print(f"  {sn}: {len(vars_list)} variables")

    # Also create a flat combined index for easier searching
    combined = []
    for sn in xls.sheet_names:
        for v in result[sn]["variables"]:
            v["study"] = sn
            combined.append(v)

    write_json(result, "variable_dictionary.json")
    write_json(combined, "variable_dictionary_flat.json")
    return result


# ── 2. CSV datasets ─────────────────────────────────────────────────

def convert_csv_datasets():
    """Convert all CSV data files to JSON arrays."""
    print("\n📊 CSV datasets...")

    datasets = OrderedDict()

    csv_files = sorted(DATA_DIR.rglob("*.csv"))
    for csv_path in csv_files:
        rel_dir = csv_path.parent.relative_to(DATA_DIR)
        stem = csv_path.stem
        out_name = f"{rel_dir}/{stem}.json"

        try:
            # Try reading with different encodings
            for enc in ["utf-8", "utf-8-sig", "latin-1", "gbk"]:
                try:
                    df = pd.read_csv(csv_path, encoding=enc)
                    break
                except UnicodeDecodeError:
                    continue

            records = df_to_records(df)

            key = str(rel_dir)
            if key not in datasets:
                datasets[key] = {"directory": key, "files": []}

            datasets[key]["files"].append({
                "file": csv_path.name,
                "rows": len(records),
                "columns": list(df.columns),
                "data": None  # data written separately
            })

            write_json(records, out_name)

        except Exception as e:
            print(f"  ✗ {out_name}: {e}")

    return datasets


# ── 3. Depression/Cognition Excel files ─────────────────────────────

def convert_depression_excels():
    """Convert charls_depression_cognition_by_wave Excel files."""
    print("\n🧠 Depression/Cognition Excel files...")

    xlsx_dir = DATA_DIR / "charls_depression_cognition_by_wave"
    for xlsx_path in sorted(xlsx_dir.glob("*.xlsx")):
        stem = xlsx_path.stem
        out_name = f"charls_depression_cognition_by_wave/{stem}.json"

        try:
            df = pd.read_excel(xlsx_path)
            records = df_to_records(df)
            write_json(records, out_name)
        except Exception as e:
            print(f"  ✗ {out_name}: {e}")


# ── 4. Dataset index ────────────────────────────────────────────────

def build_index():
    """Build a summary index of all generated JSON data files."""
    print("\n📑 Building index...")

    index = OrderedDict()
    index["title"] = "CHARLS Data — JSON Dataset Index"
    index["description"] = "Converted datasets for web visualization"

    datasets = []
    for json_path in sorted(OUTPUT_DIR.rglob("*.json"), key=str):
        if json_path.name in ("dataset_index.json",):
            continue
        rel = str(json_path.relative_to(OUTPUT_DIR))
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                sz = len(data)
                kind = "data"
                sample_cols = list(data[0].keys()) if sz > 0 else []
            elif isinstance(data, dict) and "variables" in data:
                sz = data.get("total_variables", len(data.get("variables", [])))
                kind = "variable_dictionary"
                sample_cols = []
            else:
                sz = len(data)
                kind = "other"
                sample_cols = list(data.keys())
        except Exception:
            sz = 0
            kind = "unknown"
            sample_cols = []

        datasets.append(OrderedDict([
            ("path", rel),
            ("type", kind),
            ("size", sz),
            ("sample_columns", sample_cols[:15])
        ]))

    index["datasets"] = datasets
    index["total_files"] = len(datasets)
    index["total_data_records"] = sum(d["size"] for d in datasets if d["type"] == "data")

    write_json(index, "dataset_index.json")


# ── main ─────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("CHARLS Data → JSON Converter")
    print(f"Source: {DATA_DIR}")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)

    # Clean output
    if OUTPUT_DIR.exists():
        import shutil
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    convert_master_excel()
    convert_csv_datasets()
    convert_depression_excels()
    build_index()

    # Summary
    json_files = list(OUTPUT_DIR.rglob("*.json"))
    total_size = sum(f.stat().st_size for f in json_files)
    print(f"\n✅ Done! {len(json_files)} JSON files, {total_size / 1024:.1f} KB total")
    print(f"   Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()

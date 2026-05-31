# AgeVital

**Visual Analytics of Frailty Trajectories in Chinese Middle-Aged and Older Adults**

Zhejiang University · Introduction to Visualization · CHARLS 2011–2018

---

## Overview

AgeVital is a two-page drill-down visual analytics system with Chinese ink-wash aesthetics and an English UI:

| Page | Route | Purpose |
|------|-------|---------|
| **Trajectories** | `/trajectories` | Multi-wave Sankey, event bundling, factor radar |
| **Deep Dive** | `/snapshot?year=2018&status=frail` | Map, body metaphor, boxplot brushing |

Design report: [`docs/design_report.md`](docs/design_report.md)

---

## Quick Start

### 1. Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| Python | ≥ 3.10 (pandas, numpy) |

### 2. Preprocess CHARLS data

```bash
cd code
python scripts/preprocess_charls.py
```

Outputs JSON under `public/data/` and GeoJSON under `public/geo/china-provinces.json`.

### 3. Install & run

```bash
npm install
npm run dev
```

Open:

- http://localhost:5173/trajectories
- http://localhost:5173/snapshot?year=2018&status=frail

### 4. Production build

```bash
npm run build
npm run preview
```

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | Vite 5 + React 18 + TypeScript |
| Routing | React Router v6 |
| Styling | Tailwind CSS (ink-wash theme) + shadcn/ui |
| Charts | D3.js v7 (Sankey, map, body SVG) + ECharts 5 |
| State | Zustand (cross-view brushing & linking) |
| Preprocess | Python + pandas |

---

## Project Structure

```
code/
├── data/                    # Cleaned CHARLS CSVs (input)
├── scripts/
│   └── preprocess_charls.py # CSV → public/data/*.json
├── public/
│   ├── data/                # Pre-aggregated JSON (generated)
│   └── geo/                 # China province GeoJSON
├── src/
│   ├── pages/               # Trajectories, Snapshot
│   ├── components/
│   │   ├── trajectories/    # Page 1 modules
│   │   ├── snapshot/        # Page 2 layout columns
│   │   └── charts/          # Shared D3 / ECharts wrappers
│   └── lib/
│       ├── store/           # Zustand global state
│       ├── theme/           # Ink-wash color tokens
│       └── data/            # Loaders + Sankey builder
└── docs/design_report.md
```

---

## Interaction Flow (Demo Script)

1. **Page 1** — Observe Pre-Frail reservoir growth 2011→2018 on the trend chart.
2. **Event Bundling** — Check *Hypertension + Diabetes*; Sankey re-draws for that sub-cohort.
3. **Information Scent** — Jump paths highlighted in cinnabar; recovery paths in bamboo green.
4. **Drill-Down** — Click the **2018 · Frail** node → navigates to Page 2.
5. **Page 2** — Click a province on the choropleth; KPIs and views update.
6. **Brush** — Boxplot toolbox → select high-FI elderly outliers; badge shows brushed count.
7. **Empathy** — Hover a body organ callout for prevalence + narrative vignette.

---

## Data

Raw CHARLS data must be obtained from [charls.pku.edu.cn](https://charls.pku.edu.cn/).  
Place cleaned CSVs in `data/` (see subfolders: `charls_frailty/`, `charls_sleep_by_wave/`, etc.).

**Do not commit identifiable raw microdata to public repositories.**

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production bundle |
| `npm run preprocess` | Run Python preprocessing |

---

## License

Course project. CHARLS data © PKU CHARLS team. Code for academic use with attribution.

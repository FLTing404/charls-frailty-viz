import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Wave } from '@/lib/store/globalStore'

import { SectionTitle } from '@/components/layout/SectionTitle'
import { PageShell } from '@/components/layout/PageShell'
import { InkBorder } from '@/components/layout/InkBorder'
import { WaveSelector } from '@/components/trajectories/WaveSelector'
import { CorrelationHeatmap } from '@/components/trajectories/CorrelationHeatmap'
import { ParallelCoordinatesChart } from '@/components/trajectories/ParallelCoordinatesChart'
import { ProvinceMapPanel } from '@/components/trajectories/ProvinceMapPanel'
import { SankeyScatterPanel, SunburstChordPanel } from '@/components/trajectories/DriverDetailTabs'
import {
  loadCorrelationMatrix,
  loadDriverChord,
  loadDriverRecords,
  loadDriverSankey,
  loadProvinces,
} from '@/lib/data/loaders'
import { filterRecordsByIds, parseDriverRecords } from '@/lib/data/driverRecords'
import { useGlobalStore } from '@/lib/store/globalStore'
import { useTrajectoryStore } from '@/lib/store/trajectoryStore'
import type {
  CorrelationMatrixPayload,
  DriverChordPayload,
  DriverRecord,
  DriverSankeyPayload,
  ProvinceDatum,
} from '@/types/data'
import type { DriverDimension } from '@/types/data'
import type { FocusDimension } from '@/lib/store/trajectoryStore'

// ── Spearman correlation for dynamic heatmap ──────────────────────────────────

const CORR_DIMS: DriverDimension[] = ['ace', 'sleep', 'social', 'depression', 'fi', 'ses', 'healthcare', 'activity', 'scap', 'material']
const CORR_LABELS = ['ACE', '睡眠', '社会联系', '抑郁', 'FI', '社会经济', '医疗保健', '社交参与', '社会资本Z', '物质条件']

/** Rank an array of numbers (ties get average rank). Returns a new array. */
function rank(vals: number[]): number[] {
  const indexed = vals.map((v, i) => ({ v, i }))
  indexed.sort((a, b) => a.v - b.v)
  const ranks = new Array<number>(vals.length)
  for (let i = 0; i < indexed.length; ) {
    const start = i
    while (i < indexed.length && indexed[i].v === indexed[start].v) i++
    const avg = (start + i - 1) / 2 + 0.5 // average rank of the tied group
    for (let j = start; j < i; j++) ranks[indexed[j].i] = avg
  }
  return ranks
}

/** Pearson r between two same-length arrays. */
function pearsonR(a: number[], b: number[]): number {
  const n = a.length
  if (n < 3) return NaN
  let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0
  for (let i = 0; i < n; i++) {
    sa += a[i]
    sb += b[i]
    saa += a[i] * a[i]
    sbb += b[i] * b[i]
    sab += a[i] * b[i]
  }
  const num = n * sab - sa * sb
  const da = n * saa - sa * sa
  const db = n * sbb - sb * sb
  const den = Math.sqrt(da * db)
  return den > 0 ? num / den : NaN
}

function computeCorrelationMatrix(records: DriverRecord[]): CorrelationMatrixPayload | null {
  if (records.length < 3) return null
  const nDims = CORR_DIMS.length
  // Extract per-dimension arrays, skipping NaN
  const cols: number[][] = CORR_DIMS.map((dim) => {
    const arr: number[] = []
    for (const r of records) {
      const v = r[dim] as number
      if (v != null && !Number.isNaN(v)) arr.push(v)
    }
    return arr
  })

  const matrix: (number | null)[][] = Array.from({ length: nDims }, () => Array<number | null>(nDims).fill(null))
  for (let i = 0; i < nDims; i++) {
    matrix[i][i] = 1
    for (let j = i + 1; j < nDims; j++) {
      // Find common non-NaN indices
      const dimI = CORR_DIMS[i]
      const dimJ = CORR_DIMS[j]
      const pairs: [number, number][] = []
      for (const r of records) {
        const vi = r[dimI] as number
        const vj = r[dimJ] as number
        if (vi != null && vj != null && !Number.isNaN(vi) && !Number.isNaN(vj)) {
          pairs.push([vi, vj])
        }
      }
      if (pairs.length < 3) { matrix[i][j] = matrix[j][i] = null; continue }
      const xs = pairs.map(p => p[0])
      const ys = pairs.map(p => p[1])
      const rho = pearsonR(rank(xs), rank(ys))
      const v = Number.isNaN(rho) ? null : Math.round(rho * 10000) / 10000
      matrix[i][j] = v
      matrix[j][i] = v
    }
  }

  return {
    labels: CORR_LABELS.slice(),
    keys: CORR_DIMS.slice(),
    matrix: matrix as number[][],
    n: records.length,
  }
}

export function TrajectoriesPage() {
  const [searchParams] = useSearchParams()
  const { year, province, set } = useGlobalStore()

  // Read province from URL on mount (navigated from Page 1)
  useEffect(() => {
    const p = searchParams.get('province')
    if (p) set({ province: p })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const {
    focusDimension,
    brushedIds,
    set: setTrajectory,
    resetBrush,
  } = useTrajectoryStore()

  const [provinces, setProvinces] = useState<ProvinceDatum[]>([])
  const [prevProvinces, setPrevProvinces] = useState<ProvinceDatum[] | null>(null)
  const [correlation, setCorrelation] = useState<CorrelationMatrixPayload | null>(null)
  const [records, setRecords] = useState<DriverRecord[]>([])
  const [totalN, setTotalN] = useState(0)
  const [sampled, setSampled] = useState(false)
  const [ranges, setRanges] = useState<Partial<Record<DriverDimension, [number, number]>>>({})
  const [sankey, setSankey] = useState<DriverSankeyPayload | null>(null)
  const [chord, setChord] = useState<DriverChordPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Increment on year change to remount charts that need hard reset (parallel coords brush state)
  const [chartKey, setChartKey] = useState(0)
  // Map from current wave to previous wave for anomaly detection
  const PREV_WAVE: Partial<Record<Wave, Wave>> = { 2013: 2011, 2015: 2013, 2018: 2015 }

  useEffect(() => {
    let aborted = false
    resetBrush()
    setTrajectory({ focusDimension: null })
    setError(null)
    setChartKey((k) => k + 1)

    Promise.all([
      loadProvinces(year),
      loadCorrelationMatrix(year),
      loadDriverRecords(year),
      loadDriverSankey(year),
      loadDriverChord(year),
    ])
      .then(([prov, corr, recPayload, sk, ch]) => {
        if (aborted) return
        setProvinces(prov)
        setCorrelation(corr)
        setRecords(parseDriverRecords(recPayload))
        setTotalN(recPayload.totalN)
        setSampled(recPayload.sampled)
        setRanges(recPayload.ranges as Partial<Record<DriverDimension, [number, number]>>)
        setSankey(sk)
        setChord(ch)
      })
      .catch((err) => { if (!aborted) setError(String(err)) })

    // Load previous wave provinces for anomaly panel
    const prev = PREV_WAVE[year]
    if (prev) {
      loadProvinces(prev)
        .then((p) => { if (!aborted) setPrevProvinces(p) })
        .catch(() => { if (!aborted) setPrevProvinces(null) })
    } else {
      setPrevProvinces(null) // 2011 has no prior wave
    }

    return () => { aborted = true }
  }, [year, resetBrush, setTrajectory])

  // Reset brush and remount chart when province changes
  useEffect(() => {
    resetBrush()
    setChartKey((k) => k + 1)
  }, [province, resetBrush])

  // Province filter: from global store (set by Page 1 click or local map click)
  const handleProvinceClick = useCallback(
    (p: string | null) => set({ province: p }),
    [set],
  )

  // Filter records by both brush selection and province
  const provinceFilteredRecords = useMemo(() => {
    if (!province) return records
    return records.filter((r) => r.province === province)
  }, [records, province])

  const filteredRecords = useMemo(
    () => filterRecordsByIds(provinceFilteredRecords, brushedIds),
    [provinceFilteredRecords, brushedIds],
  )

  // Dynamic Spearman correlation matrix from the currently visible records
  const provinceCorrelation = useMemo(
    () => computeCorrelationMatrix(provinceFilteredRecords),
    [provinceFilteredRecords],
  )

  const handleHeatmapClick = useCallback(
    (rowKey: DriverDimension, colKey: DriverDimension) => {
      let focus: FocusDimension = null
      if (rowKey !== 'fi' && colKey === 'fi') focus = rowKey as FocusDimension
      else if (colKey !== 'fi' && rowKey === 'fi') focus = colKey as FocusDimension
      else if (rowKey !== 'fi' && colKey !== 'fi') focus = rowKey as FocusDimension
      setTrajectory({ focusDimension: focus })
    },
    [setTrajectory],
  )

  const handleBrush = useCallback(
    (ids: string[]) => setTrajectory({ brushedIds: ids }),
    [setTrajectory],
  )

  return (
    <PageShell
      title={
        <h1 className="font-serif text-xs lg:text-base font-semibold tracking-wide text-ink">
          驱动因素与衰弱关联
        </h1>
      }
    >
      {error && (
        <div className="mb-1 border border-cinnabar bg-cinnabar/10 px-2 py-1 text-[11px] text-cinnabar-deep">
          {error}
        </div>
      )}

      {/* ── Main 3-column grid ─────────────────────────────────────────────── */}
      <div className="grid h-full min-h-0 grid-cols-12 gap-0.5 lg:gap-1.5 pb-1">

        {/* Left: Province map + wave selector */}
        <aside className="col-span-12 flex min-h-0 flex-col gap-0.5 lg:gap-1.5 lg:col-span-4">
          <InkBorder className="panel flex min-h-0 flex-col p-1 lg:p-2" style={{ flex: 3 }}>
            <WaveSelector
              sampleN={provinceFilteredRecords.length}
              totalN={totalN}
              sampled={sampled}
              selectedProvince={province}
              provinces={provinces}
              prevProvinces={prevProvinces}
            />
          </InkBorder>
          <InkBorder className="panel flex min-h-0 flex-col p-1 lg:p-2" style={{ flex: 7 }}>
            <SectionTitle title="省份分布" />
            <div className="ink-divider my-0" />
            <div className="min-h-0 flex-1">
              <ProvinceMapPanel
                provinces={provinces}
                selectedProvince={province}
                onProvinceClick={handleProvinceClick}
              />
            </div>
          </InkBorder>
        </aside>

        {/* Right: Analysis panels */}
        <section className="col-span-12 flex min-h-0 flex-col gap-0.5 lg:gap-1.5 lg:col-span-8">

          {/* Row 1: Correlation heatmap + Parallel coordinates (3/5 height) */}
          <div className="grid min-h-0 grid-cols-12 gap-1 lg:p-2" style={{ flex: 3 }}>
            <InkBorder className="panel col-span-12 flex min-h-0 flex-col p-1.5 md:col-span-4">
              <SectionTitle title="相关性热力图" />
              <div className="ink-divider my-0" />
              <div className="min-h-0 flex-1">
                <CorrelationHeatmap
                  data={provinceCorrelation ?? correlation}
                  focusDimension={focusDimension}
                  onCellClick={handleHeatmapClick}
                  className="h-full min-h-[clamp(100px,14vh,160px)]"
                />
              </div>
            </InkBorder>

            <InkBorder className="panel col-span-12 flex min-h-0 flex-col p-1.5 md:col-span-8">
              <SectionTitle title="平行坐标图" />
              <div className="ink-divider my-0" />
              <div className="min-h-0 flex-1">
                {provinceFilteredRecords.length > 0 ? (
                  <ParallelCoordinatesChart
                    key={chartKey}
                    records={provinceFilteredRecords}
                    focusDimension={focusDimension}
                    brushedIds={brushedIds}
                    onBrush={handleBrush}
                    ranges={ranges}
                    className="h-full min-h-[clamp(120px,16vh,200px)]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[9px] text-ink-stone">
                    加载中…
                  </div>
                )}
              </div>
            </InkBorder>
          </div>

          {/* Row 2: B2 left, B1 right (2/5 height) */}
          <div className="flex gap-1 lg:p-2" style={{ flex: 2 }}>
            <InkBorder className="panel flex h-full w-[clamp(170px,20%,280px)] shrink-0 flex-col p-1 lg:p-2">
              <SectionTitle title="构成 · 关联" />
              <div className="ink-divider my-0" />
              <SunburstChordPanel
                records={filteredRecords}
                chord={chord}
                className="min-h-0 flex-1"
              />
            </InkBorder>

            <InkBorder className="panel flex min-w-0 flex-1 flex-col p-1 lg:p-2">
              <SectionTitle title="流向 · 分布" />
              <div className="ink-divider my-0" />
              <SankeyScatterPanel
                key={`${year}-${province ?? 'all'}`}
                records={filteredRecords}
                focusDimension={focusDimension}
                sankey={sankey}
                className="min-h-0 flex-1"
              />
            </InkBorder>
          </div>
        </section>
      </div>
    </PageShell>
  )
}

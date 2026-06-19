import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'



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
        <h1 className="font-serif text-lg font-semibold tracking-wide text-ink">
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
      <div className="grid h-full min-h-0 grid-cols-12 gap-2 pb-3">

        {/* Left: Province map + wave selector */}
        <aside className="col-span-12 flex min-h-0 flex-col gap-2 lg:col-span-4">
          <InkBorder className="panel shrink-0 p-2">
            <WaveSelector
              sampleN={provinceFilteredRecords.length}
              totalN={totalN}
              sampled={sampled}
              selectedProvince={province}
              provinces={provinces}
            />
          </InkBorder>
          <InkBorder className="panel flex min-h-0 flex-1 flex-col p-2">
            <SectionTitle index="L1" title="省份分布" />
            <div className="ink-divider my-1" />
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
        <section className="col-span-12 flex min-h-0 flex-col gap-2 lg:col-span-8">

          {/* Row 1: Correlation heatmap + Parallel coordinates (3/5 height) */}
          <div className="grid min-h-0 grid-cols-12 gap-2" style={{ flex: 3 }}>
            <InkBorder className="panel col-span-12 flex min-h-0 flex-col p-2 md:col-span-4">
              <SectionTitle
                index="R1"
                title="相关性热力图"
              />
              <div className="ink-divider my-1" />
              <div className="min-h-0 flex-1">
                <CorrelationHeatmap
                  data={correlation}
                  focusDimension={focusDimension}
                  onCellClick={handleHeatmapClick}
                  className="h-full min-h-[clamp(150px,18vh,200px)]"
                />
              </div>
            </InkBorder>

            <InkBorder className="panel col-span-12 flex min-h-0 flex-col p-2 md:col-span-8">
              <SectionTitle
                index="R2"
                title="平行坐标图"
              />
              <div className="ink-divider my-1" />
              <div className="min-h-0 flex-1">
                {provinceFilteredRecords.length > 0 ? (
                  <ParallelCoordinatesChart
                    key={chartKey}
                    records={provinceFilteredRecords}
                    focusDimension={focusDimension}
                    brushedIds={brushedIds}
                    onBrush={handleBrush}
                    ranges={ranges}
                    className="h-full min-h-[clamp(180px,22vh,280px)]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-ink-stone">
                    加载中…
                  </div>
                )}
              </div>
            </InkBorder>
          </div>

          {/* Row 2: B2 left, B1 right (2/5 height) */}
          <div className="flex gap-2" style={{ flex: 2 }}>
            <InkBorder className="panel flex h-full w-[clamp(240px,25%,380px)] shrink-0 flex-col p-2">
              <SectionTitle index="B2" title="构成 · 关联" />
              <div className="ink-divider my-1" />
              <SunburstChordPanel
                records={filteredRecords}
                chord={chord}
                className="min-h-0 flex-1"
              />
            </InkBorder>

            <InkBorder className="panel flex min-w-0 flex-1 flex-col p-2">
              <SectionTitle index="B1" title="流向 · 分布" />
              <div className="ink-divider my-1" />
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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  const navigate = useNavigate()
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

  useEffect(() => {
    let aborted = false
    resetBrush()
    setTrajectory({ focusDimension: null })
    setError(null)

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

  // Reset brush when province changes
  useEffect(() => {
    resetBrush()
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
        <div className="flex min-w-0 items-center gap-4">
          <div>
            <span className="text-[9px] tracking-widest text-cinnabar">一 · 多维关联</span>
            <h1 className="font-serif text-lg font-semibold tracking-wide text-ink">
              驱动因素与衰弱关联
            </h1>
            <p className="text-[10px] text-ink-stone">ACE · 抑郁 · 睡眠 · 社会联系 ↔ FI</p>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Badge tone="robust">健壮</Badge>
            <Badge tone="preFrail">衰弱前期</Badge>
            <Badge tone="frail">衰弱</Badge>
          </div>
        </div>
      }
      actions={
        <Button
          variant="cinnabar"
          size="sm"
          onClick={() => {
            set({ year: 2018, status: 'frail' })
            navigate('/snapshot?year=2018&status=frail')
          }}
        >
          空间分布
          <ArrowRight className="ml-1.5 h-3 w-3" />
        </Button>
      }
    >
      {error && (
        <div className="mb-1 border border-cinnabar bg-cinnabar/10 px-2 py-1 text-[11px] text-cinnabar-deep">
          {error}
        </div>
      )}

      {/* Province filter badge */}
      {province && (
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[10px] text-ink-stone">当前范围：</span>
          <span className="rounded-[2px] border border-cinnabar/40 bg-cinnabar/8 px-2 py-0.5 font-serif text-[10px] text-cinnabar-deep">
            {province}
          </span>
          <button
            type="button"
            onClick={() => set({ province: null })}
            className="text-[9px] text-ink-stone hover:text-cinnabar"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Main 3-column grid ─────────────────────────────────────────────── */}
      <div className="grid h-full min-h-0 grid-cols-12 gap-2">

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
            <SectionTitle index="L1" title="省份分布" subtitle="点击省份筛选数据 · 再次点击取消" />
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

          {/* Row 1: Correlation heatmap + Parallel coordinates */}
          <div className="grid min-h-0 grid-cols-12 gap-2" style={{ flex: '1 1 45%' }}>
            <InkBorder className="panel col-span-12 flex min-h-0 flex-col p-2 md:col-span-4">
              <SectionTitle
                index="R1"
                title="相关性热力图"
                subtitle={`Spearman ρ · n=${correlation?.n ?? '—'} · 点击切换焦点`}
              />
              <div className="ink-divider my-1" />
              <div className="min-h-0 flex-1">
                <CorrelationHeatmap
                  data={correlation}
                  focusDimension={focusDimension}
                  onCellClick={handleHeatmapClick}
                  className="h-full min-h-[200px]"
                />
              </div>
            </InkBorder>

            <InkBorder className="panel col-span-12 flex min-h-0 flex-col p-2 md:col-span-8">
              <SectionTitle
                index="R2"
                title="平行坐标图"
                subtitle="ACE → 睡眠 → 社会联系 → 抑郁 → FI · 在轴上拖拽框选子群"
              />
              <div className="ink-divider my-1" />
              <div className="min-h-0 flex-1">
                {provinceFilteredRecords.length > 0 ? (
                  <ParallelCoordinatesChart
                    key={province ?? 'all'}
                    records={provinceFilteredRecords}
                    focusDimension={focusDimension}
                    brushedIds={brushedIds}
                    onBrush={handleBrush}
                    ranges={ranges}
                    className="h-full min-h-[200px]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-ink-stone">
                    加载中…
                  </div>
                )}
              </div>
            </InkBorder>
          </div>

          {/* Row 2: B1 wider, B2 square */}
          <div className="flex gap-2" style={{ flex: '0 0 340px' }}>
            <InkBorder className="panel flex min-w-0 flex-1 flex-col p-2">
              <SectionTitle index="B1" title="流向 · 分布" subtitle="桑基图 / 散点气泡图切换" />
              <div className="ink-divider my-1" />
              <SankeyScatterPanel
                records={filteredRecords}
                focusDimension={focusDimension}
                sankey={sankey}
                className="min-h-0 flex-1"
              />
            </InkBorder>

            <InkBorder className="panel flex h-full w-[340px] shrink-0 flex-col p-2">
              <SectionTitle index="B2" title="构成 · 关联" subtitle="旭日图 / 和弦图切换" />
              <div className="ink-divider my-1" />
              <SunburstChordPanel
                records={filteredRecords}
                chord={chord}
                className="min-h-0 flex-1"
              />
            </InkBorder>
          </div>
        </section>
      </div>
    </PageShell>
  )
}

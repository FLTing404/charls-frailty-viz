import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionTitle } from '@/components/layout/SectionTitle'
import { PageShell } from '@/components/layout/PageShell'
import { InkBorder } from '@/components/layout/InkBorder'
import { WaveSelector } from '@/components/trajectories/WaveSelector'
import { CorrelationHeatmap } from '@/components/trajectories/CorrelationHeatmap'
import { ParallelCoordinatesChart } from '@/components/trajectories/ParallelCoordinatesChart'
import { DriverBoxViolin } from '@/components/trajectories/DriverBoxViolin'
import { DriverDetailTabs } from '@/components/trajectories/DriverDetailTabs'
import {
  loadCorrelationMatrix,
  loadDriverChord,
  loadDriverRecords,
  loadDriverSankey,
  loadFactors,
} from '@/lib/data/loaders'
import { filterRecordsByIds, parseDriverRecords } from '@/lib/data/driverRecords'
import { useGlobalStore } from '@/lib/store/globalStore'
import { useTrajectoryStore } from '@/lib/store/trajectoryStore'
import type {
  CorrelationMatrixPayload,
  DriverChordPayload,
  DriverRecord,
  DriverSankeyPayload,
  FactorMatrixCell,
} from '@/types/data'
import type { DriverDimension } from '@/types/data'
import type { FocusDimension } from '@/lib/store/trajectoryStore'

export function TrajectoriesPage() {
  const navigate = useNavigate()
  const { year, set } = useGlobalStore()
  const {
    focusDimension,
    brushedIds,
    boxGroupBy,
    detailTab,
    set: setTrajectory,
    resetBrush,
  } = useTrajectoryStore()

  const [correlation, setCorrelation] = useState<CorrelationMatrixPayload | null>(null)
  const [records, setRecords] = useState<DriverRecord[]>([])
  const [totalN, setTotalN] = useState(0)
  const [sampled, setSampled] = useState(false)
  const [ranges, setRanges] = useState<Partial<Record<DriverDimension, [number, number]>>>({})
  const [sankey, setSankey] = useState<DriverSankeyPayload | null>(null)
  const [chord, setChord] = useState<DriverChordPayload | null>(null)
  const [factors, setFactors] = useState<FactorMatrixCell[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let aborted = false
    resetBrush()
    setTrajectory({ focusDimension: null })

    Promise.all([
      loadCorrelationMatrix(year),
      loadDriverRecords(year),
      loadDriverSankey(year),
      loadDriverChord(year),
      loadFactors(year),
    ])
      .then(([corr, recPayload, sk, ch, f]) => {
        if (aborted) return
        setCorrelation(corr)
        setRecords(parseDriverRecords(recPayload))
        setTotalN(recPayload.totalN)
        setSampled(recPayload.sampled)
        setRanges(recPayload.ranges as Partial<Record<DriverDimension, [number, number]>>)
        setSankey(sk)
        setChord(ch)
        setFactors(f)
      })
      .catch((err) => {
        if (!aborted) setError(String(err))
      })

    return () => {
      aborted = true
    }
  }, [year, resetBrush, setTrajectory])

  const filteredRecords = useMemo(
    () => filterRecordsByIds(records, brushedIds),
    [records, brushedIds],
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
            <h1 className="font-serif text-lg font-semibold tracking-wide text-ink">驱动因素与衰弱关联</h1>
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
          深度洞察
          <ArrowRight className="ml-1.5 h-3 w-3" />
        </Button>
      }
    >
      {error && (
        <div className="mb-1 border border-cinnabar bg-cinnabar/10 px-2 py-1 text-[11px] text-cinnabar-deep">
          {error}
        </div>
      )}

      <div className="grid h-full min-h-0 grid-cols-12 gap-3">
        <aside className="col-span-12 flex min-h-0 flex-col gap-3 lg:col-span-3">
          <InkBorder className="panel p-3">
            <WaveSelector sampleN={records.length} totalN={totalN} sampled={sampled} />
          </InkBorder>
          <InkBorder className="panel flex min-h-0 flex-1 flex-col p-3">
            <SectionTitle
              index="L1"
              title="相关性热力图"
              subtitle={`Spearman ρ · n=${correlation?.n ?? '—'} · 点击方格切换焦点`}
            />
            <div className="ink-divider my-1" />
            <div className="min-h-0 flex-1">
              <CorrelationHeatmap
                data={correlation}
                focusDimension={focusDimension}
                onCellClick={handleHeatmapClick}
                className="h-full min-h-[240px]"
              />
            </div>
          </InkBorder>
        </aside>

        <section className="col-span-12 flex min-h-0 flex-col gap-3 lg:col-span-9">
          <InkBorder className="panel flex min-h-0 flex-1 flex-col p-3">
            <SectionTitle
              index="M1"
              title="平行坐标图"
              subtitle="ACE → 睡眠 → 社会联系 → 抑郁 → FI · 在轴上拖拽框选子群"
            />
            <div className="ink-divider my-1" />
            <div className="min-h-0 flex-1">
              {records.length > 0 ? (
                <ParallelCoordinatesChart
                  records={records}
                  focusDimension={focusDimension}
                  brushedIds={brushedIds}
                  onBrush={handleBrush}
                  ranges={ranges}
                  className="h-full min-h-[280px]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-ink-stone">加载中…</div>
              )}
            </div>
          </InkBorder>

          <InkBorder className="panel shrink-0 p-3">
            <SectionTitle index="M2" title="辅助视图" subtitle="桑基 · 散点 · 气泡 · 旭日 · 和弦 · 随刷选同步" />
            <DriverDetailTabs
              detailTab={detailTab}
              onTabChange={(tab) => setTrajectory({ detailTab: tab })}
              records={filteredRecords}
              focusDimension={focusDimension}
              sankey={sankey}
              chord={chord}
              factors={factors}
            />
          </InkBorder>

          <InkBorder className="panel shrink-0 p-3">
            <SectionTitle
              index="B1"
              title="特征分布箱线图"
              subtitle="分组比较 FI 差异 · 独居老人 vs 非独居"
            />
            <DriverBoxViolin
              records={filteredRecords}
              groupBy={boxGroupBy}
              onGroupByChange={(g) => setTrajectory({ boxGroupBy: g })}
              totalN={totalN}
            />
          </InkBorder>
        </section>
      </div>
    </PageShell>
  )
}

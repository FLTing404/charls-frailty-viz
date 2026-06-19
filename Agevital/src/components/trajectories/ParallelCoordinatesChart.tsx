import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { ParallelChart } from 'echarts/charts'
import { ParallelComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { DriverRecord } from '@/types/data'
import type { FocusDimension } from '@/lib/store/trajectoryStore'
import { ECHARTS_THEME, ensureInkWashTheme, frailtyColor, inkWash } from '@/lib/theme/inkWash'
import { tDriverDim } from '@/lib/i18n/zh'

echarts.use([ParallelChart, ParallelComponent, TooltipComponent, CanvasRenderer])

const AXIS_ORDER = ['ace', 'sleep', 'social', 'depression', 'fi', 'ses', 'healthcare', 'activity', 'scap', 'material'] as const
const AXIS_DIMS = ['ace', 'sleep', 'social', 'depression', 'fi', 'ses', 'healthcare', 'activity', 'scap', 'material']

interface ParallelCoordinatesChartProps {
  records: DriverRecord[]
  focusDimension: FocusDimension
  brushedIds: string[]
  onBrush: (ids: string[]) => void
  ranges?: Partial<Record<string, [number, number]>>
  className?: string
}

function frailtyLineColor(cat: string, alpha = 0.35): string {
  const c = frailtyColor[cat as keyof typeof frailtyColor] ?? inkWash.stone
  if (c.startsWith('#')) {
    const r = parseInt(c.slice(1, 3), 16)
    const g = parseInt(c.slice(3, 5), 16)
    const b = parseInt(c.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  return c
}

export function ParallelCoordinatesChart({
  records,
  focusDimension,
  brushedIds,
  onBrush,
  ranges,
  className,
}: ParallelCoordinatesChartProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const recordsRef = useRef(records)
  recordsRef.current = records

  // Detect which dimensions have ANY non-zero data in the current record set.
  // A dimension where every record is 0 (or NaN) is likely bad/missing data
  // for this province and should be dropped from the chart entirely.
  const visibleDims = useMemo(() => {
    return AXIS_DIMS.filter((_, i) => {
      return records.some((r) => {
        const vals = [r.ace, r.sleep, r.social, r.depression, r.fi, r.ses, r.healthcare, r.activity, r.scap, r.material]
        const v = vals[i]
        return v != null && !Number.isNaN(v) && v !== 0
      })
    })
  }, [records])

  const parallelData = useMemo(() => {
    if (visibleDims.length === 0) return []

    // Build index map: AXIS_DIMS index → position in visibleDims
    const dimToVisIdx = new Map<number, number>()
    for (let vi = 0; vi < visibleDims.length; vi++) {
      const origIdx = AXIS_DIMS.indexOf(visibleDims[vi])
      dimToVisIdx.set(origIdx, vi)
    }

    // Compute per-dimension means from strictly positive (non-zero, non-NaN) values.
    // Both NaN and 0 are treated as missing and imputed with the column mean,
    // because 0 in survey data (e.g. ACE, sleep) almost always means "not recorded".
    const sums = new Array(visibleDims.length).fill(0)
    const counts = new Array(visibleDims.length).fill(0)
    for (const r of records) {
      for (let vi = 0; vi < visibleDims.length; vi++) {
        const origIdx = AXIS_DIMS.indexOf(visibleDims[vi])
        const vals = [r.ace, r.sleep, r.social, r.depression, r.fi, r.ses, r.healthcare, r.activity, r.scap, r.material]
        const v = vals[origIdx]
        if (v != null && !Number.isNaN(v) && v !== 0) {
          sums[vi] += v
          counts[vi]++
        }
      }
    }
    const means = sums.map((s, i) => (counts[i] > 0 ? s / counts[i] : 0))

    return records.map((r) => {
      const vals = [r.ace, r.sleep, r.social, r.depression, r.fi, r.ses, r.healthcare, r.activity, r.scap, r.material]
      const imputed = visibleDims.map((_, vi) => {
        const origIdx = AXIS_DIMS.indexOf(visibleDims[vi])
        const v = vals[origIdx]
        if (v != null && !Number.isNaN(v) && v !== 0) return v
        return means[vi] // replace NaN / 0 with column mean of positive values
      })
      return {
        value: imputed,
        id: r.id,
        frailty_cat: r.frailty_cat,
      }
    })
  }, [records, visibleDims])

  const option = useMemo<echarts.EChartsCoreOption>(() => {
    const focusIdx = focusDimension ? visibleDims.indexOf(focusDimension) : -1
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => {
          const d = p.data as { value: number[]; frailty_cat: string }
          const vals = d.value
          return visibleDims.map((k, i) => `${tDriverDim(k)}: ${vals[i]?.toFixed?.(2) ?? vals[i]}`).join('<br/>')
        },
      },
      parallelAxis: visibleDims.map((key, i) => ({
        dim: i,
        name: tDriverDim(key),
        min: ranges?.[key]?.[0],
        max: ranges?.[key]?.[1],
        nameTextStyle: {
          color: i === focusIdx ? inkWash.cinnabar : inkWash.wash,
          fontSize: 10,
          fontFamily: '"Noto Serif SC", serif',
          fontWeight: i === focusIdx ? 600 : 400,
        },
        axisLine: {
          lineStyle: {
            color: i === focusIdx ? inkWash.cinnabar : inkWash.mist,
            width: i === focusIdx ? 2 : 1,
          },
        },
        axisLabel: { color: inkWash.stone, fontSize: 9 },
        areaSelectStyle: {
          width: 16,
          borderWidth: 1,
          borderColor: inkWash.cinnabar,
          color: 'rgba(184,59,59,0.12)',
        },
      })),
      parallel: {
        left: 72,
        right: 52,
        top: 28,
        bottom: 24,
        parallelAxisDefault: {
          type: 'value',
          nameLocation: 'end',
          nameGap: 12,
        },
      },
      series: [
        {
          type: 'parallel',
          lineStyle: {
            width: 1,
            opacity: 0.35,
          },
          emphasis: {
            lineStyle: { width: 2, opacity: 0.9 },
          },
          inactiveOpacity: 0.05,
          activeOpacity: 1,
          data: parallelData.map((d) => ({
            value: d.value,
            id: d.id,
            frailty_cat: d.frailty_cat,
            lineStyle: {
              color: frailtyLineColor(d.frailty_cat, brushedIds.length ? 0.15 : 0.35),
            },
          })),
        },
      ],
    }
  }, [parallelData, focusDimension, ranges, brushedIds.length, visibleDims])

  const visibleDimsRef = useRef(visibleDims)
  visibleDimsRef.current = visibleDims

  const handleAxisAreaSelected = useCallback(
    (event: { batch?: { parallelAxisIndex: number; intervals: [number, number][] }[] }) => {
      // visibleDimIndex → original AXIS_DIMS key
      const curVisible = visibleDimsRef.current
      const intervalsByOrigDim: Record<string, [number, number][] | undefined> = {}
      if (event.batch?.length) {
        for (const item of event.batch) {
          const dimKey = curVisible[item.parallelAxisIndex]
          if (dimKey) {
            intervalsByOrigDim[dimKey] = item.intervals
          }
        }
      }
      const hasSelection = Object.values(intervalsByOrigDim).some((a) => a && a.length > 0)
      if (!hasSelection) {
        onBrush([])
        return
      }
      const filtered = recordsRef.current.filter((r) => {
        const vals: Record<string, number> = {
          ace: r.ace, sleep: r.sleep, social: r.social, depression: r.depression,
          fi: r.fi, ses: r.ses, healthcare: r.healthcare, activity: r.activity,
          scap: r.scap, material: r.material,
        }
        return Object.entries(intervalsByOrigDim).every(([dimKey, intervals]) => {
          if (!intervals?.length) return true
          const v = vals[dimKey]
          if (v == null || Number.isNaN(v)) return false
          return intervals.some(([lo, hi]) => v >= lo && v <= hi)
        })
      })
      onBrush(filtered.map((r) => r.id))
    },
    [onBrush],
  )

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, ECHARTS_THEME)
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)

    chart.on('parallelAxisAreaSelected', (event: unknown) => {
      handleAxisAreaSelected(
        event as { batch?: { parallelAxisIndex: number; intervals: [number, number][] }[] },
      )
    })

    return () => {
      chart.off('parallelAxisAreaSelected')
      ro.disconnect()
      chart.dispose()
    }
  }, [handleAxisAreaSelected])

  useEffect(() => {
    if (!chartRef.current) return
    chartRef.current.setOption(option, { notMerge: true, lazyUpdate: false })
  }, [option])

  return (
    <div className={className}>
      <div ref={ref} style={{ width: '100%', height: '100%', minHeight: 'clamp(180px, 22vh, 280px)' }} />
      {brushedIds.length > 0 && (
        <div className="mt-1 text-[10px] text-cinnabar">
          已刷选 {brushedIds.length} / {records.length} 人 · 在轴上拖拽框选，再次框选空区域可清除
        </div>
      )}
    </div>
  )
}

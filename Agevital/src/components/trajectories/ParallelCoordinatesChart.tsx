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

/** Zero-cost typed accessor: returns NaN for missing / undefined values. */
function dimVal(r: DriverRecord, dim: string): number {
  const map: Record<string, number> = {
    ace: r.ace, sleep: r.sleep, social: r.social, depression: r.depression,
    fi: r.fi, ses: r.ses, healthcare: r.healthcare, activity: r.activity,
    scap: r.scap, material: r.material,
  }
  const raw = map[dim]
  if (raw == null) return NaN
  const n = Number(raw)
  return Number.isNaN(n) ? NaN : n
}

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


  // Drop a dimension if > 70% of values in the current record set are 0 or NaN.
  // This handles provinces where most people have no data for a given variable
  // (e.g. Inner Mongolia ACE all 0 → axis removed).
  const visibleDims = useMemo(() => {
    if (records.length === 0) return []
    return AXIS_DIMS.filter((dim) => {
      let zeroOrNaN = 0
      for (const r of records) {
        const v = dimVal(r, dim)
        if (Number.isNaN(v) || v === 0) zeroOrNaN++
      }
      return zeroOrNaN < records.length
    })
  }, [records])

  const parallelData = useMemo(() => {
    if (visibleDims.length === 0) return []

    // Compute per-dimension means from valid (non-NaN, non-zero) values.
    const sums = new Array(visibleDims.length).fill(0)
    const counts = new Array(visibleDims.length).fill(0)
    for (const r of records) {
      for (let vi = 0; vi < visibleDims.length; vi++) {
        const v = dimVal(r, visibleDims[vi])
        if (!Number.isNaN(v) && Math.abs(v) > 0.0001) {
          sums[vi] += v
          counts[vi]++
        }
      }
    }
    const means = sums.map((s, i) => (counts[i] > 0 ? s / counts[i] : NaN))

    // Build imputed records — never emit 0 for any value
    const result: { value: number[]; id: string; frailty_cat: string }[] = []
    for (const r of records) {
      const imputed: number[] = []
      for (let vi = 0; vi < visibleDims.length; vi++) {
        const v = dimVal(r, visibleDims[vi])
        if (!Number.isNaN(v) && Math.abs(v) > 0.0001) {
          imputed.push(+v.toFixed(2))
        } else {
          // Use column mean; if mean is also NaN (no valid values in column),
          // fall back to 1 to avoid a degenerate axis
          const fill = !Number.isNaN(means[vi]) ? +means[vi].toFixed(2) : 1
          imputed.push(fill)
        }
      }
      result.push({
        value: imputed,
        id: r.id,
        frailty_cat: r.frailty_cat,
      })
    }
    return result
  }, [records, visibleDims])

  // Compute per-dimension data min/max from the imputed parallelData,
  // falling back to the backend-supplied ranges only when they are non-degenerate
  // (min ≠ max). This prevents axes from collapsing to 0 when the backend
  // returns [0, 0] for a dimension whose values actually vary (e.g. social,
  // activity, material in 2011).
  const dataRanges = useMemo(() => {
    const result: Record<string, [number, number]> = {}
    for (let vi = 0; vi < visibleDims.length; vi++) {
      const dim = visibleDims[vi]
      let lo = Infinity
      let hi = -Infinity
      for (let pi = 0; pi < parallelData.length; pi++) {
        const v = parallelData[pi].value[vi]
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
      if (Number.isFinite(lo) && Number.isFinite(hi) && lo < hi) {
        result[dim] = [lo, hi]
      }
    }
    return result
  }, [visibleDims, parallelData])

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
      parallelAxis: visibleDims.map((key, i) => {
        // Prefer data-computed range; use backend range only as fallback
        // and only when non-degenerate (lo < hi)
        const backend = ranges?.[key]
        const fb: [number, number] | undefined =
          backend && backend[0] < backend[1]
            ? [backend[0], backend[1]]
            : undefined
        const dataRange = dataRanges[key]
        const dataLo = dataRange?.[0]
        const dataHi = dataRange?.[1] ?? fb?.[1] ?? 1
        // If data spans below zero (e.g. Z-scores like SCAP), center 0.
        // Otherwise use 0 as the axis floor.
        const hasNeg = dataLo != null && dataLo < 0
        const axisMax = hasNeg ? Math.max(Math.abs(dataLo!), Math.abs(dataHi)) : dataHi
        const axisMin = hasNeg ? -axisMax : 0
        return {
        dim: i,
        name: tDriverDim(key),
        min: axisMin,
        max: axisMax,
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
        axisLabel: { show: false },
        areaSelectStyle: {
          width: 16,
          borderWidth: 1,
          borderColor: inkWash.cinnabar,
          color: 'rgba(184,59,59,0.12)',
        },
	        }
	      }),
      parallel: {
        left: 36,
        right: 36,
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

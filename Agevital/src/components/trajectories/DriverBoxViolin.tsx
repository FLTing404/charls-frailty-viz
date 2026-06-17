import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BoxplotChart, ScatterChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { DriverRecord } from '@/types/data'
import type { BoxGroupBy } from '@/lib/store/trajectoryStore'
import { ECHARTS_THEME, ensureInkWashTheme, inkWash } from '@/lib/theme/inkWash'
import { tBoxGroup, tBoxGroupOption } from '@/lib/i18n/zh'
import { formatNumber } from '@/lib/utils'

echarts.use([BoxplotChart, ScatterChart, GridComponent, TooltipComponent, CanvasRenderer])

interface DriverBoxViolinProps {
  records: DriverRecord[]
  groupBy: BoxGroupBy
  onGroupByChange: (g: BoxGroupBy) => void
  totalN: number
  className?: string
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base])
  }
  return sorted[base]
}

function boxStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    min: sorted[0] ?? 0,
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1] ?? 0,
    n: sorted.length,
  }
}

function groupRecords(records: DriverRecord[], groupBy: BoxGroupBy): Map<string, DriverRecord[]> {
  const map = new Map<string, DriverRecord[]>()
  const depMedian = records.length
    ? records.map((r) => r.depression).sort((a, b) => a - b)[Math.floor(records.length / 2)]
    : 10
  const aceMedian = records.length
    ? records.map((r) => r.ace).sort((a, b) => a - b)[Math.floor(records.length / 2)]
    : 50

  for (const r of records) {
    let key: string
    switch (groupBy) {
      case 'alone':
        key = r.alone === 1 ? 'alone' : 'not_alone'
        break
      case 'frailty_cat':
        key = r.frailty_cat
        break
      case 'ace_tier':
        key = r.ace >= aceMedian ? 'high_ace' : 'low_ace'
        break
      case 'depression_tier':
        key = r.depression >= depMedian ? 'high_dep' : 'low_dep'
        break
      default:
        key = 'other'
    }
    const list = map.get(key) ?? []
    list.push(r)
    map.set(key, list)
  }
  return map
}

const GROUP_ORDER: Record<BoxGroupBy, string[]> = {
  alone: ['not_alone', 'alone'],
  frailty_cat: ['robust', 'pre-frail', 'frail'],
  ace_tier: ['low_ace', 'high_ace'],
  depression_tier: ['low_dep', 'high_dep'],
}

export function DriverBoxViolin({
  records,
  groupBy,
  onGroupByChange,
  totalN,
  className,
}: DriverBoxViolinProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const { groups, labels, boxData, scatterSeries } = useMemo(() => {
    const grouped = groupRecords(records, groupBy)
    const order = GROUP_ORDER[groupBy].filter((k) => grouped.has(k))
    const extra = [...grouped.keys()].filter((k) => !order.includes(k))
    const keys = [...order, ...extra]
    const lbs = keys.map((k) => tBoxGroup(k))
    const boxes = keys.map((k) => {
      const vals = (grouped.get(k) ?? []).map((r) => r.fi)
      const s = boxStats(vals)
      return [s.min, s.q1, s.median, s.q3, s.max]
    })
    const scatter = keys.flatMap((k, idx) => {
      const vals = grouped.get(k) ?? []
      return vals.map((r, j) => ({
        value: [lbs[idx], r.fi],
        symbolOffset: [((j % 7) - 3) * 3, 0],
        itemStyle: { color: inkWash.indigo, opacity: 0.25 },
      }))
    })
    return { groups: keys, labels: lbs, boxData: boxes, scatterSeries: scatter }
  }, [records, groupBy])

  const option = useMemo<echarts.EChartsCoreOption>(() => ({
    grid: { top: 36, left: 52, right: 20, bottom: 40 },
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        if (p.seriesType === 'boxplot') {
          const idx = p.dataIndex as number
          const key = groups[idx]
          const vals = (groupRecords(records, groupBy).get(key) ?? []).map((r) => r.fi)
          const s = boxStats(vals)
          return `<div style="font-family:'Noto Serif SC',serif;font-size:11px">${labels[idx]}</div>
            <div style="font-size:10px;color:${inkWash.wash};margin-top:4px">
              中位数 ${s.median.toFixed(3)} · Q1–Q3 ${s.q1.toFixed(3)}–${s.q3.toFixed(3)}<br/>
              n = ${formatNumber(s.n)}
            </div>`
        }
        if (p.seriesType === 'scatter') {
          return `<div style="font-family:'Noto Serif SC',serif;font-size:11px">FI ${Number(p.value[1]).toFixed(3)}</div>`
        }
        return ''
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: inkWash.wash, fontSize: 10, fontFamily: '"Noto Serif SC", serif' },
      axisLine: { lineStyle: { color: inkWash.mist } },
    },
    yAxis: {
      type: 'value',
      name: '衰弱指数 (FI)',
      nameTextStyle: { color: inkWash.wash, fontSize: 10 },
      axisLabel: { color: inkWash.stone, fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(28,28,28,0.06)', type: 'dashed' } },
    },
    series: [
      {
        name: '分布',
        type: 'scatter',
        symbolSize: 3,
        data: scatterSeries,
        z: 1,
      },
      {
        name: 'FI',
        type: 'boxplot',
        data: boxData,
        itemStyle: {
          color: 'rgba(184,59,59,0.08)',
          borderColor: inkWash.cinnabar,
          borderWidth: 1.2,
        },
        z: 3,
      },
    ],
  }), [boxData, scatterSeries, labels, groups, records, groupBy])

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, ECHARTS_THEME)
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)
    return () => {
      ro.disconnect()
      chart.dispose()
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  const groupOptions: BoxGroupBy[] = ['alone', 'frailty_cat', 'ace_tier', 'depression_tier']

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-ink-stone">分组依据</span>
        {groupOptions.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onGroupByChange(g)}
            className={`border px-2 py-0.5 text-[10px] tracking-wide transition-colors ${
              groupBy === g
                ? 'border-cinnabar bg-cinnabar/10 text-cinnabar-deep'
                : 'border-ink/15 text-ink-wash hover:border-ink/30'
            }`}
          >
            {tBoxGroupOption(g)}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-ink-stone">
          显示 {formatNumber(records.length)} 人
          {records.length < totalN ? ` / 全样本 ${formatNumber(totalN)}` : ''}
        </span>
      </div>
      <div ref={ref} style={{ width: '100%', height: 200 }} />
    </div>
  )
}

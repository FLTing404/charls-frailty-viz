import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { ScatterChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { DriverRecord } from '@/types/data'
import type { FocusDimension } from '@/lib/store/trajectoryStore'
import { ECHARTS_THEME, ensureInkWashTheme, frailtyColor, inkWash } from '@/lib/theme/inkWash'
import { tDriverDim, tFrailty } from '@/lib/i18n/zh'

echarts.use([ScatterChart, GridComponent, TooltipComponent, CanvasRenderer])

interface DriverScatterBubbleProps {
  records: DriverRecord[]
  mode: 'scatter' | 'bubble'
  focusDimension: FocusDimension
  className?: string
}

const FI_TIER_COLORS = {
  high: inkWash.cinnabar,   // FI ≥ 0.25 → frail
  mid: inkWash.amber,       // 0.10 < FI < 0.25 → pre-frail
  low: inkWash.bamboo,      // FI ≤ 0.10 → robust
}


export function DriverScatterBubble({
  records,
  mode,
  focusDimension,
  className,
}: DriverScatterBubbleProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const xKey = focusDimension ?? 'depression'

  const option = useMemo<echarts.EChartsCoreOption>(() => {
    if (mode === 'scatter') {
      const data = records.map((r) => ({
        value: [r[xKey], r.fi],
        frailty_cat: r.frailty_cat,
        id: r.id,
        itemStyle: {
          color: frailtyColor[r.frailty_cat as keyof typeof frailtyColor] ?? inkWash.stone,
          opacity: 0.55,
        },
      }))
      return {
        grid: { top: 28, left: 52, right: 16, bottom: 40 },
        tooltip: {
          formatter: (p: any) => {
            const d = p.data
            return `<div style="font-family:'Noto Serif SC',serif;font-size:11px">${tDriverDim(xKey)} ${Number(d.value[0]).toFixed(2)} · FI ${Number(d.value[1]).toFixed(3)}</div>
              <div style="font-size:10px;color:${inkWash.wash};margin-top:4px">${tFrailty(d.frailty_cat)}</div>`
          },
        },
        xAxis: {
          name: tDriverDim(xKey),
          nameTextStyle: { color: inkWash.wash, fontSize: 10 },
          axisLabel: { color: inkWash.stone, fontSize: 10 },
          splitLine: { show: false },
        },
        yAxis: {
          name: 'FI',
          nameTextStyle: { color: inkWash.wash, fontSize: 10 },
          axisLabel: { color: inkWash.stone, fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(28,28,28,0.06)', type: 'dashed' } },
        },
        series: [
          {
            type: 'scatter',
            symbolSize: 6,
            data,
          },
        ],
      }
    }

    // ── Bubble mode ──
    // X = depression, Y = ACE, size = FI, color = FI tier
    const getFiTier = (fi: number) =>
      fi >= 0.25 ? 'high' : fi <= 0.10 ? 'low' : 'mid'

    // Avoid Math.max(...hugeArray) which overflows the call stack
    const fiValues = records.map((r) => r.fi)
    let maxFi = 0.001
    for (let i = 0; i < fiValues.length; i++) {
      if (fiValues[i] > maxFi) maxFi = fiValues[i]
    }

    const data = records
      .filter((r) => r.ace > 0)
      .map((r) => {
        const tier = getFiTier(r.fi)
        return {
          value: [r.depression, r.ace, r.fi],
          fiTier: tier,
          frailty_cat: r.frailty_cat,
          itemStyle: { color: FI_TIER_COLORS[tier], opacity: 0.6 },
        }
      })

    return {
      grid: { top: 28, left: 52, right: 16, bottom: 40 },
      tooltip: {
        formatter: (p: any) => {
          const [dep, ace, fi] = p.data.value
          return `<div style="font-family:'Noto Serif SC',serif;font-size:11px">抑郁 ${dep.toFixed(1)} · ACE ${ace.toFixed(2)}</div>
            <div style="font-size:10px;color:${inkWash.wash};margin-top:4px">FI ${fi.toFixed(3)} · ${tFrailty(p.data.frailty_cat)}</div>`
        },
      },
      xAxis: {
        name: '抑郁得分',
        nameTextStyle: { color: inkWash.wash, fontSize: 10 },
        axisLabel: { color: inkWash.stone, fontSize: 10 },
      },
      yAxis: {
        name: 'ACE',
        min: 50,
        max: 100,
        nameTextStyle: { color: inkWash.wash, fontSize: 10 },
        axisLabel: { color: inkWash.stone, fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(28,28,28,0.06)', type: 'dashed' } },
      },
      series: [
        {
          type: 'scatter',
          data,
          symbolSize: (val: number[]) => 4 + (val[2] / maxFi) * 18,
        },
      ],
    }
  }, [records, mode, xKey])

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
    if (!chartRef.current) return
    chartRef.current.setOption(option, { notMerge: true, lazyUpdate: false })
  }, [option])

  return <div ref={ref} className={className} style={{ width: '100%', height: '100%', minHeight: 220 }} />
}

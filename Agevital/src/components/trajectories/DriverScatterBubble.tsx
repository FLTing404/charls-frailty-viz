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

function aceTier(ace: number, records: DriverRecord[]): 'high' | 'mid' | 'low' {
  const sorted = records.map((r) => r.ace).sort((a, b) => a - b)
  const q33 = sorted[Math.floor(sorted.length * 0.33)] ?? 0
  const q67 = sorted[Math.floor(sorted.length * 0.67)] ?? 0
  if (ace >= q67) return 'high'
  if (ace <= q33) return 'low'
  return 'mid'
}

const ACE_COLORS = {
  high: inkWash.cinnabar,
  mid: inkWash.amber,
  low: inkWash.bamboo,
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

    const maxSocial = Math.max(...records.map((r) => r.social), 1)
    const data = records.map((r) => {
      const tier = aceTier(r.ace, records)
      return {
        value: [r.depression, r.fi, r.social],
        tier,
        itemStyle: { color: ACE_COLORS[tier], opacity: 0.6 },
      }
    })
    return {
      grid: { top: 28, left: 52, right: 16, bottom: 40 },
      tooltip: {
        formatter: (p: any) => {
          const [dep, fi, soc] = p.data.value
          return `<div style="font-family:'Noto Serif SC',serif;font-size:11px">抑郁 ${dep.toFixed(1)} · FI ${fi.toFixed(3)}</div>
            <div style="font-size:10px;color:${inkWash.wash};margin-top:4px">社会联系 ${soc.toFixed(0)} · ACE ${p.data.tier === 'high' ? '高' : p.data.tier === 'low' ? '低' : '中'}</div>`
        },
      },
      xAxis: {
        name: '抑郁得分',
        nameTextStyle: { color: inkWash.wash, fontSize: 10 },
        axisLabel: { color: inkWash.stone, fontSize: 10 },
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
          data,
          symbolSize: (val: number[]) => 4 + (val[2] / maxSocial) * 18,
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

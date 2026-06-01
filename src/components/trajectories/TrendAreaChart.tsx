import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, CustomChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkPointComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { TrendPoint, Wave } from '@/types/data'
import { ECHARTS_THEME, ensureInkWashTheme, frailtyColor, inkWash } from '@/lib/theme/inkWash'
import { tFrailty } from '@/lib/i18n/zh'

echarts.use([LineChart, BarChart, CustomChart, GridComponent, TooltipComponent, LegendComponent, MarkPointComponent, CanvasRenderer])

interface TrendAreaChartProps {
  data: TrendPoint[]
  timeSpan: [Wave, Wave]
  className?: string
}

export function TrendAreaChart({ data, timeSpan, className }: TrendAreaChartProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const option = useMemo(() => {
    const filtered = data.filter((d) => d.year >= timeSpan[0] && d.year <= timeSpan[1])
    const xs = filtered.map((d) => String(d.year))
    const robust = filtered.map((d) => d.robust)
    const pre = filtered.map((d) => d.preFrail)
    const frail = filtered.map((d) => d.frail)
    const rate = filtered.map((d) => Number((d.frailRate * 100).toFixed(2)))

    const robustLabel = tFrailty('robust')
    const preFrailLabel = tFrailty('pre-frail')
    const frailLabel = tFrailty('frail')
    const frailRateLabel = '衰弱率'

    return {
      grid: { top: 36, left: 56, right: 56, bottom: 28 },
      legend: {
        top: 4,
        right: 6,
        textStyle: { color: inkWash.wash, fontSize: 10 },
        itemWidth: 12,
        itemHeight: 8,
        data: [robustLabel, preFrailLabel, frailLabel, frailRateLabel],
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const yr = params[0].axisValueLabel
          const rows = params
            .map(
              (p: any) =>
                `<div style="display:flex;justify-content:space-between;gap:12px;">
                  <span style="color:${inkWash.wash}">${p.seriesName}</span>
                  <span style="font-weight:600">${p.value}${p.seriesName === frailRateLabel ? '%' : ''}</span>
                </div>`,
            )
            .join('')
          return `<div style="font-family:'Noto Serif SC',serif;letter-spacing:0.12em;font-size:11px;color:${inkWash.ink};margin-bottom:4px;">${yr}</div>${rows}`
        },
      },
      xAxis: {
        type: 'category',
        data: xs,
        axisLine: { lineStyle: { color: inkWash.ink, width: 0.8 } },
        axisLabel: { color: inkWash.wash, fontSize: 11, fontFamily: '"Noto Serif SC", serif' },
      },
      yAxis: [
        {
          type: 'value',
          name: '人数',
          nameTextStyle: { color: inkWash.wash, fontSize: 10, padding: [0, 0, 8, 0] },
          axisLabel: { color: inkWash.wash, fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(28,28,28,0.06)', type: 'dashed' } },
        },
        {
          type: 'value',
          name: frailRateLabel,
          nameTextStyle: { color: inkWash.cinnabar, fontSize: 10 },
          axisLabel: {
            color: inkWash.cinnabar,
            fontSize: 10,
            formatter: (v: number) => `${v}%`,
          },
          splitLine: { show: false },
          min: 0,
        },
      ],
      series: [
        {
          name: robustLabel,
          type: 'bar',
          stack: 'pop',
          data: robust,
          itemStyle: { color: frailtyColor.robust, opacity: 0.85 },
          barWidth: 38,
        },
        {
          name: preFrailLabel,
          type: 'bar',
          stack: 'pop',
          data: pre,
          itemStyle: { color: frailtyColor['pre-frail'], opacity: 0.85 },
        },
        {
          name: frailLabel,
          type: 'bar',
          stack: 'pop',
          data: frail,
          itemStyle: { color: frailtyColor.frail, opacity: 0.92 },
        },
        {
          name: frailRateLabel,
          type: 'line',
          smooth: true,
          yAxisIndex: 1,
          data: rate,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: { color: inkWash.cinnabar, borderColor: inkWash.paper, borderWidth: 1.5 },
          lineStyle: { color: inkWash.cinnabar, width: 1.6 },
          label: {
            show: true,
            position: 'top',
            color: inkWash.cinnabar,
            fontSize: 10,
            formatter: '{c}%',
          },
        },
      ],
    } as echarts.EChartsCoreOption
  }, [data, timeSpan])

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, ECHARTS_THEME)
    chartRef.current = chart
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  return <div ref={ref} className={className} style={{ width: '100%', height: className ? undefined : 200 }} />
}

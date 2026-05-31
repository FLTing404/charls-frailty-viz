import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { DonutSlice } from '@/types/data'
import { ECHARTS_THEME, ensureInkWashTheme, inkWash } from '@/lib/theme/inkWash'
import { tDonut } from '@/lib/i18n/zh'
import { formatPercent } from '@/lib/utils'

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer])

interface DonutChartProps {
  data: DonutSlice[]
  className?: string
}

export function DonutChart({ data, className }: DonutChartProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const option = useMemo<echarts.EChartsCoreOption>(() => {
    const total = data.reduce((s, d) => s + d.value, 0) || 1
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: any) =>
          `<div style="font-family:'Noto Serif SC',serif;font-size:11px;color:${inkWash.ink}">${tDonut(p.name)}</div>
           <div style="font-size:10px;color:${inkWash.wash}">${formatPercent(p.value / total)}</div>`,
      },
      legend: {
        orient: 'vertical',
        right: 0,
        top: 'middle',
        itemHeight: 8,
        itemWidth: 12,
        textStyle: { color: inkWash.wash, fontSize: 10 },
        formatter: (name: string) => tDonut(name),
      },
      series: [
        {
          type: 'pie',
          radius: ['46%', '70%'],
          center: ['38%', '50%'],
          avoidLabelOverlap: true,
          padAngle: 1.5,
          itemStyle: {
            borderColor: inkWash.paperAlt,
            borderWidth: 1,
          },
          label: {
            show: true,
            position: 'inside',
            formatter: (p: any) => formatPercent(p.value / total, 0),
            color: inkWash.paperAlt,
            fontSize: 10,
            fontFamily: '"Noto Serif SC", serif',
          },
          data: data.map((d, i) => ({
            ...d,
            name: d.name,
            itemStyle: {
              color: [inkWash.bamboo, inkWash.indigo, inkWash.amber, inkWash.cinnabar][i % 4],
              opacity: 0.92,
            },
          })),
        },
      ],
    }
  }, [data])

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

  return <div ref={ref} className={className} style={{ width: '100%', height: 180 }} />
}

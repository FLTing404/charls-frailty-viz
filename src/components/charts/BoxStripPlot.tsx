import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { ScatterChart, BoxplotChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  BrushComponent,
  ToolboxComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { BoxStripPayload } from '@/types/data'
import { ECHARTS_THEME, ensureInkWashTheme, inkWash } from '@/lib/theme/inkWash'
import { tGender, tRegion } from '@/lib/i18n/zh'
import { cn, formatNumber } from '@/lib/utils'

echarts.use([
  ScatterChart,
  BoxplotChart,
  GridComponent,
  TooltipComponent,
  BrushComponent,
  ToolboxComponent,
  CanvasRenderer,
])

interface BoxStripPlotProps {
  data: BoxStripPayload | null
  onBrush?: (ids: string[]) => void
  brushedIds?: string[]
  className?: string
}

const REGION_ORDER = ['East', 'Central', 'West'] as const
const REGION_LABELS = REGION_ORDER.map((r) => tRegion(r))

export function BoxStripPlot({ data, onBrush, brushedIds, className }: BoxStripPlotProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const pointIdsRef = useRef<string[]>([])

  const option = useMemo<echarts.EChartsCoreOption | null>(() => {
    if (!data) return null
    const boxData = REGION_ORDER.map((r) => {
      const s = data.stats.find((x) => x.region === r)
      return [s?.min ?? 0, s?.q1 ?? 0, s?.median ?? 0, s?.q3 ?? 0, s?.max ?? 0]
    })

    const scatterPoints = data.points.filter((p) =>
      REGION_ORDER.includes(p.region as (typeof REGION_ORDER)[number]),
    )
    pointIdsRef.current = scatterPoints.map((p) => p.id)

    const scatterData = scatterPoints.map((p, idx) => {
      const jitter = ((hash(p.id) % 1000) / 1000 - 0.5) * 18
      return {
        value: [tRegion(p.region), p.fi],
        symbolOffset: [jitter, 0],
        itemStyle: {
          color: p.gender === 'female' ? inkWash.cinnabar : inkWash.indigo,
          opacity: 0.55,
        },
        dataIndex: idx,
        gender: p.gender,
        rural: p.rural,
        id: p.id,
      }
    })

    return {
      grid: { top: 36, left: 52, right: 20, bottom: 32 },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.seriesType === 'boxplot') {
            const r = REGION_ORDER[params.dataIndex]
            const s = data.stats.find((x) => x.region === r)
            return `
              <div style="font-family:'Noto Serif SC',serif;font-size:11px;letter-spacing:0.06em">${tRegion(r)}</div>
              <div style="margin-top:4px;font-size:10px;color:${inkWash.wash}">
                Q1 ${s?.q1.toFixed(3)} · 中位数 ${s?.median.toFixed(3)} · Q3 ${s?.q3.toFixed(3)}<br/>
                须 ${s?.min.toFixed(3)} – ${s?.max.toFixed(3)} · 样本量 ${formatNumber(s?.n ?? 0)}
              </div>`
          }
          const d = params.data
          return `
            <div style="font-family:'Noto Serif SC',serif;font-size:11px">FI ${Number(d.value[1]).toFixed(3)}</div>
            <div style="font-size:10px;color:${inkWash.wash}">
              ${tGender(d.gender ?? 'unknown')} · ${d.rural === 1 ? '农村' : '城镇'}
            </div>`
        },
      },
      xAxis: {
        type: 'category',
        data: [...REGION_LABELS],
        axisLabel: {
          color: inkWash.wash,
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 11,
        },
        axisLine: { lineStyle: { color: inkWash.ink, width: 0.8 } },
      },
      yAxis: {
        type: 'value',
        name: '衰弱指数',
        nameTextStyle: { color: inkWash.wash, fontSize: 10, padding: [0, 0, 6, 0] },
        axisLabel: { color: inkWash.wash, fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(28,28,28,0.07)', type: 'dashed' } },
      },
      brush: {
        toolbox: ['rect', 'polygon', 'clear'],
        xAxisIndex: 0,
        yAxisIndex: 0,
        brushLink: 'all',
        outOfBrush: { colorAlpha: 0.15 },
        brushStyle: {
          borderWidth: 1,
          color: 'rgba(184,59,59,0.10)',
          borderColor: inkWash.cinnabar,
        },
      },
      toolbox: {
        right: 6,
        top: 0,
        itemSize: 12,
        iconStyle: { borderColor: inkWash.wash },
        feature: {
          brush: {
            type: ['rect', 'polygon', 'clear'],
            title: { rect: '框选', polygon: '套索', clear: '清除' },
          },
        },
      },
      series: [
        {
          name: 'FI 箱线图',
          type: 'boxplot',
          data: boxData,
          itemStyle: {
            color: 'rgba(60,90,128,0.08)',
            borderColor: inkWash.indigo,
            borderWidth: 1.2,
          },
          z: 2,
        },
        {
          name: '个体散点',
          type: 'scatter',
          symbolSize: 4,
          data: scatterData,
          z: 1,
          emphasis: { itemStyle: { color: inkWash.cinnabar, opacity: 1 } },
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

    const handleBrush = (params: any) => {
      if (!onBrush) return
      const batch = params.batch?.[0]
      if (!batch) {
        onBrush([])
        return
      }
      const sel = batch.selected?.find((s: any) => s.seriesName === '个体散点')
      const indices: number[] = sel?.dataIndex ?? []
      const ids = indices
        .map((i) => pointIdsRef.current[i])
        .filter((x): x is string => !!x)
      onBrush(ids)
    }
    chart.on('brushSelected', handleBrush)
    chart.on('brushEnd', handleBrush)

    return () => {
      window.removeEventListener('resize', onResize)
      chart.off('brushSelected')
      chart.off('brushEnd')
      chart.dispose()
      chartRef.current = null
    }
  }, [data, onBrush])

  useEffect(() => {
    if (option) chartRef.current?.setOption(option, true)
  }, [option])

  return (
    <div className={cn('relative', className)}>
      <div ref={ref} style={{ width: '100%', height: 240 }} />
      {brushedIds && brushedIds.length > 0 && (
        <div className="absolute right-3 top-1 border border-cinnabar bg-paper-alt px-2 py-0.5 text-[10px] tracking-wide text-cinnabar">
          已刷选 {brushedIds.length} 人
        </div>
      )}
    </div>
  )
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

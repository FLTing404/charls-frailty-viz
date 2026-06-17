import { useEffect, useLayoutEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  CustomChart,
  BoxplotChart,
  HeatmapChart,
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  BrushComponent,
  ToolboxComponent,
  GraphicComponent,
  VisualMapComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { ECHARTS_THEME, ensureInkWashTheme } from '@/lib/theme/inkWash'
import { cn } from '@/lib/utils'

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  CustomChart,
  BoxplotChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  BrushComponent,
  ToolboxComponent,
  GraphicComponent,
  VisualMapComponent,
  CanvasRenderer,
])
ensureInkWashTheme()

export interface EChartProps {
  option: echarts.EChartsCoreOption
  className?: string
  style?: React.CSSProperties
  onEvents?: Record<string, (params: any, chart: echarts.ECharts) => void>
  notMerge?: boolean
}

export function EChart({ option, className, style, onEvents, notMerge = true }: EChartProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, ECHARTS_THEME, { renderer: 'canvas' })
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)
    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.setOption(option, { notMerge, lazyUpdate: true })
    if (onEvents) {
      Object.entries(onEvents).forEach(([evt, handler]) => {
        chart.off(evt as any)
        chart.on(evt as any, (params) => handler(params, chart))
      })
    }
  }, [option, onEvents, notMerge])

  return <div ref={ref} className={cn('h-full w-full', className)} style={style} />
}

import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { GraphChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { DeficitNetworkPayload } from '@/types/data'
import { buildDeficitNetworkOption } from '@/lib/charts/deficitNetworkOption'
import { ECHARTS_THEME, ensureInkWashTheme } from '@/lib/theme/inkWash'
import { cn } from '@/lib/utils'

echarts.use([GraphChart, TooltipComponent, LegendComponent, CanvasRenderer])

interface DeficitForceGraphProps {
  data: DeficitNetworkPayload
  className?: string
}

export function DeficitForceGraph({ data, className }: DeficitForceGraphProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const option = useMemo(() => buildDeficitNetworkOption(data), [data])

  useEffect(() => {
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
    if (chartRef.current) {
      chartRef.current.setOption(option, { notMerge: true })
    }
  }, [option])

  return (
    <div className={cn('relative h-full min-h-0 w-full', className)}>
      <div className="pointer-events-none absolute left-2 top-1 z-10 font-serif text-[9px] tracking-widest text-ink-stone">
        衰弱 deficit 共病网络
      </div>
      <div ref={ref} className="h-full w-full" />
    </div>
  )
}

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
  selectedDeficit?: string | null
  onNodeClick?: (deficitId: string) => void
}

export function DeficitForceGraph({ data, className, selectedDeficit, onNodeClick }: DeficitForceGraphProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const initialised = useRef(false)

  // Track previous selection to efficiently toggle highlight
  const prevSelectedRef = useRef<string | null>(null)

  const fullOption = useMemo(() => buildDeficitNetworkOption(data), [data])

  // ── Init chart (once) ──────────────────────────────────────────────────
  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, ECHARTS_THEME, { renderer: 'canvas' })
    chartRef.current = chart
    chart.setOption(fullOption, { notMerge: true })
    initialised.current = true

    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)

    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
      initialised.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Year / data change: merge (preserve layout positions) ──────────────
  const dataVersion = useRef(data)
  useEffect(() => {
    if (!chartRef.current || !initialised.current) return
    if (dataVersion.current === data) return
    dataVersion.current = data
    chartRef.current.setOption(fullOption, { notMerge: false })
  }, [fullOption]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Selection highlight via dispatchAction (zero setOption, safe for legend & layout) ──
  useEffect(() => {
    if (!chartRef.current || !initialised.current) return
    const prev = prevSelectedRef.current
    const next = selectedDeficit ?? null
    if (prev === next) return

    // Clear previous highlight
    if (prev) {
      const prevNode = data.nodes.find((n) => n.id === prev)
      if (prevNode) {
        chartRef.current.dispatchAction({ type: 'downplay', seriesIndex: 0, name: prevNode.label })
      }
    }

    // Apply new highlight
    if (next) {
      const nextNode = data.nodes.find((n) => n.id === next)
      if (nextNode) {
        chartRef.current.dispatchAction({ type: 'highlight', seriesIndex: 0, name: nextNode.label })
      }
    }

    prevSelectedRef.current = next
  }, [data, selectedDeficit])

  // ── Click handler — always select, badge × clears ─────────────────────
  useEffect(() => {
    if (!chartRef.current || !onNodeClick) return
    chartRef.current.off('click')
    chartRef.current.on('click', 'series', (params: any) => {
      if (params.dataType === 'node') {
        const id = params.data?.id as string
        if (id) onNodeClick(id)
      }
    })
  }, [onNodeClick])

  return (
    <div className={cn('relative h-full min-h-0 w-full', className)}>
      <div className="pointer-events-none absolute left-2 top-1 z-10 font-serif text-[9px] tracking-widest text-ink-stone">
        衰弱 deficit 共病网络
      </div>
      <div ref={ref} className={cn('h-full w-full', onNodeClick && 'cursor-pointer')} />
    </div>
  )
}

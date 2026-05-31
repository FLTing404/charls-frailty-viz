import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { SankeyChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { DriverSankeyPayload } from '@/types/data'
import { ECHARTS_THEME, ensureInkWashTheme, inkWash } from '@/lib/theme/inkWash'

echarts.use([SankeyChart, TooltipComponent, CanvasRenderer])

interface DriverSankeyChartProps {
  data: DriverSankeyPayload | null
  className?: string
}

export function DriverSankeyChart({ data, className }: DriverSankeyChartProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const option = useMemo<echarts.EChartsCoreOption | null>(() => {
    if (!data?.nodes.length) return null
    const nodes = data.nodes.map((n) => ({ name: n.id, label: n.label, count: n.count }))
    const links = data.links.map((l) => ({
      source: l.source,
      target: l.target,
      value: l.value,
    }))
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => {
          if (p.dataType === 'edge') {
            return `<div style="font-family:'Noto Serif SC',serif;font-size:11px">${p.data.source} → ${p.data.target}</div>
              <div style="font-size:10px;color:${inkWash.wash};margin-top:4px">人数 ${p.data.value}</div>`
          }
          const node = data.nodes.find((n) => n.id === p.name)
          return `<div style="font-family:'Noto Serif SC',serif;font-size:11px">${node?.label ?? p.name}</div>
            <div style="font-size:10px;color:${inkWash.wash};margin-top:4px">n = ${node?.count ?? '—'}</div>`
        },
      },
      series: [
        {
          type: 'sankey',
          layout: 'none',
          emphasis: { focus: 'adjacency' },
          nodeAlign: 'left',
          nodeGap: 10,
          nodeWidth: 14,
          left: 12,
          right: 120,
          top: 12,
          bottom: 12,
          data: nodes.map((n) => {
            const meta = data.nodes.find((x) => x.id === n.name)
            return {
              name: n.name,
              label: { formatter: () => meta?.label ?? n.name },
              itemStyle: {
                color:
                  meta?.layerType === 'outcome'
                    ? inkWash.cinnabar
                    : meta?.state === 'high'
                      ? inkWash.cinnabarDeep
                      : meta?.state === 'low'
                        ? inkWash.bamboo
                        : inkWash.indigo,
              },
            }
          }),
          links,
          lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.35 },
          label: {
            color: inkWash.ink,
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 9,
            formatter: (p: any) => {
              const meta = data.nodes.find((n) => n.id === p.name)
              return meta?.label ?? p.name
            },
          },
        },
      ],
    }
  }, [data])

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
    chartRef.current?.setOption(option ?? {}, true)
  }, [option])

  if (!data?.nodes.length) {
    return (
      <div className={`flex items-center justify-center text-[10px] text-ink-stone ${className ?? ''}`}>
        暂无桑基数据
      </div>
    )
  }

  return <div ref={ref} className={className} style={{ width: '100%', height: '100%', minHeight: 220 }} />
}

import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { HeatmapChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { CorrelationMatrixPayload, DriverDimension } from '@/types/data'
import type { FocusDimension } from '@/lib/store/trajectoryStore'
import { ECHARTS_THEME, ensureInkWashTheme, inkWash } from '@/lib/theme/inkWash'

echarts.use([HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer])

interface CorrelationHeatmapProps {
  data: CorrelationMatrixPayload | null
  focusDimension: FocusDimension
  onCellClick: (rowKey: DriverDimension, colKey: DriverDimension, rho: number) => void
  className?: string
}

export function CorrelationHeatmap({
  data,
  focusDimension,
  onCellClick,
  className,
}: CorrelationHeatmapProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const heatData = useMemo(() => {
    if (!data) return []
    const cells: [number, number, number][] = []
    data.matrix.forEach((row, i) => {
      row.forEach((v, j) => cells.push([j, i, v ?? 0]))
    })
    return cells
  }, [data])

  const option = useMemo<echarts.EChartsCoreOption | null>(() => {
    if (!data) return null
    const labels = data.labels
    return {
      grid: { top: 8, left: 72, right: 48, bottom: 56 },
      tooltip: {
        position: 'top',
        formatter: (p: any) => {
          const [x, y, v] = p.data as [number, number, number]
          return `<div style="font-family:'Noto Serif SC',serif;font-size:11px">${labels[y]} × ${labels[x]}</div>
            <div style="font-size:10px;color:${inkWash.wash};margin-top:4px">Spearman ρ = ${v >= 0 ? '+' : ''}${v.toFixed(3)}</div>`
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        splitArea: { show: true },
        axisLabel: {
          color: inkWash.wash,
          fontSize: 9,
          fontFamily: '"Noto Serif SC", serif',
          rotate: 30,
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: labels,
        splitArea: { show: true },
        axisLabel: {
          color: inkWash.wash,
          fontSize: 9,
          fontFamily: '"Noto Serif SC", serif',
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      visualMap: {
        min: -0.5,
        max: 0.5,
        calculable: false,
        orient: 'vertical',
        right: 4,
        top: 'center',
        itemHeight: 80,
        inRange: {
          color: [inkWash.indigo, '#E8E4DC', inkWash.cinnabar],
        },
        text: ['正', '负'],
        textStyle: { color: inkWash.wash, fontSize: 9 },
      },
      series: [
        {
          type: 'heatmap',
          data: heatData,
          label: {
            show: true,
            formatter: (p: any) => {
              const v = (p.data as [number, number, number])[2]
              return Math.abs(v) >= 0.08 ? v.toFixed(2) : ''
            },
            color: inkWash.ink,
            fontSize: 9,
          },
          emphasis: {
            itemStyle: { shadowBlur: 8, shadowColor: 'rgba(184,59,59,0.35)' },
          },
        },
      ],
    }
  }, [data, heatData])

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, ECHARTS_THEME)
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)

    const onClick = (params: any) => {
      if (!data || params.componentType !== 'series') return
      const [x, y, v] = params.data as [number, number, number]
      const rowKey = data.keys[y]
      const colKey = data.keys[x]
      onCellClick(rowKey, colKey, v)
    }
    chart.on('click', onClick)

    return () => {
      chart.off('click', onClick)
      ro.disconnect()
      chart.dispose()
    }
  }, [data, onCellClick])

  useEffect(() => {
    if (!chartRef.current) return
    chartRef.current.setOption(option ?? {}, { notMerge: true, lazyUpdate: false })
  }, [option])

  return (
    <div className={className}>
      <div ref={ref} style={{ width: '100%', height: '100%', minHeight: 220 }} />
      {focusDimension && data && (
        <div className="mt-1 border-l-2 border-cinnabar pl-2 text-[10px] text-ink-wash">
          焦点：{data.labels[data.keys.indexOf(focusDimension)]}
          {' · '}
          ρ(FI) ={' '}
          {(() => {
            const fiIdx = data.keys.indexOf('fi')
            const dimIdx = data.keys.indexOf(focusDimension)
            const rho = data.matrix[dimIdx]?.[fiIdx]
            return rho != null ? `${rho >= 0 ? '+' : ''}${rho.toFixed(3)}` : '—'
          })()}
        </div>
      )}
    </div>
  )
}

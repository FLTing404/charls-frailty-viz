import { useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import { MapChart } from 'echarts/charts'
import { GeoComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ProvinceDatum } from '@/types/data'
import { buildChinaVisGeoOption } from '@/lib/charts/chinaVisGeoOption'
import { ECHARTS_THEME, ensureInkWashTheme } from '@/lib/theme/inkWash'
import { cn } from '@/lib/utils'

echarts.use([MapChart, GeoComponent, TooltipComponent, VisualMapComponent, CanvasRenderer])

const BASE = import.meta.env.BASE_URL

let mapsRegistered = false

async function ensureGeoMaps() {
  if (mapsRegistered) return
  const [world, china] = await Promise.all([
    fetch(`${BASE}geo/world.json`).then((r) => {
      if (!r.ok) throw new Error('world.json 加载失败')
      return r.json()
    }),
    fetch(`${BASE}geo/china-provinces.json`).then((r) => {
      if (!r.ok) throw new Error('china-provinces.json 加载失败')
      return r.json()
    }),
  ])
  echarts.registerMap('world', world as any)
  echarts.registerMap('china', china as any)
  mapsRegistered = true
}

interface ChinaVisGeoMapProps {
  data: ProvinceDatum[]
  className?: string
}

export function ChinaVisGeoMap({ data, className }: ChinaVisGeoMapProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const [ready, setReady] = useState(mapsRegistered)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let aborted = false
    ensureGeoMaps()
      .then(() => {
        if (!aborted) setReady(true)
      })
      .catch((e) => {
        if (!aborted) setError(String(e))
      })
    return () => {
      aborted = true
    }
  }, [])

  const option = useMemo(() => (ready ? buildChinaVisGeoOption(data) : null), [data, ready])

  useEffect(() => {
    if (!ref.current || !ready) return
    const chart = echarts.init(ref.current, ECHARTS_THEME, { renderer: 'canvas' })
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)

    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [ready])

  useEffect(() => {
    if (option && chartRef.current) {
      chartRef.current.setOption(option, { notMerge: true })
    }
  }, [option])

  if (error) {
    return (
      <div className={cn('flex h-full items-center justify-center text-[11px] text-cinnabar', className)}>
        {error}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={cn('h-full w-full', !ready && 'animate-pulse bg-paper-deep/30', className)}
    />
  )
}

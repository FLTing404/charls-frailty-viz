import { useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import { MapChart, ScatterChart } from 'echarts/charts'
import { GeoComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ProvinceDatum } from '@/types/data'
import { buildChinaVisGeoOption, type BubbleDatum } from '@/lib/charts/chinaVisGeoOption'
import { ECHARTS_THEME, ensureInkWashTheme } from '@/lib/theme/inkWash'
import { geoNameToProvince } from '@/lib/geo/provinceGeoNames'
import { cn } from '@/lib/utils'

echarts.use([MapChart, ScatterChart, GeoComponent, TooltipComponent, VisualMapComponent, CanvasRenderer])

const BASE = import.meta.env.BASE_URL

let mapsRegistered = false
let worldAvailable = false

async function tryFetchJSON(url: string): Promise<unknown | null> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const text = await r.text()
    // Guard against XML/HTML error pages served with 200 status
    if (text.trimStart().startsWith('<')) return null
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function ensureGeoMaps() {
  if (mapsRegistered) return
  const [world, china] = await Promise.all([
    tryFetchJSON(`${BASE}geo/world.json`),
    tryFetchJSON(`${BASE}geo/china-provinces.json`),
  ])
  if (!china) throw new Error('china-provinces.json 加载失败，请检查 public/geo/ 目录')
  if (world) {
    echarts.registerMap('world', world as any)
    worldAvailable = true
  }
  echarts.registerMap('china', china as any)
  mapsRegistered = true
}

export function isWorldAvailable() {
  return worldAvailable
}

interface ChinaVisGeoMapProps {
  data: ProvinceDatum[]
  className?: string
  /** Show rich stats tooltip with demographic breakdown */
  showStats?: boolean
  /** Highlighted province (English name) */
  selectedProvince?: string | null
  /** Called with English province name (or null to deselect) */
  onProvinceClick?: (province: string | null) => void
  /** Override visualMap range when showing a deficit overlay */
  visualMapRange?: [number, number]
  /** Tooltip label override when in overlay mode */
  overlayLabel?: string
  /** Bubble scatter overlay data */
  bubbleData?: BubbleDatum[] | null
  /** Label for the bubble series (e.g. '高血压患病率') */
  bubbleLabel?: string
}

export function ChinaVisGeoMap({
  data,
  className,
  showStats = false,
  selectedProvince = null,
  onProvinceClick,
  visualMapRange,
  overlayLabel,
  bubbleData = null,
  bubbleLabel,
}: ChinaVisGeoMapProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const [ready, setReady] = useState(mapsRegistered)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let aborted = false
    ensureGeoMaps()
      .then(() => { if (!aborted) setReady(true) })
      .catch((e) => { if (!aborted) setError(String(e)) })
    return () => { aborted = true }
  }, [])

  const option = useMemo(
    () =>
      ready
        ? buildChinaVisGeoOption(data, {
            showStats,
            selectedProvince,
            withWorldBackground: worldAvailable,
            visualMapRange,
            overlayLabel,
            bubbleData,
            bubbleLabel,
          })
        : null,
    [data, ready, showStats, selectedProvince, visualMapRange, overlayLabel, bubbleData, bubbleLabel],
  )

  useEffect(() => {
    if (!ref.current || !ready) return
    const chart = echarts.init(ref.current, ECHARTS_THEME, { renderer: 'canvas' })
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)

    if (onProvinceClick) {
      chart.on('click', 'series', (params: any) => {
        const geoName: string = params.name ?? ''
        const province = geoNameToProvince(geoName)
        onProvinceClick(province === selectedProvince ? null : province)
      })
    }

    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-attach click after option changes (province selection changes)
  useEffect(() => {
    if (!chartRef.current || !onProvinceClick) return
    chartRef.current.off('click')
    chartRef.current.on('click', 'series', (params: any) => {
      const geoName: string = params.name ?? ''
      const province = geoNameToProvince(geoName)
      onProvinceClick(province === selectedProvince ? null : province)
    })
  }, [selectedProvince, onProvinceClick])

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
      className={cn(
        'h-full w-full',
        !ready && 'animate-pulse bg-paper-deep/30',
        onProvinceClick && 'cursor-pointer',
        className,
      )}
    />
  )
}

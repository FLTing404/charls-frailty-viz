import type { EChartsCoreOption } from 'echarts/core'
import type { ProvinceDatum } from '@/types/data'
import { FRAIL_RATE_COLOR_DOMAIN } from '@/lib/charts/frailRateDomain'
import { provinceToGeoName } from '@/lib/geo/provinceGeoNames'
import { PROVINCE_CENTERS } from '@/lib/geo/provinceCenters'
import { fiGradient, inkWash } from '@/lib/theme/inkWash'
import { tProvince } from '@/lib/i18n/zh'
import { formatPercent } from '@/lib/utils'

export const CHINA_VIEW = {
  center: [105, 36] as [number, number],
  zoom: 1.35,
}

const KEEP_FILL_ON_HOVER = {
  areaColor: null as unknown as string,
  color: null as unknown as string,
}

export interface BubbleDatum {
  /** Chinese display name (e.g. '北京', '杭州市') */
  name: string
  /** Longitude */
  lng: number
  /** Latitude */
  lat: number
  /** Prevalence rate for bubble sizing */
  rate: number
  /** Province-level fallback: English province name (deprecated in favor of direct coords) */
  provinceEn?: string
}

export interface MapOptions {
  showStats?: boolean
  selectedProvince?: string | null
  withWorldBackground?: boolean
  /** Override visualMap range when showing a deficit overlay */
  visualMapRange?: [number, number]
  /** Label shown in tooltip when in overlay mode (e.g. '高血压患病率') */
  overlayLabel?: string
  /** Bubble overlay data — one per province, sized by indicator rate */
  bubbleData?: BubbleDatum[] | null
  /** Label for the bubble series (e.g. '高血压患病率') */
  bubbleLabel?: string
}

export function buildProvinceSeriesData(provinces: ProvinceDatum[]) {
  return provinces.map((p) => ({
    name: provinceToGeoName(p.province),
    value: p.frailRate,
    meanFI: p.meanFI,
    frailRate: p.frailRate,
    preFrailRate: p.preFrailRate,
    robustRate: p.robustRate,
    malePct: p.malePct,
    urbanPct: p.urbanPct,
    n: p.n,
    provinceEn: p.province,
  }))
}

export function buildChinaVisGeoOption(
  provinces: ProvinceDatum[],
  opts: MapOptions = {},
): EChartsCoreOption {
  const {
    showStats = false,
    selectedProvince = null,
    withWorldBackground = false,
    visualMapRange,
    overlayLabel,
    bubbleData = null,
    bubbleLabel,
  } = opts
  const mapData = buildProvinceSeriesData(provinces)
  const { min, max } = visualMapRange
    ? { min: visualMapRange[0], max: visualMapRange[1] }
    : FRAIL_RATE_COLOR_DOMAIN

  const valueLabel = overlayLabel ?? '衰弱率'
  const labelFormatter = (params: any) => {
    const d = params.data
    if (!d?.provinceEn) return params.name
    const lines = [
      `{name|${tProvince(d.provinceEn as string)}}`,
      `{detail|${valueLabel} ${formatPercent(d.frailRate, 1)}${overlayLabel ? '' : ` · FI ${Number(d.meanFI).toFixed(3)}`}}`,
    ]
    if (showStats && !overlayLabel) {
      if (d.malePct != null)
        lines.push(`{detail|男性 ${formatPercent(d.malePct, 1)} · 城镇 ${d.urbanPct != null ? formatPercent(d.urbanPct, 1) : '—'}}`)
      lines.push(`{detail|样本量 ${Number(d.n).toLocaleString()}人}`)
    }
    return lines.join('\n')
  }

  // Build selected-province highlight data override
  const dataWithSelect = mapData.map((item) => {
    const isSelected = selectedProvince && item.provinceEn === selectedProvince
    if (!isSelected) return item
    return {
      ...item,
      itemStyle: {
        borderColor: inkWash.cinnabar,
        borderWidth: 2,
        shadowColor: inkWash.cinnabar,
        shadowBlur: 6,
      },
    }
  })

  // --- Bubble overlay: convert province-level rates to scatter points ---
  const hasBubbles = !!bubbleData && bubbleData.length > 0
  const bubbleSeriesData: { name: string; value: [number, number, number] }[] = []
  let bubbleMax = 1

  if (hasBubbles && bubbleData) {
    const vals = bubbleData.map((d) => d.rate).filter((v) => v > 0)
    bubbleMax = vals.length ? Math.max(...vals) : 1
    for (const d of bubbleData) {
      if (d.rate <= 0) continue
      // Use direct coordinates if available, otherwise fall back to province center lookup
      let lng: number, lat: number
      if (d.lng != null && d.lat != null) {
        lng = d.lng
        lat = d.lat
      } else if (d.provinceEn) {
        const center = PROVINCE_CENTERS[d.provinceEn]
        if (!center) continue
        lng = center[0]
        lat = center[1]
      } else {
        continue
      }
      bubbleSeriesData.push({
        name: d.name,
        value: [lng, lat, d.rate],
      })
    }
  }

  // --- Build geo components ---
  const geoComponents: any[] = []

  // World background (always when requested)
  if (withWorldBackground) {
    geoComponents.push({
      map: 'world',
      ...CHINA_VIEW,
      roam: false,
      silent: true,
      z: 1,
      itemStyle: {
        areaColor: inkWash.ink,
        borderColor: inkWash.mist,
        borderWidth: 0.3,
        opacity: 0.2,
      },
      emphasis: { disabled: true },
      label: { show: false },
    })
  }

  // China geo for bubble scatter coordinate system
  if (hasBubbles) {
    geoComponents.push({
      map: 'china',
      ...CHINA_VIEW,
      roam: false,
      silent: true,
      z: 3,
      itemStyle: { areaColor: 'transparent', borderColor: 'transparent', borderWidth: 0 },
      emphasis: { disabled: true },
      label: { show: false },
    })
  }

  // --- Build series ---
  const seriesList: any[] = [
    {
      name: '省域衰弱率',
      type: 'map',
      map: 'china',
      ...CHINA_VIEW,
      roam: false,
      z: 2,
      data: dataWithSelect,
      selectedMode: false,
      label: { show: false },
      itemStyle: {
        borderColor: inkWash.mist,
        borderWidth: 0.5,
      },
      emphasis: {
        focus: 'none',
        scale: false,
        itemStyle: {
          ...KEEP_FILL_ON_HOVER,
          borderColor: inkWash.wash,
          borderWidth: 0.8,
        },
        label: {
          show: !showStats,
          fontFamily: '"Noto Serif SC", serif',
          lineHeight: 16,
          formatter: labelFormatter,
          rich: {
            name: { fontSize: 11, fontWeight: 600, color: inkWash.ink, lineHeight: 16 },
            detail: { fontSize: 9, color: inkWash.wash, lineHeight: 14 },
          },
        },
      },
      select: {
        disabled: true,
        itemStyle: KEEP_FILL_ON_HOVER,
      },
    },
  ]

  // Bubble scatter overlay
  if (hasBubbles && bubbleSeriesData.length > 0) {
    seriesList.push({
      name: bubbleLabel ?? '指标患病率',
      type: 'scatter',
      coordinateSystem: 'geo',
      geoIndex: withWorldBackground ? 1 : 0,
      z: 4,
      data: bubbleSeriesData,
      symbolSize: (val: number[]) => {
        const rate = val[2]
        if (rate <= 0) return 4
        // Map rate to bubble radius 6–32
        const t = Math.sqrt(rate / bubbleMax)
        return 6 + t * 26
      },
      itemStyle: {
        color: inkWash.cinnabar,
        opacity: 0.55,
        borderColor: 'rgba(255,255,255,0.6)',
        borderWidth: 0.8,
      },
      emphasis: {
        scale: 1.6,
        itemStyle: { opacity: 0.8 },
        label: {
          show: true,
          formatter: (p: any) => `${p.name}\n${formatPercent(p.value[2], 1)}`,
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 10,
          color: inkWash.ink,
        },
      },
      label: { show: false },
    })
  }

  return {
    backgroundColor: 'transparent',
    tooltip: showStats
      ? {
          show: true,
          trigger: 'item',
          backgroundColor: 'rgba(250,246,238,0.95)',
          borderColor: inkWash.mist,
          borderWidth: 1,
          padding: [6, 10],
          textStyle: { color: inkWash.ink, fontSize: 10, fontFamily: '"Noto Serif SC", serif' },
          formatter: (params: any) => {
            const d = params.data
            if (!d?.provinceEn) return params.name
            const pct = (v: number | null | undefined) =>
              v != null ? formatPercent(v, 1) : '—'
            if (overlayLabel) {
              return [
                `<b>${tProvince(d.provinceEn)}</b>`,
                `${overlayLabel} ${pct(d.frailRate)}`,
              ].join('<br/>')
            }
            return [
              `<b>${tProvince(d.provinceEn)}</b>`,
              `衰弱率 ${pct(d.frailRate)}　衰弱前期 ${pct(d.preFrailRate)}`,
              `样本量 ${Number(d.n).toLocaleString()}人`,
              `男性比 ${pct(d.malePct)}　城镇比 ${pct(d.urbanPct)}`,
            ].join('<br/>')
          },
        }
      : { show: false },
    visualMap: {
      show: false,
      min,
      max,
      seriesIndex: 0,
      inRange: { color: [...fiGradient] },
    },
    ...(geoComponents.length > 0
      ? {
          geo: geoComponents.length === 1 ? geoComponents[0] : geoComponents,
        }
      : {}),
    series: seriesList,
  }
}

import type { EChartsCoreOption } from 'echarts/core'
import type { ProvinceDatum } from '@/types/data'
import { FRAIL_RATE_COLOR_DOMAIN } from '@/lib/charts/frailRateDomain'
import { provinceToGeoName } from '@/lib/geo/provinceGeoNames'
import { fiGradient, inkWash } from '@/lib/theme/inkWash'
import { tProvince } from '@/lib/i18n/zh'
import { formatPercent } from '@/lib/utils'

/** 中国视点：世界 geo 与 map series 须使用相同 center / zoom */
export const CHINA_VIEW = {
  center: [105, 36] as [number, number],
  zoom: 1.75,
}

/** 悬停时保持 visualMap 填色不变（ECharts 要求 areaColor 与 color 均为 null） */
const KEEP_FILL_ON_HOVER = {
  areaColor: null as unknown as string,
  color: null as unknown as string,
}

export function buildProvinceSeriesData(provinces: ProvinceDatum[]) {
  return provinces.map((p) => ({
    name: provinceToGeoName(p.province),
    value: p.frailRate,
    meanFI: p.meanFI,
    frailRate: p.frailRate,
    n: p.n,
    provinceEn: p.province,
  }))
}

export function buildChinaVisGeoOption(provinces: ProvinceDatum[]): EChartsCoreOption {
  const mapData = buildProvinceSeriesData(provinces)
  const { min, max } = FRAIL_RATE_COLOR_DOMAIN

  const emphasisLabelFormatter = (params: any) => {
    const d = params.data
    if (!d?.provinceEn) return params.name
    return [
      `{name|${tProvince(d.provinceEn as string)}}`,
      `{detail|衰弱率 ${formatPercent(d.frailRate, 1)} · 平均FI ${Number(d.meanFI).toFixed(3)}}`,
    ].join('\n')
  }

  const hoverBorder = {
    borderColor: inkWash.wash,
    borderWidth: 0.8,
  }

  return {
    backgroundColor: 'transparent',
    tooltip: { show: false },
    visualMap: {
      show: false,
      min,
      max,
      seriesIndex: 0,
      inRange: { color: [...fiGradient] },
    },
    geo: {
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
    },
    series: [
      {
        name: '省域衰弱率',
        type: 'map',
        map: 'china',
        ...CHINA_VIEW,
        roam: false,
        z: 2,
        data: mapData,
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
            ...hoverBorder,
          },
          label: {
            show: true,
            fontFamily: '"Noto Serif SC", serif',
            lineHeight: 16,
            formatter: emphasisLabelFormatter,
            rich: {
              name: {
                fontSize: 11,
                fontWeight: 600,
                color: inkWash.ink,
                lineHeight: 16,
              },
              detail: {
                fontSize: 9,
                color: inkWash.wash,
                lineHeight: 14,
              },
            },
          },
        },
        select: {
          disabled: true,
          itemStyle: KEEP_FILL_ON_HOVER,
        },
      },
    ],
  }
}

import * as echarts from 'echarts/core'

export const inkWash = {
  paper: '#F7F3EB',
  paperAlt: '#FAF6F0',
  paperDeep: '#EEE8DB',
  ink: '#1C1C1C',
  wash: '#6B6B6B',
  mist: '#D4CFC4',
  stone: '#9B968D',
  cinnabar: '#B83B3B',
  cinnabarSoft: '#D26A6A',
  cinnabarDeep: '#8C2A2A',
  indigo: '#3D5A80',
  bamboo: '#5C7A6B',
  amber: '#C4A35A',
} as const

export const frailtyColor = {
  robust: inkWash.bamboo,
  'pre-frail': inkWash.amber,
  frail: inkWash.cinnabar,
  death: '#3D3D3D',
  lost: '#B5B0A6',
} as const

export type FrailtyStatus = keyof typeof frailtyColor

export const regionColor = {
  East: inkWash.indigo,
  Central: inkWash.amber,
  West: inkWash.cinnabar,
} as const

/**
 * Ink-wash gradient ramp from misty paper to cinnabar — used by choropleth
 * and any sequential encoding. Returns d3-compatible interpolator stops.
 */
export const fiGradient = [
  '#F1ECDF',
  '#E3D8C2',
  '#CDB89A',
  '#B58E73',
  '#9C6557',
  '#B83B3B',
]

export const ECHARTS_THEME = 'ink-wash'

let registered = false
export function ensureInkWashTheme() {
  if (registered) return
  echarts.registerTheme(ECHARTS_THEME, {
    color: [
      inkWash.bamboo,
      inkWash.amber,
      inkWash.cinnabar,
      inkWash.indigo,
      inkWash.stone,
      inkWash.cinnabarSoft,
    ],
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: 'Inter, "Noto Serif SC", sans-serif',
      color: inkWash.ink,
    },
    title: {
      textStyle: { color: inkWash.ink, fontFamily: '"Noto Serif SC", serif', fontWeight: 600 },
      subtextStyle: { color: inkWash.wash },
    },
    axisPointer: {
      lineStyle: { color: inkWash.wash, type: 'dashed' },
      crossStyle: { color: inkWash.wash },
    },
    legend: { textStyle: { color: inkWash.wash } },
    tooltip: {
      backgroundColor: inkWash.paperAlt,
      borderColor: inkWash.ink,
      borderWidth: 0.5,
      textStyle: { color: inkWash.ink, fontSize: 11 },
      extraCssText:
        'box-shadow: 0 8px 24px -12px rgba(28,28,28,0.25); font-family: Inter, sans-serif;',
    },
    grid: { borderColor: inkWash.mist, borderWidth: 0.5 },
    categoryAxis: {
      axisLine: { lineStyle: { color: inkWash.ink, width: 0.8 } },
      axisTick: { lineStyle: { color: inkWash.ink } },
      axisLabel: { color: inkWash.wash, fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(28,28,28,0.06)' } },
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: inkWash.wash, fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(28,28,28,0.08)', type: 'dashed' } },
    },
  } as any)
  registered = true
}

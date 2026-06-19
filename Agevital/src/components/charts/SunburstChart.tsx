import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { SunburstChart as ECSunburst } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { DriverRecord } from '@/types/data'
import { ECHARTS_THEME, ensureInkWashTheme, inkWash } from '@/lib/theme/inkWash'
import { tFrailty } from '@/lib/i18n/zh'
import { cn } from '@/lib/utils'
import { formatPercent } from '@/lib/utils'

echarts.use([ECSunburst, TooltipComponent, CanvasRenderer])

const FRAILTY_COLOR: Record<string, string> = {
  robust: '#9BB5A6',
  'pre-frail': '#C4B68A',
  frail: '#C4988E',
}

const GENDER_COLOR: Record<string, string> = {
  male: '#8C9DB5',
  female: '#C4A2A2',
  unknown: inkWash.mist,
}

const URBAN_COLOR: Record<string, string> = {
  城镇: '#A2B2BD',
  农村: '#C4BAAA',
  未知: inkWash.mist,
}

interface SunburstChartProps {
  records: DriverRecord[]
  className?: string
}

export function SunburstChart({ records, className }: SunburstChartProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const option = useMemo(() => buildOption(records), [records])

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, ECHARTS_THEME, { renderer: 'canvas' })
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)
    return () => { ro.disconnect(); chart.dispose(); chartRef.current = null }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true })
  }, [option])

  return <div ref={ref} className={cn('h-full w-full', className)} />
}

function buildOption(records: DriverRecord[]) {
  const total = records.length
  if (total === 0) return {}

  // Aggregate: frailty_cat → gender → rural
  const tree: Record<string, Record<string, Record<string, number>>> = {}

  for (const r of records) {
    const fc = r.frailty_cat ?? 'unknown'
    const gd = r.gender ?? 'unknown'
    const rl = r.rural === 0 ? '城镇' : r.rural === 1 ? '农村' : '未知'
    if (!tree[fc]) tree[fc] = {}
    if (!tree[fc][gd]) tree[fc][gd] = {}
    tree[fc][gd][rl] = (tree[fc][gd][rl] ?? 0) + 1
  }

  const sunburstData = Object.entries(tree)
    .filter(([fc]) => fc !== 'unknown')
    .sort(([a], [b]) => {
      const order = ['robust', 'pre-frail', 'frail']
      return order.indexOf(a) - order.indexOf(b)
    })
    .map(([fc, genders]) => {
      const fcCount = Object.values(genders).reduce(
        (s, rl) => s + Object.values(rl).reduce((a, b) => a + b, 0), 0,
      )
      return {
        name: tFrailty(fc),
        value: fcCount,
        itemStyle: { color: FRAILTY_COLOR[fc] ?? inkWash.wash },
        label: { show: true },
        children: Object.entries(genders)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([gd, rurals]) => {
            const gdCount = Object.values(rurals).reduce((a, b) => a + b, 0)
            const gdColor = GENDER_COLOR[gd] ?? inkWash.mist
            return {
              name: gd === 'male' ? '男' : gd === 'female' ? '女' : '未知',
              value: gdCount,
              itemStyle: { color: gdColor, opacity: 0.85 },
              label: { show: gdCount / total > 0.04 },
              children: Object.entries(rurals)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([rl, cnt]) => ({
                  name: rl,
                  value: cnt,
                  itemStyle: { color: URBAN_COLOR[rl] ?? inkWash.mist, opacity: 0.92 },
                  label: { show: cnt / total > 0.04 },
                })),
            }
          }),
      }
    })

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(250,246,238,0.95)',
      borderColor: inkWash.mist,
      borderWidth: 1,
      padding: [4, 8],
      textStyle: { color: inkWash.ink, fontSize: 11, fontFamily: '"Noto Serif SC", serif' },
      formatter: (params: any) => {
        const pct = formatPercent(params.value / total, 1)
        return `${params.name}　${params.value.toLocaleString()}人 (${pct})`
      },
    },
    series: [
      {
        type: 'sunburst',
        data: sunburstData,
        radius: ['15%', '90%'],
        sort: undefined,
        emphasis: { focus: 'ancestor' },
        label: {
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 9,
          color: inkWash.ink,
          minAngle: 8,
        },
        itemStyle: { borderWidth: 1, borderColor: 'rgba(250,246,238,0.6)' },
        levels: [
          {},
          { r0: '15%', r: '40%', label: { align: 'right', fontSize: 10, fontWeight: 600 } },
          { r0: '40%', r: '65%', label: { align: 'right', fontSize: 9 } },
          { r0: '65%', r: '90%', label: { position: 'outside', padding: 2, fontSize: 8 } },
        ],
      },
    ],
  }
}

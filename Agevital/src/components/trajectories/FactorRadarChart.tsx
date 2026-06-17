import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { SunburstChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { FactorMatrixCell } from '@/types/data'
import { ECHARTS_THEME, ensureInkWashTheme, inkWash } from '@/lib/theme/inkWash'
import { tCategory, tFactor } from '@/lib/i18n/zh'

echarts.use([SunburstChart, TooltipComponent, CanvasRenderer])

/** 水墨风暖色阶：由浅琥珀 → 朱砂深（对应示例 sunburst 的 star5→star2 渐变） */
const CORR_COLORS = ['#E8C078', '#D49258', '#C86A52', '#B83B3B', '#7A3535']

const CATEGORY_COLOR: Record<string, string> = {
  SES: CORR_COLORS[0],
  Sleep: CORR_COLORS[1],
  Mood: CORR_COLORS[2],
  ACE: CORR_COLORS[3],
  Social: CORR_COLORS[4],
}

const STRENGTH_TIERS = [
  { label: '强相关', min: 0.35, colorIdx: 0, weight: 5 },
  { label: '较高', min: 0.25, colorIdx: 1, weight: 4 },
  { label: '中等', min: 0.15, colorIdx: 2, weight: 3 },
  { label: '较低', min: 0.08, colorIdx: 3, weight: 2 },
  { label: '弱相关', min: 0, colorIdx: 4, weight: 1 },
] as const

function strengthTier(absRho: number) {
  for (const tier of STRENGTH_TIERS) {
    if (absRho >= tier.min) return tier
  }
  return STRENGTH_TIERS[STRENGTH_TIERS.length - 1]
}

type SunNode = {
  name: string
  value?: number
  children?: SunNode[]
  itemStyle?: { color?: string; opacity?: number }
  label?: { color?: string; downplay?: { opacity?: number } }
  rho?: number
  pvalue?: number
  category?: string
}

function buildSunburstTree(data: FactorMatrixCell[]): SunNode[] {
  const byCategory = new Map<string, FactorMatrixCell[]>()
  for (const cell of data) {
    const list = byCategory.get(cell.category) ?? []
    list.push(cell)
    byCategory.set(cell.category, list)
  }

  const categoryOrder = ['SES', 'Sleep', 'Mood', 'ACE', 'Social']

  const rootChildren: SunNode[] = categoryOrder
    .filter((cat) => byCategory.has(cat))
    .map((cat) => {
      const cells = byCategory.get(cat)!
      const catColor = CATEGORY_COLOR[cat] ?? CORR_COLORS[2]

      const tierMap = new Map<string, { tier: (typeof STRENGTH_TIERS)[number]; factors: FactorMatrixCell[] }>()
      for (const cell of cells) {
        const tier = strengthTier(Math.abs(cell.rho))
        const key = tier.label
        const entry = tierMap.get(key) ?? { tier, factors: [] }
        entry.factors.push(cell)
        tierMap.set(key, entry)
      }

      const tierNodes: SunNode[] = STRENGTH_TIERS.filter((t) => tierMap.has(t.label)).map((tier) => {
        const { factors } = tierMap.get(tier.label)!
        const styleColor = CORR_COLORS[tier.colorIdx]
        const style = { color: styleColor, opacity: 1 }

        const factorLeaves: SunNode[] = factors.map((f) => ({
          name: tFactor(f.factor),
          value: Math.max(0.5, Math.abs(f.rho) * tier.weight * 12),
          itemStyle: style,
          label: { color: styleColor },
          rho: f.rho,
          pvalue: f.pvalue,
          category: cat,
        }))

        return {
          name: tier.label,
          label: {
            color: styleColor,
            downplay: { opacity: 0.5 },
          },
          children: factorLeaves,
        }
      })

      return {
        name: tCategory(cat),
        itemStyle: { color: catColor },
        children: tierNodes,
      }
    })

  return [
    {
      name: 'FI 相关',
      itemStyle: { color: inkWash.indigo },
      children: rootChildren,
    },
  ]
}

interface FactorRadarChartProps {
  data: FactorMatrixCell[]
  className?: string
}

export function FactorRadarChart({ data, className }: FactorRadarChartProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const sunburstData = useMemo(() => buildSunburstTree(data), [data])

  const option = useMemo<echarts.EChartsCoreOption>(() => {
    const bg = inkWash.paperAlt

    return {
      backgroundColor: 'transparent',
      color: CORR_COLORS,
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const d = params.data as SunNode
          if (d.rho == null) {
            return `<div style="font-family:'Noto Serif SC',serif;font-size:11px;color:${inkWash.ink}">${params.name}</div>`
          }
          const sign = d.rho >= 0 ? '+' : ''
          return `
            <div style="font-family:'Noto Serif SC',serif;font-size:11px;color:${inkWash.ink};margin-bottom:4px">${params.name}</div>
            <div style="font-size:10px;color:${inkWash.wash}">
              ${d.category ? tCategory(d.category) + ' · ' : ''}Spearman ρ = ${sign}${d.rho.toFixed(3)}
            </div>`
        },
      },
      series: [
        {
          type: 'sunburst',
          center: ['50%', '50%'],
          radius: ['0%', '96%'],
          data: sunburstData,
          sort: (a: any, b: any) => {
            if (a.depth === 2) {
              return b.getValue() - a.getValue()
            }
            return a.dataIndex - b.dataIndex
          },
          label: {
            rotate: 'radial',
            color: bg,
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 9,
          },
          itemStyle: {
            borderColor: bg,
            borderWidth: 2,
          },
          emphasis: {
            focus: 'ancestor',
            itemStyle: {
              shadowBlur: 12,
              shadowColor: 'rgba(184,59,59,0.35)',
            },
          },
          levels: [
            {},
            {
              r0: 0,
              r: '22%',
              label: { rotate: 0, fontSize: 10, fontWeight: 600 },
            },
            {
              r0: '22%',
              r: '52%',
              label: { fontSize: 9 },
            },
            {
              r0: '54%',
              r: '68%',
              itemStyle: {
                shadowBlur: 2,
                shadowColor: CORR_COLORS[2],
                color: 'transparent',
              },
              label: {
                rotate: 'tangential',
                fontSize: 9,
                color: CORR_COLORS[0],
              },
            },
            {
              r0: '68%',
              r: '72%',
              itemStyle: {
                shadowBlur: 24,
                shadowColor: CORR_COLORS[0],
              },
              label: {
                position: 'outside',
                fontSize: 8,
                color: inkWash.ink,
                textShadowBlur: 3,
                textShadowColor: inkWash.paper,
              },
              downplay: {
                label: { opacity: 0.45 },
              },
            },
          ],
        },
      ],
    }
  }, [sunburstData])

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
    chartRef.current?.setOption(option, true)
  }, [option])

  return <div ref={ref} className={className} style={{ width: '100%', height: '100%', minHeight: 200 }} />
}

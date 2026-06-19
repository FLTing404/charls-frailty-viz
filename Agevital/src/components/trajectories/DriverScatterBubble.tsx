import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { ScatterChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { DriverDimension, DriverRecord } from '@/types/data'
import type { FocusDimension } from '@/lib/store/trajectoryStore'
import { ECHARTS_THEME, ensureInkWashTheme, frailtyColor, inkWash } from '@/lib/theme/inkWash'
import { tDriverDim, tFrailty } from '@/lib/i18n/zh'

echarts.use([ScatterChart, GridComponent, TooltipComponent, CanvasRenderer])

interface DriverScatterBubbleProps {
  records: DriverRecord[]
  mode: 'scatter' | 'bubble'
  focusDimension: FocusDimension
  className?: string
}

const FI_TIER_COLORS = {
  high: inkWash.cinnabar,   // FI ≥ 0.25 → frail
  mid: inkWash.amber,       // 0.10 < FI < 0.25 → pre-frail
  low: inkWash.bamboo,      // FI ≤ 0.10 → robust
}


export function DriverScatterBubble({
  records,
  mode,
  focusDimension,
  className,
}: DriverScatterBubbleProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const xKey = focusDimension ?? 'depression'

  const option = useMemo<echarts.EChartsCoreOption>(() => {
    if (mode === 'scatter') {
      const data = records.map((r) => ({
        value: [r[xKey], r.fi],
        frailty_cat: r.frailty_cat,
        id: r.id,
        itemStyle: {
          color: frailtyColor[r.frailty_cat as keyof typeof frailtyColor] ?? inkWash.stone,
          opacity: 0.55,
        },
      }))
      return {
        grid: { top: 28, left: 52, right: 16, bottom: 40 },
        tooltip: {
          formatter: (p: any) => {
            const d = p.data
            return `<div style="font-family:'Noto Serif SC',serif;font-size:11px">${tDriverDim(xKey)} ${Number(d.value[0]).toFixed(2)} · FI ${Number(d.value[1]).toFixed(3)}</div>
              <div style="font-size:10px;color:${inkWash.wash};margin-top:4px">${tFrailty(d.frailty_cat)}</div>`
          },
        },
        xAxis: {
          name: tDriverDim(xKey),
          nameTextStyle: { color: inkWash.wash, fontSize: 10 },
          axisLabel: { color: inkWash.stone, fontSize: 10 },
          splitLine: { show: false },
        },
        yAxis: {
          name: 'FI',
          nameTextStyle: { color: inkWash.wash, fontSize: 10 },
          axisLabel: { color: inkWash.stone, fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(28,28,28,0.06)', type: 'dashed' } },
        },
        series: [
          {
            type: 'scatter',
            symbolSize: 6,
            data,
          },
        ],
      }
    }

    // ── Bubble mode ──
    // Fallback axis pairs: try each until we find one with data
    const getFiTier = (fi: number) =>
      fi >= 0.25 ? 'high' : fi <= 0.10 ? 'low' : 'mid'

    // [xKey, yKey, xLabel, yLabel]
    // NOTE: bubble size = FI, so neither axis should be FI
    type AxisCandidate = [DriverDimension, DriverDimension, string, string]
    const axisCandidates: AxisCandidate[] = [
      ['depression', 'ace', '抑郁得分', 'ACE'],
      ['sleep', 'ace', '睡眠得分', 'ACE'],
      ['social', 'ace', '社交得分', 'ACE'],
      ['ses', 'ace', 'SES', 'ACE'],
      ['ace', 'depression', 'ACE', '抑郁得分'],
      ['sleep', 'depression', '睡眠得分', '抑郁得分'],
      ['social', 'depression', '社交得分', '抑郁得分'],
      ['ses', 'depression', 'SES', '抑郁得分'],
    ]

    // If focusDimension is set and isn't FI, prepend candidates using it
    if (focusDimension) {
      const fl = tDriverDim(focusDimension)
      axisCandidates.unshift(
        [focusDimension, 'ace', fl, 'ACE'],
        [focusDimension, 'depression', fl, '抑郁得分'],
      )
    }

    let bubbleData: any[] = []
    let activeXLabel = axisCandidates[0][2]
    let activeYLabel = axisCandidates[0][3]

    for (const [xk, yk, xl, yl] of axisCandidates) {
      const candidates = records
        .filter((r) => {
          const vx = Number(r[xk])
          const vy = Number(r[yk])
          const fi = Number(r.fi)
          return Number.isFinite(vx) && vx >= 0.5
            && Number.isFinite(vy) && vy >= 0.5
            && Number.isFinite(fi) && fi >= 0.005
        })
        .map((r) => {
          const tier = getFiTier(r.fi)
          return {
            value: [r[xk], r[yk], r.fi],
            fiTier: tier,
            frailty_cat: r.frailty_cat,
            itemStyle: { color: FI_TIER_COLORS[tier], opacity: 0.6 },
          }
        })
      if (candidates.length > 0) {
        bubbleData = candidates
        activeXLabel = xl
        activeYLabel = yl
        break
      }
    }

    // Auto-adapt Y range: min-5, max+5
    let activeYMin = 0
    let activeYMax = 100
    let maxFi = 0.001
    if (bubbleData.length > 0) {
      let yMin = Infinity, yMax = -Infinity
      for (let i = 0; i < bubbleData.length; i++) {
        const val = bubbleData[i].value
        if (val[1] < yMin) yMin = val[1]
        if (val[1] > yMax) yMax = val[1]
        if (val[2] > maxFi) maxFi = val[2]
      }
      activeYMin = Math.max(0, Math.floor(yMin) - 1)
      activeYMax = Math.ceil(yMax) + 1
    }

    return {
      grid: { top: 28, left: 56, right: 16, bottom: 44 },
      tooltip: {
        formatter: (p: any) => {
          const [x, y, fi] = p.data.value
          return `<div style="font-family:'Noto Serif SC',serif;font-size:11px">${activeXLabel} ${Number(x).toFixed(2)} · ${activeYLabel} ${Number(y).toFixed(2)}</div>
            <div style="font-size:10px;color:${inkWash.wash};margin-top:4px">FI ${Number(fi).toFixed(3)} · ${tFrailty(p.data.frailty_cat)}</div>`
        },
      },
      xAxis: {
        name: activeXLabel,
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: inkWash.ink, fontSize: 11, fontWeight: 'bold' },
        axisLabel: { color: inkWash.stone, fontSize: 10 },
      },
      yAxis: {
        name: activeYLabel,
        nameLocation: 'middle',
        nameGap: 40,
        nameTextStyle: { color: inkWash.ink, fontSize: 11, fontWeight: 'bold' },
        axisLabel: { color: inkWash.stone, fontSize: 10 },
        ...(activeYMin != null ? { min: activeYMin } : {}),
        ...(activeYMax != null ? { max: activeYMax } : {}),
        splitLine: { lineStyle: { color: 'rgba(28,28,28,0.06)', type: 'dashed' } },
      },
      series: [
        {
          type: 'scatter',
          data: bubbleData,
          symbolSize: (val: number[]) => 4 + (val[2] / maxFi) * 18,
        },
      ],
      graphic: [
        {
          type: 'group',
          right: 12,
          bottom: 4,
          children: [
            { type: 'text', right: 60, bottom: 38, style: { text: '气泡大小 = FI', fill: inkWash.stone, font: '9px "Noto Serif SC", serif' } },
            { type: 'circle', shape: { cx: 0, cy: 0, r: 4 }, right: 76, bottom: 14, style: { fill: 'rgba(28,28,28,0.35)' } },
            { type: 'text', right: 64, bottom: 8, style: { text: '≤0.10', fill: inkWash.stone, font: '8px sans-serif' } },
            { type: 'circle', shape: { cx: 0, cy: 0, r: 10 }, right: 40, bottom: 8, style: { fill: 'rgba(28,28,28,0.35)' } },
            { type: 'text', right: 28, bottom: 2, style: { text: '~0.18', fill: inkWash.stone, font: '8px sans-serif' } },
            { type: 'circle', shape: { cx: 0, cy: 0, r: 16 }, right: 4, bottom: 2, style: { fill: 'rgba(28,28,28,0.35)' } },
            { type: 'text', right: 0, bottom: -6, style: { text: '≥0.25', fill: inkWash.stone, font: '8px sans-serif' } },
          ],
        },
      ],
    }
  }, [records, mode, xKey, focusDimension])

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
    if (!chartRef.current) return
    chartRef.current.setOption(option, { notMerge: true, lazyUpdate: false })
  }, [option])

  return <div ref={ref} className={className} style={{ width: '100%', height: '100%', minHeight: 'clamp(150px, 18vh, 220px)' }} />
}

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

    // [xKey, yKey, xLabel, yLabel, yMin, yMax]
    // NOTE: bubble size = FI, so neither axis should be FI
    type AxisCandidate = [DriverDimension, DriverDimension, string, string, number | undefined, number | undefined]
    const axisCandidates: AxisCandidate[] = [
      ['depression', 'ace', '抑郁得分', 'ACE', 0, 100],
      ['sleep', 'ace', '睡眠得分', 'ACE', 0, 100],
      ['social', 'ace', '社交得分', 'ACE', 0, 100],
      ['ses', 'ace', 'SES', 'ACE', 0, 100],
      ['ace', 'depression', 'ACE', '抑郁得分', undefined, undefined],
      ['sleep', 'depression', '睡眠得分', '抑郁得分', undefined, undefined],
      ['social', 'depression', '社交得分', '抑郁得分', undefined, undefined],
      ['ses', 'depression', 'SES', '抑郁得分', undefined, undefined],
    ]

    // If focusDimension is set and isn't FI, prepend candidates using it
    if (focusDimension && focusDimension !== 'fi') {
      const fl = tDriverDim(focusDimension)
      axisCandidates.unshift(
        [focusDimension, 'ace', fl, 'ACE', 0, 100],
        [focusDimension, 'depression', fl, '抑郁得分', undefined, undefined],
      )
    }

    let bubbleData: any[] = []
    let activeXLabel = axisCandidates[0][2]
    let activeYLabel = axisCandidates[0][3]
    let activeYMin: number | undefined = axisCandidates[0][4]
    let activeYMax: number | undefined = axisCandidates[0][5]

    for (const [xk, yk, xl, yl, yMin, yMax] of axisCandidates) {
      const candidates = records
        .filter((r) => !isNaN(r[xk]) && !isNaN(r[yk]))
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
        activeYMin = yMin
        activeYMax = yMax
        break
      }
    }

    // Avoid Math.max(...hugeArray) which overflows the call stack
    let maxFi = 0.001
    for (let i = 0; i < bubbleData.length; i++) {
      const fi = bubbleData[i].value[2]
      if (fi > maxFi) maxFi = fi
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

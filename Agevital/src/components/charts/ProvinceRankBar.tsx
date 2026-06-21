import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ProvinceDatum, DeficitProvincePayload } from '@/types/data'
import { ECHARTS_THEME, ensureInkWashTheme, inkWash } from '@/lib/theme/inkWash'
import { cn } from '@/lib/utils'
import { tProvince } from '@/lib/i18n/zh'

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

interface ProvinceRankBarProps {
  provinces: ProvinceDatum[]
  deficitProvince: DeficitProvincePayload | null
  selectedDeficit: string | null
  className?: string
}

/** Gradient: cinnabar (t=1, high) → amber (t=0.5, mid) → bamboo (t=0, low) */
function rankColor(t: number): string {
  const r1 = 92, g1 = 122, b1 = 107  // bamboo
  const r2 = 196, g2 = 163, b2 = 90  // amber
  const r3 = 184, g3 = 59, b3 = 59   // cinnabar

  let r: number, g: number, b: number
  if (t <= 0.5) {
    const s = t / 0.5
    r = r1 + (r2 - r1) * s
    g = g1 + (g2 - g1) * s
    b = b1 + (b2 - b1) * s
  } else {
    const s = (t - 0.5) / 0.5
    r = r2 + (r3 - r2) * s
    g = g2 + (g3 - g2) * s
    b = b2 + (b3 - b2) * s
  }
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},0.85)`
}

export function ProvinceRankBar({
  provinces,
  deficitProvince,
  selectedDeficit,
  className,
}: ProvinceRankBarProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const title = useMemo(() => {
    if (selectedDeficit && deficitProvince) {
      const label = deficitProvince.labels[selectedDeficit] ?? selectedDeficit
      return `${label}患病率`
    }
    return '各省衰弱率'
  }, [selectedDeficit, deficitProvince])

  const barData = useMemo(() => {
    if (selectedDeficit && deficitProvince) {
      const items: { name: string; value: number }[] = []
      for (const [provinceEn, deficitMap] of Object.entries(deficitProvince.data)) {
        const rate = deficitMap[selectedDeficit]
        if (rate != null) {
          items.push({ name: tProvince(provinceEn), value: rate })
        }
      }
      items.sort((a, b) => b.value - a.value)
      return items
    }

    const items = provinces
      .map((p) => ({
        name: tProvince(p.province),
        value: p.frailRate,
      }))
      .sort((a, b) => b.value - a.value)
    return items
  }, [provinces, deficitProvince, selectedDeficit])

  const option = useMemo<echarts.EChartsCoreOption>(() => {
    const names = barData.map((d) => d.name)
    const values = barData.map((d) => d.value)
    const maxVal = values.length ? Math.max(...values) : 0.5
    const len = Math.max(values.length - 1, 1)

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 1600,
      animationEasing: 'cubicOut',
      animationDelay: (idx: number) => idx * 60,
      animationDurationUpdate: 900,
      animationEasingUpdate: 'cubicInOut',
      animationDelayUpdate: (idx: number) => idx * 35,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p: any) => {
          const d = Array.isArray(p) ? p[0] : p
          return `<div style="font-family:'Noto Serif SC',serif;font-size:11px">${d.name}</div>
            <div style="font-size:10px;color:${inkWash.wash};margin-top:2px">${title} ${(Number(d.value) * 100).toFixed(1)}%</div>`
        },
      },
      grid: {
        left: 4,
        right: 44,
        top: 8,
        bottom: 4,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: Math.ceil(maxVal * 1.15 * 100) / 100,
        axisLabel: {
          color: inkWash.stone,
          fontSize: 8,
          formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
        },
        axisLine: { lineStyle: { color: inkWash.mist } },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(28,28,28,0.05)', type: 'dashed' } },
        position: 'top',
      },
      yAxis: {
        type: 'category',
        data: names,
        inverse: true,
        axisLabel: {
          color: inkWash.ink,
          fontSize: 11,
          fontFamily: '"Noto Serif SC", serif',
          overflow: 'truncate',
          width: 58,
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: values.map((v, i) => ({
            value: v,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: rankColor((len - i) / len) },
                { offset: 1, color: rankColor((len - i) / len).replace('0.85', '0.3') },
              ]),
              borderRadius: [0, 2, 2, 0],
            },
          })),
          barWidth: 13,
          emphasis: {
            itemStyle: { opacity: 1 },
            label: {
              show: true,
              position: 'right',
              color: inkWash.ink,
              fontSize: 9,
              fontFamily: '"Noto Serif SC", serif',
              formatter: (p: any) => `${(Number(p.value) * 100).toFixed(1)}%`,
            },
          },
        },
      ],
    }
  }, [barData, title])

  const seededRef = useRef(false)

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, ECHARTS_THEME)
    chartRef.current = chart
    seededRef.current = false

    // Seed zero values so bars animate from 0 → real on first render
    chart.setOption(
      {
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: barData.map((d) => d.name), inverse: true },
        series: [{ type: 'bar', data: barData.map(() => 0) }],
      },
      { notMerge: true },
    )

    const timer = setTimeout(() => {
      if (!chartRef.current) return
      seededRef.current = true
      chartRef.current.setOption(option, { notMerge: true })
    }, 150)

    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)
    return () => {
      clearTimeout(timer)
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
    // Only on mount (key change triggers remount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update chart on data change (year slider etc.)
  useEffect(() => {
    if (!chartRef.current || !seededRef.current) return
    chartRef.current.setOption(option, { notMerge: true })
  }, [option])

  return (
    <div className={cn(className)} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="pointer-events-none absolute left-1 top-0 z-10 font-serif text-[9px] tracking-widest text-ink-stone">
        {title}排名
      </div>
      <div ref={ref} style={{ width: '100%', height: '100%', paddingTop: 16 }} />
    </div>
  )
}

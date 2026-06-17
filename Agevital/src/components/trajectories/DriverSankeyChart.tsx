import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import * as echarts from 'echarts/core'
import { SankeyChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { sankey as d3Sankey } from 'd3-sankey'
import type { DriverSankeyPayload } from '@/types/data'
import { ECHARTS_THEME, ensureInkWashTheme, inkWash } from '@/lib/theme/inkWash'
import { cn, formatNumber, formatPercent } from '@/lib/utils'

echarts.use([SankeyChart, TooltipComponent, CanvasRenderer])

const STATE_COLOR: Record<string, string> = {
  robust: inkWash.bamboo,      // #5C7A6B — muted green, matches sunburst
  'pre-frail': inkWash.amber,  // #C4A35A — muted amber, matches sunburst
  frail: inkWash.cinnabar,     // #B83B3B — muted red, matches sunburst
  lost: inkWash.wash,          // #8A8580 — grey
}

const STATE_LABEL: Record<string, string> = {
  robust: '健壮',
  'pre-frail': '衰弱前期',
  frail: '衰弱',
  lost: '失访/死亡',
}

interface TSNode {
  id: string
  layer: number
  state: string
  label: string
  wave?: number
  count: number
  x0?: number; x1?: number; y0?: number; y1?: number
}
interface TSLink {
  source: TSNode | string
  target: TSNode | string
  value: number
  prob: number
  width?: number; y0?: number; y1?: number
}

interface DriverSankeyChartProps {
  data: DriverSankeyPayload | null
  className?: string
}

function ribbonPath(link: TSLink): string {
  const src = link.source as TSNode
  const tgt = link.target as TSNode
  const x0 = src.x1 ?? 0; const x1 = tgt.x0 ?? 0
  const w = link.width ?? 1
  const y0t = (link.y0 ?? 0) - w / 2; const y0b = (link.y0 ?? 0) + w / 2
  const y1t = (link.y1 ?? 0) - w / 2; const y1b = (link.y1 ?? 0) + w / 2
  const mx = (x0 + x1) / 2
  return `M${x0},${y0t} C${mx},${y0t} ${mx},${y1t} ${x1},${y1t} L${x1},${y1b} C${mx},${y1b} ${mx},${y0b} ${x0},${y0b} Z`
}

export function DriverSankeyChart({ data, className }: DriverSankeyChartProps) {
  // ── Legacy mode: ACE → frailty (no meta) ──
  if (data && !data.meta) return <LegacyDriverSankey data={data} className={className} />

  // ── Temporal mode: 4-wave frailty transitions ──
  return <TemporalDriverSankey data={data} className={className} />
}

/** Old ECharts-based ACE→frailty sankey for backward compat */
function LegacyDriverSankey({ data, className }: DriverSankeyChartProps) {
  ensureInkWashTheme()
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const option = useMemo<echarts.EChartsCoreOption | null>(() => {
    if (!data?.nodes.length) return null
    const nodes = data.nodes.map((n) => ({ name: n.id, label: n.label, count: n.count }))
    const links = data.links.map((l) => ({ source: l.source, target: l.target, value: l.value }))
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => {
          if (p.dataType === 'edge') {
            return `<div style="font-family:'Noto Serif SC',serif;font-size:11px">${p.data.source} → ${p.data.target}</div>
              <div style="font-size:10px;color:${inkWash.wash};margin-top:4px">人数 ${p.data.value}</div>`
          }
          const node = data.nodes.find((n) => n.id === p.name)
          return `<div style="font-family:'Noto Serif SC',serif;font-size:11px">${node?.label ?? p.name}</div>
            <div style="font-size:10px;color:${inkWash.wash};margin-top:4px">n = ${node?.count ?? '—'}</div>`
        },
      },
      series: [{
        type: 'sankey', layout: 'none', emphasis: { focus: 'adjacency' },
        nodeAlign: 'left', nodeGap: 10, nodeWidth: 14,
        left: 12, right: 120, top: 12, bottom: 12,
        data: nodes.map((n) => {
          const meta = data.nodes.find((x) => x.id === n.name)
          return {
            name: n.name,
            label: { formatter: () => meta?.label ?? n.name },
            itemStyle: {
              color: meta?.layerType === 'outcome'
                ? (STATE_COLOR[meta.state] ?? inkWash.cinnabar)
                : meta?.state === 'high' ? inkWash.cinnabarDeep
                : meta?.state === 'low' ? inkWash.bamboo : inkWash.indigo,
            },
          }
        }),
        links,
        lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.35 },
        label: { color: inkWash.ink, fontFamily: '"Noto Serif SC", serif', fontSize: 9 },
      }],
    }
  }, [data])

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, ECHARTS_THEME)
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)
    return () => { ro.disconnect(); chart.dispose() }
  }, [])

  useEffect(() => {
    if (!chartRef.current) return
    chartRef.current.setOption(option ?? {}, { notMerge: true, lazyUpdate: false })
  }, [option])

  if (!data?.nodes.length) {
    return <div className={cn('flex items-center justify-center text-[10px] text-ink-stone', className)}>暂无桑基数据</div>
  }
  return <div ref={ref} className={className} style={{ width: '100%', height: '100%', minHeight: 220 }} />
}

/** New D3-based multi-wave temporal sankey */
function TemporalDriverSankey({ data, className }: DriverSankeyChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  // Start with 0 dimensions — SVG hidden until measured from real container
  const [{ w, h }, setSize] = useState({ w: 0, h: 0 })
  const [hover, setHover] = useState<{ x: number; y: number; html: string } | null>(null)
  const uid = useMemo(() => `ds-${Math.random().toString(36).slice(2, 8)}`, [])

  // Aggressive measurement on mount: sync + RAF chain + ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let lastW = 0
    let lastH = 0
    const measure = () => {
      if (!containerRef.current) return
      const cw = containerRef.current.clientWidth
      const ch = containerRef.current.clientHeight
      if (cw > 0 && ch > 0 && (cw !== lastW || ch !== lastH)) {
        lastW = cw
        lastH = ch
        setSize({ w: Math.max(420, cw), h: Math.max(300, ch) })
      }
    }

    // Sync measure (effect runs after browser paint — dom should be laid out)
    measure()
    // RAF chain: remeasure after 1st and 2nd animation frame
    // Flex layout may need extra frames to fully resolve nested sizes
    const r1 = requestAnimationFrame(() => {
      measure()
      requestAnimationFrame(measure)
    })

    const obs = new ResizeObserver(() => measure())
    obs.observe(el)

    return () => {
      cancelAnimationFrame(r1)
      obs.disconnect()
    }
  }, [])

  const layout = useMemo(() => {
    if (!data?.nodes.length) return null
    const activeNodes = data.nodes
      .filter((n) => n.count > 0)
      .map((n) => ({ ...n })) as TSNode[]
    const activeIds = new Set(activeNodes.map((n) => n.id))
    const activeLinks = data.links
      .filter((l) => activeIds.has(l.source) && activeIds.has(l.target) && l.value > 0)
      .map((l) => ({ ...l })) as TSLink[]

    if (!activeNodes.length || !activeLinks.length) return null

    const layers = Array.from(new Set(activeNodes.map((n) => n.layer))).sort()
    const layerIdx = new Map(layers.map((l, i) => [l, i]))
    const waveLabels = data.meta
      ? [data.meta.startWave, data.meta.midWave,
         Math.round((data.meta.midWave + data.meta.endWave) / 2),
         data.meta.endWave]
      : [2011, 2013, 2015, 2018]

    const stateOrder = { robust: 0, 'pre-frail': 1, frail: 2, lost: 3 }

    try {
      const gen = d3Sankey<TSNode, TSLink>()
        .nodeId((d) => d.id)
        .nodeWidth(18)
        .nodePadding(6)
        .nodeSort((a, b) => (stateOrder[a.state as keyof typeof stateOrder] ?? 0) -
                          (stateOrder[b.state as keyof typeof stateOrder] ?? 0))
        .nodeAlign((node) => layerIdx.get(node.layer) ?? 0)
        .extent([[64, 48], [w - 24, h - 20]])

      const graph = gen({ nodes: activeNodes, links: activeLinks })
      return { nodes: graph.nodes as TSNode[], links: graph.links as TSLink[], layers, waveLabels }
    } catch {
      return null
    }
  }, [data, w, h])

  // Always render container so ResizeObserver can attach
  const showEmpty = !data?.nodes.length || !layout

  return (
    <div ref={containerRef} className={cn('relative h-full min-h-[240px] w-full', className)}>
      {showEmpty ? (
        <div className="flex h-full items-center justify-center text-[10px] text-ink-stone">
          暂无桑基数据
        </div>
      ) : (
        <SankeySVG
          layout={layout!}
          w={w}
          h={h}
          uid={uid}
          hover={hover}
          setHover={setHover}
        />
      )}
    </div>
  )
}

/** Renders the D3 sankey SVG — separated so TS can narrow types */
function SankeySVG({
  layout,
  w,
  h,
  uid,
  hover,
  setHover,
}: {
  layout: { nodes: TSNode[]; links: TSLink[]; layers: number[]; waveLabels: number[] }
  w: number
  h: number
  uid: string
  hover: { x: number; y: number; html: string } | null
  setHover: (v: { x: number; y: number; html: string } | null) => void
}) {
  const { nodes, links, waveLabels } = layout
  const layerXs = [...new Set(nodes.map((n) => n.layer))]
    .sort()
    .map((l) => {
      const layerNodes = nodes.filter((n) => n.layer === l)
      return [l, ((layerNodes[0]?.x0 ?? 0) + (layerNodes[0]?.x1 ?? 0)) / 2] as const
    })

  return (
    <>
      <svg width={w} height={h} className="block">
        <defs>
          {links.map((link, i) => {
            const src = link.source as TSNode
            const tgt = link.target as TSNode
            const c0 = STATE_COLOR[src.state] ?? '#888'
            const c1 = STATE_COLOR[tgt.state] ?? '#888'
            return (
              <linearGradient key={`g-${i}`} id={`${uid}-lg-${i}`}
                gradientUnits="userSpaceOnUse"
                x1={(src.x1 ?? 0).toString()} y1={(link.y0 ?? 0).toString()}
                x2={(tgt.x0 ?? 0).toString()} y2={(link.y1 ?? 0).toString()}
              >
                <stop offset="0%" stopColor={c0} stopOpacity={0.72} />
                <stop offset="55%" stopColor={d3.interpolateRgb(c0, c1)(0.5)} stopOpacity={0.65} />
                <stop offset="100%" stopColor={c1} stopOpacity={0.78} />
              </linearGradient>
            )
          })}
        </defs>

        <rect x={0} y={0} width={w} height={h} fill={inkWash.paperAlt} fillOpacity={0.2} />

        {/* Layer headers */}
        {layerXs.map(([layer, x]) => (
          <g key={layer}>
            <text x={x} y={18} textAnchor="middle" fill={inkWash.ink}
              style={{ fontFamily: '"Noto Serif SC", serif', fontSize: 11, fontWeight: 600 }}>
              {waveLabels[layer] ?? layer}
            </text>
            <text x={x} y={30} textAnchor="middle" fill={inkWash.wash}
              style={{ fontSize: 8, fontFamily: '"Noto Serif SC", serif' }}>
              第 {layer + 1} 波
            </text>
            <line x1={x} x2={x} y1={36} y2={h - 10}
              stroke={inkWash.ink} strokeOpacity={0.05} strokeDasharray="3 5" />
          </g>
        ))}

        {/* Ribbons */}
        <g style={{ mixBlendMode: 'multiply' }}>
          {links.map((link, i) => {
            const d = ribbonPath(link)
            return (
              <path key={`r-${i}`} d={d} fill={`url(#${uid}-lg-${i})`} fillOpacity={0.65}
                onMouseMove={(e) => {
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                  const src = link.source as TSNode
                  const tgt = link.target as TSNode
                  setHover({
                    x: e.clientX - rect.left + 12,
                    y: e.clientY - rect.top + 12,
                    html: `<div style="font-family:'Noto Serif SC',serif;font-size:11px;font-weight:600">
                      ${src.label} → ${tgt.label}
                    </div>
                    <div style="font-size:10px;color:${inkWash.wash};margin-top:4px">
                      ${formatNumber(link.value)} 人 · ${formatPercent(link.prob)}
                    </div>`,
                  })
                }}
                onMouseLeave={() => setHover(null)}
                style={{ transition: 'fill-opacity 200ms' }}
              />
            )
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node) => {
            const fill = STATE_COLOR[node.state] ?? '#888'
            const nw = (node.x1 ?? 0) - (node.x0 ?? 0)
            const nh = Math.max(3, (node.y1 ?? 0) - (node.y0 ?? 0))
            return (
              <g key={node.id} transform={`translate(${node.x0},${node.y0})`}
                onMouseMove={(e) => {
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                  setHover({
                    x: e.clientX - rect.left + 12,
                    y: e.clientY - rect.top + 12,
                    html: `<div style="font-family:'Noto Serif SC',serif;font-size:11px;font-weight:600">
                      ${node.label}${node.wave ? ` · ${node.wave}` : ''}
                    </div>
                    <div style="font-size:10px;color:${inkWash.wash};margin-top:4px">
                      ${formatNumber(node.count)} 人
                    </div>`,
                  })
                }}
                onMouseLeave={() => setHover(null)}
              >
                <rect width={nw} height={nh} rx={2} fill={fill} fillOpacity={0.92}
                  stroke={inkWash.ink} strokeOpacity={0.3} strokeWidth={0.5} />
                {/* Node labels removed — see legend below for state→color mapping */}
              </g>
            )
          })}
        </g>

        {/* Legend */}
        <g transform={`translate(8, ${h - 80})`}>
          {Object.entries(STATE_COLOR).map(([state, color], i) => (
            <g key={state} transform={`translate(0, ${i * 16})`}>
              <rect width={8} height={8} rx={1} fill={color} />
              <text x={12} y={7} fill={inkWash.stone} style={{ fontSize: 8 }}>
                {STATE_LABEL[state] ?? state}
              </text>
            </g>
          ))}
        </g>

        {/* Flow direction hint */}
        <g transform={`translate(${w - 72}, ${h - 12})`} opacity={0.45}>
          <text fill={inkWash.wash} style={{ fontSize: 8, fontFamily: '"Noto Serif SC", serif' }}>
            追踪流转 →
          </text>
        </g>
      </svg>

      {hover && (
        <div className="pointer-events-none absolute z-20 max-w-[260px] border border-ink/40 bg-paper-alt p-2 shadow-ink"
          style={{ left: hover.x, top: hover.y }}
          dangerouslySetInnerHTML={{ __html: hover.html }} />
      )}
    </>
  )
}

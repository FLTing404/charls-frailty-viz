import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { SankeyData } from '@/types/data'
import { inkWash } from '@/lib/theme/inkWash'
import { LAYER_META } from '@/lib/data/sankey'
import {
  deteriorationScore,
  FACTOR_COLOR,
  EVOLUTION_COLOR,
  layoutTemporalSankey,
  nodeColor,
  ribbonPath,
  ribbonCenterLine,
  SANKEY_STATE_COLOR,
  spawnParticles,
  type FlowParticle,
  type TSLink,
  type TSNode,
} from '@/lib/charts/temporalSankey'
import { cn, formatNumber, formatPercent } from '@/lib/utils'

interface SankeyDiagramProps {
  data: SankeyData
  highlightAnomalies: boolean
  onNodeClick?: (node: { wave: number; state: string }) => void
  className?: string
}

export function SankeyDiagram({
  data,
  highlightAnomalies,
  onNodeClick,
  className,
}: SankeyDiagramProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pathRefs = useRef<(SVGPathElement | null)[]>([])
  const particlesRef = useRef<FlowParticle[]>([])
  const rafRef = useRef<number>(0)
  const [{ width, height }, setSize] = useState({ width: 760, height: 460 })
  const [hover, setHover] = useState<{ x: number; y: number; html: string } | null>(null)
  const [hoverLink, setHoverLink] = useState<number | null>(null)
  const [, tick] = useState(0)
  const uid = useMemo(() => `ts-${Math.random().toString(36).slice(2, 8)}`, [])

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect
        setSize({ width: Math.max(420, cr.width), height: Math.max(360, cr.height) })
      }
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const layout = useMemo(
    () => layoutTemporalSankey(data, width, height),
    [data, width, height],
  )

  const links = layout?.links ?? []
  const nodes = layout?.nodes ?? []
  const layers = layout?.layers ?? [0, 1, 2, 3]

  useEffect(() => {
    if (!links.length) return
    particlesRef.current = spawnParticles(links, 100)
    pathRefs.current = new Array(links.length).fill(null)

    const animate = () => {
      for (const p of particlesRef.current) {
        p.t += p.speed
        if (p.t > 1) p.t -= 1
      }
      tick((n) => n + 1)
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [links])

  const layerXs = useMemo(() => {
    const map = new Map<number, number>()
    for (const n of nodes) {
      map.set(n.layer, ((n.x0 ?? 0) + (n.x1 ?? 0)) / 2)
    }
    return layers.map((l) => [l, map.get(l) ?? 0] as const)
  }, [nodes, layers])

  const layerSubtitles = useMemo(() => {
    const meta = data.meta
    if (!meta) return LAYER_META
    return LAYER_META.map((m) => {
      if (m.layer === 1) return { ...m, subtitle: `${meta.startWave} 基线衰弱` }
      if (m.layer === 2) return { ...m, subtitle: `${meta.startWave}→${meta.midWave} 流转` }
      if (m.layer === 3) return { ...m, subtitle: `${meta.endWave} 最终转归` }
      return m
    })
  }, [data.meta])

  const legendGroups = useMemo(
    () => [
      { title: '风险因子', items: Object.entries(FACTOR_COLOR).map(([k, c]) => ({ k, c })) },
      { title: '演变', items: Object.entries(EVOLUTION_COLOR).map(([k, c]) => ({ k, c })) },
      { title: '衰弱状态', items: Object.entries(SANKEY_STATE_COLOR).filter(([k]) => k !== 'death').map(([k, c]) => ({ k, c })) },
    ],
    [],
  )

  const labelForLegend = (key: string) => {
    const node = data.nodes.find((n) => n.state === key)
    return node?.label ?? key
  }

  if (!layout) {
    return (
      <div ref={containerRef} className={cn('relative h-[460px] w-full', className)}>
        <div className="flex h-full items-center justify-center text-[11px] tracking-wide text-ink-wash">
          当前筛选条件下无匹配的异构流转路径。
        </div>
      </div>
    )
  }

  const renderLinkTooltip = (link: TSLink, i: number, e: React.MouseEvent<SVGPathElement>) => {
    const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    const src = link.source as TSNode
    const tgt = link.target as TSNode
    const isJump = link.anomaly === 'jump'
    const isRecovery = link.anomaly === 'recovery'
    setHoverLink(i)
    setHover({
      x: e.clientX - rect.left + 12,
      y: e.clientY - rect.top + 12,
      html: `
        <div class="font-serif text-[11px] tracking-wide text-ink">
          ${src.label} → ${tgt.label}
        </div>
        <div class="mt-1 text-[10px] text-ink-wash">
          ${formatNumber(link.value)} 人 · 条件概率 ${formatPercent(link.prob)}
          ${isJump ? '· <span style="color:#D04FA8">恶化路径</span>' : ''}
          ${isRecovery ? '· <span style="color:#2EC4C4">改善路径</span>' : ''}
        </div>`,
    })
  }

  return (
    <div ref={containerRef} className={cn('relative h-full min-h-[240px] w-full', className)}>
      <svg width={width} height={height} className="block">
        <defs>
          <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {links.map((link, i) => {
            const src = link.source as TSNode
            const tgt = link.target as TSNode
            const c0 = nodeColor(src)
            const c1 = nodeColor(tgt)
            return (
              <linearGradient
                key={`g-${i}`}
                id={`${uid}-lg-${i}`}
                gradientUnits="userSpaceOnUse"
                x1={(src.x1 ?? 0).toString()}
                y1={(link.y0 ?? 0).toString()}
                x2={(tgt.x0 ?? 0).toString()}
                y2={(link.y1 ?? 0).toString()}
              >
                <stop offset="0%" stopColor={c0} stopOpacity={0.72} />
                <stop offset="55%" stopColor={d3.interpolateRgb(c0, c1)(0.5)} stopOpacity={0.65} />
                <stop offset="100%" stopColor={c1} stopOpacity={0.78} />
              </linearGradient>
            )
          })}
        </defs>

        <rect x={0} y={0} width={width} height={height} fill={inkWash.paperAlt} fillOpacity={0.25} />

        {layerXs.map(([layer, x]) => {
          const meta = layerSubtitles.find((m) => m.layer === layer)
          return (
            <g key={layer}>
              <text
                x={x}
                y={22}
                textAnchor="middle"
                fill={inkWash.ink}
                style={{ fontFamily: '"Noto Serif SC", serif', fontSize: 12, fontWeight: 600 }}
              >
                {meta?.title}
              </text>
              <text
                x={x}
                y={36}
                textAnchor="middle"
                fill={inkWash.wash}
                style={{ fontSize: 8, fontFamily: '"Noto Serif SC", serif' }}
              >
                {meta?.subtitle}
              </text>
              <line
                x1={x}
                x2={x}
                y1={44}
                y2={height - 16}
                stroke={inkWash.ink}
                strokeOpacity={0.06}
                strokeDasharray="3 5"
              />
            </g>
          )
        })}

        <g style={{ mixBlendMode: 'multiply' }}>
          {links.map((link, i) => {
            const d = ribbonPath(link)
            const isJump = link.anomaly === 'jump'
            const isRecovery = link.anomaly === 'recovery'
            const isAnomaly = isJump || isRecovery
            const dim =
              (highlightAnomalies && !isAnomaly) ||
              (hoverLink !== null && hoverLink !== i)
            const src = link.source as TSNode
            const tgt = link.target as TSNode
            const worsen = deteriorationScore(src, tgt) > 0
            return (
              <path
                key={`ribbon-${i}`}
                d={d}
                fill={`url(#${uid}-lg-${i})`}
                fillOpacity={dim ? 0.12 : worsen ? 0.82 : 0.68}
                stroke={isJump ? '#D04FA8' : isRecovery ? '#2EC4C4' : 'none'}
                strokeWidth={isAnomaly && highlightAnomalies ? 0.6 : 0}
                strokeOpacity={0.5}
                style={{ transition: 'fill-opacity 280ms' }}
                onMouseMove={(e) => renderLinkTooltip(link, i, e)}
                onMouseLeave={() => {
                  setHover(null)
                  setHoverLink(null)
                }}
              />
            )
          })}
        </g>

        <g visibility="hidden" aria-hidden pointerEvents="none">
          {links.map((link, i) => (
            <path
              key={`path-guide-${i}`}
              ref={(el) => {
                pathRefs.current[i] = el
              }}
              d={ribbonCenterLine(link)}
            />
          ))}
        </g>

        <g pointerEvents="none" filter={`url(#${uid}-glow)`}>
          {particlesRef.current.map((p, pi) => {
            const link = links[p.linkIdx]
            if (!link) return null
            const pathEl = pathRefs.current[p.linkIdx]
            if (!pathEl) return null
            const len = pathEl.getTotalLength()
            if (len <= 0) return null
            const pt = pathEl.getPointAtLength(p.t * len)
            const src = link.source as TSNode
            const tgt = link.target as TSNode
            const tColor = d3.interpolateRgb(nodeColor(src), nodeColor(tgt))(p.t)
            return (
              <circle
                key={`p-${pi}`}
                cx={pt.x}
                cy={pt.y}
                r={p.r}
                fill={tColor}
                fillOpacity={hoverLink === null || hoverLink === p.linkIdx ? p.opacity : 0.06}
              />
            )
          })}
        </g>

        <g>
          {nodes.map((node) => {
            const fill = nodeColor(node)
            const nw = (node.x1 ?? 0) - (node.x0 ?? 0)
            const nh = Math.max(3, (node.y1 ?? 0) - (node.y0 ?? 0))
            const interactive =
              (node.layerType === 'baseline' || node.layerType === 'outcome') &&
              node.state !== 'lost' &&
              node.count > 0 &&
              node.wave != null
            const isFirstCol = node.layer === 0
            const isLastCol = node.layer === 3
            return (
              <g
                key={node.id}
                transform={`translate(${node.x0},${node.y0})`}
                className={cn(interactive && 'cursor-pointer')}
                onClick={() => {
                  if (!interactive || !node.wave) return
                  onNodeClick?.({ wave: node.wave, state: node.state })
                }}
                onMouseMove={(e) => {
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                  setHover({
                    x: e.clientX - rect.left + 12,
                    y: e.clientY - rect.top + 12,
                    html: `
                      <div class="font-serif text-[11px] tracking-wide text-ink">
                        ${node.label}${node.wave ? ` · ${node.wave}` : ''}
                      </div>
                      <div class="mt-1 text-[10px] text-ink-wash">
                        ${formatNumber(node.count)} 人${interactive ? ' · 点击下钻 →' : ''}
                      </div>`,
                  })
                }}
                onMouseLeave={() => setHover(null)}
              >
                <rect
                  width={nw}
                  height={nh}
                  rx={2}
                  fill={fill}
                  fillOpacity={node.state === 'lost' ? 0.55 : 0.92}
                  stroke={inkWash.ink}
                  strokeOpacity={0.35}
                  strokeWidth={0.5}
                />
                {nh >= 12 && (
                  <text
                    x={isFirstCol ? -6 : isLastCol ? nw + 6 : nw / 2}
                    y={nh / 2}
                    dy="0.32em"
                    textAnchor={isFirstCol ? 'end' : isLastCol ? 'start' : 'middle'}
                    fill={inkWash.ink}
                    style={{
                      fontFamily: '"Noto Serif SC", serif',
                      fontSize: nh >= 20 ? 9 : 7,
                    }}
                  >
                    {nh >= 20 ? (
                      <>
                        {node.label}{' '}
                        <tspan fill={inkWash.wash}>{formatNumber(node.count)}</tspan>
                      </>
                    ) : (
                      formatNumber(node.count)
                    )}
                  </text>
                )}
              </g>
            )
          })}
        </g>

        <g transform={`translate(8, 52)`}>
          {legendGroups.map((group, gi) => (
            <g key={group.title} transform={`translate(0, ${gi * 52})`}>
              <text fill={inkWash.wash} style={{ fontSize: 8, fontFamily: '"Noto Serif SC", serif' }}>
                {group.title}
              </text>
              {group.items.slice(0, 4).map((item, ii) => (
                <g key={item.k} transform={`translate(0, ${12 + ii * 14})`}>
                  <rect width={8} height={8} rx={1} fill={item.c} />
                  <text x={12} y={7} fill={inkWash.stone} style={{ fontSize: 7 }}>
                    {labelForLegend(item.k).slice(0, 8)}
                  </text>
                </g>
              ))}
            </g>
          ))}
        </g>

        <g transform={`translate(${width - 80}, ${height - 18})`} opacity={0.5}>
          <text fill={inkWash.wash} style={{ fontSize: 8, fontFamily: '"Noto Serif SC", serif' }}>
            流转 →
          </text>
          <path d="M0,6 H36 M30,3 L36,6 L30,9" fill="none" stroke={inkWash.wash} strokeWidth={0.8} />
        </g>
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-20 max-w-[260px] border border-ink/40 bg-paper-alt p-2 shadow-ink"
          style={{ left: hover.x, top: hover.y }}
          dangerouslySetInnerHTML={{ __html: hover.html }}
        />
      )}
    </div>
  )
}

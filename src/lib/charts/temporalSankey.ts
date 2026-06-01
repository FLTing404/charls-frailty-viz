import * as d3 from 'd3'
import { sankey as d3Sankey } from 'd3-sankey'
import type { SankeyData, SankeyNode } from '@/types/data'
import { EVOLUTION_ORDER, FACTOR_ORDER, STATE_ORDER } from '@/lib/data/sankey'

/** 衰弱状态色 */
export const SANKEY_STATE_COLOR: Record<string, string> = {
  robust: '#2EC4C4',
  'pre-frail': '#E8B84A',
  frail: '#D04FA8',
  death: '#5A4A72',
  lost: '#5A4A72',
}

/** 风险因子层 */
export const FACTOR_COLOR: Record<string, string> = {
  high_ace: '#5A4A72',
  low_assets_sleep: '#C4A35A',
  high_assets_mood: '#B83B3B',
  other: '#9B968D',
}

/** 演变层 */
export const EVOLUTION_COLOR: Record<string, string> = {
  stable: '#5C7A6B',
  improving: '#2EC4C4',
  worsening: '#D04FA8',
  lost_mid: '#8A8580',
}

export type TSNode = SankeyData['nodes'][number] & {
  x0?: number
  x1?: number
  y0?: number
  y1?: number
}

export type TSLink = SankeyData['links'][number] & {
  source: TSNode | string
  target: TSNode | string
  width?: number
  y0?: number
  y1?: number
  index?: number
}

export interface TemporalSankeyLayout {
  nodes: TSNode[]
  links: TSLink[]
  layers: number[]
}

const LAYER_NODE_ORDER: Record<number, string[]> = {
  0: [...FACTOR_ORDER],
  1: ['robust', 'pre-frail', 'frail'],
  2: [...EVOLUTION_ORDER],
  3: [...STATE_ORDER],
}

function layerSortIndex(layer: number, state: string): number {
  const order = LAYER_NODE_ORDER[layer] ?? []
  const idx = order.indexOf(state)
  return idx >= 0 ? idx : 99
}

/** 缎带闭合路径（水平时序流） */
export function ribbonPath(link: TSLink): string {
  const src = link.source as TSNode
  const tgt = link.target as TSNode
  const x0 = src.x1 ?? 0
  const x1 = tgt.x0 ?? 0
  const w = link.width ?? 1
  const y0t = (link.y0 ?? 0) - w / 2
  const y0b = (link.y0 ?? 0) + w / 2
  const y1t = (link.y1 ?? 0) - w / 2
  const y1b = (link.y1 ?? 0) + w / 2
  const mx = (x0 + x1) / 2
  return [
    `M${x0},${y0t}`,
    `C${mx},${y0t} ${mx},${y1t} ${x1},${y1t}`,
    `L${x1},${y1b}`,
    `C${mx},${y1b} ${mx},${y0b} ${x0},${y0b}`,
    'Z',
  ].join(' ')
}

export function nodeColor(node: Pick<SankeyNode, 'layerType' | 'state'>): string {
  if (node.layerType === 'factor') return FACTOR_COLOR[node.state] ?? '#888'
  if (node.layerType === 'evolution') return EVOLUTION_COLOR[node.state] ?? '#888'
  return SANKEY_STATE_COLOR[node.state] ?? '#888'
}

/** @deprecated 使用 nodeColor */
export function stateColor(state: string): string {
  return SANKEY_STATE_COLOR[state] ?? '#888'
}

/** 健康恶化程度，用于粒子亮度 */
export function deteriorationScore(src: TSNode, tgt: TSNode): number {
  if (src.layerType === 'baseline' && tgt.state === 'worsening') return 1
  if (src.layerType === 'evolution' && tgt.state === 'frail' && src.state === 'worsening') return 1
  if (tgt.state === 'improving' || (src.state === 'improving' && tgt.state === 'robust')) return -1
  const rank: Record<string, number> = { robust: 0, 'pre-frail': 1, frail: 2, lost: 3 }
  if (tgt.layerType === 'outcome' && src.layerType === 'evolution') {
    return (rank[tgt.state] ?? 0) - (rank[src.state === 'worsening' ? 'frail' : src.state] ?? 0)
  }
  return 0
}

export function layoutTemporalSankey(
  data: SankeyData,
  width: number,
  height: number,
): TemporalSankeyLayout | null {
  if (!data.nodes.length) return null

  const layers = Array.from(new Set(data.nodes.map((n) => n.layer))).sort((a, b) => a - b)
  const layerIndex = new Map(layers.map((l, i) => [l, i]))

  const activeNodes = data.nodes.filter((n) => n.count > 0)
  if (!activeNodes.length) return null

  const activeIds = new Set(activeNodes.map((n) => n.id))
  const activeLinks = data.links.filter(
    (l) => activeIds.has(l.source) && activeIds.has(l.target) && l.value > 0,
  )

  const sankeyGen = d3Sankey<TSNode, TSLink>()
    .nodeId((d) => d.id)
    .nodeWidth(22)
    .nodePadding(8)
    .nodeSort((a, b) => layerSortIndex(a.layer, a.state) - layerSortIndex(b.layer, b.state))
    .nodeAlign((node) => layerIndex.get(node.layer) ?? 0)
    .extent([
      [56, 52],
      [width - 28, height - 24],
    ])

  const nodes = activeNodes.map((n) => ({ ...n })) as TSNode[]
  const links = activeLinks.map((l) => ({ ...l })) as TSLink[]

  try {
    const graph = sankeyGen({ nodes, links })
    return { nodes: graph.nodes as TSNode[], links: graph.links as TSLink[], layers }
  } catch {
    return null
  }
}

export interface FlowParticle {
  linkIdx: number
  t: number
  speed: number
  r: number
  opacity: number
}

export function spawnParticles(links: TSLink[], maxTotal = 120): FlowParticle[] {
  const particles: FlowParticle[] = []
  const totalFlow = links.reduce((s, l) => s + l.value, 0) || 1

  links.forEach((link, linkIdx) => {
    const w = link.width ?? 1
    const share = link.value / totalFlow
    const n = Math.min(6, Math.max(1, Math.round(share * maxTotal * 0.6 + w / 14)))
    for (let i = 0; i < n; i += 1) {
      particles.push({
        linkIdx,
        t: Math.random(),
        speed: 0.0018 + Math.random() * 0.0022 + share * 0.001,
        r: Math.min(3.2, 1.2 + w / 12),
        opacity: 0.45 + Math.random() * 0.45,
      })
    }
  })

  return particles.slice(0, maxTotal)
}

/** 沿缎带中心线采样点（用于粒子动画） */
export function ribbonCenterLine(link: TSLink): string {
  const src = link.source as TSNode
  const tgt = link.target as TSNode
  const x0 = src.x1 ?? 0
  const x1 = tgt.x0 ?? 0
  const y0 = link.y0 ?? 0
  const y1 = link.y1 ?? 0
  const mx = (x0 + x1) / 2
  return `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`
}

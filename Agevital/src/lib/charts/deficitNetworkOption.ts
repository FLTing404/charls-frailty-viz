import type { EChartsCoreOption } from 'echarts/core'
import type { DeficitNetworkPayload } from '@/types/data'
import { inkWash } from '@/lib/theme/inkWash'
import { formatNumber, formatPercent } from '@/lib/utils'

const CATEGORY_COLOR: Record<string, string> = {
  慢性病: inkWash.cinnabar,
  自评: inkWash.amber,
  ADL: inkWash.indigo,
  IADL: '#6B8E9B',
  体能: inkWash.bamboo,
  感官: '#8B7355',
}

function nodeSize(n: number, minN: number, maxN: number): number {
  if (maxN <= minN) return 26
  const t = (Math.sqrt(n) - Math.sqrt(minN)) / (Math.sqrt(maxN) - Math.sqrt(minN) || 1)
  return 18 + t * 42
}

function edgeWidth(value: number, maxV: number): number {
  if (maxV <= 0) return 0.5
  return 0.5 + (value / maxV) * 4
}

/**
 * Build the full force-graph option. Call once for initial render.
 */
export function buildDeficitNetworkOption(data: DeficitNetworkPayload): EChartsCoreOption {
  const ns = data.nodes.map((n) => n.n)
  const minN = Math.min(...ns, 0)
  const maxN = Math.max(...ns, 1)
  const maxLink = Math.max(...data.links.map((l) => l.value), 1)

  const graphNodes = data.nodes.map((n) => ({
    id: n.id,
    name: n.label,
    value: n.n,
    category: n.category,
    symbolSize: nodeSize(n.n, minN, maxN),
    itemStyle: {
      color: CATEGORY_COLOR[n.category] ?? inkWash.wash,
    },
    label: {
      show: n.n >= maxN * 0.08,
      fontSize: 8,
      fontFamily: '"Noto Serif SC", serif',
      color: inkWash.ink,
      fontWeight: 400,
    },
  }))

  const graphLinks = data.links.map((l) => {
    const src = data.nodes.find((n) => n.id === l.source)
    const tgt = data.nodes.find((n) => n.id === l.target)
    return {
      source: l.source,
      target: l.target,
      value: l.value,
      lineStyle: {
        width: edgeWidth(l.value, maxLink),
        opacity: 0.35,
        color: inkWash.wash,
      },
      _srcLabel: src?.label ?? l.source,
      _tgtLabel: tgt?.label ?? l.target,
      _prob: l.prob,
    }
  })

  const categories = [...new Set(data.nodes.map((n) => n.category))].map((name) => ({
    name,
    itemStyle: { color: CATEGORY_COLOR[name] ?? inkWash.wash },
  }))

  return {
    backgroundColor: 'transparent',
    animationDurationUpdate: 200,
    animationEasingUpdate: 'cubicInOut',
    tooltip: {
      trigger: 'item',
      backgroundColor: inkWash.paperAlt,
      borderColor: inkWash.ink,
      borderWidth: 0.5,
      textStyle: {
        color: inkWash.ink,
        fontFamily: '"Noto Serif SC", serif',
        fontSize: 8,
      },
      formatter: (p: any) => {
        if (p.dataType === 'edge') {
          const d = p.data
          return [
            `<div style="font-weight:600">${d._srcLabel} ↔ ${d._tgtLabel}</div>`,
            `<div style="color:${inkWash.wash};margin-top:4px">`,
            `共现 ${formatNumber(d.value)} 人 · 占较小者 ${formatPercent(d._prob, 1)}`,
            `</div>`,
          ].join('')
        }
        const d = p.data
        const node = data.nodes.find((n) => n.id === d.id)
        if (!node) return d.name
        return [
          `<div style="font-weight:600">${node.label}</div>`,
          `<div style="color:${inkWash.wash};margin-top:4px">`,
          `${node.category} · ${formatNumber(node.n)} 人 · ${formatPercent(node.prevalence, 1)}`,
          `</div>`,
        ].join('')
      },
    },
    legend: {
      show: true,
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 8, color: inkWash.wash, fontFamily: '"Noto Serif SC", serif' },
      data: categories.map((c) => c.name),
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        categories,
        data: graphNodes,
        links: graphLinks,
        force: {
          repulsion: 100,
          edgeLength: [100, 250],
          gravity: 0.15,
          friction: 0.05,
          layoutAnimation: true,
        },
        emphasis: {
          focus: 'adjacency',
          itemStyle: {
            borderColor: inkWash.cinnabar,
            borderWidth: 2.5,
            shadowColor: inkWash.cinnabar,
            shadowBlur: 16,
          },
          label: {
            show: true,
            fontSize: 13,
            fontFamily: '"Noto Serif SC", serif',
            color: inkWash.cinnabar,
            fontWeight: 700,
          },
          lineStyle: { width: 3, opacity: 0.7 },
        },
        lineStyle: {
          curveness: 0.12,
        },
      },
    ],
  }
}


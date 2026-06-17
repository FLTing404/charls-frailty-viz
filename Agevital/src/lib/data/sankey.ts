import type { CohortTable, SankeyData, SankeyLink, SankeyNode, Wave } from '@/types/data'
import type { Condition } from '@/lib/store/globalStore'

export const STATE_ORDER = ['robust', 'pre-frail', 'frail', 'lost'] as const
export type StateKey = (typeof STATE_ORDER)[number]

export const FACTOR_ORDER = [
  'high_ace',
  'low_assets_sleep',
  'high_assets_mood',
  'other',
] as const

export const EVOLUTION_ORDER = ['stable', 'improving', 'worsening', 'lost_mid'] as const

const CODE_TO_STATE: Record<number, StateKey> = {
  0: 'robust',
  1: 'pre-frail',
  2: 'frail',
  3: 'lost',
}

const RISK_CODE_TO_FACTOR: Record<number, (typeof FACTOR_ORDER)[number]> = {
  0: 'other',
  1: 'low_assets_sleep',
  2: 'high_assets_mood',
  3: 'high_ace',
}

const WAVES: Wave[] = [2011, 2013, 2015, 2018]
const WAVE_FIELDS = ['s11', 's13', 's15', 's18'] as const

export interface BuildOpts {
  conditions: Condition[]
  cohortMode: 'all' | 'tracked'
  timeSpan: [Wave, Wave]
}

export const LAYER_META = [
  { layer: 0, title: '根源层', subtitle: '主导风险因子' },
  { layer: 1, title: '状态层', subtitle: '基线衰弱分级' },
  { layer: 2, title: '演变层', subtitle: '随访病情流转' },
  { layer: 3, title: '终点层', subtitle: '最终转归' },
] as const

function evolutionKey(startCode: number, midCode: number): (typeof EVOLUTION_ORDER)[number] {
  if (midCode === 3 || startCode === 3) return 'lost_mid'
  if (midCode > startCode) return 'worsening'
  if (midCode < startCode) return 'improving'
  return 'stable'
}

function nodeLabel(layerType: SankeyNode['layerType'], state: string): string {
  if (layerType === 'factor') {
    const map: Record<string, string> = {
      high_ace: '童年逆境高',
      low_assets_sleep: '低资产+睡眠困扰',
      high_assets_mood: '高资产+情志失调',
      other: '综合/其他',
    }
    return map[state] ?? state
  }
  if (layerType === 'evolution') {
    const map: Record<string, string> = {
      stable: '状态稳定',
      worsening: '病情恶化',
      improving: '状态改善',
      lost_mid: '中期失访',
    }
    return map[state] ?? state
  }
  const frailty: Record<string, string> = {
    robust: '健壮',
    'pre-frail': '衰弱前期',
    frail: '衰弱',
    lost: '失访/缺失',
  }
  return frailty[state] ?? state
}

/**
 * 四层异构嵌套桑基：风险因子 → 基线状态 → 中期演变 → 终点转归。
 * 数据来自 cohort 表（risk 列由预处理基于 2011 SES / 睡眠 / ACE 真实计算）。
 */
export function buildSankey(cohort: CohortTable, opts: BuildOpts): SankeyData {
  const [startWave, endWave] = opts.timeSpan
  const waveIdxStart = WAVES.indexOf(startWave)
  const waveIdxEnd = WAVES.indexOf(endWave)
  if (waveIdxStart < 0 || waveIdxEnd < 0 || waveIdxEnd <= waveIdxStart) {
    return { nodes: [], links: [], cohort_n: 0, generated_at: new Date().toISOString() }
  }

  const visibleWaves = WAVES.slice(waveIdxStart, waveIdxEnd + 1)
  const midWave =
    visibleWaves.length >= 3
      ? visibleWaves[Math.floor(visibleWaves.length / 2)]
      : visibleWaves[visibleWaves.length - 1]

  const startIdx = WAVES.indexOf(startWave)
  const midIdx = WAVES.indexOf(midWave)
  const endIdx = WAVES.indexOf(endWave)

  const fields = cohort.fields
  const startFieldIdx = fields.indexOf(WAVE_FIELDS[startIdx])
  const midFieldIdx = fields.indexOf(WAVE_FIELDS[midIdx])
  const endFieldIdx = fields.indexOf(WAVE_FIELDS[endIdx])
  const riskIdx = fields.indexOf('risk')
  const condIdx = opts.conditions.map((c) => fields.indexOf(c))

  const nodeCount: Record<string, number> = {}
  const linkCount: Record<string, { value: number; src: string; tgt: string }> = {}
  let cohortN = 0

  const incNode = (id: string) => {
    nodeCount[id] = (nodeCount[id] ?? 0) + 1
  }
  const incLink = (src: string, tgt: string) => {
    const id = `${src}->${tgt}`
    const entry = linkCount[id] ?? { value: 0, src, tgt }
    entry.value += 1
    linkCount[id] = entry
  }

  for (const row of cohort.rows) {
    if (condIdx.some((i) => i < 0 || row[i] !== 1)) continue

    const startCode = row[startFieldIdx]
    const midCode = row[midFieldIdx]
    const endCode = row[endFieldIdx]

    if (startCode === 3) continue

    if (opts.cohortMode === 'tracked') {
      const trackIdx = visibleWaves.map((w) => fields.indexOf(WAVE_FIELDS[WAVES.indexOf(w)]))
      if (trackIdx.some((i) => i < 0 || row[i] === 3)) continue
    }

    cohortN += 1

    const riskCode = riskIdx >= 0 ? row[riskIdx] : 0
    const factor = RISK_CODE_TO_FACTOR[riskCode] ?? 'other'
    const baseline = CODE_TO_STATE[startCode] ?? 'lost'
    const evolution = evolutionKey(startCode, midCode)
    const outcome = CODE_TO_STATE[endCode] ?? 'lost'

    const fId = `F:${factor}`
    const bId = `B:${baseline}`
    const eId = `E:${evolution}`
    const oId = `O:${outcome}`

    incNode(fId)
    incNode(bId)
    incNode(eId)
    incNode(oId)
    incLink(fId, bId)
    incLink(bId, eId)
    incLink(eId, oId)
  }

  const nodes: SankeyNode[] = []

  for (const factor of FACTOR_ORDER) {
    const id = `F:${factor}`
    nodes.push({
      id,
      layer: 0,
      layerType: 'factor',
      state: factor,
      label: nodeLabel('factor', factor),
      count: nodeCount[id] ?? 0,
    })
  }

  for (const state of ['robust', 'pre-frail', 'frail'] as const) {
    const id = `B:${state}`
    nodes.push({
      id,
      layer: 1,
      layerType: 'baseline',
      state,
      label: nodeLabel('baseline', state),
      wave: startWave,
      count: nodeCount[id] ?? 0,
    })
  }

  for (const evo of EVOLUTION_ORDER) {
    const id = `E:${evo}`
    nodes.push({
      id,
      layer: 2,
      layerType: 'evolution',
      state: evo,
      label: nodeLabel('evolution', evo),
      wave: midWave,
      count: nodeCount[id] ?? 0,
    })
  }

  for (const state of STATE_ORDER) {
    const id = `O:${state}`
    nodes.push({
      id,
      layer: 3,
      layerType: 'outcome',
      state,
      label: nodeLabel('outcome', state),
      wave: endWave,
      count: nodeCount[id] ?? 0,
    })
  }

  const sourceTotals: Record<string, number> = {}
  for (const { src, value } of Object.values(linkCount)) {
    sourceTotals[src] = (sourceTotals[src] ?? 0) + value
  }

  const links: SankeyLink[] = []
  for (const { src, tgt, value } of Object.values(linkCount)) {
    if (!value) continue
    const total = sourceTotals[src] ?? 0
    const prob = total ? value / total : 0
    let anomaly: SankeyLink['anomaly'] = null
    const srcLayer = src.split(':')[0]
    const tgtLayer = tgt.split(':')[0]
    if (srcLayer === 'B' && tgtLayer === 'E') {
      const evo = tgt.split(':')[1]
      if (evo === 'worsening') anomaly = 'jump'
      if (evo === 'improving') anomaly = 'recovery'
    }
    if (srcLayer === 'E' && tgtLayer === 'O') {
      const base = src.split(':')[1]
      const out = tgt.split(':')[1]
      if (base === 'worsening' && out === 'frail') anomaly = 'jump'
      if (base === 'improving' && out === 'robust') anomaly = 'recovery'
    }
    links.push({
      source: src,
      target: tgt,
      value,
      prob: Number(prob.toFixed(4)),
      anomaly,
    })
  }

  return {
    nodes,
    links,
    cohort_n: cohortN,
    generated_at: new Date().toISOString(),
    meta: {
      startWave,
      midWave,
      endWave,
    },
  }
}

/**
 * AI-Powered Anomaly Analysis via DeepSeek API
 *
 * Takes computed statistical anomalies + RAG knowledge context,
 * calls DeepSeek to produce expert-level analysis in Chinese.
 */
import { buildRAGContext } from './frailtyKnowledge'
import type { Wave } from '@/lib/store/globalStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProvinceChangeInput {
  province: string // English name
  provinceCn: string // Chinese name
  frailRate: number // current year frailRate (0-1)
  prevFrailRate: number // previous year frailRate (0-1)
  frailDelta: number // percentage-point change
  preFrailDelta: number // percentage-point change in preFrailRate
  meanFIDelta: number // absolute change in mean FI
  direction: 'up' | 'down' | 'flat'
  n: number // sample size
  malePct: number | null
  urbanPct: number | null
}

export interface AnalysisInput {
  year: Wave
  prevYear: Wave
  isProvinceView: boolean
  selectedProvinceCn: string | null
  national: ProvinceChangeInput
  provinces: ProvinceChangeInput[] // all province changes
  topRise: ProvinceChangeInput[] // top 3 by frailRate increase
  topDrop: ProvinceChangeInput[] // top 3 by frailRate decrease
  selectedProvince: ProvinceChangeInput | null
  selectedSigma: number
  selectedIsUnusual: boolean
  totalSampleN: number
}

export interface AIAnalysisResult {
  /** One-line headline insight (for the anomaly panel title) */
  headline: string
  /** 2-3 sentence national overview */
  nationalOverview: string
  /** Specific anomaly findings (2-4 items) */
  anomalies: AIAnomalyItem[]
  /** What to pay attention to next */
  attention: string
  /** Key driver hypothesis — what might explain the observed changes */
  driverHypothesis: string
}

export interface AIAnomalyItem {
  province: string
  severity: 'high' | 'medium' | 'low'
  finding: string
}

// ── Cache (fingerprint-based, survives hot reload) ──────────────────────────

const cache = new Map<string, { result: AIAnalysisResult; ts: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function fingerprint(input: AnalysisInput): string {
  // Simple fingerprint: year + national frailDelta + top province delta
  const top = input.topRise[0]
  return `${input.year}-${input.prevYear}-${input.national.frailDelta.toFixed(2)}-${top?.frailDelta.toFixed(2) ?? 'none'}-${input.selectedProvinceCn ?? 'nat'}`
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildSystemPrompt(ragContext: string): string {
  return `你是一位专注于中国老年衰弱研究的专家，熟悉 CHARLS（中国健康与养老追踪调查）数据。
你的任务是基于提供的统计数据和学术文献知识，对 CHARLS 数据中发现的衰弱率变化进行专家级分析。

请严格基于以下学术文献知识进行分析，引用具体研究发现来支持你的判断：

${ragContext}

分析要求：
1. 使用学术文献中的发现来解释观察到的数据模式
2. 当数据变化与文献一致时，指出支持的研究
3. 当数据变化与文献不一致时，指出可能的特殊原因
4. 对异常省份提出可验证的假设
5. 使用中文，语言精炼专业，适合直接显示在可视分析面板中`
}

function buildUserPrompt(input: AnalysisInput): string {
  const { year, prevYear, isProvinceView, national, provinces, topRise, topDrop, selectedProvince, selectedSigma, selectedIsUnusual, totalSampleN } = input

  let prompt = `## 数据摘要

**对比**: ${year} 年 vs ${prevYear} 年
**总样本**: ${totalSampleN.toLocaleString()} 人
**全国衰弱率变化**: ${national.frailDelta > 0 ? '+' : ''}${national.frailDelta.toFixed(1)} 百分点 (${prevYear}: ${(national.prevFrailRate * 100).toFixed(1)}% → ${year}: ${(national.frailRate * 100).toFixed(1)}%)
**全国衰弱前期变化**: ${national.preFrailDelta > 0 ? '+' : ''}${national.preFrailDelta.toFixed(1)} 百分点
**全国平均 FI 变化**: ${national.meanFIDelta > 0 ? '+' : ''}${national.meanFIDelta.toFixed(3)}

### 衰弱率上升最快省份 (Top 3):
${topRise.map((p, i) => `${i + 1}. ${p.provinceCn}：+${p.frailDelta.toFixed(1)} pp（${(p.prevFrailRate * 100).toFixed(1)}% → ${(p.frailRate * 100).toFixed(1)}%，n=${p.n.toLocaleString()}）`).join('\n')}

### 衰弱率下降最快省份 (Top 3):
${topDrop.map((p, i) => `${i + 1}. ${p.provinceCn}：${p.frailDelta.toFixed(1)} pp（${(p.prevFrailRate * 100).toFixed(1)}% → ${(p.frailRate * 100).toFixed(1)}%，n=${p.n.toLocaleString()}）`).join('\n')}
`

  if (isProvinceView && selectedProvince) {
    prompt += `
### 当前选中省份: ${selectedProvince.provinceCn}
- 衰弱率变化: ${selectedProvince.frailDelta > 0 ? '+' : ''}${selectedProvince.frailDelta.toFixed(1)} pp
- 偏离全国均值: ${Math.abs(selectedSigma).toFixed(1)}σ ${selectedIsUnusual ? '(异常)' : '(正常范围)'}
- 样本量: ${selectedProvince.n.toLocaleString()}
- 男性比: ${selectedProvince.malePct != null ? (selectedProvince.malePct * 100).toFixed(0) + '%' : '未知'}
- 城镇比: ${selectedProvince.urbanPct != null ? (selectedProvince.urbanPct * 100).toFixed(0) + '%' : '未知'}
`
  }

  // Add all province data context for richer analysis
  const westP = provinces.filter((p) => ['guizhou', 'gansu', 'yunnan', 'sichuan', 'qinghai', 'xinjiang', 'tibet'].includes(p.province.toLowerCase()))
  const eastP = provinces.filter((p) => ['shanghai', 'jiangsu', 'zhejiang', 'fujian', 'guangdong', 'beijing', 'tianjin'].includes(p.province.toLowerCase()))

  if (westP.length > 0 && eastP.length > 0) {
    const westAvg = westP.reduce((s, p) => s + p.frailDelta, 0) / westP.length
    const eastAvg = eastP.reduce((s, p) => s + p.frailDelta, 0) / eastP.length
    prompt += `
### 区域对比:
- 西部省份衰弱率平均变化: ${westAvg > 0 ? '+' : ''}${westAvg.toFixed(1)} pp
- 东部省份衰弱率平均变化: ${eastAvg > 0 ? '+' : ''}${eastAvg.toFixed(1)} pp
`
  }

  prompt += `
请以 JSON 格式返回分析结果，格式如下：
{
  "headline": "一句话标题洞察",
  "nationalOverview": "2-3句全国概况分析，引用文献",
  "anomalies": [
    {"province": "省份名", "severity": "high|medium|low", "finding": "具体发现，引用文献支持"}
  ],
  "attention": "下一步应关注什么",
  "driverHypothesis": "对观察到的变化模式提出可能的驱动因素假设，引用CHARLS文献中的已知机制"
}

只返回 JSON，不要有其他内容。`

  return prompt
}

// ── API call ──────────────────────────────────────────────────────────────────

async function callDeepSeek(systemPrompt: string, userPrompt: string): Promise<AIAnalysisResult> {
  // Use Vite dev server proxy to keep API key server-side
  const response = await fetch('/api/deepseek', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown')
    throw new Error(`DeepSeek API error ${response.status}: ${errorText.slice(0, 200)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('DeepSeek returned empty response')
  }

  try {
    const parsed = JSON.parse(content) as AIAnalysisResult
    // Validate required fields
    if (!parsed.headline || !parsed.nationalOverview || !Array.isArray(parsed.anomalies)) {
      throw new Error('Invalid response structure')
    }
    return parsed
  } catch (e) {
    // If JSON parse fails, try to extract JSON from markdown code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]) as AIAnalysisResult
    }
    throw new Error(`Failed to parse DeepSeek response as JSON: ${String(e)}`)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function analyzeAnomalies(input: AnalysisInput): Promise<AIAnalysisResult> {
  // Check cache
  const fp = fingerprint(input)
  const cached = cache.get(fp)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.result
  }

  // In production builds (no dev proxy), skip API call and use fallback
  if (import.meta.env.PROD) {
    return fallbackAnalysis(input)
  }

  const ragContext = buildRAGContext({
    isProvinceView: input.isProvinceView,
    hasAceData: true,
    hasSESData: true,
    hasDepressionData: true,
  })

  const systemPrompt = buildSystemPrompt(ragContext)
  const userPrompt = buildUserPrompt(input)

  const result = await callDeepSeek(systemPrompt, userPrompt)

  // Cache result
  cache.set(fp, { result, ts: Date.now() })

  return result
}

/**
 * Synchronous fallback analysis when API is unavailable or loading.
 * Uses simple statistical rules + knowledge base.
 */
export function fallbackAnalysis(input: AnalysisInput): AIAnalysisResult {
  const { national, topRise, selectedProvince, selectedIsUnusual, selectedSigma, isProvinceView, prevYear, year } = input

  const anomalies: AIAnomalyItem[] = []
  const isProv = isProvinceView && selectedProvince
  const fragile = isProv ? selectedProvince : national

  // Build anomalies
  if (isProv && selectedIsUnusual) {
    anomalies.push({
      province: selectedProvince.provinceCn,
      severity: Math.abs(selectedSigma) > 2 ? 'high' : 'medium',
      finding: `${selectedProvince.provinceCn}衰弱率变化偏离全国均值 ${Math.abs(selectedSigma).toFixed(1)} 个标准差。`,
    })
  }
  if (!isProv) {
    for (const p of topRise.slice(0, 1)) {
      if (p.frailDelta > 1) {
        anomalies.push({
          province: p.provinceCn,
          severity: p.frailDelta > 3 ? 'high' : 'medium',
          finding: `衰弱率上升 ${p.frailDelta.toFixed(1)} pp，高于全国均值。`,
        })
      }
    }
  }

  // ── Headline: province-specific vs national ──
  const headline = isProv
    ? Math.abs(fragile.frailDelta) < 0.3
      ? `${fragile.provinceCn}衰弱率基本持平`
      : fragile.frailDelta > 0
        ? `${fragile.provinceCn}衰弱率上升 ${fragile.frailDelta.toFixed(1)} pp`
        : `${fragile.provinceCn}衰弱率下降 ${Math.abs(fragile.frailDelta).toFixed(1)} pp`
    : national.frailDelta > 1
      ? `全国衰弱率显著上升 ${national.frailDelta.toFixed(1)} pp`
      : national.frailDelta < -1
        ? `全国衰弱率下降 ${Math.abs(national.frailDelta).toFixed(1)} pp`
        : `全国衰弱率基本稳定`

  // ── Overview: province-specific vs national ──
  const overview = isProv
    ? `从${prevYear}到${year}年，${fragile.provinceCn}衰弱率从${(fragile.prevFrailRate * 100).toFixed(1)}%` +
      `变为${(fragile.frailRate * 100).toFixed(1)}%（${fragile.frailDelta > 0 ? '+' : ''}${fragile.frailDelta.toFixed(1)} pp），` +
      `同期全国从${(national.prevFrailRate * 100).toFixed(1)}%变为${(national.frailRate * 100).toFixed(1)}%（${national.frailDelta > 0 ? '+' : ''}${national.frailDelta.toFixed(1)} pp）。` +
      (selectedIsUnusual
        ? `${fragile.provinceCn}的变化偏离全国均值 ${Math.abs(selectedSigma).toFixed(1)} 个标准差，属于异常波动。`
        : `${fragile.provinceCn}的变化处于全国正常波动范围内。`) +
      `根据 CHARLS 文献，该省衰弱率变化受 ACE 累积效应、社会经济状况、医疗可及性和社会参与度等因素影响。`
    : `从${prevYear}到${year}年，全国衰弱率从${(national.prevFrailRate * 100).toFixed(1)}%变为${(national.frailRate * 100).toFixed(1)}%。` +
      `根据 CHARLS 文献，衰弱率变化受 ACE（童年不良经历）累积效应、社会参与度变化和医疗可及性等多重因素影响。` +
      `区域差异（东西部梯度）是预期模式，偏离区域预期的省份值得关注。`

  // ── Attention: province-specific ──
  const attention = isProv
    ? `在平行坐标图中观察 ${fragile.provinceCn} 各维度的分布，重点关注 ACE 和抑郁维度与 FI 的关联。在桑基图中检查该省的衰弱状态转化率。`
    : '在平行坐标图中重点关注 ACE 和抑郁维度与 FI 的关联模式，在桑基图中检查衰弱状态转化率异常。'

  // ── Driver hypothesis: province-specific ──
  const driverHypo = isProv
    ? `CHARLS 文献（JAMA Network Open 2022, Child Abuse & Neglect 2025）表明：ACE 的累积效应通过抑郁症状（中介约 29%）和生活行为（中介约 4-8%）间接驱动衰弱进展。` +
      `${fragile.provinceCn}的衰弱率变化可能与 ACE 暴露水平、社会经济条件和社会参与度等结构性因素有关。建议在平行坐标图中对比该省与全国的驱动因素分布差异。`
    : `CHARLS 文献（JAMA Network Open 2022, Child Abuse & Neglect 2025）一致表明：ACE 的累积效应通过抑郁症状（中介约 29%）和生活行为（中介约 4-8%）间接驱动衰弱进展。` +
      `建议检查${topRise[0]?.provinceCn ?? '异常省份'}的 ACE 得分偏高人群比例。`

  return { headline, nationalOverview: overview, anomalies, attention, driverHypothesis: driverHypo }
}

/**
 * Pre-generate AI Analysis for all province × year combinations.
 *
 * Usage:
 *   cd Agevital
 *   node scripts/generatePresets.mjs
 *
 * Reads public/data/map_province_*.json, computes year-over-year anomaly
 * statistics for national + every province, calls DeepSeek with RAG
 * context, and writes the results to src/lib/ai/preGenerated.ts.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA = resolve(ROOT, 'public', 'data')
const PRESET_FILE = resolve(ROOT, 'src', 'lib', 'ai', 'preGenerated.ts')

// ── Config ──────────────────────────────────────────────────────────────────
const API_KEY = readFileSync(resolve(ROOT, '.env'), 'utf-8')
  .match(/DEEPSEEK_API_KEY=(.+)/)?.[1]?.trim() ?? ''

if (!API_KEY) {
  console.error('❌ DEEPSEEK_API_KEY not found in .env')
  process.exit(1)
}

const DELAY_MS = 1500 // between API calls
const WAVES = [2011, 2013, 2015, 2018]
const PAIRS = /** @type {const} */ ([
  [2011, 2013],
  [2013, 2015],
  [2015, 2018],
])

// ── Province CN labels ─────────────────────────────────────────────────────
const PROVINCE_CN = {
  Anhui: '安徽', Beijing: '北京', Chongqing: '重庆', Fujian: '福建',
  Gansu: '甘肃', Guangdong: '广东', Guangxi: '广西', Guizhou: '贵州',
  Hainan: '海南', Hebei: '河北', Heilongjiang: '黑龙江', Henan: '河南',
  Hubei: '湖北', Hunan: '湖南', 'Inner Mongolia': '内蒙古', Jiangsu: '江苏',
  Jiangxi: '江西', Jilin: '吉林', Liaoning: '辽宁', Ningxia: '宁夏',
  Qinghai: '青海', Shaanxi: '陕西', Shandong: '山东', Shanghai: '上海',
  Shanxi: '山西', Sichuan: '四川', Tibet: '西藏', Tianjin: '天津',
  Xinjiang: '新疆', Yunnan: '云南', Zhejiang: '浙江',
}

const REGION = {
  Anhui: 'East', Beijing: 'East', Chongqing: 'West', Fujian: 'East',
  Gansu: 'West', Guangdong: 'East', Guangxi: 'West', Guizhou: 'West',
  Hainan: 'East', Hebei: 'East', Heilongjiang: 'Central', Henan: 'Central',
  Hubei: 'Central', Hunan: 'Central', 'Inner Mongolia': 'West', Jiangsu: 'East',
  Jiangxi: 'East', Jilin: 'Central', Liaoning: 'Central', Ningxia: 'West',
  Qinghai: 'West', Shaanxi: 'West', Shandong: 'East', Shanghai: 'East',
  Shanxi: 'Central', Sichuan: 'West', Tibet: 'West', Tianjin: 'East',
  Xinjiang: 'West', Yunnan: 'West', Zhejiang: 'East',
}

// ── RAG Knowledge (abridged) ────────────────────────────────────────────────
const RAG_CONTEXT = `【Association of ACEs With Frailty Index Level and Trajectory in China (JAMA Network Open, 2022)】
样本: N=11,568 CHARLS ≥45岁, 2011-2018
核心发现:
  · 每增加一项ACE，衰弱风险升高 20% (OR=1.20, 95%CI 1.16-1.23)
  · 每增加一项ACE，快速上升衰弱轨迹概率增加 19% (OR=1.19)
  · 社会经济剥夺、低质量邻里、同伴欺凌是最强ACE领域
  · 威胁型ACE预测基线衰弱水平；剥夺型ACE预测衰弱增长速度
效应量: OR=1.20 per ACE; Trajectory OR=1.19

【ACEs & Frailty: Retrospective Cohort Study (Zhou et al., 2024)】
样本: N=3,491 基线非衰弱者, 随访8年(2011-2018)
核心发现:
  · 父母残疾 OR=1.34, 家庭暴力 OR=1.63, 不安全社区 OR=1.57 独立预测衰弱发生
  · 抑郁症状中介了29.1%的父母残疾→衰弱效应
效应量: 家庭暴力 OR=1.63; 抑郁中介29.1%

【ACEs & Frailty State Transitions (European Review of Aging and Physical Activity, 2024)】
样本: N=9,621, 5波次(2011-2020)
核心发现:
  · ≥4 ACEs → robust→prefrail HR=1.37, prefrail→frail HR=1.39
  · ≥4 ACEs → 恢复概率下降 (prefrail→robust HR=0.64)
  · 高社会参与显著缓冲ACE效应，促进衰弱逆转
效应量: Forward HR=1.37-1.39; Recovery HR=0.64

【Social Frailty Trajectories (Child Abuse & Neglect, 2025)】
样本: N=4,476 CHARLS, 4波次(2011-2018)
核心发现:
  · 社会衰弱随年龄稳步上升
  · 威胁型ACE预测基线社会衰弱(b=0.061); 剥夺型ACE预测增长速度(b=0.018)
  · 无显著性别差异

【Early-Life Food Deprivation & Frailty (Nutrients, 2021)】
样本: N=11,615 CHARLS ≥45岁
核心发现:
  · 儿童期食物匮乏使衰弱风险增加30% (OR=1.30)
  · 6-12岁为关键暴露窗口(OR=1.15)
  · 成年期SES部分但未完全衰减该关联

【Gender & Frailty Consensus】
  · 女性衰弱率约为男性1.5-2倍
  · ACE→衰弱关联在中国样本中无显著性别交互
  · 若某省男性衰弱率异常偏高则为显著异常

【Regional Disparities】
  · 西部省份(贵州、甘肃、云南)衰弱率最高；东部沿海(上海、江苏、浙江)最低
  · 城市-农村衰弱差距 > 区域差距
  · 医疗可及性解释约35%的城乡差距
  · 东西部衰弱梯度自2011年起持续收窄`

// ── Stats ───────────────────────────────────────────────────────────────────

function loadJSON(name) {
  return JSON.parse(readFileSync(resolve(DATA, name), 'utf-8'))
}

/** Weighted national frailRate */
function nationalFrail(provinces) {
  const n = provinces.reduce((s, p) => s + p.n, 0)
  return provinces.reduce((s, p) => s + p.frailRate * p.n, 0) / (n || 1)
}

function nationalPreFrail(provinces) {
  const n = provinces.reduce((s, p) => s + p.n, 0)
  return provinces.reduce((s, p) => s + p.preFrailRate * p.n, 0) / (n || 1)
}

function nationalFI(provinces) {
  const n = provinces.reduce((s, p) => s + p.n, 0)
  return provinces.reduce((s, p) => s + p.meanFI * p.n, 0) / (n || 1)
}

function computeProvinceDelta(curP, prevMap) {
  const prevP = prevMap.get(curP.province)
  if (!prevP) return null
  return {
    province: curP.province,
    provinceCn: PROVINCE_CN[curP.province] ?? curP.province,
    region: REGION[curP.province] ?? 'Unknown',
    frailRate: curP.frailRate,
    prevFrailRate: prevP.frailRate,
    frailDelta: (curP.frailRate - prevP.frailRate) * 100,
    preFrailDelta: (curP.preFrailRate - prevP.preFrailRate) * 100,
    meanFIDelta: curP.meanFI - prevP.meanFI,
    n: curP.n,
    malePct: curP.malePct,
    urbanPct: curP.urbanPct,
  }
}

/**
 * @param {number} year
 * @param {number} prevYear
 * @param {string|null} province - null for national
 */
function buildPrompt(year, prevYear, curAll, prevAll, province) {
  const prevMap = new Map(prevAll.map((p) => [p.province, p]))
  const allDeltas = curAll.map((p) => computeProvinceDelta(p, prevMap)).filter(Boolean)

  const curFrail = province
    ? (curAll.find((p) => p.province === province)?.frailRate ?? 0)
    : nationalFrail(curAll)
  const prevFrail = province
    ? (prevMap.get(province)?.frailRate ?? 0)
    : nationalFrail(prevAll)

  const sortedRise = allDeltas.filter((d) => d.frailDelta > 0).sort((a, b) => b.frailDelta - a.frailDelta)
  const sortedDrop = allDeltas.filter((d) => d.frailDelta < 0).sort((a, b) => a.frailDelta - b.frailDelta)

  const nationalDelta = nationalFrail(curAll) - nationalFrail(prevAll)

  // Selected province stats
  let selInfo = ''
  if (province) {
    const sel = allDeltas.find((d) => d.province === province)
    if (sel) {
      const deltas = allDeltas.map((d) => d.frailDelta)
      const mean = deltas.reduce((s, v) => s + v, 0) / deltas.length
      const variance = deltas.reduce((s, v) => s + (v - mean) ** 2, 0) / deltas.length
      const sd = Math.sqrt(variance)
      const sigma = sd > 0.001 ? (sel.frailDelta - mean) / sd : 0
      const unusual = Math.abs(sigma) > 1.5
      selInfo = `
### 分析目标省份: ${sel.provinceCn}
- 衰弱率: ${(sel.prevFrailRate * 100).toFixed(1)}% → ${(sel.frailRate * 100).toFixed(1)}%
- 变化: ${sel.frailDelta > 0 ? '+' : ''}${sel.frailDelta.toFixed(1)} pp
- 偏离全国均值: ${Math.abs(sigma).toFixed(1)}σ ${unusual ? '(异常)' : '(正常范围)'}
- 区域: ${sel.region}
- 样本量: ${sel.n.toLocaleString()}人
- 男性比: ${sel.malePct != null ? (sel.malePct * 100).toFixed(0) + '%' : '未知'}
- 城镇比: ${sel.urbanPct != null ? (sel.urbanPct * 100).toFixed(0) + '%' : '未知'}`
    }
  }

  // West vs East
  const westProvs = ['Guizhou', 'Gansu', 'Yunnan', 'Sichuan', 'Qinghai', 'Xinjiang', 'Tibet', 'Ningxia', 'Guangxi']
  const eastProvs = ['Shanghai', 'Jiangsu', 'Zhejiang', 'Fujian', 'Guangdong', 'Beijing', 'Tianjin', 'Shandong']
  const westDeltas = allDeltas.filter((d) => westProvs.includes(d.province))
  const eastDeltas = allDeltas.filter((d) => eastProvs.includes(d.province))
  const westAvg = westDeltas.length ? westDeltas.reduce((s, d) => s + d.frailDelta, 0) / westDeltas.length : 0
  const eastAvg = eastDeltas.length ? eastDeltas.reduce((s, d) => s + d.frailDelta, 0) / eastDeltas.length : 0

  const top3Rise = sortedRise.slice(0, 3).map((d, i) =>
    `${i + 1}. ${d.provinceCn}：+${d.frailDelta.toFixed(1)} pp（${(d.prevFrailRate * 100).toFixed(1)}% → ${(d.frailRate * 100).toFixed(1)}%，n=${d.n.toLocaleString()}，${d.region}部）`).join('\n')

  const top3Drop = sortedDrop.slice(0, 3).map((d, i) =>
    `${i + 1}. ${d.provinceCn}：${d.frailDelta.toFixed(1)} pp（${(d.prevFrailRate * 100).toFixed(1)}% → ${(d.frailRate * 100).toFixed(1)}%，n=${d.n.toLocaleString()}，${d.region}部）`).join('\n')

  return `## 数据摘要

**对比**: ${year} 年 vs ${prevYear} 年
**总样本**: ${curAll.reduce((s, p) => s + p.n, 0).toLocaleString()} 人
**全国衰弱率**: ${(nationalFrail(prevAll) * 100).toFixed(1)}% → ${(nationalFrail(curAll) * 100).toFixed(1)}%
**全国衰弱前期变化**: ${((nationalPreFrail(curAll) - nationalPreFrail(prevAll)) * 100).toFixed(1)} pp
**全国平均 FI 变化**: ${(nationalFI(curAll) - nationalFI(prevAll)).toFixed(3)}

### 衰弱率上升最快省份 (Top 3):
${top3Rise || '无'}

### 衰弱率下降最快省份 (Top 3):
${top3Drop || '无'}

### 区域对比:
- 西部省份衰弱率平均变化: ${westAvg > 0 ? '+' : ''}${westAvg.toFixed(1)} pp
- 东部省份衰弱率平均变化: ${eastAvg > 0 ? '+' : ''}${eastAvg.toFixed(1)} pp
${selInfo}

请基于CHARLS文献进行分析。返回JSON格式：{"headline":"一句话洞察","nationalOverview":"分析文本(4-6句,引用具体文献)","anomalies":[{"province":"省份","severity":"high|medium|low","finding":"发现描述"}],"attention":"下一步建议","driverHypothesis":"驱动因素假设(4-6句,引用文献)"}`
}

// ── API call ────────────────────────────────────────────────────────────────

async function callDeepSeek(systemPrompt, userPrompt) {
  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`API ${resp.status}: ${text.slice(0, 200)}`)
  }
  const data = await resp.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response')
  const parsed = JSON.parse(content)
  // Validate
  if (!parsed.headline || !parsed.nationalOverview || !Array.isArray(parsed.anomalies)) {
    throw new Error('Invalid structure: ' + JSON.stringify(parsed).slice(0, 200))
  }
  return parsed
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Load all waves
  const waveData = {}
  for (const w of WAVES) {
    waveData[w] = loadJSON(`map_province_${w}.json`)
    console.log(`📂 Loaded ${waveData[w].length} provinces for ${w}`)
  }

  const systemPrompt = `你是中国老年衰弱研究专家，熟悉 CHARLS 数据。基于学术文献分析衰弱率变化。

${RAG_CONTEXT}

要求：1.引用文献解释数据模式 2.与文献一致时指出支持研究 3.不一致时指出可能原因 4.对异常省份提出可验证假设 5.中文，精炼专业。返回合法JSON。`

  const results = {}
  let total = 0
  const errors = []

  for (const [prevYear, year] of PAIRS) {
    const cur = waveData[year]
    const prev = waveData[prevYear]

    // ── National ──
    const natKey = `${prevYear}_${year}_national`
    console.log(`\n🔍 [${prevYear}→${year}] National...`)
    try {
      const prompt = buildPrompt(year, prevYear, cur, prev, null)
      const res = await callDeepSeek(systemPrompt, prompt)
      results[natKey] = res
      total++
      console.log(`   ✅ ${natKey} — "${res.headline}"`)
    } catch (e) {
      console.error(`   ❌ ${natKey}: ${e.message}`)
      errors.push(natKey)
    }
    await new Promise((r) => setTimeout(r, DELAY_MS))

    // ── Per province ──
    for (const p of cur) {
      const key = `${prevYear}_${year}_${p.province}`
      console.log(`   📍 ${key}...`)
      try {
        const prompt = buildPrompt(year, prevYear, cur, prev, p.province)
        const res = await callDeepSeek(systemPrompt, prompt)
        results[key] = res
        total++
        console.log(`      ✅ "${res.headline}"`)
      } catch (e) {
        console.error(`      ❌ ${e.message}`)
        errors.push(key)
      }
      await new Promise((r) => setTimeout(r, DELAY_MS / 2))
    }
  }

  // ── Write output ──────────────────────────────────────────────────────
  console.log(`\n\n📝 Writing ${total} results to ${PRESET_FILE}...`)

  // Read existing file to preserve toggle & imports
  const existing = readFileSync(PRESET_FILE, 'utf-8')

  // Build the PRESET_ANALYSES object literal
  const entries = Object.entries(results)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => {
      return `  '${key}': ${JSON.stringify(val, null, 2).replace(/\n/g, '\n    ')},`
    })
    .join('\n\n')

  // Replace the PRESET_ANALYSES block
  const re = /export const PRESET_ANALYSES: Record<string, AIAnalysisResult> = \{[\s\S]*?\n};/
  const replacement = `export const PRESET_ANALYSES: Record<string, AIAnalysisResult> = {\n${entries}\n};`

  const updated = existing.replace(re, replacement)

  writeFileSync(PRESET_FILE, updated, 'utf-8')

  console.log(`✅ Done! ${total} entries written.`)
  if (errors.length) {
    console.log(`⚠ ${errors.length} errors:`)
    errors.forEach((e) => console.log(`   - ${e}`))
  }
}

main().catch(console.error)

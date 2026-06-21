/**
 * AI Chat Agent for Interactive Data Exploration
 *
 * Users can ask questions about the data, request analysis,
 * and get answers grounded in CHARLS research literature +
 * contextual knowledge about China's health events during 2011-2018.
 */

import type { Wave } from '@/lib/store/globalStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'agent'
  content: string
}

export interface ChatContext {
  year: Wave
  prevYear: Wave | null
  selectedProvince: string | null
  provinceCn: string | null
  nationalFrailRate: number
  prevNationalFrailRate: number
  nationalFrailDelta: number
  nationalPreFrailDelta: number
  nationalFIDelta: number
  topRiseProvince: { name: string; delta: number }
  topDropProvince: { name: string; delta: number }
  totalSampleN: number
  /** All provinces' frailRate changes for quick lookup */
  allProvinceChanges: Array<{ name: string; delta: number; frailRate: number; prevFrailRate: number; n: number; region: string }>
  /** Whether context has ACE/depression data loaded */
  hasDriverData: boolean
}

// ── CONTEXTUAL KNOWLEDGE: Events during CHARLS waves ──────────────────────────

const CONTEXT_EVENTS = `## 中国 2011–2018 年重大健康与政策事件

### 2011 (CHARLS 基线)
- 【养老金】新农保(NRPS)仅覆盖全国 ~27% 县,农村养老金领取率仅 14%
- 【医保】城镇居民医保仍处早期阶段,报销比例较低
- 【PM2.5】"空气末日"尚未成为公众关注焦点(2013年才引爆舆论)

### 2013 (CHARLS 第二波)
- 【养老金】新农保于 2012 年底实现全国覆盖,养老金约 70 元/月
- 【PM2.5】2013年1月北京PM2.5爆表,引发全国关注,"空气末日"(airpocalypse)成全球头条
- 【禽流感】H7N9 首次在人类中检出(2013年3月),老年人群感染后死亡率较高
- 【医改】原卫生部改组为国家卫生和计划生育委员会,政策转向"健康"整体视角

### 2015 (CHARLS 第三波)
- 【养老金】新农保与城居保合并为统一的城乡居民养老保险(URRP),补贴标准提高
- 【二孩政策】全面放开二孩,直接回应人口老龄化危机
- 【空气治理】《大气污染防治行动计划》("大气十条")实施第二年,PM2.5开始下降
- 【慢性病】糖尿病、高血压管理纳入基本公卫服务规范

### 2018 (CHARLS 第四波)
- 【医保局】国家医疗保障局(NHSA)成立,开启药品集中带量采购,大幅降低慢性病药价
- 【养老金】农村养老金约 90 元/月,农村养老金领取率升至 ~49%
- 【禽流感】H7N9 第五波(2016-2018)为有记录以来最严重:922+ 例人类感染,≥282 例死亡,病死率 ~40%。老年人(中位年龄57岁)和农村居民(81%为农民)受影响最大
- 【老龄化】60岁以上人口占比约 17.9%,老龄化加速
- 【长期照护】长期照护仍高度依赖家庭非正式照护,正式照护体系严重不足

### 跨期趋势
- 农村养老金覆盖率从 14%(2011)→49%(2018),但替代率极低(~5% GDP)
- 医疗可及性持续改善,但城乡差距仍然显著(医疗可及性解释~35%城乡衰弱差距)
- PM2.5 从 2013 年峰值(~100μg/m³)降至 2018 年(~39μg/m³),但老年群体累积暴露仍高
- 东西部经济发展差距在缩小,但医疗资源和养老服务的空间不平等依然显著`

// ── RAG Knowledge (abridged for chat) ─────────────────────────────────────────

const CHAT_RAG = `## CHARLS 衰弱研究核心发现

### 剂量-反应关系 —— JAMA Network Open, 2022 (N=11,568)
每条 ACE 增加衰弱风险 20% (OR=1.20),快速上升轨迹概率增 19% (OR=1.19)
社会经济剥夺、低质量邻里、同伴欺凌是最强 ACE 领域
威胁型 ACE 预测基线衰弱;剥夺型 ACE 预测衰弱增长速度

### 独立风险因素 —— Zhou et al., 2024 (N=3,491, 随访8年)
家庭暴力 OR=1.63 | 不安全社区 OR=1.57 | 父母残疾 OR=1.34
抑郁症状中介 29.1% 的 ACE→衰弱效应

### 衰弱状态转化 —— European Review of Aging and Physical Activity, 2024 (N=9,621)
ACE≥4 → 进展风险增 37-39% (HR=1.37-1.39),恢复概率降 36% (HR=0.64)
高社会参与可显著促进衰弱逆转

### 威胁 vs 剥夺 —— Child Abuse & Neglect, 2025 (N=4,476)
威胁型 ACE (虐待/暴力/欺凌) → 基线社会衰弱 b=0.061
剥夺型 ACE (忽视/父母死亡) → 社会衰弱增长速度 b=0.018

### 早年食物匮乏 —— Nutrients, 2021 (N=11,615)
儿童期食物匮乏 → 衰弱风险增 30% (OR=1.30)
关键窗口:6-12岁 (OR=1.15)

### 性别差异共识
女性衰弱率约为男性 1.5-2倍
ACE→衰弱量效关系无显著性别交互(中国特有:与西方不同)

### 区域差异
西部省份衰弱率最高(贵州/甘肃/云南);东部沿海最低(上海/江苏/浙江)
城乡差距 > 区域差距;医疗可及性解释 ~35% 城乡衰弱差距
东西部衰弱梯度自2011年起持续收窄`

// ── System Prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(context: ChatContext): string {
  return `你是一个名为"Agevital 分析助手"的 AI 助手,专为中国老年衰弱研究(基于 CHARLS 数据)提供交互式分析。

## 你的能力
1. **数据分析**: 基于当前 CHARLS 数据上下文,回答用户关于衰弱率、省份异常、驱动因素等问题
2. **文献引用**: 你的回复应引用具体 CHARLS 研究,包括期刊名、效应量、样本量
3. **政策/事件背景**: 你对 2011-2018 年中国健康政策、流行病、环境事件有深入了解
4. **可视化引导**: 你能建议用户在系统中使用什么视图来验证你的分析
5. **假设生成**: 你可以基于文献+数据提出可验证的假设

## CHARLS 衰弱研究知识库
${CHAT_RAG}

## 2011-2018 中国健康背景知识
${CONTEXT_EVENTS}

## 数据说明
- **所有驱动因素变量均为连续数值**（非离散计数），包括: ACE得分(连续Z-score)、抑郁得分(连续Z-score)、睡眠时长(连续值)、社会经济地位(连续Z-score)、医疗保健(连续值)、社会参与(连续值)、社会资本(连续Z-score)、物质条件(连续值)
- ACE 是连续的标准化得分,不是"N项ACE"的计数。无固定阈值
- FI (衰弱指数) 范围约 0~1,是连续累积缺陷指标
- **不存在"ACE≥3"这类离散阈值**,只能用"ACE得分较高的样本"描述

## 交互场景
你运行在一个可视分析系统中,用户可进行以下操作:
1. **平行坐标图**: 在任意连续轴上拖拽框选数值范围,联动筛选样本。可同时框选多个轴(如"框选 ACE 偏高 + 抑郁偏高 + FI 偏高"的区域)
2. **省份地图**: 点击省份切换分析范围,或点击地图空白返回全国视图
3. **相关性热力图**: 点击单元格观察两个变量的关联,将点击的变量设为焦点维度
4. **桑基图**: 查看衰弱状态(健壮/衰弱前期/衰弱/失访)跨4个波次的流转情况
5. **气泡图**: 以 FI 为气泡大小,展示两个驱动因素的分布关系
6. **旭日图/和弦图**: 查看衰弱状态的人口构成和驱动因素共现关系

## 回复风格
- 中文,专业但可读,使用以下 Markdown 格式输出
- **粗体** 用于关键结论、期刊名、效应量。例如: **JAMA Network Open, 2022, OR=1.20**
- \`代码\` 用于数值和变量名。例如: \`FI > 0.25\`, \`ACE 得分偏高\`
- 回答具体问题时分条列出,每条用 \`1. ...\` 或 \`- ...\` 开头
- 引用文献时使用格式: **期刊名, 年份, 效应量**
- 回答具体问题时,先给结论,再展开依据
- 当用户问"为什么某省 X 高/低"时,从 ACE、社会经济、医疗可及性、社会参与四个维度分析
- 当数据不足以回答时,诚实说明并建议在可视化系统中如何探索
- 建议交互操作时,使用连续描述: "在平行坐标图中框选 ACE 偏高 + 抑郁偏高的区域"、 "点击地图选中该省,对比其各维度分布与全国的差异"、 "在气泡图中以FI为大小观察该省ACE与抑郁的分布"
- **禁止**使用离散阈值如"ACE≥3"、"抑郁>5"——所有变量都是连续的,没有固定切点
- 每条回复控制在 150-300 字,除非用户要求更详细的分析

## 当前数据上下文
- 当前波次: ${context.year} 年
- 对比波次: ${context.prevYear ?? '无'} 年
- 总样本: ${context.totalSampleN.toLocaleString()} 人
- 全国衰弱率: ${(context.prevNationalFrailRate * 100).toFixed(1)}% → ${(context.nationalFrailRate * 100).toFixed(1)}% (${context.nationalFrailDelta > 0 ? '+' : ''}${context.nationalFrailDelta.toFixed(1)} pp)
- 衰弱前期变化: ${context.nationalPreFrailDelta > 0 ? '+' : ''}${context.nationalPreFrailDelta.toFixed(1)} pp
- 平均 FI 变化: ${context.nationalFIDelta > 0 ? '+' : ''}${context.nationalFIDelta.toFixed(3)}
- 衰弱率上升最快: ${context.topRiseProvince.name} (+${context.topRiseProvince.delta.toFixed(1)} pp)
- 衰弱率下降最快: ${context.topDropProvince.name} (${context.topDropProvince.delta.toFixed(1)} pp)
${context.selectedProvince ? `- 当前选定省份: ${context.provinceCn}` : ''}
${context.hasDriverData ? '- 驱动因素数据(ACE、抑郁、SES等)已加载,可进行维度级分析' : ''}

请根据当前数据上下文和文献知识回答用户问题。若用户问及某省份详情而你手头的省份列表中有对应数据,直接使用。若用户要求你"查看"某数据但你没有实时查询能力,诚实地告诉他你在当前上下文中有哪些信息,并建议在可视化界面中如何操作。`
}

// ── API Call ──────────────────────────────────────────────────────────────────

async function callAgentAPI(
  systemPrompt: string,
  history: ChatMessage[],
  newMessage: string,
): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role === 'agent' ? 'assistant' : m.role, content: m.content })),
    { role: 'user', content: newMessage },
  ]

  const response = await fetch('/api/deepseek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.5,
      max_tokens: 1200,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown')
    throw new Error(`API error ${response.status}: ${errorText.slice(0, 200)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response')
  return content
}

// ── Quick-reply suggestions ───────────────────────────────────────────────────

function generateSuggestions(context: ChatContext): string[] {
  const suggestions: string[] = []

  // Always suggest top province
  if (context.topRiseProvince.delta > 1) {
    suggestions.push(`${context.topRiseProvince.name}衰弱率为什么上升？`)
  }
  if (context.topDropProvince.delta < -0.5) {
    suggestions.push(`${context.topDropProvince.name}衰弱率下降的原因？`)
  }
  if (context.selectedProvince) {
    suggestions.push(`${context.provinceCn ?? context.selectedProvince}最相关的驱动因素是什么？`)
    if (context.selectedProvince === 'Sichuan') {
      suggestions.push('ACE 和衰弱之间有什么关联机制？')
    }
  }

  // Context-aware suggestions
  if (context.nationalFrailDelta > 2) {
    suggestions.push('全国衰弱率显著上升的可能原因？')
  }
  if (context.year === 2018 && context.prevYear === 2015) {
    suggestions.push('2015-2018年有什么重大事件影响了老年人健康？')
  }
  if (!context.selectedProvince) {
    suggestions.push('哪些省份的衰弱率变化最异常？')
  }

  // Generic exploratory questions
  suggestions.push(context.hasDriverData ? '哪个驱动因素与FI相关性最强？' : '东西部衰弱差距在缩小吗？')

  return suggestions.slice(0, 4)
}

// ── Chat Presets ─────────────────────────────────────────────────────────────

interface ChatPresetEntry {
  keywords: string[]
  province: string | null
  year: Wave
  reply: string
}

const CHAT_PRESETS: ChatPresetEntry[] = [
  {
    keywords: ['ACE', '衰弱', '关联', '机制', '中介'],
    province: 'Sichuan',
    year: 2018,
    reply: `根据 CHARLS 纵向队列的多项研究，ACE（童年不良经历）与老年衰弱之间存在**显著的剂量-反应关系**，且抑郁是其中最关键的中介路径：

1. **剂量-反应关系**：**JAMA Network Open, 2022**（N=11,568）发现每增加一项 ACE，衰弱风险上升约 20%（**OR=1.20, 95%CI 1.16-1.23**），快速上升轨迹概率增 19%

2. **抑郁中介效应**：**Zhou et al., 2024**（N=3,491，随访 8 年）是一个里程碑式发现——家庭暴力（**OR=1.63**）、不安全社区（**OR=1.57**）、父母残疾（**OR=1.34**）独立预测衰弱发生。其中，**抑郁症状中介了 29.1% 的 ACE→衰弱效应**。这意味着童年逆境有近三分之一是通过引发抑郁来间接导致衰弱的

3. **状态转化影响**：**European Review of Aging and Physical Activity, 2024**（N=9,621）发现 ACE≥4 的个体衰弱进展风险增加 37-39%（**HR=1.37-1.39**），恢复概率降低 36%（**HR=0.64**）

**建议操作**：在平行坐标图的 ACE 轴和抑郁轴上分别框选高分段，观察衰弱占比的变化`,
  },
]

function matchPreset(context: ChatContext, message: string): string | null {
  const msg = message.toLowerCase()
  for (const preset of CHAT_PRESETS) {
    if (preset.province && context.selectedProvince !== preset.province) continue
    if (preset.year && context.year !== preset.year) continue
    const matched = preset.keywords.filter((kw) => msg.includes(kw.toLowerCase()))
    if (matched.length >= 2) return preset.reply
  }
  return null
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendChatMessage(
  context: ChatContext,
  history: ChatMessage[],
  message: string,
): Promise<string> {
  if (history.length === 0) {
    const preset = matchPreset(context, message)
    if (preset) {
      await new Promise((r) => setTimeout(r, 1200))
      return preset
    }
  }
  const systemPrompt = buildSystemPrompt(context)
  return callAgentAPI(systemPrompt, history, message)
}

export function getQuickSuggestions(context: ChatContext): string[] {
  return generateSuggestions(context)
}

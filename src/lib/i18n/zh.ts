/** 界面与数据标签中文映射 */

export const FRAILTY_STATE: Record<string, string> = {
  robust: '健壮',
  'pre-frail': '衰弱前期',
  frail: '衰弱',
  death: '死亡',
  lost: '失访/缺失',
}

export const REGION: Record<string, string> = {
  East: '东部',
  Central: '中部',
  West: '西部',
  NorthEast: '东北',
}

export const REGION_HINT: Record<string, string> = {
  East: '沿海 · 社会经济较高',
  Central: '内陆 · 农业地带',
  West: '山地 · 社会经济较低',
  NorthEast: '寒带 · 工业遗产',
}

export const PROVINCE: Record<string, string> = {
  Anhui: '安徽',
  Beijing: '北京',
  Chongqing: '重庆',
  Fujian: '福建',
  Gansu: '甘肃',
  Guangdong: '广东',
  Guangxi: '广西',
  Guizhou: '贵州',
  Hainan: '海南',
  Hebei: '河北',
  Heilongjiang: '黑龙江',
  Henan: '河南',
  Hubei: '湖北',
  Hunan: '湖南',
  'Inner Mongolia': '内蒙古',
  Jiangsu: '江苏',
  Jiangxi: '江西',
  Jilin: '吉林',
  Liaoning: '辽宁',
  Ningxia: '宁夏',
  Qinghai: '青海',
  Shaanxi: '陕西',
  Shandong: '山东',
  Shanghai: '上海',
  Shanxi: '山西',
  Sichuan: '四川',
  Tibet: '西藏',
  Tianjin: '天津',
  Xinjiang: '新疆',
  Yunnan: '云南',
  Zhejiang: '浙江',
  Taiwan: '台湾',
  'Hong Kong': '香港',
  Macau: '澳门',
}

export const FACTOR: Record<string, string> = {
  Education: '受教育程度',
  'Household Assets': '家庭资产',
  'Sleep Hours': '睡眠时长',
  'Sleep Trouble': '睡眠困扰',
  'Depression (CES-D)': '抑郁（CES-D）',
  'ACE Sum': '童年逆境指数',
  'Social Participation': '社会参与',
  'Insurance Coverage': '医疗保险覆盖',
}

export const FACTOR_CATEGORY: Record<string, string> = {
  SES: '社会经济',
  Sleep: '睡眠',
  Mood: '情绪',
  ACE: '童年逆境',
  Social: '社会参与',
}

export const SYMPTOM: Record<string, { label: string; desc: string }> = {
  fatigue: { label: '疲劳与自评健康差', desc: '自评健康为差/很差。' },
  fall: { label: '跌倒风险', desc: '步行1公里或从椅子站起困难。' },
  weight_loss: { label: '分解代谢负担', desc: '糖尿病或癌症史（分解代谢代理指标）。' },
  adl: { label: '日常生活能力受限', desc: '穿衣/洗澡/进食/上下床/如厕任一受限。' },
}

export const DONUT: Record<string, string> = {
  'Social Activity': '社交活动',
  'Sleep 6-9 h': '睡眠 6–9 小时',
  'Regular Exercise': '规律锻炼',
  'Care Support': '照护支持',
}

export const ISOTYPE: Record<string, string> = {
  East: '东部地区',
  Central: '中部地区',
  West: '西部地区',
  'East Region': '东部地区',
  'Central Region': '中部地区',
  'West Region': '西部地区',
}

export const CONDITION: Record<string, string> = {
  hypertension: '高血压',
  diabetes: '糖尿病',
  heart: '心脏病',
  stroke: '中风',
  arthritis: '关节炎',
  lung: '肺部疾病',
}

export const BODY_DOMAIN: Record<string, string> = {
  brain: '认知 · 情绪',
  vision: '感觉 · 视力',
  heart: '心血管',
  lung: '呼吸系统',
  metabolic: '代谢',
  joint: '肌肉骨骼',
  muscle: '日常生活能力',
}

export const GENDER: Record<string, string> = {
  female: '女性',
  male: '男性',
  unknown: '未知',
}

export function tFrailty(state: string): string {
  return FRAILTY_STATE[state] ?? state
}

export function tRegion(region: string): string {
  return REGION[region] ?? region
}

export function tProvince(province: string): string {
  return PROVINCE[province] ?? province
}

export function tFactor(factor: string): string {
  return FACTOR[factor] ?? factor
}

export function tCategory(cat: string): string {
  return FACTOR_CATEGORY[cat] ?? cat
}

export function tSymptom(key: string, fallback?: string): string {
  return SYMPTOM[key]?.label ?? fallback ?? key
}

export function tSymptomDesc(key: string, fallback?: string): string {
  return SYMPTOM[key]?.desc ?? fallback ?? ''
}

export function tDonut(name: string): string {
  return DONUT[name] ?? name
}

export function tIsotype(label: string): string {
  return ISOTYPE[label] ?? label
}

export function tCondition(key: string): string {
  return CONDITION[key] ?? key
}

export function tBodyDomain(domain: string): string {
  return BODY_DOMAIN[domain] ?? domain
}

export function tGender(g: string): string {
  return GENDER[g] ?? g
}

export const DRIVER_DIM: Record<string, string> = {
  ace: 'ACE 得分',
  sleep: '睡眠时长',
  social: '社会联系',
  depression: '抑郁得分',
  fi: '衰弱指数 (FI)',
}

export const BOX_GROUP: Record<string, string> = {
  alone: '按独居分组',
  frailty_cat: '按衰弱状态',
  ace_tier: '按 ACE 水平',
  depression_tier: '按抑郁水平',
  not_alone: '非独居',
  alone_yes: '独居',
  robust: '健壮',
  'pre-frail': '衰弱前期',
  frail: '衰弱',
  low_ace: '低 ACE',
  high_ace: '高 ACE',
  low_dep: '低抑郁',
  high_dep: '高抑郁',
}

export const DETAIL_TAB: Record<string, string> = {
  sankey: '桑基图',
  scatter: '散点图',
  bubble: '气泡图',
  sunburst: '旭日图',
  chord: '和弦图',
}

export function tDriverDim(key: string): string {
  return DRIVER_DIM[key] ?? key
}

export function tBoxGroup(key: string): string {
  if (key === 'not_alone') return '非独居'
  if (key === 'alone') return '独居'
  return BOX_GROUP[key] ?? key
}

export function tBoxGroupOption(key: string): string {
  return BOX_GROUP[key] ?? key
}

export function tDetailTab(tab: string): string {
  return DETAIL_TAB[tab] ?? tab
}

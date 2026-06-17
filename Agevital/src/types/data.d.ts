export type Wave = 2011 | 2013 | 2015 | 2018
export type FrailtyState = 'robust' | 'pre-frail' | 'frail' | 'death' | 'lost'

export type SankeyLayerType = 'factor' | 'baseline' | 'evolution' | 'outcome'

export interface SankeyNode {
  id: string
  layer: number
  layerType: SankeyLayerType
  state: string
  label: string
  wave?: Wave
  count: number
}

export interface SankeyLink {
  source: string
  target: string
  value: number
  prob: number
  anomaly?: 'jump' | 'recovery' | null
}

export interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
  cohort_n: number
  generated_at: string
  meta?: {
    startWave: Wave
    midWave: Wave
    endWave: Wave
  }
}

export interface AnomalyPath {
  id: string
  kind: 'jump' | 'recovery'
  path: string[]
  share: number
  value: number
  description: string
}

export interface TrendPoint {
  year: Wave
  robust: number
  preFrail: number
  frail: number
  total: number
  frailRate: number
}

export interface KpiPayload {
  year: Wave
  status: FrailtyState | 'all'
  n: number
  frailRate: number
  preFrailRate: number
  meanFI: number
  meanAge?: number
  femaleRate?: number
  ruralRate?: number
}

export interface ProvinceDatum {
  province: string
  code: string
  region: 'East' | 'Central' | 'West' | 'Unknown'
  n: number
  meanFI: number
  frailRate: number
  preFrailRate: number
  robustRate: number
  malePct: number | null
  urbanPct: number | null
}

export interface BodyDomain {
  domain: 'brain' | 'heart' | 'lung' | 'joint' | 'muscle' | 'metabolic' | 'vision'
  label: string
  prevalence: number
  meanFI: number
}

export interface IsotypeRow {
  group: string
  rate: number
  label?: string
}

export interface DonutSlice {
  name: string
  value: number
  detail?: string
}

export interface BoxStripPoint {
  id: string
  region: 'East' | 'Central' | 'West'
  fi: number
  age?: number
  gender?: 'male' | 'female'
  rural?: 0 | 1
}

export interface BoxStripPayload {
  stats: {
    region: string
    min: number
    q1: number
    median: number
    q3: number
    max: number
    n: number
  }[]
  points: BoxStripPoint[]
}

export interface FactorMatrixCell {
  factor: string
  rho: number
  pvalue: number
  category: 'SES' | 'Sleep' | 'Mood' | 'ACE' | 'Social'
}

export interface EmpathyVignette {
  domain: BodyDomain['domain']
  text: string
  protagonist?: string
}

export interface ClassicSymptom {
  key: 'fatigue' | 'fall' | 'weight_loss' | 'adl'
  label: string
  prevalence: number
  desc: string
}

export interface SmallMultipleRegion {
  region: 'East' | 'Central' | 'West' | 'NorthEast'
  n: number
  frailN: number
  frailRate: number
}

export interface DeficitNetworkNode {
  id: string
  label: string
  category: '慢性病' | '自评' | 'ADL' | 'IADL' | '体能' | '感官'
  n: number
  prevalence: number
  validN?: number
}

export interface DeficitNetworkLink {
  source: string
  target: string
  value: number
  prob: number
}

export interface DeficitNetworkPayload {
  year: Wave
  sampleN: number
  nodes: DeficitNetworkNode[]
  links: DeficitNetworkLink[]
}

export type CohortRow = number[]
export interface CohortTable {
  fields: string[]
  rows: CohortRow[]
  n: number
}

export type DriverDimension = 'ace' | 'sleep' | 'social' | 'depression' | 'fi' | 'ses' | 'healthcare' | 'activity' | 'scap' | 'material'

export interface CorrelationMatrixPayload {
  labels: string[]
  keys: DriverDimension[]
  matrix: (number | null)[][]
  n: number
}

export interface DriverRecord {
  id: string
  ace: number
  sleep: number
  social: number
  depression: number
  fi: number
  ses: number
  healthcare: number
  activity: number
  scap: number
  material: number
  frailty_cat: string
  alone: 0 | 1
  gender?: 'male' | 'female' | null
  rural?: 0 | 1 | null
  province?: string | null
}

export interface DriverRecordsPayload {
  fields: string[]
  rows: (string | number | null)[][]
  n: number
  totalN: number
  sampled: boolean
  ranges: Partial<Record<DriverDimension, [number, number]>>
}

export interface DriverSankeyPayload {
  nodes: SankeyNode[]
  links: SankeyLink[]
  cohort_n: number
  generated_at: string
  meta?: {
    startWave: Wave
    midWave: Wave
    endWave: Wave
  }
}

export interface DriverChordPayload {
  labels: string[]
  keys: string[]
  matrix: number[][]
  n: number
}

export interface DeficitProvincePayload {
  deficits: string[]
  labels: Record<string, string>
  data: Record<string, Record<string, number>>
}

export interface CityDatum {
  city: string
  cityCn: string
  province: string
  region: 'East' | 'Central' | 'West' | 'Unknown'
  lng: number | null
  lat: number | null
  n: number
  meanFI: number
  frailRate: number
  preFrailRate: number
  robustRate: number
  malePct: number | null
  urbanPct: number | null
}

export interface DeficitCityEntry {
  cityCn: string
  lng: number | null
  lat: number | null
  deficits: Record<string, number>
}

export interface DeficitCityPayload {
  deficits: string[]
  labels: Record<string, string>
  data: Record<string, DeficitCityEntry>
}

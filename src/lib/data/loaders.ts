import type {
  SankeyData,
  AnomalyPath,
  TrendPoint,
  KpiPayload,
  ProvinceDatum,
  BodyDomain,
  IsotypeRow,
  DonutSlice,
  BoxStripPayload,
  FactorMatrixCell,
  EmpathyVignette,
  ClassicSymptom,
  SmallMultipleRegion,
  DeficitNetworkPayload,
  Wave,
  CohortTable,
  CorrelationMatrixPayload,
  DriverRecordsPayload,
  DriverSankeyPayload,
  DriverChordPayload,
} from '@/types/data'

const BASE = `${import.meta.env.BASE_URL}data/`

async function loadJSON<T>(name: string): Promise<T> {
  const res = await fetch(`${BASE}${name}`)
  if (!res.ok) throw new Error(`Failed to load ${name}: ${res.status}`)
  return (await res.json()) as T
}

export const loadSankey = () => loadJSON<SankeyData>('sankey_transitions.json')
export const loadAnomalies = () => loadJSON<AnomalyPath[]>('anomaly_paths.json')
export const loadTrend = () => loadJSON<TrendPoint[]>('trend_stacked.json')
export const loadVignettes = () => loadJSON<EmpathyVignette[]>('empathy_vignettes.json')
export const loadCohort = () => loadJSON<CohortTable>('trajectories_cohort.json')

export const loadKpi = (y: Wave) => loadJSON<KpiPayload>(`kpi_${y}.json`)
export const loadProvinces = (y: Wave) => loadJSON<ProvinceDatum[]>(`map_province_${y}.json`)
export const loadBody = (y: Wave) => loadJSON<BodyDomain[]>(`body_domains_${y}.json`)
export const loadIsotype = (y: Wave) => loadJSON<IsotypeRow[]>(`isotype_region_${y}.json`)
export const loadDonut = (y: Wave) => loadJSON<DonutSlice[]>(`donut_daily_${y}.json`)
export const loadBoxStrip = (y: Wave) => loadJSON<BoxStripPayload>(`boxplot_region_${y}.json`)
export const loadFactors = (y: Wave) => loadJSON<FactorMatrixCell[]>(`factor_matrix_${y}.json`)
export const loadSymptoms = (y: Wave) => loadJSON<ClassicSymptom[]>(`symptoms_${y}.json`)
export const loadSmallMultiples = (y: Wave) =>
  loadJSON<SmallMultipleRegion[]>(`small_multiples_${y}.json`)
export const loadDeficitNetwork = (y: Wave) =>
  loadJSON<DeficitNetworkPayload>(`deficit_network_${y}.json`)

export const loadCorrelationMatrix = (y: Wave) =>
  loadJSON<CorrelationMatrixPayload>(`correlation_matrix_${y}.json`)
export const loadDriverRecords = (y: Wave) =>
  loadJSON<DriverRecordsPayload>(`driver_records_${y}.json`)
export const loadDriverSankey = (y: Wave) =>
  loadJSON<DriverSankeyPayload>(`driver_sankey_${y}.json`)
export const loadDriverChord = (y: Wave) =>
  loadJSON<DriverChordPayload>(`driver_chord_${y}.json`)

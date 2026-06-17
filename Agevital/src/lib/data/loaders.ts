import type {
  ProvinceDatum,
  CityDatum,
  DeficitNetworkPayload,
  DeficitProvincePayload,
  DeficitCityPayload,
  Wave,
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

export const loadProvinces = (y: Wave) => loadJSON<ProvinceDatum[]>(`map_province_${y}.json`)
export const loadCities = (y: Wave) => loadJSON<CityDatum[]>(`map_city_${y}.json`)

export const loadDeficitNetwork = (y: Wave) =>
  loadJSON<DeficitNetworkPayload>(`deficit_network_${y}.json`)
export const loadDeficitProvince = (y: Wave) =>
  loadJSON<DeficitProvincePayload>(`deficit_province_${y}.json`)
export const loadDeficitCity = (y: Wave) =>
  loadJSON<DeficitCityPayload>(`deficit_city_${y}.json`)

export const loadCorrelationMatrix = (y: Wave) =>
  loadJSON<CorrelationMatrixPayload>(`correlation_matrix_${y}.json`)
export const loadDriverRecords = (y: Wave) =>
  loadJSON<DriverRecordsPayload>(`driver_records_${y}.json`)
export const loadDriverSankey = (y: Wave) =>
  loadJSON<DriverSankeyPayload>(`driver_sankey_${y}.json`)
export const loadDriverChord = (y: Wave) =>
  loadJSON<DriverChordPayload>(`driver_chord_${y}.json`)

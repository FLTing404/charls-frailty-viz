import { create } from 'zustand'

export type Wave = 2011 | 2013 | 2015 | 2018
export type FrailtyStatus = 'robust' | 'pre-frail' | 'frail'
export type Condition = 'hypertension' | 'diabetes' | 'heart' | 'stroke' | 'arthritis' | 'lung'

export interface GlobalState {
  year: Wave
  status: FrailtyStatus | null
  province: string | null
  region: 'East' | 'Central' | 'West' | null
  bundledConditions: Condition[]
  cohortMode: 'all' | 'tracked'
  anomalyOn: boolean
  timeSpan: [Wave, Wave]
  brushedIds: string[]
  set: (patch: Partial<GlobalState>) => void
  reset: () => void
}

const initial: Omit<GlobalState, 'set' | 'reset'> = {
  year: 2018,
  status: null,
  province: null,
  region: null,
  bundledConditions: [],
  cohortMode: 'all',
  anomalyOn: true,
  timeSpan: [2011, 2018],
  brushedIds: [],
}

export const useGlobalStore = create<GlobalState>((set) => ({
  ...initial,
  set: (patch) => set(patch),
  reset: () => set(initial),
}))

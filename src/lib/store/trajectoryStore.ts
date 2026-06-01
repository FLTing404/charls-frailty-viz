import { create } from 'zustand'
import type { DriverDimension } from '@/types/data'

export type FocusDimension = Exclude<DriverDimension, 'fi'> | null
export type BoxGroupBy = 'alone' | 'frailty_cat' | 'ace_tier' | 'depression_tier'
export type DetailTab = 'sankey' | 'scatter' | 'bubble' | 'sunburst' | 'chord'

export interface TrajectoryState {
  focusDimension: FocusDimension
  brushedIds: string[]
  boxGroupBy: BoxGroupBy
  detailTab: DetailTab
  set: (patch: Partial<Omit<TrajectoryState, 'set' | 'reset'>>) => void
  resetBrush: () => void
  reset: () => void
}

const initial: Omit<TrajectoryState, 'set' | 'resetBrush' | 'reset'> = {
  focusDimension: null,
  brushedIds: [],
  boxGroupBy: 'alone',
  detailTab: 'sankey',
}

export const useTrajectoryStore = create<TrajectoryState>((set) => ({
  ...initial,
  set: (patch) => set(patch),
  resetBrush: () => set({ brushedIds: [] }),
  reset: () => set(initial),
}))

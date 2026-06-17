import { ChinaVisGeoMap } from '@/components/charts/ChinaVisGeoMap'
import { DeficitForceGraph } from '@/components/charts/DeficitForceGraph'
import type { DeficitNetworkPayload, ProvinceDatum } from '@/types/data'

interface SnapshotGeoStageProps {
  provinces: ProvinceDatum[]
  deficitNetwork: DeficitNetworkPayload | null
}

export function SnapshotGeoStage({ provinces, deficitNetwork }: SnapshotGeoStageProps) {
  return (
    <div className="relative min-h-0 flex-1">
      <ChinaVisGeoMap data={provinces} className="absolute inset-0 z-0" />

      {deficitNetwork && (
        <aside className="pointer-events-none absolute inset-y-3 right-3 z-10 flex w-[min(32%,340px)] min-w-[220px] flex-col">
          <div className="pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-ink/10 bg-paper-alt/78 shadow-ink backdrop-blur-[2px]">
            <DeficitForceGraph data={deficitNetwork} className="min-h-0 flex-1" />
          </div>
        </aside>
      )}
    </div>
  )
}

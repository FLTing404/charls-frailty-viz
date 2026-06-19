import { useMemo, useState } from 'react'
import { ChinaVisGeoMap } from '@/components/charts/ChinaVisGeoMap'
import { DeficitForceGraph } from '@/components/charts/DeficitForceGraph'
import { ProvinceRankBar } from '@/components/charts/ProvinceRankBar'
import type { BubbleDatum } from '@/lib/charts/chinaVisGeoOption'
import type { DeficitNetworkPayload, DeficitProvincePayload, DeficitCityPayload, ProvinceDatum } from '@/types/data'

interface SnapshotGeoStageProps {
  provinces: ProvinceDatum[]
  deficitNetwork: DeficitNetworkPayload | null
  deficitProvince: DeficitProvincePayload | null
  deficitCity: DeficitCityPayload | null
  onProvinceClick?: (province: string) => void
}

export function SnapshotGeoStage({
  provinces,
  deficitNetwork,
  deficitProvince,
  deficitCity,
  onProvinceClick,
}: SnapshotGeoStageProps) {
  const [selectedDeficit, setSelectedDeficit] = useState<string | null>(null)

  // Always select — click same node re-selects (no toggle). × badge clears.
  const handleDeficitClick = (id: string) => setSelectedDeficit(id)

  // Derive bubble scatter data when a deficit is selected.
  // The choropleth always shows frailty rate — only city-level bubbles are overlaid.
  const { bubbleData, bubbleLabel } = useMemo(() => {
    if (!selectedDeficit || !deficitCity) {
      return {
        bubbleData: null as BubbleDatum[] | null,
        bubbleLabel: undefined as string | undefined,
      }
    }
    const cData = deficitCity.data
    const label = deficitCity.labels[selectedDeficit] ?? selectedDeficit

    // Build bubble data: one point per city, sized by deficit rate
    const bubbles: BubbleDatum[] = []
    for (const [cityEn, cityEntry] of Object.entries(cData)) {
      if (!cityEntry.lng || !cityEntry.lat) continue  // skip cities without coordinates
      const rate = cityEntry.deficits[selectedDeficit]
      if (rate != null && rate > 0) {
        bubbles.push({
          name: cityEntry.cityCn,
          lng: cityEntry.lng,
          lat: cityEntry.lat,
          rate,
        })
      }
    }

    return {
      bubbleData: bubbles,
      bubbleLabel: label + '患病率（城市）',
    }
  }, [selectedDeficit, deficitCity])

  return (
    <div className="relative min-h-0 flex-1">
      <ChinaVisGeoMap
        data={provinces}
        className="absolute inset-0 z-0"
        onProvinceClick={(p) => p && onProvinceClick?.(p)}
        bubbleData={bubbleData}
        bubbleLabel={bubbleLabel}
      />

      {/* Bubble badge — shows which deficit's city-level bubbles are active */}
      {selectedDeficit && deficitCity && (
        <div className="pointer-events-none absolute left-[clamp(212px,25%,312px)] top-2 z-10 flex items-center gap-1.5 rounded-sm border border-cinnabar/40 bg-paper-alt/92 px-2 py-1 backdrop-blur-[2px]">
          <span className="font-serif text-[9px] text-cinnabar">城市气泡：{deficitCity.labels[selectedDeficit]}患病率
          </span>
          <button
            type="button"
            className="pointer-events-auto text-ink-stone hover:text-cinnabar"
            onClick={() => setSelectedDeficit(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Left sidebar: province ranking bar chart */}
      {provinces.length > 0 && (
        <aside className="pointer-events-none absolute inset-y-1 left-1 z-10 flex w-[clamp(200px,24%,300px)] flex-col">
          <div className="pointer-events-auto flex min-h-0 flex-1 flex-col rounded-sm border border-ink/10 bg-paper-alt/78 backdrop-blur-[2px]">
            <ProvinceRankBar
              key={selectedDeficit ?? 'frail'}
              provinces={provinces}
              deficitProvince={deficitProvince}
              selectedDeficit={selectedDeficit}
              className="min-h-0 flex-1"
            />
          </div>
        </aside>
      )}

      {deficitNetwork && (
        <aside className="pointer-events-none absolute inset-y-1 right-1 z-10 flex w-[clamp(240px,28%,360px)] flex-col">
          <div className="pointer-events-auto flex min-h-0 flex-1 flex-col rounded-sm border border-ink/10 bg-paper-alt/78 backdrop-blur-[2px]">
            <DeficitForceGraph
              data={deficitNetwork}
              selectedDeficit={selectedDeficit}
              onNodeClick={handleDeficitClick}
              className="min-h-0 flex-1"
            />
          </div>
        </aside>
      )}

    </div>
  )
}

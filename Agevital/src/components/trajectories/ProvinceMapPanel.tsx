import { ChinaVisGeoMap } from '@/components/charts/ChinaVisGeoMap'
import type { ProvinceDatum } from '@/types/data'

interface ProvinceMapPanelProps {
  provinces: ProvinceDatum[]
  selectedProvince: string | null
  onProvinceClick: (province: string | null) => void
}

export function ProvinceMapPanel({
  provinces,
  selectedProvince,
  onProvinceClick,
}: ProvinceMapPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[8px] tracking-widest text-ink-stone">省份分布</span>
        {selectedProvince && (
          <button
            type="button"
            onClick={() => onProvinceClick(null)}
            className="text-[8px] text-cinnabar hover:underline"
          >
            清除筛选 ×
          </button>
        )}
      </div>

      {/* Map */}
      <div className="min-h-0 flex-1">
        <ChinaVisGeoMap
          data={provinces}
          showStats
          selectedProvince={selectedProvince}
          onProvinceClick={onProvinceClick}
          className="h-full"
        />
      </div>
    </div>
  )
}

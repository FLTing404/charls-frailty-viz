import { ChinaVisGeoMap } from '@/components/charts/ChinaVisGeoMap'
import { tProvince } from '@/lib/i18n/zh'
import { formatPercent } from '@/lib/utils'
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
  const sel = selectedProvince
    ? provinces.find((p) => p.province === selectedProvince) ?? null
    : null

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] tracking-widest text-ink-stone">省份分布</span>
        {selectedProvince && (
          <button
            type="button"
            onClick={() => onProvinceClick(null)}
            className="text-[9px] text-cinnabar hover:underline"
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

      {/* Stats panel — shows selected province or national summary */}
      <div className="shrink-0 border-t border-ink/10 pt-1.5">
        {sel ? (
          <ProvinceStat datum={sel} />
        ) : (
          <NationalStat provinces={provinces} />
        )}
      </div>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px] text-ink-stone">{label}</span>
      <span className="font-serif text-[11px] tabular-nums text-ink">{value}</span>
    </div>
  )
}

function ProvinceStat({ datum }: { datum: ProvinceDatum }) {
  return (
    <div className="space-y-0.5">
      <p className="mb-1 font-serif text-[11px] font-semibold text-ink">
        {tProvince(datum.province)}
      </p>
      <StatRow label="衰弱率" value={formatPercent(datum.frailRate, 1)} />
      <StatRow label="衰弱前期" value={formatPercent(datum.preFrailRate, 1)} />
      <StatRow label="样本量" value={`${datum.n.toLocaleString()} 人`} />
      <StatRow
        label="男性比"
        value={datum.malePct != null ? formatPercent(datum.malePct, 1) : '—'}
      />
      <StatRow
        label="城镇比"
        value={datum.urbanPct != null ? formatPercent(datum.urbanPct, 1) : '—'}
      />
    </div>
  )
}

function NationalStat({ provinces }: { provinces: ProvinceDatum[] }) {
  if (!provinces.length)
    return <p className="text-[9px] text-ink-stone">加载中…</p>

  const totalN = provinces.reduce((s, p) => s + p.n, 0)
  const avgFrail =
    provinces.reduce((s, p) => s + p.frailRate * p.n, 0) / (totalN || 1)
  const avgPreFrail =
    provinces.reduce((s, p) => s + p.preFrailRate * p.n, 0) / (totalN || 1)
  const maleProvinces = provinces.filter((p) => p.malePct != null)
  const avgMale =
    maleProvinces.length
      ? maleProvinces.reduce((s, p) => s + p.malePct! * p.n, 0) /
        maleProvinces.reduce((s, p) => s + p.n, 0)
      : null
  const urbanProvinces = provinces.filter((p) => p.urbanPct != null)
  const avgUrban =
    urbanProvinces.length
      ? urbanProvinces.reduce((s, p) => s + p.urbanPct! * p.n, 0) /
        urbanProvinces.reduce((s, p) => s + p.n, 0)
      : null

  return (
    <div className="space-y-0.5">
      <p className="mb-1 font-serif text-[9px] tracking-widest text-ink-stone">全国</p>
      <StatRow label="衰弱率" value={formatPercent(avgFrail, 1)} />
      <StatRow label="衰弱前期" value={formatPercent(avgPreFrail, 1)} />
      <StatRow label="样本量" value={`${totalN.toLocaleString()} 人`} />
      <StatRow
        label="男性比"
        value={avgMale != null ? formatPercent(avgMale, 1) : '—'}
      />
      <StatRow
        label="城镇比"
        value={avgUrban != null ? formatPercent(avgUrban, 1) : '—'}
      />
    </div>
  )
}

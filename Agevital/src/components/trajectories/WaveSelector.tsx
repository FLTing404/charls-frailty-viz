import { useGlobalStore, type Wave } from '@/lib/store/globalStore'
import { formatNumber, formatPercent } from '@/lib/utils'
import { tProvince } from '@/lib/i18n/zh'
import type { ProvinceDatum } from '@/types/data'

const WAVES: Wave[] = [2011, 2013, 2015, 2018]

interface WaveSelectorProps {
  sampleN: number
  totalN: number
  sampled?: boolean
  selectedProvince: string | null
  provinces: ProvinceDatum[]
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px] text-ink-stone">{label}</span>
      <span className="font-serif text-[11px] tabular-nums text-ink">{value}</span>
    </div>
  )
}

export function WaveSelector({ sampleN, totalN, sampled, selectedProvince, provinces }: WaveSelectorProps) {
  const { year, set } = useGlobalStore()

  // Compute province stats
  const sel = selectedProvince
    ? provinces.find((p) => p.province === selectedProvince) ?? null
    : null

  return (
    <div className="flex flex-col gap-3 p-2">
      <div>
        <p className="text-[9px] tracking-widest text-ink-stone">调查波次</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {WAVES.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => set({ year: w })}
              className={`border px-2 py-1 text-[11px] tabular-nums transition-colors ${
                year === w
                  ? 'border-cinnabar bg-cinnabar/10 text-cinnabar-deep'
                  : 'border-ink/15 text-ink-wash hover:border-ink/30'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-ink/10 pt-2">
        <p className="text-[9px] tracking-widest text-ink-stone">样本量</p>
        <p className="mt-1 font-serif text-lg text-ink">{formatNumber(sampleN)}</p>
        <p className="text-[10px] text-ink-stone">
          {totalN !== sampleN ? `筛选后 ${formatNumber(sampleN)} / 总体 ${formatNumber(totalN)}` : `有效样本 ${formatNumber(totalN)}`}
        </p>
      </div>

      {/* Province stats — replaces 变量说明 */}
      <div className="border-t border-ink/10 pt-2">
        {sel ? (
          <div className="space-y-0.5">
            <p className="mb-1 font-serif text-[11px] font-semibold text-ink">
              {tProvince(sel.province)}
            </p>
            <StatRow label="衰弱率" value={formatPercent(sel.frailRate, 1)} />
            <StatRow label="衰弱前期" value={formatPercent(sel.preFrailRate, 1)} />
            <StatRow label="样本量" value={`${sel.n.toLocaleString()} 人`} />
            <StatRow
              label="男性比"
              value={sel.malePct != null ? formatPercent(sel.malePct, 1) : '—'}
            />
            <StatRow
              label="城镇比"
              value={sel.urbanPct != null ? formatPercent(sel.urbanPct, 1) : '—'}
            />
          </div>
        ) : provinces.length > 0 ? (
          (() => {
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
          })()
        ) : (
          <p className="text-[9px] text-ink-stone">加载中…</p>
        )}
      </div>
    </div>
  )
}

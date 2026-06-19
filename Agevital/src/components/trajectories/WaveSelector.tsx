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

function Bar({ pct, tone }: { pct: number; tone: 'frail' | 'preFrail' | 'urban' }) {
  const color =
    tone === 'frail'
      ? 'bg-cinnabar'
      : tone === 'preFrail'
        ? 'bg-amber_ink'
        : 'bg-indigo_ink'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/8">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
    </div>
  )
}

/** 50 ♂♀ icons in proportion — bold */
function GenderBar({ malePct }: { malePct: number }) {
  const total = 50
  const maleCount = Math.round((malePct / 100) * total)
  const femaleCount = total - maleCount
  return (
    <div className="flex flex-wrap gap-0.5 leading-none">
      {Array.from({ length: maleCount }, (_, i) => (
        <span key={`m-${i}`} className="text-[13px] font-black text-indigo_ink">♂</span>
      ))}
      {Array.from({ length: femaleCount }, (_, i) => (
        <span key={`f-${i}`} className="text-[13px] font-black text-ink/20">♀</span>
      ))}
    </div>
  )
}

interface StatsBlockProps {
  frailRate: number
  preFrailRate: number
  malePct: number | null
  urbanPct: number | null
  n: number
  totalN?: number
}

function StatsBlock({ frailRate, preFrailRate, malePct, urbanPct, n, totalN }: StatsBlockProps) {
  return (
    <div className="space-y-2.5">
      {/* 衰弱率 */}
      <div>
        <div className="mb-0.5 flex items-center justify-between">
          <span className="text-[9px] text-ink-stone">衰弱率</span>
          <span className="font-serif text-[11px] tabular-nums text-ink">
            {formatPercent(frailRate, 1)}
          </span>
        </div>
        <Bar pct={frailRate * 100} tone="frail" />
      </div>

      {/* 衰弱前期 */}
      <div>
        <div className="mb-0.5 flex items-center justify-between">
          <span className="text-[9px] text-ink-stone">衰弱前期</span>
          <span className="font-serif text-[11px] tabular-nums text-ink">
            {formatPercent(preFrailRate, 1)}
          </span>
        </div>
        <Bar pct={preFrailRate * 100} tone="preFrail" />
      </div>

      {/* 样本量 */}
      <div className="border-t border-ink/5 pt-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-ink-stone">样本量</span>
          <span className="font-serif text-[11px] tabular-nums text-ink">
            {totalN != null ? `${n.toLocaleString()} / ${totalN.toLocaleString()} 人` : `${n.toLocaleString()} 人`}
          </span>
        </div>
      </div>

      {/* 男性比 — person icons */}
      <div>
        <div className="mb-0.5 flex items-center justify-between">
          <span className="text-[9px] text-ink-stone">男性比</span>
          <span className="font-serif text-[11px] tabular-nums text-ink">
            {malePct != null ? formatPercent(malePct, 1) : '—'}
          </span>
        </div>
        {malePct != null && <GenderBar malePct={malePct * 100} />}
      </div>

      {/* 城镇比 */}
      <div>
        <div className="mb-0.5 flex items-center justify-between">
          <span className="text-[9px] text-ink-stone">城镇比</span>
          <span className="font-serif text-[11px] tabular-nums text-ink">
            {urbanPct != null ? formatPercent(urbanPct, 1) : '—'}
          </span>
        </div>
        {urbanPct != null && <Bar pct={urbanPct * 100} tone="urban" />}
      </div>
    </div>
  )
}

export function WaveSelector({ sampleN, totalN, sampled, selectedProvince, provinces }: WaveSelectorProps) {
  const { year, set } = useGlobalStore()

  const sel = selectedProvince
    ? provinces.find((p) => p.province === selectedProvince) ?? null
    : null

  return (
    <div className="flex flex-col gap-3 p-2">
      <div>
        <p className="text-[11px] tracking-widest text-ink-stone">调查波次</p>
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
        {sel ? (
          <>
            <p className="mb-1.5 font-serif text-[11px] font-semibold text-ink">
              {tProvince(sel.province)}
            </p>
            <StatsBlock
              frailRate={sel.frailRate}
              preFrailRate={sel.preFrailRate}
              malePct={sel.malePct}
              urbanPct={sel.urbanPct}
              n={sel.n}
              totalN={totalN}
            />
          </>
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
              <>
                <p className="mb-1.5 font-serif text-[9px] tracking-widest text-ink-stone">全国</p>
                <StatsBlock
                  frailRate={avgFrail}
                  preFrailRate={avgPreFrail}
                  malePct={avgMale}
                  urbanPct={avgUrban}
                  n={totalN}
                />
              </>
            )
          })()
        ) : (
          <p className="text-[9px] text-ink-stone">加载中…</p>
        )}
      </div>
    </div>
  )
}

import type { SmallMultipleRegion } from '@/types/data'
import { inkWash } from '@/lib/theme/inkWash'
import { useGlobalStore } from '@/lib/store/globalStore'
import { REGION_HINT, tRegion } from '@/lib/i18n/zh'
import { cn, formatNumber, formatPercent } from '@/lib/utils'

interface RegionSmallMultiplesProps {
  data: SmallMultipleRegion[]
  className?: string
}

export function RegionSmallMultiples({ data, className }: RegionSmallMultiplesProps) {
  const { region, set } = useGlobalStore()
  const max = Math.max(1, ...data.map((d) => d.n))
  return (
    <div className={cn('grid grid-cols-4 gap-3', className)}>
      {data.map((d) => {
        const active = region === d.region
        const ratio = d.n / max
        const size = 56
        const innerSide = size * Math.sqrt(ratio || 0.01)
        const frailSide = size * Math.sqrt((d.frailRate || 0.01))
        const isStandard = d.region === 'East' || d.region === 'Central' || d.region === 'West'
        return (
          <button
            key={d.region}
            type="button"
            onClick={() => {
              if (!isStandard) return
              set({ region: active ? null : (d.region as 'East' | 'Central' | 'West') })
            }}
            className={cn(
              'group flex flex-col items-center gap-1 border px-2 py-2 transition-colors',
              active
                ? 'border-cinnabar bg-cinnabar/5'
                : 'border-ink/15 hover:border-ink/40 bg-paper-alt/40',
              !isStandard && 'cursor-default',
            )}
          >
            <svg width={size} height={size} className="overflow-visible">
              <rect width={size} height={size} fill={inkWash.paperDeep} stroke={inkWash.ink} strokeOpacity={0.3} strokeWidth={0.6} />
              <rect
                x={(size - innerSide) / 2}
                y={(size - innerSide) / 2}
                width={innerSide}
                height={innerSide}
                fill={inkWash.indigo}
                fillOpacity={0.55}
              />
              <rect
                x={(size - frailSide) / 2}
                y={(size - frailSide) / 2}
                width={frailSide}
                height={frailSide}
                fill={inkWash.cinnabar}
                fillOpacity={0.9}
              />
            </svg>
            <div className="text-center leading-tight">
              <div className="font-serif text-[11px] tracking-wide text-ink">
                {tRegion(d.region)}
              </div>
              <div className="text-[10px] text-ink-wash">{REGION_HINT[d.region]}</div>
              <div className="mt-1 text-[10px] text-ink">
                衰弱 {formatNumber(d.frailN)} 人
                <span className="ml-1 text-cinnabar">({formatPercent(d.frailRate, 1)})</span>
              </div>
              <div className="text-[9px] tracking-wide text-ink-stone">
                样本量 {formatNumber(d.n)}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

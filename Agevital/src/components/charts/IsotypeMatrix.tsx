import type { IsotypeRow } from '@/types/data'
import { inkWash } from '@/lib/theme/inkWash'
import { tIsotype } from '@/lib/i18n/zh'
import { cn, formatPercent } from '@/lib/utils'

interface IsotypeMatrixProps {
  rows: IsotypeRow[]
  iconsPerRow?: number
  className?: string
}

function Person({ filled, size = 10 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size + 4} viewBox="0 0 10 14" className="block">
      <circle cx="5" cy="3" r="2.4" fill={filled ? inkWash.cinnabar : 'transparent'} stroke={inkWash.ink} strokeWidth="0.5" />
      <path
        d="M1.4 13 V8.5 Q1.4 5.6 5 5.6 Q8.6 5.6 8.6 8.5 V13 Z"
        fill={filled ? inkWash.cinnabar : 'transparent'}
        stroke={inkWash.ink}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IsotypeMatrix({ rows, iconsPerRow = 20, className }: IsotypeMatrixProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {rows.map((row) => {
        const filled = Math.round(row.rate * iconsPerRow)
        const label = tIsotype(row.label ?? row.group)
        return (
          <div key={row.group} className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-[11px] tracking-wide text-ink">
                {label}
              </span>
              <span className="text-[10px] text-cinnabar">{formatPercent(row.rate, 1)}</span>
            </div>
            <div className="flex flex-wrap gap-[2px]">
              {Array.from({ length: iconsPerRow }).map((_, i) => (
                <Person key={i} filled={i < filled} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

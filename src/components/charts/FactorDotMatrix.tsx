import type { FactorMatrixCell } from '@/types/data'
import { inkWash } from '@/lib/theme/inkWash'
import { tCategory, tFactor } from '@/lib/i18n/zh'
import { cn } from '@/lib/utils'

interface FactorDotMatrixProps {
  data: FactorMatrixCell[]
  cellsPerRow?: number
  className?: string
}

const CATEGORY_COLOR: Record<string, string> = {
  SES: inkWash.indigo,
  Sleep: inkWash.bamboo,
  Mood: inkWash.cinnabar,
  ACE: inkWash.amber,
  Social: inkWash.stone,
}

export function FactorDotMatrix({ data, cellsPerRow = 10, className }: FactorDotMatrixProps) {
  const maxRho = Math.max(0.05, ...data.map((d) => Math.abs(d.rho)))
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-3 text-[9px] tracking-wide text-ink-stone">
        {Object.entries(CATEGORY_COLOR).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
            {tCategory(k)}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {data.map((cell) => {
          const intensity = Math.abs(cell.rho) / maxRho
          const filled = Math.max(1, Math.round(intensity * cellsPerRow))
          const baseColor = CATEGORY_COLOR[cell.category] ?? inkWash.ink
          const sign = cell.rho >= 0 ? '+' : '−'
          return (
            <div key={cell.factor} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
              <div className="truncate text-[10px] tracking-wide text-ink">{tFactor(cell.factor)}</div>
              <div className="flex gap-[2px]">
                {Array.from({ length: cellsPerRow }).map((_, i) => (
                  <span
                    key={i}
                    className="h-2.5 w-2.5"
                    style={{
                      backgroundColor: i < filled ? baseColor : 'transparent',
                      opacity: i < filled ? 0.4 + 0.6 * intensity : 1,
                      border: `1px solid ${i < filled ? baseColor : inkWash.mist}`,
                    }}
                  />
                ))}
              </div>
              <div className="w-12 text-right font-serif text-[11px] tabular-nums text-ink">
                {sign}
                {Math.abs(cell.rho).toFixed(2)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

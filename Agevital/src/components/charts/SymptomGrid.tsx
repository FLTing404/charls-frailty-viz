import { AlertTriangle, Footprints, Move, TrendingDown } from 'lucide-react'
import type { ClassicSymptom } from '@/types/data'
import { tSymptom, tSymptomDesc } from '@/lib/i18n/zh'
import { cn, formatPercent } from '@/lib/utils'

interface SymptomGridProps {
  data: ClassicSymptom[]
  className?: string
}

const ICONS: Record<ClassicSymptom['key'], React.ComponentType<{ className?: string }>> = {
  fatigue: AlertTriangle,
  fall: Footprints,
  weight_loss: TrendingDown,
  adl: Move,
}

export function SymptomGrid({ data, className }: SymptomGridProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {data.map((s) => {
        const Icon = ICONS[s.key]
        return (
          <div
            key={s.key}
            className="flex flex-col gap-1 border border-ink/15 bg-paper-alt/60 px-2 py-2"
          >
            <div className="flex items-center justify-between">
              <Icon className="h-3.5 w-3.5 text-cinnabar" />
              <span className="font-serif text-[15px] font-semibold text-ink">
                {formatPercent(s.prevalence, 1)}
              </span>
            </div>
            <div className="text-[10px] tracking-wide text-ink">{tSymptom(s.key, s.label)}</div>
            <div className="text-[9px] leading-tight text-ink-stone">{tSymptomDesc(s.key, s.desc)}</div>
          </div>
        )
      })}
    </div>
  )
}

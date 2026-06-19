import { useGlobalStore, type Wave } from '@/lib/store/globalStore'
import { cn } from '@/lib/utils'

const WAVES: Wave[] = [2011, 2013, 2015, 2018]

export function TopBar() {
  const { year, set } = useGlobalStore()
  const idx = Math.max(0, WAVES.indexOf(year))

  return (
    <div className="flex shrink-0 items-center justify-end gap-2 border-y border-ink/15 bg-paper-alt/70 px-2 py-1">
      <span className="font-serif text-[8px] lg:text-[10px] tracking-wide text-ink-wash">调查年份</span>

      {/* Slider track */}
      <div className="flex flex-col gap-0.5">
        <input
          type="range"
          min={0}
          max={3}
          step={1}
          value={idx}
          onChange={(e) => set({ year: WAVES[Number(e.target.value)] })}
          className="wave-slider h-[3px] w-[120px] lg:w-[160px] cursor-pointer appearance-none rounded-full bg-ink/15 accent-cinnabar"
        />
        {/* Tick labels */}
        <div className="flex w-[120px] lg:w-[160px] justify-between px-px">
          {WAVES.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => set({ year: w })}
              className={cn(
                'font-serif text-[8px] leading-none transition-colors',
                w === year ? 'font-semibold text-cinnabar' : 'text-ink-stone hover:text-ink',
              )}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Current year badge */}
      <span className="min-w-[2.5rem] font-serif text-[11px] lg:text-sm font-semibold text-cinnabar">{year}</span>
    </div>
  )
}

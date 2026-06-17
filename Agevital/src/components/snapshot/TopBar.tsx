import { useGlobalStore, type Wave } from '@/lib/store/globalStore'
import { cn } from '@/lib/utils'

const WAVES: Wave[] = [2011, 2013, 2015, 2018]

export function TopBar() {
  const { year, set } = useGlobalStore()
  const idx = Math.max(0, WAVES.indexOf(year))

  return (
    <div className="flex shrink-0 items-center justify-end gap-4 border-y border-ink/15 bg-paper-alt/70 px-4 py-2.5">
      <span className="font-serif text-[10px] tracking-wide text-ink-wash">调查年份</span>

      {/* Slider track */}
      <div className="flex flex-col gap-1">
        <input
          type="range"
          min={0}
          max={3}
          step={1}
          value={idx}
          onChange={(e) => set({ year: WAVES[Number(e.target.value)] })}
          className="wave-slider h-[3px] w-[180px] cursor-pointer appearance-none rounded-full bg-ink/15 accent-cinnabar"
        />
        {/* Tick labels */}
        <div className="flex w-[180px] justify-between px-px">
          {WAVES.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => set({ year: w })}
              className={cn(
                'font-serif text-[9px] leading-none transition-colors',
                w === year ? 'font-semibold text-cinnabar' : 'text-ink-stone hover:text-ink',
              )}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Current year badge */}
      <span className="min-w-[3rem] font-serif text-sm font-semibold text-cinnabar">{year}</span>
    </div>
  )
}

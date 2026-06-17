import { Slider } from '@/components/ui/slider'
import { useGlobalStore, type Wave } from '@/lib/store/globalStore'

const WAVE_LIST: Wave[] = [2011, 2013, 2015, 2018]

export function TimeSpanSlider() {
  const { timeSpan, set } = useGlobalStore()
  const startIdx = WAVE_LIST.indexOf(timeSpan[0])
  const endIdx = WAVE_LIST.indexOf(timeSpan[1])
  return (
    <div className="flex flex-1 items-center gap-5">
      <div className="font-serif text-[11px] tracking-wide text-ink-wash">
        时间跨度
      </div>
      <div className="flex flex-1 items-center gap-3">
        {WAVE_LIST.map((w) => (
          <span
            key={w}
            className={`font-serif text-[11px] tracking-wide ${
              w >= timeSpan[0] && w <= timeSpan[1]
                ? 'text-ink'
                : 'text-ink-stone'
            }`}
          >
            {w}
          </span>
        ))}
      </div>
      <div className="flex-1 max-w-[260px]">
        <Slider
          min={0}
          max={3}
          step={1}
          value={[startIdx, endIdx]}
          onValueChange={(values) => {
            if (values.length !== 2) return
            const [a, b] = values.slice().sort((x, y) => x - y)
            set({ timeSpan: [WAVE_LIST[a], WAVE_LIST[b]] as [Wave, Wave] })
          }}
        />
      </div>
    </div>
  )
}

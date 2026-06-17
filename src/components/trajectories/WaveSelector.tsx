import { useGlobalStore, type Wave } from '@/lib/store/globalStore'
import { formatNumber } from '@/lib/utils'

const WAVES: Wave[] = [2011, 2013, 2015, 2018]

interface WaveSelectorProps {
  sampleN: number
  totalN: number
  sampled?: boolean
}

export function WaveSelector({ sampleN, totalN, sampled }: WaveSelectorProps) {
  const { year, set } = useGlobalStore()

  return (
    <div className="flex flex-col gap-3">
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
          {sampled ? `分层抽样 · 总体 ${formatNumber(totalN)}` : `有效样本 ${formatNumber(totalN)}`}
        </p>
      </div>

      <div className="border-t border-ink/10 pt-2 text-[10px] leading-relaxed text-ink-stone">
        <p className="mb-1 font-medium text-ink-wash">变量说明</p>
        <ul className="space-y-0.5">
          <li>ACE · 童年逆境总分</li>
          <li>抑郁 · CES-D 10 项</li>
          <li>睡眠 · 夜间时长(h)</li>
          <li>社会联系 · 参与频率指数</li>
          <li>FI · 衰弱指数</li>
        </ul>
      </div>
    </div>
  )
}

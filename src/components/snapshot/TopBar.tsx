import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useGlobalStore, type Wave } from '@/lib/store/globalStore'

export function TopBar() {
  const { year, set } = useGlobalStore()

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-y border-ink/15 bg-paper-alt/70 px-4 py-2.5">
      <p className="text-[10px] tracking-wide text-ink-stone">切换调查波次以对比各省衰弱率变化</p>
      <div className="flex items-center gap-2">
        <div className="font-serif text-[10px] tracking-wide text-ink-wash">年份</div>
        <div className="w-[110px]">
        <Select value={String(year)} onValueChange={(v) => set({ year: Number(v) as Wave })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2011, 2013, 2015, 2018].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
      </div>
    </div>
  )
}

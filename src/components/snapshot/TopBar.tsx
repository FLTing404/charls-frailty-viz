import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useGlobalStore, type Wave } from '@/lib/store/globalStore'

export function TopBar() {
  const { year, set } = useGlobalStore()

  return (
    <div className="flex items-center justify-end gap-3 border-y border-ink/15 bg-paper-alt/70 px-4 py-3">
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
  )
}

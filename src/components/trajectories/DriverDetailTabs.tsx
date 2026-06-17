import { FactorRadarChart } from '@/components/trajectories/FactorRadarChart'
import { DriverSankeyChart } from '@/components/trajectories/DriverSankeyChart'
import { DriverScatterBubble } from '@/components/trajectories/DriverScatterBubble'
import { DriverChordChart } from '@/components/trajectories/DriverChordChart'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DriverRecord, DriverSankeyPayload, DriverChordPayload, FactorMatrixCell } from '@/types/data'
import type { DetailTab, FocusDimension } from '@/lib/store/trajectoryStore'
import { tDetailTab } from '@/lib/i18n/zh'

interface DriverDetailTabsProps {
  detailTab: DetailTab
  onTabChange: (tab: DetailTab) => void
  records: DriverRecord[]
  focusDimension: FocusDimension
  sankey: DriverSankeyPayload | null
  chord: DriverChordPayload | null
  factors: FactorMatrixCell[]
  className?: string
}

const TABS: DetailTab[] = ['sankey', 'scatter', 'bubble', 'sunburst', 'chord']

export function DriverDetailTabs({
  detailTab,
  onTabChange,
  records,
  focusDimension,
  sankey,
  chord,
  factors,
  className,
}: DriverDetailTabsProps) {
  return (
    <Tabs value={detailTab} onValueChange={(v) => onTabChange(v as DetailTab)} className={className}>
      <div className="-mx-1 overflow-x-auto">
        <TabsList className="min-w-max px-1">
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tDetailTab(tab)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value="sankey" className="min-h-[220px]">
        <DriverSankeyChart data={sankey} className="h-[220px]" />
      </TabsContent>
      <TabsContent value="scatter" className="min-h-[220px]">
        <DriverScatterBubble
          records={records}
          mode="scatter"
          focusDimension={focusDimension}
          className="h-[220px]"
        />
      </TabsContent>
      <TabsContent value="bubble" className="min-h-[220px]">
        <DriverScatterBubble records={records} mode="bubble" focusDimension={focusDimension} className="h-[220px]" />
      </TabsContent>
      <TabsContent value="sunburst" className="min-h-[220px]">
        {factors.length > 0 ? (
          <FactorRadarChart data={factors} className="h-[220px]" />
        ) : (
          <div className="flex h-[220px] items-center justify-center text-[10px] text-ink-stone">加载因素数据…</div>
        )}
      </TabsContent>
      <TabsContent value="chord" className="min-h-[220px]">
        <DriverChordChart data={chord} className="h-[220px]" />
      </TabsContent>
    </Tabs>
  )
}

import { SectionTitle } from '@/components/layout/SectionTitle'

import { InkBorder } from '@/components/layout/InkBorder'

import { ChinaChoropleth } from '@/components/charts/ChinaChoropleth'

import { RegionSmallMultiples } from '@/components/charts/RegionSmallMultiples'

import { BoxStripPlot } from '@/components/charts/BoxStripPlot'

import type { BoxStripPayload, ProvinceDatum, SmallMultipleRegion } from '@/types/data'

import { useGlobalStore } from '@/lib/store/globalStore'



interface CenterColumnProps {

  provinces: ProvinceDatum[]

  smallMultiples: SmallMultipleRegion[]

  boxStrip: BoxStripPayload | null

}



export function CenterColumn({ provinces, smallMultiples, boxStrip }: CenterColumnProps) {

  const { province, brushedIds, set } = useGlobalStore()

  return (

    <div className="grid h-full min-h-0 grid-rows-[1fr_auto_auto] gap-2">

      <InkBorder className="panel flex min-h-0 flex-col p-2">

        <SectionTitle index="C1" title="中国地图" subtitle="点击省份筛选" />

        <div className="ink-divider my-1" />

        <div className="min-h-0 flex-1">

          <ChinaChoropleth

            data={provinces}

            selected={province}

            onSelect={(p) => set({ province: p })}

            className="h-full"

          />

        </div>

      </InkBorder>



      <InkBorder className="panel shrink-0 p-2">

        <SectionTitle index="C2" title="区域小倍数图" />

        <RegionSmallMultiples data={smallMultiples} />

      </InkBorder>



      <InkBorder className="panel shrink-0 p-2">

        <SectionTitle index="C3" title="FI 分布 · 刷选" />

        <BoxStripPlot

          data={boxStrip}

          brushedIds={brushedIds}

          onBrush={(ids) => set({ brushedIds: ids })}

        />

      </InkBorder>

    </div>

  )

}


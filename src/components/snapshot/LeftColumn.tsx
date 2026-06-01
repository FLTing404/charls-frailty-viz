import { SectionTitle } from '@/components/layout/SectionTitle'

import { InkBorder } from '@/components/layout/InkBorder'

import { IsotypeMatrix } from '@/components/charts/IsotypeMatrix'

import { DonutChart } from '@/components/charts/DonutChart'

import type { DonutSlice, IsotypeRow, KpiPayload } from '@/types/data'

import { formatNumber, formatPercent } from '@/lib/utils'



interface LeftColumnProps {

  kpi: KpiPayload | null

  isotype: IsotypeRow[]

  donut: DonutSlice[]

}



export function LeftColumn({ kpi, isotype, donut }: LeftColumnProps) {

  return (

    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">

      <InkBorder className="panel shrink-0 p-2">

        <SectionTitle index="L1" title="基础数据" />

        <div className="grid grid-cols-2 gap-2">

          <div>

            <div className="kpi-number text-[28px]">{kpi ? formatNumber(kpi.n) : '—'}</div>

            <div className="kpi-label">样本量</div>

          </div>

          <div>

            <div className="kpi-number text-[28px] text-cinnabar">

              {kpi ? formatPercent(kpi.frailRate, 1) : '—'}

            </div>

            <div className="kpi-label">衰弱率</div>

          </div>

          <div>

            <div className="kpi-number text-[24px]">{kpi ? kpi.meanFI.toFixed(3) : '—'}</div>

            <div className="kpi-label">平均 FI</div>

          </div>

          <div>

            <div className="kpi-number text-[24px] text-amber_ink">

              {kpi ? formatPercent(kpi.preFrailRate, 1) : '—'}

            </div>

            <div className="kpi-label">衰弱前期</div>

          </div>

        </div>

      </InkBorder>



      <InkBorder className="panel shrink-0 p-2">

        <SectionTitle index="L2" title="医保覆盖" />

        <IsotypeMatrix rows={isotype} iconsPerRow={15} />

      </InkBorder>



      <InkBorder className="panel shrink-0 p-2">

        <SectionTitle index="L3" title="日常管理" />

        <DonutChart data={donut} className="h-[140px]" />

      </InkBorder>

    </div>

  )

}


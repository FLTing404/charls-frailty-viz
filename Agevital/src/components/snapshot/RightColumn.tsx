import { SectionTitle } from '@/components/layout/SectionTitle'

import { InkBorder } from '@/components/layout/InkBorder'

import { BodyMetaphor } from '@/components/charts/BodyMetaphor'

import { SymptomGrid } from '@/components/charts/SymptomGrid'

import { FactorDotMatrix } from '@/components/charts/FactorDotMatrix'

import type {

  BodyDomain,

  ClassicSymptom,

  EmpathyVignette,

  FactorMatrixCell,

} from '@/types/data'



interface RightColumnProps {

  body: BodyDomain[]

  symptoms: ClassicSymptom[]

  factors: FactorMatrixCell[]

  vignettes: EmpathyVignette[]

}



export function RightColumn({ body, symptoms, factors, vignettes }: RightColumnProps) {

  return (

    <div className="grid h-full min-h-0 grid-rows-[auto_1fr_auto] gap-2 overflow-hidden">

      <InkBorder className="panel shrink-0 p-2">

        <SectionTitle index="R1" title="典型症状" />

        <SymptomGrid data={symptoms} />

      </InkBorder>



      <InkBorder className="panel flex min-h-0 flex-col overflow-hidden p-1">

        <SectionTitle index="R2" title="人体 · 风险与并发症" subtitle="悬停查看器官" />

        <div className="min-h-0 flex-1">

          <BodyMetaphor domains={body} vignettes={vignettes} className="h-full" />

        </div>

      </InkBorder>



      <InkBorder className="panel shrink-0 overflow-hidden p-2">

        <SectionTitle index="R3" title="因素矩阵" />

        <FactorDotMatrix data={factors} cellsPerRow={8} />

      </InkBorder>

    </div>

  )

}


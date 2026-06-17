import { Activity, Bone, Droplet, Heart, Pill, Wind } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'

import { Card, CardTitle } from '@/components/ui/card'

import { Button } from '@/components/ui/button'

import { useGlobalStore, type Condition } from '@/lib/store/globalStore'

import { tCondition } from '@/lib/i18n/zh'

import { formatNumber, formatPercent } from '@/lib/utils'



interface ConditionDef {

  key: Condition

  icon: React.ComponentType<{ className?: string }>

}



const CONDITIONS: ConditionDef[] = [

  { key: 'hypertension', icon: Droplet },

  { key: 'diabetes', icon: Pill },

  { key: 'heart', icon: Heart },

  { key: 'stroke', icon: Activity },

  { key: 'arthritis', icon: Bone },

  { key: 'lung', icon: Wind },

]



interface CohortSidebarProps {

  cohortN: number

  totalN: number

  compact?: boolean

}



export function CohortSidebar({ cohortN, totalN, compact }: CohortSidebarProps) {

  const { bundledConditions, cohortMode, set, reset } = useGlobalStore()



  const toggle = (cond: Condition) => {

    const next = bundledConditions.includes(cond)

      ? bundledConditions.filter((c) => c !== cond)

      : [...bundledConditions, cond]

    set({ bundledConditions: next })

  }



  const coverage = totalN ? cohortN / totalN : 0



  return (

    <div className={compact ? 'flex flex-col gap-2' : 'flex h-full flex-col gap-3'}>

      <Card className="bg-paper-alt p-2">

        <CardTitle className="text-[10px]">队列概览</CardTitle>

        <div className="grid grid-cols-2 gap-2">

          <div>

            <div className="kpi-number text-[26px]">{formatNumber(cohortN)}</div>

            <div className="kpi-label">样本量</div>

          </div>

          <div>

            <div className="kpi-number text-[26px] text-cinnabar">{formatPercent(coverage, 1)}</div>

            <div className="kpi-label">占比</div>

          </div>

        </div>

      </Card>



      <Card className="p-2">

        <CardTitle className="text-[10px]">事件捆绑筛选</CardTitle>

        <div className="ink-divider my-1" />

        <div className="flex flex-col gap-1">

          {CONDITIONS.map(({ key, icon: Icon }) => {

            const active = bundledConditions.includes(key)

            return (

              <label

                key={key}

                className={`flex cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5 text-[10px] ${

                  active ? 'bg-cinnabar/10 text-cinnabar' : 'hover:bg-paper-deep'

                }`}

              >

                <Checkbox checked={active} onCheckedChange={() => toggle(key)} />

                <Icon className="h-3 w-3 shrink-0" />

                <span className="truncate">{tCondition(key)}</span>

              </label>

            )

          })}

        </div>

      </Card>



      <Card className="p-2">

        <CardTitle className="text-[10px]">队列模式</CardTitle>

        <div className="mt-1 grid grid-cols-2 gap-1">

          <Button size="sm" variant={cohortMode === 'all' ? 'cinnabar' : 'outline'} onClick={() => set({ cohortMode: 'all' })}>

            全部

          </Button>

          <Button size="sm" variant={cohortMode === 'tracked' ? 'cinnabar' : 'outline'} onClick={() => set({ cohortMode: 'tracked' })}>

            追踪

          </Button>

        </div>

      </Card>



      <Button variant="ghost" size="sm" onClick={reset}>

        重置

      </Button>

    </div>

  )

}


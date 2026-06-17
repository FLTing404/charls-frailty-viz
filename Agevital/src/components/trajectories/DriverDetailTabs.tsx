import { useState } from 'react'
import { DriverSankeyChart } from '@/components/trajectories/DriverSankeyChart'
import { DriverScatterBubble } from '@/components/trajectories/DriverScatterBubble'
import { DriverChordChart } from '@/components/trajectories/DriverChordChart'
import { SunburstChart } from '@/components/charts/SunburstChart'
import type { DriverRecord, DriverSankeyPayload, DriverChordPayload } from '@/types/data'
import type { FocusDimension } from '@/lib/store/trajectoryStore'
import { cn } from '@/lib/utils'

interface ToggleProps {
  options: { key: string; label: string }[]
  active: string
  onChange: (key: string) => void
}

function ToggleBar({ options, active, onChange }: ToggleProps) {
  return (
    <div className="flex gap-px rounded-[2px] border border-ink/15 p-px">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={cn(
            'flex-1 px-2 py-0.5 text-[10px] transition-colors rounded-[1px]',
            active === opt.key
              ? 'bg-cinnabar/10 text-cinnabar-deep font-medium'
              : 'text-ink-wash hover:text-ink',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Panel 1: 桑基图 | 散点/气泡图 ─────────────────────────────────────────────

interface SankeyScatterPanelProps {
  records: DriverRecord[]
  focusDimension: FocusDimension
  sankey: DriverSankeyPayload | null
  className?: string
}

export function SankeyScatterPanel({
  records,
  focusDimension,
  sankey,
  className,
}: SankeyScatterPanelProps) {
  const [active, setActive] = useState<'sankey' | 'bubble'>('sankey')

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <ToggleBar
        options={[
          { key: 'sankey', label: '桑基图' },
          { key: 'bubble', label: '散点 / 气泡' },
        ]}
        active={active}
        onChange={(k) => setActive(k as 'sankey' | 'bubble')}
      />
      <div className="min-h-0 flex-1">
        {active === 'sankey' ? (
          <DriverSankeyChart data={sankey} className="h-full" />
        ) : (
          <DriverScatterBubble
            records={records}
            mode="bubble"
            focusDimension={focusDimension}
            className="h-full"
          />
        )}
      </div>
    </div>
  )
}

// ── Panel 2: 旭日图 | 和弦图 ──────────────────────────────────────────────────

interface SunburstChordPanelProps {
  records: DriverRecord[]
  chord: DriverChordPayload | null
  className?: string
}

export function SunburstChordPanel({ records, chord, className }: SunburstChordPanelProps) {
  const [active, setActive] = useState<'sunburst' | 'chord'>('sunburst')

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <ToggleBar
        options={[
          { key: 'sunburst', label: '旭日图' },
          { key: 'chord', label: '和弦图' },
        ]}
        active={active}
        onChange={(k) => setActive(k as 'sunburst' | 'chord')}
      />
      <div className="min-h-0 flex-1">
        {active === 'sunburst' ? (
          <SunburstChart records={records} className="h-full" />
        ) : (
          <DriverChordChart data={chord} className="h-full" />
        )}
      </div>
    </div>
  )
}

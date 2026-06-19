import { cn } from '@/lib/utils'
import { InkDecor } from './InkDecor'

interface PageShellProps {
  children: React.ReactNode
  className?: string
  /** Compact title row — omit large hero block */
  title?: React.ReactNode
  actions?: React.ReactNode
}

/** Full-viewport shell: no max-width cap, ink decorations, no page scroll. */
export function PageShell({ children, className, title, actions }: PageShellProps) {
  return (
    <div className={cn('relative flex h-full w-full flex-col overflow-hidden', className)}>
      <InkDecor variant="mist" className="pointer-events-none absolute inset-0 z-0" />
      {(title || actions) && (
        <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-ink/10 bg-paper-alt/50 px-3 h-14 backdrop-blur-[1px]">
          <div className="min-w-0">{title}</div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      <div className="relative z-10 min-h-0 flex-1 overflow-hidden px-2 pb-4 pt-1">{children}</div>
    </div>
  )
}

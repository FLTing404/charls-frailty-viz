import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em]',
  {
    variants: {
      tone: {
        ink: 'border-ink/40 text-ink bg-transparent',
        robust: 'border-bamboo/60 text-bamboo bg-bamboo/10',
        preFrail: 'border-amber_ink/60 text-amber_ink bg-amber_ink/10',
        frail: 'border-cinnabar-deep text-cinnabar bg-cinnabar/10',
        muted: 'border-ink/20 text-ink-wash bg-paper-deep',
      },
    },
    defaultVariants: { tone: 'ink' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}

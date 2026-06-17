import { cn } from '@/lib/utils'

interface SectionTitleProps {
  index?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  className?: string
}

export function SectionTitle({ index, title, subtitle, align = 'left', className }: SectionTitleProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col gap-0.5',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {index && (
        <span className="text-[9px] tracking-widest text-cinnabar">
          {index}
        </span>
      )}
      <h3 className="font-serif text-[13px] font-semibold tracking-wide text-ink">
        {title}
      </h3>
      {subtitle && (
        <p className="text-[10px] tracking-wide text-ink-wash">
          {subtitle}
        </p>
      )}
    </div>
  )
}

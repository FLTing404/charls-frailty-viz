import { cn } from '@/lib/utils'

interface SectionTitleProps {
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  className?: string
}

export function SectionTitle({ title, subtitle, align = 'left', className }: SectionTitleProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      <h3 className="font-serif text-[10px] lg:text-xs font-semibold tracking-wide text-ink">
        {title}
      </h3>
      {subtitle && (
        <p className="text-[8px] lg:text-[10px] tracking-wide text-ink-wash">
          {subtitle}
        </p>
      )}
    </div>
  )
}

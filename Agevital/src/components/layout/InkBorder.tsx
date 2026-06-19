import { cn } from '@/lib/utils'

interface InkBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  corners?: boolean
  children?: React.ReactNode
}

export function InkBorder({ className, corners = true, children, ...props }: InkBorderProps) {
  return (
    <div className={cn('relative border-t border-x border-ink/25', className)} {...props}>
      {corners && (
        <>
          <span className="absolute -left-px -top-px h-2 w-2 border-l border-t border-ink" />
          <span className="absolute -right-px -top-px h-2 w-2 border-r border-t border-ink" />
        </>
      )}
      {children}
    </div>
  )
}

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-sm text-xs font-medium uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cinnabar disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default:
          'bg-ink text-paper hover:bg-ink/90 border border-ink',
        outline:
          'border border-ink/40 bg-transparent text-ink hover:bg-paper-deep hover:border-ink',
        ghost: 'text-ink hover:bg-paper-deep',
        cinnabar:
          'bg-cinnabar text-paper hover:bg-cinnabar-deep border border-cinnabar-deep',
        link: 'underline-offset-4 hover:underline text-ink-wash',
      },
      size: {
        default: 'h-8 px-4',
        sm: 'h-7 px-3 text-[10px]',
        lg: 'h-10 px-6 text-sm',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }

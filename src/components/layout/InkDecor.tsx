import { cn } from '@/lib/utils'
import { inkWash } from '@/lib/theme/inkWash'

interface InkDecorProps {
  variant?: 'mist' | 'corner' | 'brush'
  className?: string
}

/** Ambient Chinese ink-wash decorative layer. */
export function InkDecor({ variant = 'mist', className }: InkDecorProps) {
  if (variant === 'corner') {
    return (
      <svg className={cn('absolute inset-0 h-full w-full', className)} aria-hidden>
        <defs>
          <radialGradient id="ink-corner-tl" cx="0" cy="0" r="0.45">
            <stop offset="0%" stopColor={inkWash.ink} stopOpacity="0.06" />
            <stop offset="100%" stopColor={inkWash.ink} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ink-corner-br" cx="1" cy="1" r="0.4">
            <stop offset="0%" stopColor={inkWash.cinnabar} stopOpacity="0.05" />
            <stop offset="100%" stopColor={inkWash.cinnabar} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#ink-corner-tl)" />
        <rect width="100%" height="100%" fill="url(#ink-corner-br)" />
        {/* Corner brush strokes */}
        <path
          d="M0 0 Q80 40 120 0 Q60 80 0 100"
          fill="none"
          stroke={inkWash.ink}
          strokeOpacity={0.08}
          strokeWidth={1.2}
        />
        <path
          d="M100% 100% Qcalc(100% - 80px) calc(100% - 40px) calc(100% - 120px) 100%"
          fill="none"
          stroke={inkWash.cinnabar}
          strokeOpacity={0.1}
          strokeWidth={1}
        />
      </svg>
    )
  }

  if (variant === 'brush') {
    return (
      <svg className={cn('h-full w-full', className)} aria-hidden preserveAspectRatio="none">
        <path
          d="M0 60 Q200 20 400 55 T800 40 T1200 70"
          fill="none"
          stroke={inkWash.ink}
          strokeOpacity={0.07}
          strokeWidth={2}
        />
        <path
          d="M0 120 Q300 90 600 110 T1200 95"
          fill="none"
          stroke={inkWash.indigo}
          strokeOpacity={0.05}
          strokeWidth={1.5}
        />
      </svg>
    )
  }

  // mist — soft ink wash blobs
  return (
    <svg className={cn('h-full w-full', className)} aria-hidden preserveAspectRatio="none">
      <defs>
        <filter id="ink-mist-blur">
          <feGaussianBlur stdDeviation="28" />
        </filter>
      </defs>
      <ellipse
        cx="8%"
        cy="18%"
        rx="180"
        ry="120"
        fill={inkWash.ink}
        fillOpacity={0.04}
        filter="url(#ink-mist-blur)"
      />
      <ellipse
        cx="92%"
        cy="75%"
        rx="200"
        ry="140"
        fill={inkWash.cinnabar}
        fillOpacity={0.035}
        filter="url(#ink-mist-blur)"
      />
      <ellipse
        cx="55%"
        cy="8%"
        rx="120"
        ry="60"
        fill={inkWash.bamboo}
        fillOpacity={0.04}
        filter="url(#ink-mist-blur)"
      />
    </svg>
  )
}

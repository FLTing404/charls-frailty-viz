import { useMemo, useState } from 'react'
import type { BodyDomain, EmpathyVignette } from '@/types/data'
import { inkWash } from '@/lib/theme/inkWash'
import { tBodyDomain } from '@/lib/i18n/zh'
import { cn, formatPercent } from '@/lib/utils'

interface BodyMetaphorProps {
  domains: BodyDomain[]
  vignettes: EmpathyVignette[]
  className?: string
}

/** Anatomical anchor on the detailed human SVG (viewBox 0 0 400 720). */
const ANCHORS: Record<
  BodyDomain['domain'],
  { cx: number; cy: number; side: 'L' | 'R' }
> = {
  brain: { cx: 200, cy: 72, side: 'L' },
  vision: { cx: 200, cy: 58, side: 'R' },
  heart: { cx: 188, cy: 248, side: 'L' },
  lung: { cx: 212, cy: 238, side: 'R' },
  metabolic: { cx: 200, cy: 320, side: 'R' },
  joint: { cx: 168, cy: 480, side: 'L' },
  muscle: { cx: 232, cy: 520, side: 'R' },
}

export function BodyMetaphor({ domains, vignettes, className }: BodyMetaphorProps) {
  const [hovered, setHovered] = useState<BodyDomain['domain'] | null>(null)
  const lookup = useMemo(() => new Map(domains.map((d) => [d.domain, d])), [domains])
  const vignetteMap = useMemo(() => {
    const m = new Map<string, EmpathyVignette>()
    for (const v of vignettes) if (!m.has(v.domain)) m.set(v.domain, v)
    return m
  }, [vignettes])

  const maxPrev = Math.max(0.05, ...domains.map((d) => d.prevalence))

  return (
    <div className={cn('relative h-full min-h-0 w-full overflow-hidden', className)}>
      <svg
        viewBox="0 0 400 720"
        className="mx-auto block h-full max-h-full w-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="body-halo" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor={inkWash.mist} stopOpacity="0.7" />
            <stop offset="100%" stopColor={inkWash.mist} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="skin-ink" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EDE8DC" />
            <stop offset="100%" stopColor="#D8D0C0" />
          </linearGradient>
          <filter id="body-soft">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>

        <ellipse cx="200" cy="360" rx="110" ry="320" fill="url(#body-halo)" />

        {/* ── Realistic anterior human silhouette (medical poster style) ── */}
        <g fill="url(#skin-ink)" stroke={inkWash.ink} strokeWidth="0.9" strokeLinejoin="round">
          {/* Head */}
          <ellipse cx="200" cy="68" rx="34" ry="42" />
          {/* Ears */}
          <ellipse cx="166" cy="72" rx="6" ry="10" fill="#E5DFD2" />
          <ellipse cx="234" cy="72" rx="6" ry="10" fill="#E5DFD2" />
          {/* Neck */}
          <path d="M182 108 L182 138 Q200 148 218 138 L218 108 Z" />
          {/* Shoulders + upper torso */}
          <path d="M118 148 Q200 128 282 148 L268 220 Q200 210 132 220 Z" />
          {/* Chest / rib cage */}
          <path d="M132 220 Q200 232 268 220 L260 340 Q200 352 140 340 Z" opacity={0.95} />
          {/* Abdomen */}
          <path d="M140 340 Q200 358 260 340 L252 420 Q200 432 148 420 Z" />
          {/* Pelvis */}
          <path d="M148 420 Q200 440 252 420 L240 480 Q200 492 160 480 Z" />
          {/* Left arm */}
          <path d="M118 148 Q88 200 78 280 Q72 340 82 400 Q88 420 98 430 L108 420 Q98 360 104 280 Q110 200 132 220 Z" />
          {/* Right arm */}
          <path d="M282 148 Q312 200 322 280 Q328 340 318 400 Q312 420 302 430 L292 420 Q302 360 296 280 Q290 200 268 220 Z" />
          {/* Left hand */}
          <ellipse cx="92" cy="448" rx="14" ry="18" />
          {/* Right hand */}
          <ellipse cx="308" cy="448" rx="14" ry="18" />
          {/* Left thigh */}
          <path d="M160 492 Q150 560 148 620 L168 620 Q172 560 178 492 Z" />
          {/* Right thigh */}
          <path d="M240 492 Q250 560 252 620 L232 620 Q228 560 222 492 Z" />
          {/* Left lower leg */}
          <path d="M148 620 Q142 660 140 690 L162 692 Q168 660 168 620 Z" />
          {/* Right lower leg */}
          <path d="M252 620 Q258 660 260 690 L238 692 Q232 660 232 620 Z" />
          {/* Feet */}
          <ellipse cx="152" cy="702" rx="22" ry="8" />
          <ellipse cx="248" cy="702" rx="22" ry="8" />
        </g>

        {/* Anatomical detail lines (ink brush) */}
        <g fill="none" stroke={inkWash.ink} strokeOpacity={0.35} strokeWidth="0.6">
          {/* Clavicle */}
          <path d="M148 168 Q200 158 252 168" />
          {/* Sternum */}
          <path d="M200 220 L200 340" strokeDasharray="2 3" />
          {/* Rib hints */}
          <path d="M155 250 Q200 258 245 250" />
          <path d="M158 280 Q200 288 242 280" />
          <path d="M160 310 Q200 318 240 310" />
          {/* Navel */}
          <circle cx="200" cy="378" r="3" fill={inkWash.ink} fillOpacity={0.2} stroke="none" />
          {/* Knees */}
          <path d="M152 580 Q160 590 168 580" />
          <path d="M232 580 Q240 590 248 580" />
        </g>

        {/* Organ zones — subtle ink wash fills */}
        <g filter="url(#body-soft)">
          {(
            [
              ['brain', 'M182 38 Q200 28 218 38 Q220 78 200 88 Q180 78 182 38 Z'],
              ['heart', 'M172 228 Q188 218 200 240 Q212 218 228 228 Q220 268 200 278 Q180 268 172 228 Z'],
              ['lung', 'M148 218 Q132 248 140 288 Q160 278 168 248 Q158 228 148 218 M252 218 Q268 248 260 288 Q240 278 232 248 Q242 228 252 218'],
              ['metabolic', 'M162 318 Q200 308 238 318 Q232 368 200 378 Q168 368 162 318 Z'],
              ['joint', 'M148 460 Q168 450 178 490 Q160 510 148 490 Z M252 460 Q232 450 222 490 Q240 510 252 490 Z'],
              ['muscle', 'M168 500 L168 600 M232 500 L232 600'],
            ] as const
          ).map(([domain, d]) => {
            const active = hovered === domain
            const prev = lookup.get(domain as BodyDomain['domain'])?.prevalence ?? 0
            return (
              <path
                key={domain}
                d={d}
                fill={active ? inkWash.cinnabar : inkWash.indigo}
                fillOpacity={active ? 0.35 : 0.08 + (prev / maxPrev) * 0.2}
                stroke={active ? inkWash.cinnabar : 'none'}
                strokeWidth={active ? 1 : 0}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(domain as BodyDomain['domain'])}
                onMouseLeave={() => setHovered(null)}
              />
            )
          })}
        </g>

        {/* Callout connectors + labels (inside SVG — no HTML overflow) */}
        {Object.entries(ANCHORS).map(([domain, anchor]) => {
          const datum = lookup.get(domain as BodyDomain['domain'])
          if (!datum) return null
          const active = hovered === domain
          const isLeft = anchor.side === 'L'
          const lx = isLeft ? 8 : 392
          const ly = anchor.cy
          const r = 4 + (datum.prevalence / maxPrev) * 6
          return (
            <g key={domain}>
              <line
                x1={anchor.cx}
                y1={anchor.cy}
                x2={isLeft ? 70 : 330}
                y2={ly}
                stroke={active ? inkWash.cinnabar : inkWash.ink}
                strokeOpacity={active ? 0.85 : 0.3}
                strokeWidth={active ? 1 : 0.5}
                strokeDasharray="3 2"
              />
              <circle
                cx={anchor.cx}
                cy={anchor.cy}
                r={r}
                fill={inkWash.cinnabar}
                fillOpacity={active ? 0.95 : 0.55}
                stroke={inkWash.paperAlt}
                strokeWidth={1}
              />
              <g transform={`translate(${isLeft ? 4 : 396},${ly - 18})`}>
                <rect
                  x={isLeft ? 0 : -88}
                  y={0}
                  width={88}
                  height={36}
                  fill={inkWash.paperAlt}
                  fillOpacity={0.92}
                  stroke={active ? inkWash.cinnabar : inkWash.ink}
                  strokeOpacity={active ? 0.8 : 0.25}
                  strokeWidth={0.6}
                />
                <text
                  x={isLeft ? 4 : -4}
                  y={12}
                  textAnchor={isLeft ? 'start' : 'end'}
                  fill={inkWash.wash}
                  style={{ fontSize: 7, letterSpacing: '0.04em', fontFamily: '"Noto Serif SC",serif' }}
                >
                  {tBodyDomain(domain)}
                </text>
                <text
                  x={isLeft ? 4 : -4}
                  y={28}
                  textAnchor={isLeft ? 'start' : 'end'}
                  fill={active ? inkWash.cinnabar : inkWash.ink}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: '"Noto Serif SC",serif',
                  }}
                >
                  {formatPercent(datum.prevalence, 1)}
                </text>
              </g>
            </g>
          )
        })}

        {/* Empathy vignette banner at bottom when hovering */}
        {hovered && vignetteMap.get(hovered) && (
          <g transform="translate(20,640)">
            <rect
              x={0}
              y={0}
              width={360}
              height={68}
              fill={inkWash.paperAlt}
              stroke={inkWash.cinnabar}
              strokeOpacity={0.5}
              strokeWidth={0.6}
            />
            <text
              x={8}
              y={14}
              fill={inkWash.cinnabar}
              style={{ fontSize: 8, letterSpacing: '0.06em', fontFamily: '"Noto Serif SC",serif' }}
            >
              共情叙事 · {vignetteMap.get(hovered)!.protagonist}
            </text>
            <foreignObject x={8} y={18} width={344} height={48}>
              <div
                style={{
                  fontSize: 10,
                  lineHeight: 1.35,
                  color: inkWash.ink,
                  fontFamily: '"Noto Serif SC", serif',
                  overflow: 'hidden',
                } as React.CSSProperties}
              >
                {vignetteMap.get(hovered)!.text.slice(0, 180)}
                {vignetteMap.get(hovered)!.text.length > 180 ? '…' : ''}
              </div>
            </foreignObject>
          </g>
        )}

        {/* Cinnabar seal */}
        <g transform="translate(178,698)">
          <rect width="44" height="14" fill={inkWash.cinnabar} opacity={0.9} />
          <text
            x={22}
            y={11}
            textAnchor="middle"
            fill={inkWash.paperAlt}
            style={{ fontFamily: '"Noto Serif SC",serif', fontSize: 10, fontWeight: 700 }}
          >
            齡
          </text>
        </g>
      </svg>
    </div>
  )
}

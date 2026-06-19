import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/snapshot', label: '空间分布' },
  { to: '/trajectories', label: '驱动关联' },
]

export function Header() {
  return (
    <header className="relative shrink-0 border-b border-ink/15 bg-paper-alt/90 backdrop-blur-[2px]">
      <div className="flex h-8 w-full items-center gap-2 px-2">
        <div className="flex flex-1 items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-cinnabar text-paper shadow-sm">
            <span className="font-serif text-xs font-bold leading-none">齡</span>
          </div>
          <div className="leading-tight">
            <div className="font-serif text-[11px] font-semibold tracking-wide text-ink">
              龄健 AgeVital
            </div>
            <div className="text-[7px] tracking-wider text-ink-wash leading-none">
              衰弱可视分析 · CHARLS 2011–2018
            </div>
          </div>
        </div>
        <nav className="flex shrink-0 items-center gap-0">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group relative flex flex-col justify-center px-2 py-0 text-[9px] tracking-wide transition-colors',
                  isActive ? 'text-ink' : 'text-ink-wash hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="font-serif text-[10px] leading-tight">{item.label}</span>
                  <span
                    className={cn(
                      'absolute bottom-0 left-1/2 h-px -translate-x-1/2 bg-cinnabar transition-all',
                      isActive ? 'w-3/5' : 'w-0 group-hover:w-2/5',
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1" />
      </div>
      <div className="ink-divider" />
    </header>
  )
}
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/snapshot', label: '空间分布', kicker: '一 · 地理格局' },
  { to: '/trajectories', label: '驱动关联', kicker: '二 · 多维时序' },
]

export function Header() {
  return (
    <header className="relative shrink-0 border-b border-ink/15 bg-paper-alt/90 backdrop-blur-[2px]">
      <div className="flex h-14 w-full items-center gap-4 px-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-cinnabar text-paper shadow-sm">
            <span className="font-serif text-lg font-bold leading-none">齡</span>
          </div>
          <div className="leading-tight">
            <div className="font-serif text-sm font-semibold tracking-wide text-ink">
              龄健 AgeVital
            </div>
            <div className="text-[10px] tracking-wider text-ink-wash">
              衰弱可视分析 · CHARLS 2011–2018
            </div>
          </div>
        </div>
        <nav className="flex shrink-0 items-center gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group relative flex flex-col justify-center px-4 py-1 text-[11px] tracking-wide transition-colors',
                  isActive ? 'text-ink' : 'text-ink-wash hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="block text-[9px] leading-none tracking-widest text-ink-stone">{item.kicker}</span>
                  <span className="font-serif text-[12px] leading-tight">{item.label}</span>
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

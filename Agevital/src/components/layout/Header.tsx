import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/trajectories', label: '时空轨迹', kicker: '一 · 时序' },
  { to: '/snapshot', label: '深度洞察', kicker: '二 · 快照' },
]

export function Header() {
  return (
    <header className="relative shrink-0 border-b border-ink/15 bg-paper-alt/90 backdrop-blur-[2px]">
      <div className="flex h-14 w-full items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
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
        <nav className="flex items-center gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group relative px-4 py-2 text-[11px] tracking-wide transition-colors',
                  isActive ? 'text-ink' : 'text-ink-wash hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="block text-[9px] tracking-widest text-ink-stone">{item.kicker}</span>
                  <span className="font-serif text-[12px]">{item.label}</span>
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
        <div className="hidden text-[10px] tracking-wider text-ink-stone md:block">
          浙江大学 · 可视化导论 2026
        </div>
      </div>
      <div className="ink-divider" />
    </header>
  )
}

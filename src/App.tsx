import { Navigate, Route, Routes } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { TrajectoriesPage } from '@/pages/TrajectoriesPage'
import { SnapshotPage } from '@/pages/SnapshotPage'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ensureInkWashTheme } from '@/lib/theme/inkWash'

ensureInkWashTheme()

export default function App() {
  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex h-screen w-full flex-col overflow-hidden">
        <Header />
        <main className="relative min-h-0 flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/trajectories" replace />} />
            <Route path="/trajectories" element={<TrajectoriesPage />} />
            <Route path="/snapshot" element={<SnapshotPage />} />
            <Route path="*" element={<Navigate to="/trajectories" replace />} />
          </Routes>
        </main>
      </div>
    </TooltipProvider>
  )
}

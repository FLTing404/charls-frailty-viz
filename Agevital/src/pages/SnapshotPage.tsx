import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/snapshot/TopBar'
import { SnapshotGeoStage } from '@/components/snapshot/SnapshotGeoStage'
import { PageShell } from '@/components/layout/PageShell'
import { loadDeficitNetwork, loadDeficitProvince, loadProvinces, loadDeficitCity } from '@/lib/data/loaders'
import { useGlobalStore, type Wave } from '@/lib/store/globalStore'
import type { DeficitNetworkPayload, DeficitProvincePayload, DeficitCityPayload, ProvinceDatum } from '@/types/data'

export function SnapshotPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { year, set } = useGlobalStore()

  const [provinces, setProvinces] = useState<ProvinceDatum[]>([])
  const [deficitNetwork, setDeficitNetwork] = useState<DeficitNetworkPayload | null>(null)
  const [deficitProvince, setDeficitProvince] = useState<DeficitProvincePayload | null>(null)
  const [deficitCity, setDeficitCity] = useState<DeficitCityPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const y = Number(params.get('year'))
    if ([2011, 2013, 2015, 2018].includes(y)) set({ year: y as Wave })
  }, [params, set])

  useEffect(() => {
    let aborted = false
    setError(null)
    Promise.all([loadProvinces(year), loadDeficitNetwork(year), loadDeficitProvince(year), loadDeficitCity(year)])
      .then(([p, d, dp, dc]) => {
        if (!aborted) {
          setProvinces(p)
          setDeficitNetwork(d)
          setDeficitProvince(dp)
          setDeficitCity(dc)
        }
      })
      .catch((err) => {
        if (!aborted) setError(String(err))
      })
    return () => { aborted = true }
  }, [year])

  const handleProvinceClick = (province: string) => {
    set({ province })
    navigate(`/trajectories?province=${encodeURIComponent(province)}`)
  }

  return (
    <PageShell
      title={
        <h1 className="font-serif text-xs lg:text-base font-semibold tracking-wide text-ink">
          衰弱空间分布 · {year}
        </h1>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-1">
        {error && (
          <div className="mb-1 border border-cinnabar bg-cinnabar/10 px-2 py-1 text-[11px] text-cinnabar-deep">
            {error}
          </div>
        )}

        <TopBar />

        <SnapshotGeoStage
          provinces={provinces}
          deficitNetwork={deficitNetwork}
          deficitProvince={deficitProvince}
          deficitCity={deficitCity}
          onProvinceClick={handleProvinceClick}
        />
      </div>
    </PageShell>
  )
}

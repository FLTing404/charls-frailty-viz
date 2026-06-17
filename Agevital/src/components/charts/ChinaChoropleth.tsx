import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { ProvinceDatum } from '@/types/data'
import { fiGradient, inkWash } from '@/lib/theme/inkWash'
import { tProvince, tRegion } from '@/lib/i18n/zh'
import { cn, formatNumber, formatPercent } from '@/lib/utils'

type GeoFeature = {
  type: 'Feature'
  properties?: Record<string, unknown>
  geometry: unknown
}
type GeoFeatureCollection = { type: 'FeatureCollection'; features: GeoFeature[] }

interface ChinaChoroplethProps {
  data: ProvinceDatum[]
  selected: string | null
  onSelect: (province: string | null) => void
  className?: string
}

interface HoverState {
  x: number
  y: number
  html: string
}

const GEO_URL = `${import.meta.env.BASE_URL}geo/china-provinces.json`

/** Chinese province name (GeoJSON) → English name (preprocessor). */
const CN_TO_EN: Record<string, string> = {
  北京市: 'Beijing',
  天津市: 'Tianjin',
  河北省: 'Hebei',
  山西省: 'Shanxi',
  内蒙古自治区: 'Inner Mongolia',
  辽宁省: 'Liaoning',
  吉林省: 'Jilin',
  黑龙江省: 'Heilongjiang',
  上海市: 'Shanghai',
  江苏省: 'Jiangsu',
  浙江省: 'Zhejiang',
  安徽省: 'Anhui',
  福建省: 'Fujian',
  江西省: 'Jiangxi',
  山东省: 'Shandong',
  河南省: 'Henan',
  湖北省: 'Hubei',
  湖南省: 'Hunan',
  广东省: 'Guangdong',
  广西壮族自治区: 'Guangxi',
  海南省: 'Hainan',
  重庆市: 'Chongqing',
  四川省: 'Sichuan',
  贵州省: 'Guizhou',
  云南省: 'Yunnan',
  西藏自治区: 'Tibet',
  陕西省: 'Shaanxi',
  甘肃省: 'Gansu',
  青海省: 'Qinghai',
  宁夏回族自治区: 'Ningxia',
  新疆维吾尔自治区: 'Xinjiang',
  台湾省: 'Taiwan',
  香港特别行政区: 'Hong Kong',
  澳门特别行政区: 'Macau',
}

function normalizeAdcode(v: unknown): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return String(Math.floor(n / 10000) * 10000).padStart(6, '0')
}

export function ChinaChoropleth({ data, selected, onSelect, className }: ChinaChoroplethProps) {
  const wrap = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 640, height: 480 })
  const [geo, setGeo] = useState<GeoFeatureCollection | null>(null)
  const [hover, setHover] = useState<HoverState | null>(null)
  const uid = useMemo(() => `map-${Math.random().toString(36).slice(2, 8)}`, [])

  useEffect(() => {
    let aborted = false
    fetch(GEO_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`GeoJSON ${r.status}`)
        return r.json()
      })
      .then((g: GeoFeatureCollection) => {
        if (aborted) return
        // Keep province-level features only (Aliyun full.json includes provinces at level=province).
        const features = (g.features ?? []).filter((f) => {
          const p = f.properties ?? {}
          const level = String(p.level ?? '')
          const ad = Number(p.adcode ?? 0)
          return level === 'province' || (ad >= 110000 && ad % 10000 === 0)
        })
        setGeo({ type: 'FeatureCollection', features })
      })
      .catch(() => setGeo(null))
    return () => {
      aborted = true
    }
  }, [])

  useEffect(() => {
    if (!wrap.current) return
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect
        if (width > 0 && height > 0) {
          setSize({ width, height })
        }
      }
    })
    obs.observe(wrap.current)
    return () => obs.disconnect()
  }, [])

  const dataByCode = useMemo(() => {
    const map = new Map<string, ProvinceDatum>()
    for (const d of data) map.set(d.code, d)
    return map
  }, [data])

  const dataByName = useMemo(() => {
    const map = new Map<string, ProvinceDatum>()
    for (const d of data) map.set(d.province.toLowerCase(), d)
    return map
  }, [data])

  const colorScale = useMemo(() => {
    const values = data.map((d) => d.meanFI).filter((v) => Number.isFinite(v))
    const max = d3.max(values) ?? 0.3
    const min = Math.max(0, (d3.min(values) ?? 0) - 0.02)
    return d3.scaleSequential((t) => d3.interpolateRgbBasis(fiGradient)(t)).domain([min, max])
  }, [data])

  const { paths, projection } = useMemo(() => {
    if (!geo?.features?.length) {
      return { paths: [] as Array<{ d: string; feature: GeoFeature; datum?: ProvinceDatum }>, projection: null }
    }

    const fc = geo as any
    const projection = d3.geoMercator()
    const pathGen = d3.geoPath(projection)

    // Auto-fit China to the container — fixes invisible/off-screen map.
    projection.fitExtent(
      [
        [12, 8],
        [size.width - 12, size.height - 36],
      ],
      fc,
    )

    const ps = geo.features
      .map((feature) => {
        const props = feature.properties ?? {}
        const code = normalizeAdcode(props.adcode)
        let datum = dataByCode.get(code)
        if (!datum) {
          const cn = String(props.name ?? '')
          const en = CN_TO_EN[cn]
          if (en) datum = dataByName.get(en.toLowerCase())
        }
        const d = pathGen(feature as any) ?? ''
        return d ? { d, feature, datum } : null
      })
      .filter(Boolean) as Array<{ d: string; feature: GeoFeature; datum?: ProvinceDatum }>

    return { paths: ps, projection }
  }, [geo, size, dataByCode, dataByName])

  if (!geo) {
    return (
      <div ref={wrap} className={cn('relative h-full min-h-[200px] w-full', className)}>
        <div className="flex h-full items-center justify-center text-[11px] tracking-wide text-ink-wash">
          正在加载省界几何…
        </div>
      </div>
    )
  }

  if (!paths.length) {
    return (
      <div ref={wrap} className={cn('relative h-full min-h-[200px] w-full', className)}>
        <div className="flex h-full items-center justify-center text-[11px] text-cinnabar">
          地图几何加载失败，请检查 public/geo/china-provinces.json
        </div>
      </div>
    )
  }

  return (
    <div ref={wrap} className={cn('relative h-full min-h-0 w-full overflow-hidden', className)}>
      <svg width={size.width} height={size.height} className="block max-h-full max-w-full">
        <defs>
          <linearGradient id={`${uid}-legend`} x1="0" x2="1" y1="0" y2="0">
            {fiGradient.map((c, i) => (
              <stop key={i} offset={`${(i / (fiGradient.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </linearGradient>
          <filter id={`${uid}-ink`}>
            <feGaussianBlur stdDeviation="0.3" />
          </filter>
        </defs>

        {/* Ink-wash backdrop */}
        <rect
          x={0}
          y={0}
          width={size.width}
          height={size.height}
          fill={inkWash.paperAlt}
          fillOpacity={0.35}
        />

        <g filter={`url(#${uid}-ink)`}>
          {paths.map(({ d, feature, datum }, i) => {
            const fill = datum ? colorScale(datum.meanFI) : inkWash.paperDeep
            const isSelected = datum && selected === datum.province
            const isDim = selected && !isSelected
            return (
              <path
                key={i}
                d={d}
                fill={fill}
                fillOpacity={isDim ? 0.3 : 0.92}
                stroke={isSelected ? inkWash.cinnabar : inkWash.ink}
                strokeOpacity={isSelected ? 1 : 0.5}
                strokeWidth={isSelected ? 1.2 : 0.35}
                style={{ cursor: datum ? 'pointer' : 'default', transition: 'fill-opacity 200ms' }}
                onClick={() => {
                  if (!datum) return
                  onSelect(selected === datum.province ? null : datum.province)
                }}
                onMouseMove={(e) => {
                  if (!datum) return
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                  setHover({
                    x: e.clientX - rect.left + 12,
                    y: e.clientY - rect.top + 12,
                    html: `
                      <div class="font-serif text-[11px] tracking-wide text-ink">${tProvince(datum.province)}</div>
                      <div class="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-ink-wash">
                        <span>区域</span><span class="text-ink">${tRegion(datum.region)}</span>
                        <span>样本量</span><span class="text-ink">${formatNumber(datum.n)}</span>
                        <span>平均 FI</span><span class="text-ink">${datum.meanFI.toFixed(3)}</span>
                        <span>衰弱率</span><span style="color:${inkWash.cinnabar}">${formatPercent(datum.frailRate, 1)}</span>
                      </div>`,
                  })
                }}
                onMouseLeave={() => setHover(null)}
              />
            )
          })}
        </g>

        {selected && projection && (() => {
          const datum = data.find((d) => d.province === selected)
          if (!datum) return null
          const hit = paths.find((p) => p.datum?.province === datum.province)
          if (!hit) return null
          const pathGen = d3.geoPath(projection)
          const c = pathGen.centroid(hit.feature as any)
          return (
            <g transform={`translate(${c[0]},${c[1]})`}>
              <rect x={-42} y={-20} width={84} height={16} fill={inkWash.cinnabar} opacity={0.92} />
              <text
                textAnchor="middle"
                y={-8}
                fill={inkWash.paperAlt}
                style={{ fontFamily: '"Noto Serif SC", serif', fontSize: 9, letterSpacing: '0.14em' }}
              >
                {tProvince(datum.province)}
              </text>
            </g>
          )
        })()}

        <g transform={`translate(${size.width - 128},${size.height - 28})`}>
          <text fill={inkWash.wash} style={{ fontSize: 8, letterSpacing: '0.06em' }}>
            平均 FI
          </text>
          <rect
            x={0}
            y={8}
            width={112}
            height={5}
            fill={`url(#${uid}-legend)`}
            stroke={inkWash.ink}
            strokeOpacity={0.25}
          />
        </g>
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-20 max-w-[200px] border border-ink/40 bg-paper-alt p-2 shadow-ink"
          style={{ left: hover.x, top: hover.y }}
          dangerouslySetInnerHTML={{ __html: hover.html }}
        />
      )}
    </div>
  )
}

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { DriverChordPayload } from '@/types/data'
import { inkWash } from '@/lib/theme/inkWash'

interface DriverChordChartProps {
  data: DriverChordPayload | null
  className?: string
}

export function DriverChordChart({ data, className }: DriverChordChartProps) {
  const ref = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    if (!data?.matrix.length || !data.n) return

    const width = ref.current?.clientWidth ?? 360
    const height = ref.current?.clientHeight ?? 220
    const outerRadius = Math.min(width, height) * 0.42
    const innerRadius = outerRadius - 18

    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`)

    const matrix = data.matrix
    const n = matrix.length
    const chord = d3.chord().padAngle(0.04).sortSubgroups(d3.descending)
    const chords = chord(matrix)

    const color = d3.scaleOrdinal<string>()
      .domain(data.keys)
      .range([
        inkWash.cinnabarDeep,
        inkWash.indigo,
        inkWash.amber,
        inkWash.cinnabar,
        inkWash.bamboo,
        '#8C2A2A',
      ])

    const arc = d3.arc<d3.ChordGroup>().innerRadius(innerRadius).outerRadius(outerRadius)
    const ribbon = d3.ribbon<d3.Chord, d3.ChordSubgroup>().radius(innerRadius)

    g.append('g')
      .selectAll('path')
      .data(chords.groups)
      .join('path')
      .attr('fill', (d) => color(data.keys[d.index]) ?? inkWash.stone)
      .attr('stroke', inkWash.paper)
      .attr('stroke-width', 1)
      .attr('d', arc)
      .append('title')
      .text((d) => `${data.labels[d.index]}: ${matrix[d.index][d.index]}`)

    g.append('g')
      .attr('fill-opacity', 0.72)
      .selectAll('path')
      .data(chords)
      .join('path')
      .attr('d', ribbon)
      .attr('fill', (d) => color(data.keys[d.source.index]) ?? inkWash.stone)
      .attr('stroke', inkWash.paper)
      .append('title')
      .text(
        (d) =>
          `${data.labels[d.source.index]} ↔ ${data.labels[d.target.index]}: ${matrix[d.source.index][d.target.index]}`,
      )

    g.append('g')
      .selectAll('text')
      .data(chords.groups)
      .join('text')
      .each(function (d) {
        d3.select(this)
          .append('tspan')
          .attr('x', 0)
          .attr('dy', '0.35em')
          .text(data.labels[d.index])
      })
      .attr('transform', (d) => {
        const angle = (d.startAngle + d.endAngle) / 2
        const rotate = (angle * 180) / Math.PI - 90
        const flip = angle > Math.PI ? 180 : 0
        return `rotate(${rotate}) translate(${outerRadius + 6}) rotate(${flip})`
      })
      .attr('text-anchor', (d) => ((d.startAngle + d.endAngle) / 2 > Math.PI ? 'end' : 'start'))
      .attr('font-family', '"Noto Serif SC", serif')
      .attr('font-size', 8)
      .attr('fill', inkWash.ink)
  }, [data])

  if (!data?.n) {
    return (
      <div className={`flex items-center justify-center text-[10px] text-ink-stone ${className ?? ''}`}>
        暂无和弦图数据
      </div>
    )
  }

  return (
    <svg
      ref={ref}
      className={className}
      style={{ width: '100%', height: '100%', minHeight: 'clamp(150px, 18vh, 220px)' }}
      role="img"
      aria-label="驱动因素共现和弦图"
    />
  )
}

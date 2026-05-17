'use client'
import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { goalsApi } from '@/lib/api'
import { currentYear } from '@/lib/utils'
import DashboardLayout from '@/components/shared/DashboardLayout'
import { Map, Filter, RefreshCw } from 'lucide-react'

const COLOR_MAP: Record<string, string> = {
  green: '#10b981', amber: '#f59e0b', red: '#ef4444',
  gray: '#64748b', blue: '#6366f1',
}

export default function AlignmentMapPage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [data, setData] = useState<{ nodes: any[]; edges: any[] } | null>(null)
  const [tooltip, setTooltip] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(currentYear())
  const YEARS = [year - 1, year, year + 1]

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await goalsApi.getAlignmentMap(year)
      setData(res.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [year])

  useEffect(() => {
    if (!data || !svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = svgRef.current.clientWidth || 900
    const H = 580

    const g = svg.append('g')

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)

    // Force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges).id((d: any) => d.id).distance(120).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius((d: any) => (d.size || 10) + 15))

    // Edges
    const link = g.append('g').selectAll('line')
      .data(data.edges)
      .enter().append('line')
      .attr('class', 'link')
      .attr('stroke', (d: any) => d.type === 'shared' ? '#6366f1' : '#334155')
      .attr('stroke-width', (d: any) => d.type === 'shared' ? 2 : 1)
      .attr('stroke-dasharray', (d: any) => d.type === 'shared' ? '5,3' : 'none')

    // Node groups
    const node = g.append('g').selectAll('g')
      .data(data.nodes)
      .enter().append('g')
      .attr('class', (d: any) => `node-${d.type}`)
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, any>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null; d.fy = null
          })
      )
      .on('mouseenter', (_event, d) => setTooltip(d))
      .on('mouseleave', () => setTooltip(null))

    // Employee nodes — rectangles
    const empNodes = node.filter((d: any) => d.type === 'employee')
    empNodes.append('rect')
      .attr('x', -48).attr('y', -16).attr('width', 96).attr('height', 32)
      .attr('rx', 8)
      .attr('fill', '#1e293b')
      .attr('stroke', '#6366f1')
      .attr('stroke-width', 1.5)
    empNodes.append('text')
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('fill', '#e2e8f0').attr('font-size', '11px').attr('font-weight', '600')
      .text((d: any) => d.label.split(' ')[0])

    // Shared hub nodes — diamonds
    const hubNodes = node.filter((d: any) => d.type === 'shared_hub')
    hubNodes.append('polygon')
      .attr('points', '0,-20 20,0 0,20 -20,0')
      .attr('fill', '#312e81').attr('stroke', '#6366f1').attr('stroke-width', 1.5)
    hubNodes.append('text')
      .attr('text-anchor', 'middle').attr('dy', '30px')
      .attr('fill', '#a5b4fc').attr('font-size', '9px')
      .text((d: any) => d.label.slice(0, 18) + '…')

    // Goal nodes — circles
    const goalNodes = node.filter((d: any) => d.type === 'goal')
    goalNodes.append('circle')
      .attr('r', (d: any) => Math.max((d.size || 10) * 0.45, 8))
      .attr('fill', (d: any) => COLOR_MAP[d.color] || '#64748b')
      .attr('fill-opacity', (d: any) => d.opacity ?? 1)
      .attr('stroke', (d: any) => (COLOR_MAP[d.color] || '#64748b') + '80')
      .attr('stroke-width', 2)
    goalNodes.append('text')
      .attr('text-anchor', 'middle').attr('dy', (d: any) => Math.max((d.size || 10) * 0.45, 8) + 12)
      .attr('fill', '#94a3b8').attr('font-size', '9px')
      .text((d: any) => d.label.slice(0, 16) + (d.label.length > 16 ? '…' : ''))

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    return () => { simulation.stop() }
  }, [data])

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Map className="w-6 h-6 text-indigo-400" /> Goal Alignment Map
            </h1>
            <p className="text-slate-500 text-sm mt-1">D3 force graph — zoom, drag, hover to explore</p>
          </div>
          <div className="flex gap-3">
            <select
              className="input w-28 py-1.5 text-sm"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={fetchData} className="btn-secondary py-1.5 text-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4 flex-wrap">
          {[
            { color: '#10b981', label: '≥75% On track' },
            { color: '#f59e0b', label: '40–75% At risk' },
            { color: '#ef4444', label: '<40% Off track' },
            { color: '#64748b', label: 'No data' },
            { color: '#6366f1', label: 'Shared goal hub' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              {label}
            </div>
          ))}
        </div>

        <div className="card p-0 relative overflow-hidden" style={{ height: 580 }}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data?.nodes?.length ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
              No goal data for {year}
            </div>
          ) : (
            <svg ref={svgRef} width="100%" height="100%" />
          )}

          {/* Tooltip */}
          {tooltip && tooltip.type === 'goal' && (
            <div className="absolute top-4 right-4 card-sm max-w-xs text-xs z-10 pointer-events-none">
              <p className="font-semibold text-slate-100 mb-1">{tooltip.label}</p>
              <p className="text-slate-500">{tooltip.thrust_area}</p>
              <div className="divider" />
              <div className="grid grid-cols-2 gap-1">
                <span className="text-slate-500">Employee:</span><span className="text-slate-300">{tooltip.employee_name}</span>
                <span className="text-slate-500">Target:</span><span className="text-slate-300">{tooltip.target}</span>
                <span className="text-slate-500">Actual:</span><span className="text-slate-300">{tooltip.achievement ?? '—'}</span>
                <span className="text-slate-500">Weight:</span><span className="text-slate-300">{tooltip.weightage}%</span>
                <span className="text-slate-500">UoM:</span><span className="text-slate-300">{tooltip.uom_type}</span>
                <span className="text-slate-500">Score:</span>
                <span className={tooltip.score >= 0.75 ? 'text-emerald-400' : tooltip.score >= 0.4 ? 'text-amber-400' : 'text-red-400'}>
                  {tooltip.score != null ? `${Math.round(tooltip.score * 100)}%` : '—'}
                </span>
              </div>
              {tooltip.is_shared && <p className="mt-1 text-purple-400">🔗 Shared Goal</p>}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

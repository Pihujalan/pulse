'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/shared/DashboardLayout'
import { goalsApi, checkinsApi } from '@/lib/api'
import { currentYear, scoreColor } from '@/lib/utils'
import { BarChart3 } from 'lucide-react'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

function cellColor(score: number | null) {
  if (score === null) return 'bg-slate-800 text-slate-600'
  if (score >= 75) return 'bg-emerald-900/60 text-emerald-300'
  if (score >= 40) return 'bg-amber-900/60 text-amber-300'
  return 'bg-red-900/60 text-red-300'
}

function checkinColor(pct: number) {
  if (pct >= 100) return 'bg-emerald-900/60 text-emerald-300'
  if (pct > 0) return 'bg-blue-900/60 text-blue-300'
  return 'bg-slate-800 text-slate-600'
}

export default function MatrixPage() {
  const [sheets, setSheets] = useState<any[]>([])
  const [teamCheckins, setTeamCheckins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'progress' | 'checkin'>('progress')
  const [year, setYear] = useState(currentYear())
  const [dept, setDept] = useState<string>('ALL')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [sheetsRes, checkinsRes] = await Promise.all([
          goalsApi.getSheets(year),
          checkinsApi.getTeamCheckins(year),
        ])
        setSheets(Array.isArray(sheetsRes.data) ? sheetsRes.data : [])
        setTeamCheckins(Array.isArray(checkinsRes.data) ? checkinsRes.data : [])
      } catch {}
      setLoading(false)
    })()
  }, [year])

  const depts = ['ALL', ...Array.from(new Set(sheets.map((s: any) => s.employee_detail?.department).filter(Boolean)))]
  const filteredSheets = dept === 'ALL' ? sheets : sheets.filter((s: any) => s.employee_detail?.department === dept)

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-400" /> Team Health Matrix
            </h1>
            <p className="text-slate-500 text-sm mt-1">Goal progress & check-in completion heatmap</p>
          </div>
          <div className="flex gap-3">
            <select className="input w-24 py-1.5 text-sm" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="input w-36 py-1.5 text-sm" value={dept} onChange={e => setDept(e.target.value)}>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="flex rounded-lg overflow-hidden border border-slate-700">
              <button onClick={() => setView('progress')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'progress' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                Progress
              </button>
              <button onClick={() => setView('checkin')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'checkin' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                Check-ins
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4">
          {view === 'progress' ? (
            <>
              <div className="flex items-center gap-1.5 text-xs text-slate-400"><div className="w-3 h-3 rounded bg-emerald-900/60" />≥75%</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400"><div className="w-3 h-3 rounded bg-amber-900/60" />40–75%</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400"><div className="w-3 h-3 rounded bg-red-900/60" />&lt;40%</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400"><div className="w-3 h-3 rounded bg-slate-800" />No data</div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-xs text-slate-400"><div className="w-3 h-3 rounded bg-emerald-900/60" />100% done</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400"><div className="w-3 h-3 rounded bg-blue-900/60" />Partial</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400"><div className="w-3 h-3 rounded bg-slate-800" />Not started</div>
            </>
          )}
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3 px-4 text-slate-500 font-medium w-48">Employee</th>
                <th className="text-left py-3 px-3 text-slate-500 font-medium w-24">Dept</th>
                <th className="text-left py-3 px-3 text-slate-500 font-medium w-20">Status</th>
                {view === 'progress' ? (
                  // Per-goal columns (up to 8)
                  Array.from({ length: 8 }, (_, i) => (
                    <th key={i} className="py-3 px-2 text-slate-500 font-medium text-center text-xs">G{i + 1}</th>
                  ))
                ) : (
                  QUARTERS.map(q => (
                    <th key={q} className="py-3 px-3 text-slate-500 font-medium text-center">{q}</th>
                  ))
                )}
                <th className="py-3 px-3 text-slate-500 font-medium text-center">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredSheets.map((s: any) => {
                const goals: any[] = s.goals || []
                const tc = teamCheckins.find((t: any) => t.employee_id === s.employee_detail?.id)

                const overallScore = goals.length
                  ? goals.reduce((a: number, g: any) => a + (g.progress_score ?? 0), 0) / goals.length * 100
                  : null

                return (
                  <tr key={s.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-white">{s.employee_detail?.full_name?.[0]}</span>
                        </div>
                        <span className="text-slate-200 text-xs truncate">{s.employee_detail?.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 truncate">{s.employee_detail?.department}</td>
                    <td className="py-3 px-3">
                      <span className="text-xs text-slate-400">{s.status.slice(0, 6)}</span>
                    </td>

                    {view === 'progress' ? (
                      Array.from({ length: 8 }, (_, i) => {
                        const g = goals[i]
                        const score = g ? (g.progress_score != null ? g.progress_score * 100 : null) : null
                        return (
                          <td key={i} className="py-2 px-1">
                            {g ? (
                              <div className={`rounded text-center text-xs py-1.5 px-1 ${cellColor(score)}`}>
                                {score != null ? `${Math.round(score)}%` : '—'}
                              </div>
                            ) : (
                              <div className="rounded text-center text-xs py-1.5 px-1 text-slate-800">·</div>
                            )}
                          </td>
                        )
                      })
                    ) : (
                      QUARTERS.map(q => {
                        const qData = tc?.quarters?.[q]
                        const pct = qData?.completion_pct || 0
                        return (
                          <td key={q} className="py-2 px-2">
                            <div className={`rounded text-center text-xs py-1.5 ${checkinColor(pct)}`}>
                              {pct > 0 ? `${pct}%` : '—'}
                            </div>
                          </td>
                        )
                      })
                    )}

                    <td className="py-2 px-3">
                      <div className={`rounded text-center text-xs py-1.5 font-semibold ${cellColor(overallScore)}`}>
                        {overallScore != null ? `${Math.round(overallScore)}%` : '—'}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredSheets.length === 0 && (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-500 text-sm">No data found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}

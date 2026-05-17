'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/shared/DashboardLayout'
import ProgressRing from '@/components/shared/ProgressRing'
import { useAuth } from '@/lib/auth'
import { goalsApi, checkinsApi } from '@/lib/api'
import { statusBadgeClass, statusLabel, currentYear } from '@/lib/utils'
import { Target, ClipboardCheck, TrendingUp, AlertCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [sheet, setSheet] = useState<any>(null)
  const [checkins, setCheckins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const year = currentYear()

  useEffect(() => {
    ;(async () => {
      try {
        const res = await goalsApi.getSheet(year)
        const s = Array.isArray(res.data) ? res.data[0] : res.data
        setSheet(s)
        if (s?.goals?.length) {
          // Get checkins for first few goals
          const checks: any[] = []
          for (const g of s.goals.slice(0, 3)) {
            const r = await checkinsApi.getForGoal(g.id)
            checks.push(...r.data)
          }
          setCheckins(checks)
        }
      } catch {}
      setLoading(false)
    })()
  }, [])

  const goals = sheet?.goals || []
  const totalWeightage = goals.reduce((s: number, g: any) => s + g.weightage, 0)
  const avgScore = goals.length
    ? goals.reduce((s: number, g: any) => s + (g.progress_score ?? 0), 0) / goals.length * 100
    : null
  const checkedGoals = new Set(checkins.map((c: any) => c.goal_entry)).size

  const stats = [
    { label: 'My Goals', value: goals.length, icon: Target, color: 'text-indigo-400', sub: `of 8 max` },
    { label: 'Total Weightage', value: `${totalWeightage}%`, icon: TrendingUp, color: totalWeightage === 100 ? 'text-emerald-400' : 'text-amber-400', sub: totalWeightage === 100 ? 'Balanced ✓' : `Need ${100 - totalWeightage}% more` },
    { label: 'Check-ins Done', value: checkedGoals, icon: ClipboardCheck, color: 'text-blue-400', sub: `Q2 open` },
  ]

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Good morning, {user?.full_name?.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 mt-1 text-sm">Here's your performance snapshot for {year}.</p>
        </div>

        {/* Sheet status banner */}
        {sheet && (
          <div className={`flex items-center justify-between mb-6 px-4 py-3 rounded-xl border ${
            sheet.status === 'RETURNED' ? 'bg-red-900/20 border-red-800' :
            sheet.status === 'APPROVED' ? 'bg-emerald-900/20 border-emerald-800' :
            'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              {sheet.status === 'RETURNED' && <AlertCircle className="w-4 h-4 text-red-400" />}
              <div>
                <span className="text-sm font-medium text-slate-200">Goal Sheet Status: </span>
                <span className={`badge ${statusBadgeClass(sheet.status)}`}>{statusLabel(sheet.status)}</span>
                {sheet.status === 'RETURNED' && (
                  <p className="text-xs text-red-300 mt-1">{sheet.return_reason}</p>
                )}
              </div>
            </div>
            <Link href="/employee/goals" className="btn-secondary text-xs py-1.5">
              {sheet.status === 'RETURNED' ? 'Fix & Resubmit' : 'View Goals'}
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className="card-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{sub}</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-800">
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Overall score */}
          <div className="card col-span-2 flex flex-col items-center justify-center py-8">
            <ProgressRing score={avgScore} size={120} strokeWidth={10} />
            <p className="mt-3 text-sm font-medium text-slate-300">Overall Progress</p>
            <p className="text-xs text-slate-500 mt-0.5">{year} Performance Cycle</p>
          </div>

          {/* Goal list */}
          <div className="card col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title mb-0">My Goals</h3>
              <Link href="/employee/goals" className="text-xs text-indigo-400 hover:text-indigo-300">
                Manage →
              </Link>
            </div>
            {goals.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No goals set yet</p>
                <Link href="/employee/goals" className="btn-primary text-xs mt-3 inline-flex">
                  Add First Goal
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {goals.map((g: any) => {
                  const score = g.progress_score != null ? Math.min(g.progress_score * 100, 100) : null
                  return (
                    <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 truncate">{g.title}</p>
                        <p className="text-xs text-slate-600">{g.thrust_area} · {g.weightage}%</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold ${score == null ? 'text-slate-500' : score >= 75 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                          {score != null ? `${Math.round(score)}%` : '—'}
                        </p>
                        <div className="w-16 h-1 bg-slate-700 rounded-full mt-1">
                          <div
                            className={`h-full rounded-full ${score == null ? '' : score >= 75 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${score ?? 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

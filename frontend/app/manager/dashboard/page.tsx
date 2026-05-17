'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/shared/DashboardLayout'
import ProgressRing from '@/components/shared/ProgressRing'
import { useAuth } from '@/lib/auth'
import { goalsApi, checkinsApi, escalationsApi } from '@/lib/api'
import { statusBadgeClass, statusLabel, currentYear } from '@/lib/utils'
import { Users, ClipboardCheck, AlertTriangle, ChevronRight, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'

export default function ManagerDashboard() {
  const { user } = useAuth()
  const [sheets, setSheets] = useState<any[]>([])
  const [teamCheckins, setTeamCheckins] = useState<any[]>([])
  const [escalations, setEscalations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const year = currentYear()

  useEffect(() => {
    ;(async () => {
      try {
        const [sheetsRes, checkinsRes, escRes] = await Promise.all([
          goalsApi.getSheets(year),
          checkinsApi.getTeamCheckins(year),
          escalationsApi.list(true),
        ])
        setSheets(Array.isArray(sheetsRes.data) ? sheetsRes.data : [sheetsRes.data])
        setTeamCheckins(Array.isArray(checkinsRes.data) ? checkinsRes.data : [])
        setEscalations(Array.isArray(escRes.data) ? escRes.data : [])
      } catch {}
      setLoading(false)
    })()
  }, [])

  const pendingReview = sheets.filter(s => ['SUBMITTED', 'MANAGER_REVIEW'].includes(s.status))
  const approved = sheets.filter(s => s.status === 'APPROVED')
  const draft = sheets.filter(s => ['DRAFT', 'RETURNED'].includes(s.status))

  const statusCounts = {
    pending: pendingReview.length,
    approved: approved.length,
    draft: draft.length,
    total: sheets.length,
  }

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Team Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Performance cycle {year} · {user?.department}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Team', value: statusCounts.total, icon: Users, color: 'text-indigo-400' },
            { label: 'Pending Review', value: statusCounts.pending, icon: Clock, color: 'text-amber-400' },
            { label: 'Approved', value: statusCounts.approved, icon: CheckCircle, color: 'text-emerald-400' },
            { label: 'Escalations', value: escalations.length, icon: AlertTriangle, color: 'text-red-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                </div>
                <Icon className={`w-5 h-5 ${color} opacity-70`} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Team Members */}
          <div className="col-span-3 card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title mb-0">Team Members</h3>
              <Link href="/manager/review" className="text-xs text-indigo-400 hover:text-indigo-300">
                Review All →
              </Link>
            </div>
            <div className="space-y-2">
              {sheets.map((s: any) => {
                const goals = s.goals || []
                const avgScore = goals.length
                  ? goals.reduce((acc: number, g: any) => acc + (g.progress_score ?? 0), 0) / goals.length * 100
                  : null
                return (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-white">
                        {s.employee_detail?.full_name?.[0] || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{s.employee_detail?.full_name}</p>
                      <p className="text-xs text-slate-500">{s.employee_detail?.department} · {goals.length} goals</p>
                    </div>
                    <span className={`badge ${statusBadgeClass(s.status)} text-xs`}>{statusLabel(s.status)}</span>
                    <ProgressRing score={avgScore} size={36} strokeWidth={4} />
                  </div>
                )
              })}
              {sheets.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No team members found</p>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="col-span-2 space-y-4">
            {/* Pending review CTA */}
            {pendingReview.length > 0 && (
              <div className="card bg-amber-900/10 border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h4 className="font-medium text-amber-300 text-sm">Awaiting Your Review</h4>
                </div>
                <p className="text-2xl font-bold text-amber-400 mb-3">{pendingReview.length} sheets</p>
                <Link href="/manager/review" className="btn-secondary w-full justify-center text-sm">
                  Review Now <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Q2 check-in overview */}
            <div className="card">
              <h4 className="font-medium text-slate-200 text-sm mb-3 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-blue-400" /> Q2 Check-in Status
              </h4>
              <div className="space-y-2">
                {teamCheckins.slice(0, 4).map((tc: any) => {
                  const q2 = tc.quarters?.Q2
                  return (
                    <div key={tc.employee_id} className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 truncate">{tc.employee_name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full">
                          <div
                            className={`h-full rounded-full ${q2?.completion_pct >= 100 ? 'bg-emerald-500' : q2?.completion_pct > 0 ? 'bg-blue-500' : 'bg-slate-700'}`}
                            style={{ width: `${q2?.completion_pct || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{q2?.completion_pct || 0}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <Link href="/manager/checkins" className="text-xs text-blue-400 hover:text-blue-300 mt-3 block">
                View full matrix →
              </Link>
            </div>

            {/* Escalations */}
            {escalations.length > 0 && (
              <div className="card bg-red-900/10 border-red-900">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <h4 className="font-medium text-red-300 text-sm">Active Escalations</h4>
                </div>
                {escalations.slice(0, 3).map((e: any) => (
                  <div key={e.id} className="flex items-center gap-2 py-1.5 text-xs text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    {e.employee_name} — {e.escalation_type.replace('_', ' ')}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

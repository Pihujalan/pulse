'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/shared/DashboardLayout'
import ProgressRing from '@/components/shared/ProgressRing'
import { goalsApi, checkinsApi, escalationsApi, usersApi } from '@/lib/api'
import { statusBadgeClass, statusLabel, currentYear } from '@/lib/utils'
import { Users, Target, CheckCircle, AlertTriangle, BarChart3, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function AdminDashboard() {
  const [sheets, setSheets] = useState<any[]>([])
  const [escalations, setEscalations] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const year = currentYear()

  useEffect(() => {
    ;(async () => {
      try {
        const [sheetsRes, escRes, usersRes] = await Promise.all([
          goalsApi.getSheets(year),
          escalationsApi.list(true),
          usersApi.getAll(),
        ])
        setSheets(Array.isArray(sheetsRes.data) ? sheetsRes.data : [])
        setEscalations(Array.isArray(escRes.data) ? escRes.data : [])
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : [])
      } catch {}
      setLoading(false)
    })()
  }, [])

  const statusGroups = sheets.reduce((acc: Record<string, number>, s: any) => {
    acc[s.status] = (acc[s.status] || 0) + 1
    return acc
  }, {})

  const deptScores: Record<string, number[]> = {}
  sheets.forEach((s: any) => {
    const dept = s.employee_detail?.department || 'Unknown'
    const goals = s.goals || []
    const avg = goals.length
      ? goals.reduce((a: number, g: any) => a + (g.progress_score ?? 0), 0) / goals.length * 100
      : 0
    if (!deptScores[dept]) deptScores[dept] = []
    deptScores[dept].push(avg)
  })

  const deptData = Object.entries(deptScores).map(([dept, scores]) => ({
    dept,
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  }))

  const orgAvgScore = sheets.length
    ? deptData.reduce((a, d) => a + d.avg, 0) / deptData.length
    : null

  const stats = [
    { label: 'Total Employees', value: users.filter(u => u.role === 'EMPLOYEE').length, icon: Users, color: 'text-indigo-400' },
    { label: 'Goal Sheets', value: sheets.length, icon: Target, color: 'text-purple-400' },
    { label: 'Approved', value: statusGroups['APPROVED'] || 0, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Pending Review', value: (statusGroups['SUBMITTED'] || 0) + (statusGroups['MANAGER_REVIEW'] || 0), icon: BarChart3, color: 'text-amber-400' },
    { label: 'Unresolved Escalations', value: escalations.length, icon: AlertTriangle, color: 'text-red-400' },
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
      <div className="p-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Organisation-wide performance overview — {year}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card-sm">
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-6 mb-6">
          {/* Org score ring */}
          <div className="card col-span-1 flex flex-col items-center justify-center">
            <ProgressRing score={orgAvgScore} size={100} strokeWidth={9} />
            <p className="mt-2 text-xs text-slate-400 text-center">Org Avg Score</p>
          </div>

          {/* Status breakdown bar */}
          <div className="card col-span-2">
            <h3 className="section-title text-sm mb-4">Sheet Status Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(statusGroups).map(([status, count]) => {
                const pct = sheets.length ? Math.round(((count as number) / sheets.length) * 100) : 0
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className={`badge ${statusBadgeClass(status)} text-xs shrink-0`}>{statusLabel(status)}</span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right">{count as number}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dept performance */}
          <div className="card col-span-2">
            <h3 className="section-title text-sm mb-4">Dept Performance</h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={deptData} barSize={24}>
                <XAxis dataKey="dept" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(v: any) => [`${v}%`, 'Avg Score']}
                />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                  {deptData.map((d, i) => (
                    <Cell key={i} fill={d.avg >= 75 ? '#10b981' : d.avg >= 40 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { href: '/admin/alignment-map', label: 'Alignment Map', icon: '🗺️', desc: 'D3 goal graph' },
            { href: '/admin/matrix', label: 'Heatmap Matrix', icon: '🔥', desc: 'Team health grid' },
            { href: '/admin/shared-goals', label: 'Shared Goals', icon: '🤝', desc: 'Push cross-team goals' },
            { href: '/admin/export', label: 'Export Report', icon: '📊', desc: 'Download achievement data' },
          ].map(({ href, label, icon, desc }) => (
            <Link key={href} href={href} className="card-sm hover:border-slate-600 hover:bg-slate-800/60 transition-all group">
              <span className="text-2xl mb-2 block">{icon}</span>
              <p className="text-sm font-medium text-slate-200 group-hover:text-white">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/shared/DashboardLayout'
import { useToast, ToastProvider } from '@/components/shared/Toast'
import { goalsApi, checkinsApi } from '@/lib/api'
import { statusBadgeClass, statusLabel, currentYear } from '@/lib/utils'
import { ClipboardCheck, CheckCircle, Clock, AlertCircle } from 'lucide-react'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

function CheckinsPageInner() {
  const { toast } = useToast()
  const [sheet, setSheet] = useState<any>(null)
  const [allCheckins, setAllCheckins] = useState<Record<number, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeGoal, setActiveGoal] = useState<any>(null)
  const [form, setForm] = useState({ quarter: 'Q2', planned_target: '', actual_achievement: '', status: 'ON_TRACK', employee_note: '' })
  const year = currentYear()

  const load = async () => {
    const res = await goalsApi.getSheet(year)
    const s = Array.isArray(res.data) ? res.data[0] : res.data
    setSheet(s)
    if (s?.goals) {
      const map: Record<number, any[]> = {}
      await Promise.all(s.goals.map(async (g: any) => {
        const r = await checkinsApi.getForGoal(g.id)
        map[g.id] = r.data
      }))
      setAllCheckins(map)
    }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeGoal) return
    try {
      await checkinsApi.submitCheckin(activeGoal.id, {
        quarter: form.quarter,
        planned_target: parseFloat(form.planned_target),
        actual_achievement: form.actual_achievement ? parseFloat(form.actual_achievement) : undefined,
        status: form.status,
        employee_note: form.employee_note,
      })
      toast('Check-in saved!')
      setActiveGoal(null)
      load()
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Check-in failed'
      toast(msg, 'error')
    }
  }

  const goals: any[] = sheet?.goals || []
  const canCheckin = sheet?.status === 'APPROVED'

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">My Check-ins — {year}</h1>
          <p className="text-slate-500 text-sm mt-1">Submit quarterly progress updates for each goal. Q2 window is currently open.</p>
        </div>

        {!canCheckin && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-800 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-300">Check-ins Not Available</p>
              <p className="text-sm text-amber-400/70 mt-0.5">Your goal sheet must be approved before you can submit check-ins.</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {goals.map((goal: any) => {
            const checkins = allCheckins[goal.id] || []
            const checkinMap = Object.fromEntries(checkins.map((c: any) => [c.quarter, c]))

            return (
              <div key={goal.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-medium text-slate-200">{goal.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{goal.thrust_area} · Target: {goal.target} · {goal.weightage}%</p>
                  </div>
                </div>

                {/* Quarter grid */}
                <div className="grid grid-cols-4 gap-2">
                  {QUARTERS.map(q => {
                    const ci = checkinMap[q]
                    return (
                      <div
                        key={q}
                        className={`rounded-lg border p-3 text-center cursor-pointer transition-all hover:border-indigo-600 ${
                          ci ? 'border-emerald-800 bg-emerald-900/10' :
                          canCheckin ? 'border-slate-700 bg-slate-800/30 hover:bg-slate-800/60' :
                          'border-slate-800 bg-slate-900/30 opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => {
                          if (!canCheckin) return
                          setActiveGoal(goal)
                          if (ci) {
                            setForm({
                              quarter: q,
                              planned_target: String(ci.planned_target),
                              actual_achievement: ci.actual_achievement != null ? String(ci.actual_achievement) : '',
                              status: ci.status,
                              employee_note: ci.employee_note || '',
                            })
                          } else {
                            setForm({ quarter: q, planned_target: '', actual_achievement: '', status: 'ON_TRACK', employee_note: '' })
                          }
                        }}
                      >
                        <p className="text-xs font-medium text-slate-400 mb-1">{q}</p>
                        {ci ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                            <p className="text-xs text-emerald-400">{ci.status.replace('_', ' ')}</p>
                            {ci.actual_achievement != null && (
                              <p className="text-xs text-slate-500 mt-0.5">Act: {ci.actual_achievement}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-slate-600 mx-auto mb-1" />
                            <p className="text-xs text-slate-600">Not done</p>
                          </>
                        )}
                        {ci?.manager_comment && (
                          <div className="mt-1.5 text-[10px] text-blue-400 text-left bg-blue-900/20 rounded px-1.5 py-1">
                            💬 {ci.manager_comment.slice(0, 40)}...
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Check-in form modal */}
        {activeGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Check-in — {form.quarter}</h3>
                <button onClick={() => setActiveGoal(null)} className="text-slate-500 hover:text-slate-300">✕</button>
              </div>
              <p className="text-sm text-slate-400 mb-4 truncate">{activeGoal.title}</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Quarter</label>
                  <select className="input" value={form.quarter} onChange={e => setForm(f => ({ ...f, quarter: e.target.value }))}>
                    {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Planned Target for {form.quarter}</label>
                  <input type="number" step="0.01" className="input" placeholder="What did you plan to achieve this quarter?" value={form.planned_target} onChange={e => setForm(f => ({ ...f, planned_target: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Actual Achievement</label>
                  <input type="number" step="0.01" className="input" placeholder="What did you actually achieve?" value={form.actual_achievement} onChange={e => setForm(f => ({ ...f, actual_achievement: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="ON_TRACK">On Track</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea className="input" rows={2} placeholder="Any blockers or additional context..." value={form.employee_note} onChange={e => setForm(f => ({ ...f, employee_note: e.target.value }))} />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setActiveGoal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 justify-center">
                    <ClipboardCheck className="w-4 h-4" /> Save Check-in
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function CheckinsPage() {
  return <ToastProvider><CheckinsPageInner /></ToastProvider>
}

'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/shared/DashboardLayout'
import { useToast, ToastProvider } from '@/components/shared/Toast'
import { goalsApi } from '@/lib/api'
import { statusBadgeClass, statusLabel, uomLabel, currentYear } from '@/lib/utils'
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Edit2, Save, Lock } from 'lucide-react'

function ReviewPageInner() {
  const { toast } = useToast()
  const [sheets, setSheets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [returnSheet, setReturnSheet] = useState<{ id: number; reason: string } | null>(null)
  const [editGoal, setEditGoal] = useState<{ sheetId: number; goal: any; target: string; weightage: string } | null>(null)
  const [saving, setSaving] = useState<number | null>(null)

  const load = async () => {
    const res = await goalsApi.getReview()
    setSheets(Array.isArray(res.data) ? res.data : [])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const toggle = (id: number) => setExpanded(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const handleApprove = async (sheetId: number) => {
    setSaving(sheetId)
    try {
      await goalsApi.approveSheet(sheetId)
      toast('Sheet approved!')
      load()
    } catch (err: any) {
      toast(err.response?.data?.detail || 'Approval failed', 'error')
    } finally { setSaving(null) }
  }

  const handleReturn = async () => {
    if (!returnSheet || returnSheet.reason.length < 10) {
      toast('Reason must be at least 10 characters', 'error')
      return
    }
    try {
      await goalsApi.returnSheet(returnSheet.id, returnSheet.reason)
      toast('Sheet returned for rework')
      setReturnSheet(null)
      load()
    } catch { toast('Failed to return sheet', 'error') }
  }

  const handleSaveEdit = async () => {
    if (!editGoal) return
    try {
      await goalsApi.updateGoal(editGoal.sheetId, editGoal.goal.id, {
        target: parseFloat(editGoal.target),
        weightage: parseInt(editGoal.weightage),
      })
      toast('Goal updated!')
      setEditGoal(null)
      load()
    } catch (err: any) {
      toast(err.response?.data?.detail || 'Failed to update goal', 'error')
    }
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
      <div className="p-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Review Goal Sheets</h1>
          <p className="text-slate-500 text-sm mt-1">{sheets.length} sheet{sheets.length !== 1 ? 's' : ''} awaiting review</p>
        </div>

        {sheets.length === 0 ? (
          <div className="card text-center py-16">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
            <p className="text-slate-300 font-medium">All caught up!</p>
            <p className="text-slate-500 text-sm mt-1">No pending goal sheets to review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sheets.map((s: any) => {
              const isOpen = expanded.has(s.id)
              const goals: any[] = s.goals || []
              const total = goals.reduce((acc: number, g: any) => acc + g.weightage, 0)
              const weightageOk = total === 100
              const canApprove = s.status === 'MANAGER_REVIEW' && weightageOk

              return (
                <div key={s.id} className="card">
                  {/* Header */}
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggle(s.id)}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-white">{s.employee_detail?.full_name?.[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-200">{s.employee_detail?.full_name}</p>
                      <p className="text-xs text-slate-500">{s.employee_detail?.department} · {goals.length} goals · Weightage: <span className={weightageOk ? 'text-emerald-400' : 'text-amber-400'}>{total}%</span></p>
                    </div>
                    <span className={`badge ${statusBadgeClass(s.status)}`}>{statusLabel(s.status)}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>

                  {/* Goals */}
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <div className="space-y-2 mb-4">
                        {goals.map((g: any) => {
                          const isEditing = editGoal?.goal.id === g.id
                          return (
                            <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/40">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-200 truncate">{g.title}</p>
                                <p className="text-xs text-slate-500">{g.thrust_area} · {uomLabel(g.uom_type)}</p>
                              </div>
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <div>
                                    <label className="text-xs text-slate-500">Target</label>
                                    <input type="number" className="input w-20 py-1 text-sm" value={editGoal!.target} onChange={e => setEditGoal(prev => prev ? { ...prev, target: e.target.value } : null)} />
                                  </div>
                                  <div>
                                    <label className="text-xs text-slate-500">Weight%</label>
                                    <input type="number" className="input w-20 py-1 text-sm" value={editGoal!.weightage} onChange={e => setEditGoal(prev => prev ? { ...prev, weightage: e.target.value } : null)} />
                                  </div>
                                  <button onClick={handleSaveEdit} className="btn-success py-1 px-2 text-xs mt-3"><Save className="w-3 h-3" /></button>
                                  <button onClick={() => setEditGoal(null)} className="btn-secondary py-1 px-2 text-xs mt-3">✕</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-slate-400">Target: {g.target}</span>
                                  <span className="badge bg-slate-800 text-slate-400 text-xs">{g.weightage}%</span>
                                  {s.status === 'MANAGER_REVIEW' && (
                                    <button
                                      onClick={() => setEditGoal({ sheetId: s.id, goal: g, target: String(g.target), weightage: String(g.weightage) })}
                                      className="text-slate-500 hover:text-indigo-400"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Approve / Return / Move to review */}
                      <div className="flex gap-3">
                        {s.status === 'SUBMITTED' && (
                          <button onClick={() => handleApprove(s.id)} disabled={saving === s.id} className="btn-secondary flex-1 justify-center">
                            Move to Review
                          </button>
                        )}
                        {s.status === 'MANAGER_REVIEW' && (
                          <>
                            <button
                              onClick={() => setReturnSheet({ id: s.id, reason: '' })}
                              className="btn-danger flex-1 justify-center"
                            >
                              <XCircle className="w-4 h-4" /> Return
                            </button>
                            <button
                              onClick={() => handleApprove(s.id)}
                              disabled={!canApprove || saving === s.id}
                              className="btn-success flex-1 justify-center"
                            >
                              {saving === s.id
                                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <><CheckCircle className="w-4 h-4" /> Approve & Lock</>
                              }
                            </button>
                          </>
                        )}
                        {!weightageOk && (
                          <p className="text-xs text-amber-400 self-center">Weightage is {total}% — must be 100%</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Return modal */}
        {returnSheet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md card">
              <h3 className="font-semibold mb-4 text-red-300">Return Sheet for Rework</h3>
              <label className="label">Reason (minimum 10 characters) *</label>
              <textarea
                className="input mb-4" rows={4}
                placeholder="Explain what needs to be fixed..."
                value={returnSheet.reason}
                onChange={e => setReturnSheet(prev => prev ? { ...prev, reason: e.target.value } : null)}
              />
              <div className="flex gap-3">
                <button onClick={() => setReturnSheet(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={handleReturn} className="btn-danger flex-1 justify-center">
                  <XCircle className="w-4 h-4" /> Return Sheet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function ReviewPage() {
  return <ToastProvider><ReviewPageInner /></ToastProvider>
}

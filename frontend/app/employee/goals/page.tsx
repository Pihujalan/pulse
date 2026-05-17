'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/shared/DashboardLayout'
import GoalCard from '@/components/goal-health/GoalCard'
import AISuggestModal from '@/components/goal-health/AISuggestModal'
import { useToast, ToastProvider } from '@/components/shared/Toast'
import { goalsApi } from '@/lib/api'
import { statusBadgeClass, statusLabel, currentYear } from '@/lib/utils'
import { Plus, Send, Sparkles, Lock, AlertCircle, Target } from 'lucide-react'

const UOM_OPTIONS = [
  { value: 'MIN', label: 'Numeric / % (Higher is Better)', hint: 'e.g. Revenue, CSAT score' },
  { value: 'MAX', label: 'Numeric (Lower is Better)', hint: 'e.g. TAT, Cost, Error rate' },
  { value: 'TIMELINE', label: 'Timeline / Date-based', hint: 'e.g. Project delivery' },
  { value: 'ZERO', label: 'Zero-based (Zero = Success)', hint: 'e.g. Incidents, Defects' },
]

function GoalsPageInner() {
  const { toast } = useToast()
  const [sheet, setSheet] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [editGoal, setEditGoal] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [achievementGoal, setAchievementGoal] = useState<any>(null)
  const [achievementVal, setAchievementVal] = useState('')

  const [form, setForm] = useState({
    title: '', description: '', thrust_area: '', uom_type: 'MIN',
    target: '', weightage: '', deadline: ''
  })
  const year = currentYear()

  const load = async () => {
    const res = await goalsApi.getSheet(year)
    const s = Array.isArray(res.data) ? res.data[0] : res.data
    setSheet(s)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const goals: any[] = sheet?.goals || []
  const totalWeightage = goals.reduce((s: number, g: any) => s + g.weightage, 0)
  const canEdit = sheet && !sheet.is_locked && ['DRAFT', 'RETURNED'].includes(sheet.status)
  const canSubmit = canEdit && goals.length > 0 && totalWeightage === 100

  const resetForm = () => setForm({ title: '', description: '', thrust_area: '', uom_type: 'MIN', target: '', weightage: '', deadline: '' })

  const handleSubmitGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheet) return
    try {
      const payload: any = {
        title: form.title, description: form.description, thrust_area: form.thrust_area,
        uom_type: form.uom_type, target: parseFloat(form.target), weightage: parseInt(form.weightage),
      }
      if (form.deadline) payload.deadline = form.deadline
      if (editGoal) {
        await goalsApi.updateGoal(sheet.id, editGoal.id, payload)
        toast('Goal updated!')
      } else {
        await goalsApi.addGoal(sheet.id, payload)
        toast('Goal added!')
      }
      setShowForm(false)
      setEditGoal(null)
      resetForm()
      load()
    } catch (err: any) {
      const errs = err.response?.data
      const msg = typeof errs === 'object' ? Object.values(errs).flat().join(' ') : 'Failed to save goal.'
      toast(msg, 'error')
    }
  }

  const handleDelete = async (goalId: number) => {
    if (!sheet) return
    try {
      await goalsApi.deleteGoal(sheet.id, goalId)
      toast('Goal deleted')
      load()
    } catch { toast('Failed to delete goal', 'error') }
  }

  const handleEdit = (goal: any) => {
    setEditGoal(goal)
    setForm({
      title: goal.title, description: goal.description || '', thrust_area: goal.thrust_area,
      uom_type: goal.uom_type, target: String(goal.target), weightage: String(goal.weightage),
      deadline: goal.deadline || ''
    })
    setShowForm(true)
  }

  const handleSubmitSheet = async () => {
    if (!sheet) return
    setSubmitting(true)
    try {
      await goalsApi.submitSheet(sheet.id)
      toast('Goal sheet submitted for review!')
      load()
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Submission failed'
      toast(msg, 'error')
    } finally { setSubmitting(false) }
  }

  const handleLogAchievement = async () => {
    if (!achievementGoal) return
    try {
      await goalsApi.updateAchievement(achievementGoal.id, parseFloat(achievementVal))
      toast('Achievement logged!')
      setAchievementGoal(null)
      load()
    } catch { toast('Failed to log achievement', 'error') }
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
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">My Goals — {year}</h1>
            <p className="text-slate-500 text-sm mt-1">Set up to 8 goals. Total weightage must equal 100%.</p>
          </div>
          <div className="flex items-center gap-3">
            {sheet && (
              <span className={`badge ${statusBadgeClass(sheet.status)} text-sm py-1`}>
                {sheet.is_locked && <Lock className="w-3 h-3 mr-1" />}
                {statusLabel(sheet.status)}
              </span>
            )}
          </div>
        </div>

        {/* Return reason */}
        {sheet?.status === 'RETURNED' && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-300">Returned for Rework</p>
              <p className="text-sm text-red-400/80 mt-0.5">{sheet.return_reason}</p>
            </div>
          </div>
        )}

        {/* Weightage bar */}
        <div className="card-sm mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Total Weightage</span>
            <span className={`text-sm font-bold ${totalWeightage === 100 ? 'text-emerald-400' : totalWeightage > 100 ? 'text-red-400' : 'text-amber-400'}`}>
              {totalWeightage}% / 100%
            </span>
          </div>
          <div className="progress-bar h-3">
            <div
              className={`progress-fill ${totalWeightage === 100 ? 'bg-emerald-500' : totalWeightage > 100 ? 'bg-red-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(totalWeightage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>{goals.length} goals</span>
            <span>{goals.length < 8 ? `${8 - goals.length} slots remaining` : 'Max goals reached'}</span>
          </div>
        </div>

        {/* Goals list */}
        <div className="space-y-3 mb-6">
          {goals.length === 0 ? (
            <div className="card text-center py-12">
              <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-1">No goals added yet</p>
              <p className="text-sm text-slate-600">Add your first goal to get started</p>
            </div>
          ) : (
            goals.map((g: any) => (
              <GoalCard
                key={g.id}
                goal={g}
                canEdit={canEdit}
                canDelete={canEdit}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onLogAchievement={sheet?.status === 'APPROVED' ? setAchievementGoal : undefined}
              />
            ))
          )}
        </div>

        {/* Actions */}
        {canEdit && goals.length < 8 && (
          <button onClick={() => { setEditGoal(null); resetForm(); setShowForm(true) }} className="btn-secondary w-full justify-center mb-3">
            <Plus className="w-4 h-4" />
            Add Goal
          </button>
        )}

        {canSubmit && (
          <button onClick={handleSubmitSheet} disabled={submitting} className="btn-primary w-full justify-center py-3">
            {submitting
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Send className="w-4 h-4" /> Submit for Manager Review</>
            }
          </button>
        )}
        {canEdit && !canSubmit && goals.length > 0 && (
          <p className="text-xs text-center text-amber-400 mt-2">
            {totalWeightage !== 100 ? `Adjust weightage to total 100% before submitting (currently ${totalWeightage}%)` : ''}
          </p>
        )}

        {/* Add/Edit Goal Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg card max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold">{editGoal ? 'Edit Goal' : 'Add New Goal'}</h3>
                <div className="flex gap-2">
                  {form.title.length > 3 && !editGoal && (
                    <button
                      type="button"
                      onClick={() => setShowAI(true)}
                      className="btn-secondary text-xs py-1 gap-1.5 border-indigo-800 text-indigo-400 hover:text-indigo-300"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> AI Suggest
                    </button>
                  )}
                  <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300 text-sm">✕</button>
                </div>
              </div>
              <form onSubmit={handleSubmitGoal} className="space-y-4">
                <div>
                  <label className="label">Goal Title *</label>
                  <input className="input" placeholder="e.g. Achieve ₹50L Monthly Revenue" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input" rows={2} placeholder="Additional context..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Thrust Area *</label>
                  <input className="input" placeholder="e.g. Revenue Growth, Quality, Safety" value={form.thrust_area} onChange={e => setForm(f => ({ ...f, thrust_area: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Unit of Measure *</label>
                  <select className="input" value={form.uom_type} onChange={e => setForm(f => ({ ...f, uom_type: e.target.value }))}>
                    {UOM_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label} — {o.hint}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Target *</label>
                    <input type="number" step="0.01" className="input" placeholder="e.g. 50" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="label">Weightage (%) *</label>
                    <input type="number" min="10" max="100" step="1" className="input" placeholder="min 10" value={form.weightage} onChange={e => setForm(f => ({ ...f, weightage: e.target.value }))} required />
                  </div>
                </div>
                {form.uom_type === 'TIMELINE' && (
                  <div>
                    <label className="label">Deadline *</label>
                    <input type="date" className="input" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} required />
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 justify-center">
                    {editGoal ? 'Update Goal' : 'Add Goal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Achievement Modal */}
        {achievementGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm card">
              <h3 className="font-semibold mb-4">Log Achievement</h3>
              <p className="text-sm text-slate-400 mb-3">Goal: {achievementGoal.title}</p>
              <p className="text-xs text-slate-500 mb-3">Target: {achievementGoal.target}</p>
              <label className="label">Actual Achievement</label>
              <input type="number" step="0.01" className="input mb-4" placeholder="Enter actual value" value={achievementVal} onChange={e => setAchievementVal(e.target.value)} />
              <div className="flex gap-3">
                <button onClick={() => setAchievementGoal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={handleLogAchievement} className="btn-primary flex-1 justify-center">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* AI Modal */}
        {showAI && (
          <AISuggestModal
            draftTitle={form.title}
            thrustArea={form.thrust_area}
            uomType={form.uom_type}
            onApply={(s) => {
              setForm(f => ({ ...f, title: s.title, uom_type: s.recommended_uom }))
              setShowAI(false)
            }}
            onClose={() => setShowAI(false)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

export default function GoalsPage() {
  return <ToastProvider><GoalsPageInner /></ToastProvider>
}

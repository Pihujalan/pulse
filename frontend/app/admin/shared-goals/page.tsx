'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/shared/DashboardLayout'
import { useToast, ToastProvider } from '@/components/shared/Toast'
import { goalsApi, usersApi } from '@/lib/api'
import { currentYear, uomLabel } from '@/lib/utils'
import { Users, Plus, Link2 } from 'lucide-react'

const UOM_OPTIONS = ['MIN', 'MAX', 'TIMELINE', 'ZERO']

function SharedGoalsInner() {
  const { toast } = useToast()
  const [shared, setShared] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const year = currentYear()
  const [form, setForm] = useState({
    title: '', description: '', thrust_area: '', uom_type: 'MIN',
    target: '', cycle_year: year, primary_owner_id: '', employee_ids: [] as number[]
  })

  const load = async () => {
    const [sRes, uRes] = await Promise.all([goalsApi.getSharedGoals(year), usersApi.getAll()])
    setShared(Array.isArray(sRes.data) ? sRes.data : [])
    setUsers(Array.isArray(uRes.data) ? uRes.data : [])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const employees = users.filter(u => u.role === 'EMPLOYEE')

  const toggleEmployee = (id: number) => {
    setForm(f => ({
      ...f,
      employee_ids: f.employee_ids.includes(id)
        ? f.employee_ids.filter(e => e !== id)
        : [...f.employee_ids, id]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.employee_ids.length === 0) { toast('Select at least one employee', 'error'); return }
    if (!form.primary_owner_id) { toast('Select a primary owner', 'error'); return }
    setSubmitting(true)
    try {
      await goalsApi.createSharedGoal({
        title: form.title,
        description: form.description,
        thrust_area: form.thrust_area,
        uom_type: form.uom_type,
        target: parseFloat(form.target),
        cycle_year: form.cycle_year,
        primary_owner: parseInt(form.primary_owner_id),
        employee_ids: form.employee_ids
      })
      toast(`Shared goal pushed to ${form.employee_ids.length} employees!`)
      setShowForm(false)
      setForm({ title: '', description: '', thrust_area: '', uom_type: 'MIN', target: '', cycle_year: year, primary_owner_id: '', employee_ids: [] })
      load()
    } catch (err: any) {
      toast(err.response?.data?.detail || 'Failed to create shared goal', 'error')
    } finally { setSubmitting(false) }
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
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Link2 className="w-6 h-6 text-indigo-400" /> Shared Goals
            </h1>
            <p className="text-slate-500 text-sm mt-1">Push cross-team goals to multiple employees at once</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Create Shared Goal
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {shared.length === 0 ? (
            <div className="card text-center py-12">
              <Link2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No shared goals yet</p>
              <p className="text-slate-600 text-sm mt-1">Create a shared goal to sync it across multiple employees</p>
            </div>
          ) : shared.map((sg: any) => (
            <div key={sg.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge bg-purple-900/50 text-purple-300 text-xs">Shared</span>
                    <span className="badge bg-slate-800 text-slate-400 text-xs">{sg.cycle_year}</span>
                    <span className="badge bg-slate-800 text-slate-400 text-xs">{uomLabel(sg.uom_type)}</span>
                  </div>
                  <p className="font-medium text-slate-200">{sg.title}</p>
                  {sg.description && <p className="text-sm text-slate-500 mt-1">{sg.description}</p>}
                  <div className="flex gap-4 mt-3 text-xs text-slate-600">
                    <span>Thrust: <span className="text-slate-400">{sg.thrust_area}</span></span>
                    <span>Target: <span className="text-slate-400">{sg.target}</span></span>
                    <span>Primary owner: <span className="text-slate-400">{sg.primary_owner_detail?.full_name}</span></span>
                    <span>Created by: <span className="text-slate-400">{sg.created_by_detail?.full_name}</span></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg card max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold">Create Shared Goal</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Title *</label>
                  <input className="input" placeholder="e.g. Achieve 95% CSAT Org-wide" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Thrust Area *</label>
                    <input className="input" value={form.thrust_area} onChange={e => setForm(f => ({ ...f, thrust_area: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="label">UoM *</label>
                    <select className="input" value={form.uom_type} onChange={e => setForm(f => ({ ...f, uom_type: e.target.value }))}>
                      {UOM_OPTIONS.map(o => <option key={o} value={o}>{o} — {uomLabel(o)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Target *</label>
                    <input type="number" step="0.01" className="input" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="label">Cycle Year *</label>
                    <input type="number" className="input" value={form.cycle_year} onChange={e => setForm(f => ({ ...f, cycle_year: Number(e.target.value) }))} required />
                  </div>
                </div>
                <div>
                  <label className="label">Primary Owner (achievement sync source) *</label>
                  <select className="input" value={form.primary_owner_id} onChange={e => setForm(f => ({ ...f, primary_owner_id: e.target.value }))} required>
                    <option value="">Select employee...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} — {e.department}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Push to Employees * ({form.employee_ids.length} selected)</label>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                    {employees.map(e => (
                      <label key={e.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 rounded px-2 py-1">
                        <input
                          type="checkbox"
                          className="accent-indigo-500"
                          checked={form.employee_ids.includes(e.id)}
                          onChange={() => toggleEmployee(e.id)}
                        />
                        <span className="text-sm text-slate-300">{e.full_name}</span>
                        <span className="text-xs text-slate-500">{e.department}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                    {submitting
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <><Users className="w-4 h-4" /> Push to Team</>
                    }
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

export default function SharedGoalsPage() {
  return <ToastProvider><SharedGoalsInner /></ToastProvider>
}

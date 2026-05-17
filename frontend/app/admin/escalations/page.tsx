'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/shared/DashboardLayout'
import { useToast, ToastProvider } from '@/components/shared/Toast'
import { escalationsApi, usersApi } from '@/lib/api'
import { AlertTriangle, CheckCircle, Plus } from 'lucide-react'
import { format } from 'date-fns'

function EscalationsInner() {
  const { toast } = useToast()
  const [escalations, setEscalations] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [unresOnly, setUnresOnly] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ employee_id: '', notes: '' })

  const load = async () => {
    const [eRes, uRes] = await Promise.all([escalationsApi.list(unresOnly), usersApi.getAll()])
    setEscalations(Array.isArray(eRes.data) ? eRes.data : [])
    setUsers(Array.isArray(uRes.data) ? uRes.data : [])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [unresOnly])

  const handleResolve = async (id: number) => {
    try {
      await escalationsApi.resolve(id)
      toast('Escalation resolved')
      load()
    } catch { toast('Failed to resolve', 'error') }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await escalationsApi.create({ employee_id: parseInt(form.employee_id), notes: form.notes })
      toast('Escalation created')
      setShowForm(false)
      load()
    } catch { toast('Failed to create escalation', 'error') }
  }

  const TYPE_COLORS: Record<string, string> = {
    NO_SUBMISSION: 'text-red-400 bg-red-900/30',
    NO_CHECKIN: 'text-amber-400 bg-amber-900/30',
    OVERDUE: 'text-orange-400 bg-orange-900/30',
    MANUAL: 'text-blue-400 bg-blue-900/30',
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
              <AlertTriangle className="w-6 h-6 text-red-400" /> Escalations
            </h1>
            <p className="text-slate-500 text-sm mt-1">Track and resolve performance issues</p>
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input type="checkbox" className="accent-indigo-500" checked={unresOnly} onChange={e => setUnresOnly(e.target.checked)} />
              Unresolved only
            </label>
            <button onClick={() => setShowForm(true)} className="btn-danger text-sm">
              <Plus className="w-4 h-4" /> Manual Escalation
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {escalations.length === 0 ? (
            <div className="card text-center py-12">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-60" />
              <p className="text-slate-300 font-medium">No escalations</p>
              <p className="text-slate-500 text-sm mt-1">All clear!</p>
            </div>
          ) : escalations.map((e: any) => (
            <div key={e.id} className={`card flex items-start gap-4 ${e.is_resolved ? 'opacity-50' : ''}`}>
              <div className={`shrink-0 px-2 py-1 rounded text-xs font-medium ${TYPE_COLORS[e.escalation_type] || 'text-slate-400 bg-slate-800'}`}>
                {e.escalation_type.replace('_', ' ')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-200">{e.employee_name}</p>
                {e.notes && <p className="text-sm text-slate-500 mt-0.5">{e.notes}</p>}
                <div className="flex gap-4 mt-1 text-xs text-slate-600">
                  <span>Notified: {e.notified_to_name}</span>
                  <span>Triggered: {format(new Date(e.triggered_at), 'd MMM yyyy')}</span>
                  {e.resolved_at && <span>Resolved: {format(new Date(e.resolved_at), 'd MMM yyyy')}</span>}
                </div>
              </div>
              {!e.is_resolved && (
                <button onClick={() => handleResolve(e.id)} className="btn-success text-xs py-1 px-2 shrink-0">
                  <CheckCircle className="w-3 h-3" /> Resolve
                </button>
              )}
              {e.is_resolved && (
                <span className="badge bg-emerald-900/30 text-emerald-400 text-xs shrink-0">Resolved</span>
              )}
            </div>
          ))}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm card">
              <h3 className="font-semibold mb-4 text-red-300">Manual Escalation</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="label">Employee *</label>
                  <select className="input" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} required>
                    <option value="">Select employee...</option>
                    {users.filter(u => u.role === 'EMPLOYEE').map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} — {u.department}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea className="input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Describe the issue..." />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                  <button type="submit" className="btn-danger flex-1 justify-center">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function EscalationsPage() {
  return <ToastProvider><EscalationsInner /></ToastProvider>
}

'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/shared/DashboardLayout'
import { useToast, ToastProvider } from '@/components/shared/Toast'
import { cyclesApi } from '@/lib/api'
import { currentYear } from '@/lib/utils'
import { Calendar, Plus, CheckCircle, XCircle, Edit2 } from 'lucide-react'

function CyclesInner() {
  const { toast } = useToast()
  const [windows, setWindows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(currentYear())
  const [editId, setEditId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ cycle_year: year, quarter: 'Q1', window_opens: '', window_closes: '', is_active: false, notes: '' })
  const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

  const load = async () => {
    try {
      const res = await cyclesApi.getWindows(year)
      setWindows(Array.isArray(res.data) ? res.data : [])
    } catch {}
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [year])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editId) {
        await cyclesApi.updateWindow(editId, form)
        toast('Window updated!')
      } else {
        await cyclesApi.createWindow({ ...form, cycle_year: year })
        toast('Window created!')
      }
      setShowForm(false)
      setEditId(null)
      load()
    } catch (err: any) {
      toast(err.response?.data?.detail || 'Failed to save window', 'error')
    }
  }

  const handleEdit = (w: any) => {
    setEditId(w.id)
    setForm({ cycle_year: w.cycle_year, quarter: w.quarter, window_opens: w.window_opens, window_closes: w.window_closes, is_active: w.is_active, notes: w.notes || '' })
    setShowForm(true)
  }

  const handleToggle = async (w: any) => {
    try {
      await cyclesApi.updateWindow(w.id, { is_active: !w.is_active })
      toast(`Q${w.quarter} window ${w.is_active ? 'closed' : 'opened'}`)
      load()
    } catch { toast('Failed to update window', 'error') }
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
      <div className="p-8 max-w-3xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-400" /> Cycles & Check-in Windows
            </h1>
            <p className="text-slate-500 text-sm mt-1">Control when employees can submit check-ins</p>
          </div>
          <div className="flex gap-3">
            <select className="input w-24 py-1.5 text-sm" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => { setEditId(null); setForm({ cycle_year: year, quarter: 'Q1', window_opens: '', window_closes: '', is_active: false, notes: '' }); setShowForm(true) }} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Window
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {QUARTERS.map(q => {
            const w = windows.find(w => w.quarter === q)
            return (
              <div key={q} className={`card border-2 ${w?.is_active ? 'border-emerald-700 bg-emerald-900/10' : 'border-slate-800'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-200">{q}</span>
                    {w?.is_active
                      ? <span className="badge bg-emerald-900 text-emerald-300 text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />OPEN</span>
                      : <span className="badge bg-slate-800 text-slate-500 text-xs">CLOSED</span>
                    }
                  </div>
                  {w && (
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(w)} className="p-1.5 text-slate-500 hover:text-indigo-400 rounded hover:bg-slate-800">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleToggle(w)} className={`p-1.5 rounded hover:bg-slate-800 ${w.is_active ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'}`}>
                        {w.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
                {w ? (
                  <>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Opens:</span>
                        <span className="text-slate-300">{new Date(w.window_opens).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Closes:</span>
                        <span className="text-slate-300">{new Date(w.window_closes).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      {w.notes && <p className="text-slate-600 mt-1">{w.notes}</p>}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-slate-600 text-sm">Not configured</p>
                    <button
                      onClick={() => { setEditId(null); setForm({ cycle_year: year, quarter: q, window_opens: '', window_closes: '', is_active: false, notes: '' }); setShowForm(true) }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 mt-1"
                    >
                      + Add window
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm card">
              <h3 className="font-semibold mb-4">{editId ? 'Edit' : 'Add'} Check-in Window</h3>
              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label className="label">Quarter</label>
                  <select className="input" value={form.quarter} onChange={e => setForm(f => ({ ...f, quarter: e.target.value }))}>
                    {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Window Opens</label>
                  <input type="date" className="input" value={form.window_opens} onChange={e => setForm(f => ({ ...f, window_opens: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Window Closes</label>
                  <input type="date" className="input" value={form.window_closes} onChange={e => setForm(f => ({ ...f, window_closes: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input className="input" placeholder="Optional note..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-indigo-500" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <span className="text-sm text-slate-300">Open immediately</span>
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 justify-center">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function CyclesPage() {
  return <ToastProvider><CyclesInner /></ToastProvider>
}

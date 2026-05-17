'use client'
import { useState } from 'react'
import DashboardLayout from '@/components/shared/DashboardLayout'
import { checkinsApi } from '@/lib/api'
import { downloadBlob, currentYear } from '@/lib/utils'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'

export default function ExportPage() {
  const [year, setYear] = useState(currentYear())
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx')
  const [quarters, setQuarters] = useState(['Q1', 'Q2', 'Q3', 'Q4'])
  const [loading, setLoading] = useState(false)

  const toggleQ = (q: string) => setQuarters(prev =>
    prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q]
  )

  const handleExport = async () => {
    setLoading(true)
    try {
      const res = await checkinsApi.export(year, format)
      const ext = format === 'xlsx' ? 'xlsx' : 'csv'
      downloadBlob(res.data, `pulse_achievement_${year}.${ext}`)
    } catch (e) {
      alert('Export failed. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Download className="w-6 h-6 text-indigo-400" /> Export Reports
          </h1>
          <p className="text-slate-500 text-sm mt-1">Download achievement data for all employees</p>
        </div>

        <div className="card space-y-6">
          <div>
            <label className="label text-base">Cycle Year</label>
            <select className="input w-32" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div>
            <label className="label text-base mb-3">Include Quarters</label>
            <div className="flex gap-3">
              {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                <label key={q} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all ${quarters.includes(q) ? 'border-indigo-600 bg-indigo-900/30 text-indigo-300' : 'border-slate-700 bg-slate-800/40 text-slate-500'}`}>
                  <input type="checkbox" className="hidden" checked={quarters.includes(q)} onChange={() => toggleQ(q)} />
                  <span className="font-medium">{q}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label text-base mb-3">File Format</label>
            <div className="flex gap-3">
              <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${format === 'xlsx' ? 'border-emerald-600 bg-emerald-900/20 text-emerald-300' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                <input type="radio" name="format" value="xlsx" className="hidden" checked={format === 'xlsx'} onChange={() => setFormat('xlsx')} />
                <FileSpreadsheet className="w-5 h-5" />
                <div>
                  <p className="font-medium">Excel (.xlsx)</p>
                  <p className="text-xs opacity-70">Recommended for analysis</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${format === 'csv' ? 'border-blue-600 bg-blue-900/20 text-blue-300' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                <input type="radio" name="format" value="csv" className="hidden" checked={format === 'csv'} onChange={() => setFormat('csv')} />
                <FileText className="w-5 h-5" />
                <div>
                  <p className="font-medium">CSV (.csv)</p>
                  <p className="text-xs opacity-70">For data pipelines</p>
                </div>
              </label>
            </div>
          </div>

          <div className="divider" />

          <div className="bg-slate-800/40 rounded-lg px-4 py-3 text-sm text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">Report includes:</p>
            <p>• Employee name, email, department, manager</p>
            <p>• All goals: title, thrust area, UoM, target, weightage</p>
            <p>• Achievement values and progress scores (%)</p>
            <p>• Quarterly check-in planned vs actual for {quarters.join(', ') || 'selected quarters'}</p>
            <p>• Goal sheet status</p>
          </div>

          <button
            onClick={handleExport}
            disabled={loading || quarters.length === 0}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
              : <><Download className="w-5 h-5" /> Download {format.toUpperCase()} Report</>
            }
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}

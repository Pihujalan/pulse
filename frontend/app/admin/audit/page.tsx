'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/shared/DashboardLayout'
import { auditApi } from '@/lib/api'
import { Shield, Search } from 'lucide-react'
import { format } from 'date-fns'

const ACTION_COLORS: Record<string, string> = {
  GOALSHEET_APPROVED: 'text-emerald-400', GOALSHEET_RETURNED: 'text-red-400',
  GOALSHEET_SUBMITTED: 'text-blue-400', GOAL_INLINE_EDIT: 'text-amber-400',
  GOALSHEET_UNLOCKED: 'text-purple-400', CHECKIN_MANAGER_COMMENT: 'text-indigo-400',
}

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    auditApi.getLogs().then(r => setLogs(Array.isArray(r.data) ? r.data : [])).finally(() => setLoading(false))
  }, [])

  const filtered = logs.filter(l =>
    !search || l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.target_model?.toLowerCase().includes(search.toLowerCase())
  )

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
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-400" /> Audit Log
            </h1>
            <p className="text-slate-500 text-sm mt-1">Immutable record of all system actions</p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input pl-9 w-60 py-1.5 text-sm" placeholder="Search action, actor..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800">
                <tr>
                  {['Timestamp', 'Actor', 'Action', 'Target', 'Changes'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-slate-500 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filtered.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {format(new Date(log.timestamp), 'd MMM, HH:mm')}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">{log.actor_name}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium ${ACTION_COLORS[log.action] || 'text-slate-400'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {log.target_model} #{log.target_id}
                    </td>
                    <td className="py-3 px-4">
                      {log.new_value && (
                        <code className="text-[10px] bg-slate-800 rounded px-1.5 py-0.5 text-slate-400 block max-w-xs truncate">
                          {JSON.stringify(log.new_value)}
                        </code>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">No logs found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

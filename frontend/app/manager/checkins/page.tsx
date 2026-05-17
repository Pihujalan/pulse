'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/shared/DashboardLayout'
import { useToast, ToastProvider } from '@/components/shared/Toast'
import { checkinsApi, goalsApi, aiApi } from '@/lib/api'
import { currentYear } from '@/lib/utils'
import { Sparkles, Send, ChevronDown, ChevronUp } from 'lucide-react'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

function ManagerCheckinsInner() {
  const { toast } = useToast()
  const [teamCheckins, setTeamCheckins] = useState<any[]>([])
  const [sheets, setSheets] = useState<any[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [allGoalCheckins, setAllGoalCheckins] = useState<Record<number, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [commentModal, setCommentModal] = useState<{ checkin: any; goal: any } | null>(null)
  const [comment, setComment] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const year = currentYear()

  const load = async () => {
    const [tcRes, sheetsRes] = await Promise.all([
      checkinsApi.getTeamCheckins(year),
      goalsApi.getSheets(year),
    ])
    setTeamCheckins(Array.isArray(tcRes.data) ? tcRes.data : [])
    const sArr = Array.isArray(sheetsRes.data) ? sheetsRes.data : []
    setSheets(sArr)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const toggleEmployee = async (empId: number) => {
    setExpanded(prev => {
      const n = new Set(prev)
      n.has(empId) ? n.delete(empId) : n.add(empId)
      return n
    })
    // Load checkins for all goals of this employee
    const sheet = sheets.find((s: any) => s.employee_detail?.id === empId)
    if (sheet?.goals) {
      const map = { ...allGoalCheckins }
      await Promise.all(sheet.goals.map(async (g: any) => {
        if (!map[g.id]) {
          const r = await checkinsApi.getForGoal(g.id)
          map[g.id] = r.data
        }
      }))
      setAllGoalCheckins(map)
    }
  }

  const handleAIDraft = async () => {
    if (!commentModal) return
    setAiLoading(true)
    try {
      const { checkin, goal } = commentModal
      const res = await aiApi.draftCheckinComment({
        goal_title: goal.title,
        uom_type: goal.uom_type,
        planned_target: checkin.planned_target,
        actual_achievement: checkin.actual_achievement,
        progress_score: goal.progress_score,
        quarter: checkin.quarter,
        employee_name: commentModal.goal.employee_name || 'the employee',
        goal_id: goal.id,
      })
      setComment(res.data.draft_comment || '')
      toast('AI draft generated!', 'info')
    } catch { toast('AI draft unavailable', 'error') }
    finally { setAiLoading(false) }
  }

  const handleSaveComment = async () => {
    if (!commentModal || !comment.trim()) return
    try {
      await checkinsApi.addManagerComment(commentModal.goal.id, commentModal.checkin.id, { manager_comment: comment })
      toast('Comment saved!')
      setCommentModal(null)
      setComment('')
      load()
    } catch { toast('Failed to save comment', 'error') }
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
      <div className="p-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Team Check-ins — {year}</h1>
          <p className="text-slate-500 text-sm mt-1">Review and comment on your team's quarterly progress.</p>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {QUARTERS.map(q => {
            const total = teamCheckins.length
            const done = teamCheckins.filter(tc => (tc.quarters?.[q]?.completion_pct || 0) >= 100).length
            return (
              <div key={q} className="card-sm text-center">
                <p className="text-sm font-semibold text-slate-300 mb-1">{q}</p>
                <p className="text-2xl font-bold text-indigo-400">{done}/{total}</p>
                <p className="text-xs text-slate-600">completed</p>
              </div>
            )
          })}
        </div>

        {/* Employee rows */}
        <div className="space-y-3">
          {teamCheckins.map((tc: any) => {
            const sheet = sheets.find((s: any) => s.employee_detail?.id === tc.employee_id)
            const goals: any[] = sheet?.goals || []
            const isOpen = expanded.has(tc.employee_id)

            return (
              <div key={tc.employee_id} className="card">
                {/* Header row */}
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleEmployee(tc.employee_id)}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">{tc.employee_name?.[0]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">{tc.employee_name}</p>
                    <p className="text-xs text-slate-500">{tc.department}</p>
                  </div>
                  {/* Quarter completion pills */}
                  <div className="flex gap-2">
                    {QUARTERS.map(q => {
                      const pct = tc.quarters?.[q]?.completion_pct || 0
                      return (
                        <div key={q} className={`text-center w-10 ${pct >= 100 ? 'text-emerald-400' : pct > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                          <div className="text-[10px] font-medium">{q}</div>
                          <div className="text-xs font-bold">{pct}%</div>
                        </div>
                      )
                    })}
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </div>

                {/* Goals checkin detail */}
                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                    {goals.map((goal: any) => {
                      const goalCheckins = allGoalCheckins[goal.id] || []
                      return (
                        <div key={goal.id} className="bg-slate-800/40 rounded-lg p-3">
                          <p className="text-sm font-medium text-slate-300 mb-2 truncate">{goal.title}</p>
                          <div className="grid grid-cols-4 gap-2">
                            {QUARTERS.map(q => {
                              const ci = goalCheckins.find((c: any) => c.quarter === q)
                              return (
                                <div key={q} className={`rounded-lg p-2 text-center text-xs border cursor-pointer transition-all ${
                                  ci ? 'border-slate-700 bg-slate-900/60 hover:border-indigo-700' : 'border-slate-800 bg-transparent opacity-40'
                                }`}
                                  onClick={() => {
                                    if (!ci) return
                                    setCommentModal({ checkin: ci, goal: { ...goal, employee_name: tc.employee_name } })
                                    setComment(ci.manager_comment || '')
                                  }}
                                >
                                  <p className="font-medium text-slate-400">{q}</p>
                                  {ci ? (
                                    <>
                                      <p className="text-slate-300 mt-0.5">Act: {ci.actual_achievement ?? '—'}</p>
                                      <p className={`${ci.status === 'COMPLETED' ? 'text-emerald-400' : ci.status === 'ON_TRACK' ? 'text-blue-400' : 'text-slate-500'}`}>
                                        {ci.status.replace('_', ' ')}
                                      </p>
                                      {ci.manager_comment && <p className="text-indigo-400 mt-0.5">💬</p>}
                                    </>
                                  ) : <p className="text-slate-600">No data</p>}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Comment modal */}
      {commentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md card">
            <h3 className="font-semibold mb-2">Manager Comment — {commentModal.checkin.quarter}</h3>
            <p className="text-xs text-slate-500 mb-1 truncate">{commentModal.goal.title}</p>
            <div className="flex gap-2 text-xs text-slate-600 mb-4">
              <span>Planned: {commentModal.checkin.planned_target}</span>
              <span>·</span>
              <span>Actual: {commentModal.checkin.actual_achievement ?? '—'}</span>
            </div>
            <label className="label">Comment</label>
            <textarea
              className="input mb-3" rows={4}
              placeholder="Write your feedback..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
            <button
              onClick={handleAIDraft}
              disabled={aiLoading}
              className="btn-secondary w-full justify-center mb-3 text-xs border-indigo-800 text-indigo-400"
            >
              {aiLoading
                ? <span className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                : <Sparkles className="w-3.5 h-3.5" />
              }
              {aiLoading ? 'Generating...' : 'AI Draft Comment'}
            </button>
            <div className="flex gap-3">
              <button onClick={() => setCommentModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleSaveComment} className="btn-primary flex-1 justify-center">
                <Send className="w-4 h-4" /> Save Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default function ManagerCheckinsPage() {
  return <ToastProvider><ManagerCheckinsInner /></ToastProvider>
}

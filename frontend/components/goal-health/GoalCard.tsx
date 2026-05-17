'use client'
import { cn, statusBadgeClass, statusLabel, uomLabel, formatScore, scoreColor } from '@/lib/utils'
import { Target, TrendingUp, Calendar, Trash2, Edit2, Sparkles } from 'lucide-react'

interface GoalEntry {
  id: number
  title: string
  description?: string
  thrust_area: string
  uom_type: string
  target: number
  weightage: number
  achievement?: number | null
  deadline?: string | null
  is_shared?: boolean
  progress_score?: number | null
}

interface Props {
  goal: GoalEntry
  canEdit?: boolean
  canDelete?: boolean
  onEdit?: (goal: GoalEntry) => void
  onDelete?: (goalId: number) => void
  onLogAchievement?: (goal: GoalEntry) => void
  compact?: boolean
}

export default function GoalCard({ goal, canEdit, canDelete, onEdit, onDelete, onLogAchievement, compact }: Props) {
  const score = goal.progress_score
  const pct = score != null ? Math.min(score, 1) : null

  const barColor = pct == null ? 'bg-slate-700'
    : pct >= 0.75 ? 'bg-emerald-500'
    : pct >= 0.4 ? 'bg-amber-500'
    : 'bg-red-500'

  return (
    <div className={cn('card-sm hover:border-slate-700 transition-all group', compact && 'p-3')}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
          goal.is_shared ? 'bg-purple-900/40 border border-purple-800' : 'bg-indigo-900/40 border border-indigo-800'
        )}>
          <Target className={cn('w-4 h-4', goal.is_shared ? 'text-purple-400' : 'text-indigo-400')} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">{goal.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{goal.thrust_area} · {uomLabel(goal.uom_type)}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {goal.is_shared && (
                <span className="badge bg-purple-900/50 text-purple-300 text-[10px]">Shared</span>
              )}
              <span className="badge bg-slate-800 text-slate-400 text-[10px]">{goal.weightage}%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-500">Progress</span>
              <span className={cn('text-xs font-semibold', scoreColor(pct != null ? pct * 100 : null))}>
                {pct != null ? `${Math.round(pct * 100)}%` : '—'}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className={cn('progress-fill', barColor)}
                style={{ width: pct != null ? `${Math.min(pct * 100, 100)}%` : '0%' }}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5 text-xs text-slate-600">
              <span>Target: {goal.target}</span>
              {goal.achievement != null && <span>Actual: {goal.achievement}</span>}
              {goal.deadline && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(goal.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {(canEdit || canDelete || onLogAchievement) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
          {onLogAchievement && (
            <button
              onClick={() => onLogAchievement(goal)}
              className="btn-secondary text-xs py-1 px-2"
            >
              <TrendingUp className="w-3 h-3" />
              Log Progress
            </button>
          )}
          {canEdit && onEdit && (
            <button onClick={() => onEdit(goal)} className="btn-secondary text-xs py-1 px-2">
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          )}
          {canDelete && onDelete && (
            <button onClick={() => onDelete(goal.id)} className="btn-danger text-xs py-1 px-2">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

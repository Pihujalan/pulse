'use client'
import { useState } from 'react'
import { aiApi } from '@/lib/api'
import { Sparkles, X, RefreshCw, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Suggestion {
  title: string
  rationale: string
  recommended_uom: string
  uom_reason: string
}

interface Props {
  draftTitle: string
  thrustArea?: string
  uomType?: string
  onApply: (suggestion: Suggestion) => void
  onClose: () => void
}

export default function AISuggestModal({ draftTitle, thrustArea, uomType, onApply, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [error, setError] = useState('')

  const fetch = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await aiApi.suggestGoal({ draft_title: draftTitle, thrust_area: thrustArea, uom_type: uomType })
      setSuggestions(res.data.suggestions || [])
    } catch {
      setError('AI suggestion unavailable. Check your Groq API key.')
    } finally {
      setLoading(false)
    }
  }

  const uomColors: Record<string, string> = {
    MIN: 'text-emerald-400', MAX: 'text-amber-400', TIMELINE: 'text-blue-400', ZERO: 'text-purple-400'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg card border-indigo-900/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-slate-100">AI Goal Suggestions</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-800/60 rounded-lg px-3 py-2 mb-4 text-sm text-slate-400">
          <span className="text-slate-500 text-xs">Your draft: </span>
          <span className="text-slate-200">"{draftTitle}"</span>
        </div>

        {suggestions.length === 0 ? (
          <div className="text-center py-6">
            <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-3 opacity-60" />
            <p className="text-sm text-slate-400 mb-4">
              Get AI-powered SMART restatements of your goal with UoM recommendations.
            </p>
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            <button onClick={fetch} className="btn-primary" disabled={loading}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                : <><Sparkles className="w-4 h-4" /> Generate Suggestions</>
              }
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="bg-slate-800/50 border border-slate-700 hover:border-indigo-700 rounded-lg p-3 cursor-pointer group transition-all"
                onClick={() => onApply(s)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100 group-hover:text-white">{s.title}</p>
                  <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </div>
                <p className="text-xs text-slate-500 mt-1">{s.rationale}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn('text-xs font-medium', uomColors[s.recommended_uom] || 'text-slate-400')}>
                    {s.recommended_uom}
                  </span>
                  <span className="text-[10px] text-slate-600">·</span>
                  <span className="text-xs text-slate-500">{s.uom_reason}</span>
                </div>
              </div>
            ))}
            <button onClick={fetch} className="btn-secondary w-full justify-center text-xs" disabled={loading}>
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
              Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

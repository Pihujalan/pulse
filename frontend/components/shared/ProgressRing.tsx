'use client'
import { cn } from '@/lib/utils'

interface Props {
  score: number | null
  size?: number
  strokeWidth?: number
  className?: string
  label?: string
}

export default function ProgressRing({ score, size = 80, strokeWidth = 7, className, label }: Props) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const pct = score == null ? 0 : Math.min(score, 100)
  const offset = circ - (pct / 100) * circ

  const color = score == null ? '#475569' : score >= 75 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>
          {score == null ? '—' : `${Math.round(pct)}%`}
        </span>
        {label && <span className="text-[9px] text-slate-500 mt-0.5">{label}</span>}
      </div>
    </div>
  )
}

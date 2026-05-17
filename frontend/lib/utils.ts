import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatScore(score: number | null | undefined): string {
  if (score == null) return '—'
  return `${score.toFixed(1)}%`
}

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-slate-400'
  if (score >= 75) return 'text-emerald-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

export function scoreBg(score: number | null | undefined): string {
  if (score == null) return 'bg-slate-700'
  if (score >= 75) return 'bg-emerald-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-700 text-slate-300',
    SUBMITTED: 'bg-blue-900 text-blue-300',
    MANAGER_REVIEW: 'bg-purple-900 text-purple-300',
    APPROVED: 'bg-emerald-900 text-emerald-300',
    RETURNED: 'bg-red-900 text-red-300',
    ON_TRACK: 'bg-blue-900 text-blue-300',
    COMPLETED: 'bg-emerald-900 text-emerald-300',
    NOT_STARTED: 'bg-slate-700 text-slate-400',
  }
  return map[status] ?? 'bg-slate-700 text-slate-300'
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    MANAGER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    RETURNED: 'Returned for Rework',
    ON_TRACK: 'On Track',
    COMPLETED: 'Completed',
    NOT_STARTED: 'Not Started',
  }
  return map[status] ?? status
}

export function uomLabel(uom: string): string {
  const map: Record<string, string> = {
    MIN: 'Higher is Better',
    MAX: 'Lower is Better',
    TIMELINE: 'Timeline',
    ZERO: 'Zero = Success',
  }
  return map[uom] ?? uom
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function currentYear(): number {
  return 2025
}

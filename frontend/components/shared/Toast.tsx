'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: number; message: string; type: ToastType }

interface ToastCtx { toast: (message: string, type?: ToastType) => void }
const ToastContext = createContext<ToastCtx>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  let id = 0

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const tid = ++id
    setToasts(prev => [...prev, { id: tid, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 animate-fade-in">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium min-w-[280px] animate-slide-in',
              t.type === 'success' ? 'bg-emerald-900/90 border-emerald-700 text-emerald-200' :
              t.type === 'error' ? 'bg-red-900/90 border-red-700 text-red-200' :
              'bg-slate-800 border-slate-700 text-slate-200'
            )}
          >
            {t.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> :
             t.type === 'error' ? <XCircle className="w-4 h-4 shrink-0" /> :
             <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>
              <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

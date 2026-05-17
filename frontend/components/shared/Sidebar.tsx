'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import {
  Zap, LayoutDashboard, Target, ClipboardCheck, Users, Map,
  Settings, LogOut, Bell, BarChart3, Shield, Download, Calendar, AlertTriangle
} from 'lucide-react'

const employeeNav = [
  { href: '/employee/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/employee/goals', icon: Target, label: 'My Goals' },
  { href: '/employee/checkins', icon: ClipboardCheck, label: 'Check-ins' },
]

const managerNav = [
  { href: '/manager/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/manager/review', icon: ClipboardCheck, label: 'Review Goals' },
  { href: '/manager/checkins', icon: BarChart3, label: 'Team Check-ins' },
]

const adminNav = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/alignment-map', icon: Map, label: 'Alignment Map' },
  { href: '/admin/matrix', icon: BarChart3, label: 'Heatmap Matrix' },
  { href: '/admin/shared-goals', icon: Users, label: 'Shared Goals' },
  { href: '/admin/cycles', icon: Calendar, label: 'Cycles & Windows' },
  { href: '/admin/escalations', icon: AlertTriangle, label: 'Escalations' },
  { href: '/admin/export', icon: Download, label: 'Export Reports' },
  { href: '/admin/audit', icon: Shield, label: 'Audit Log' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const nav = user?.role === 'ADMIN' ? adminNav
    : user?.role === 'MANAGER' ? managerNav
    : employeeNav

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-slate-900 border-r border-slate-800 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-white text-sm">Pulse</span>
          <p className="text-xs text-slate-500 leading-none mt-0.5">Performance</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(active ? 'sidebar-link-active' : 'sidebar-link')}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-sm">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 border-t border-slate-800 pt-4">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-slate-200 truncate">{user?.full_name}</p>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          <span className={cn(
            'badge mt-1 text-xs',
            user?.role === 'ADMIN' ? 'bg-purple-900/60 text-purple-300' :
            user?.role === 'MANAGER' ? 'bg-blue-900/60 text-blue-300' :
            'bg-slate-800 text-slate-400'
          )}>
            {user?.role}
          </span>
        </div>
        <button onClick={logout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-900/20">
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

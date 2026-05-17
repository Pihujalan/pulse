'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from './api'

interface User {
  id: number
  email: string
  full_name: string
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN'
  department: string
  manager?: number
  manager_name?: string
}

interface AuthCtx {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('pulse_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    const { access, refresh, role, full_name, id } = res.data
    localStorage.setItem('pulse_access', access)
    localStorage.setItem('pulse_refresh', refresh)
    const meRes = await authApi.me()
    const userData = meRes.data
    localStorage.setItem('pulse_user', JSON.stringify(userData))
    setUser(userData)
    // Role-based redirect
    if (role === 'ADMIN') router.push('/admin/dashboard')
    else if (role === 'MANAGER') router.push('/manager/dashboard')
    else router.push('/employee/dashboard')
  }

  const logout = () => {
    localStorage.removeItem('pulse_access')
    localStorage.removeItem('pulse_refresh')
    localStorage.removeItem('pulse_user')
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

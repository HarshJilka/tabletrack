import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as authService from '../services/authService'
import type { AppUser } from '../types'

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AppUser>
  register: (data: authService.RegisterInput) => Promise<AppUser>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = authService.getSession()
    if (session) setUser(session.user)
    setLoading(false)
  }, [])

  async function login(email: string, password: string): Promise<AppUser> {
    const session = await authService.login(email, password)
    setUser(session.user)
    return session.user
  }

  async function register(data: authService.RegisterInput): Promise<AppUser> {
    const session = await authService.registerCustomer(data)
    setUser(session.user)
    return session.user
  }

  function logout(): void {
    authService.logout()
    setUser(null)
  }

  const value: AuthContextValue = {
    user,
    loading,
    login,
    register,
    logout,
    isAdmin: user?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

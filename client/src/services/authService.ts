import { api, TOKEN_KEY, USER_KEY } from './api'
import type { AppUser } from '../types'

interface Session {
  user: AppUser
  token: string
}

export async function login(email: string, password: string): Promise<Session> {
  const { data } = await api.post<Session>('/auth/login', { email, password })
  localStorage.setItem(TOKEN_KEY, data.token)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  return data
}

export interface RegisterInput {
  name: string
  email: string
  phone: string
  password: string
}

export async function registerCustomer(input: RegisterInput): Promise<Session> {
  const { data } = await api.post<Session>('/auth/register', input)
  localStorage.setItem(TOKEN_KEY, data.token)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  return data
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getSession(): Session | null {
  const token   = localStorage.getItem(TOKEN_KEY)
  const userRaw = localStorage.getItem(USER_KEY)
  if (!token || !userRaw) return null
  try {
    return { token, user: JSON.parse(userRaw) as AppUser }
  } catch {
    return null
  }
}

import axios from 'axios'

export const TOKEN_KEY = 'tabletrack_token'
export const USER_KEY  = 'tabletrack_user'

/**
 * Shared axios instance. All requests go through Vite's /api proxy → http://localhost:3001.
 * The request interceptor attaches the JWT from localStorage automatically.
 * The response interceptor unwraps error messages so callers get `new Error(message)`.
 */
// In dev: Vite proxy forwards /api → http://localhost:3001
// In production: VITE_API_URL = https://your-backend.onrender.com/api
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      (err.response?.data as { error?: string })?.error ??
      err.message ??
      'Request failed'
    return Promise.reject(new Error(message))
  },
)

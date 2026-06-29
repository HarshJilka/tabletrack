import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login(form.email, form.password)
      if (user.role === 'admin')      navigate('/admin/dashboard')
      else if (user.role === 'supervisor') navigate('/supervisor/scan')
      else                            navigate('/customer/profile')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Welcome back</h2>
      <p className="text-sm text-slate-500 mb-6">Sign in to continue to TableTrack</p>

      {error && <div className="mb-4 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            required
            className="input-field"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            required
            className="input-field"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm text-slate-500 mt-5 text-center">
        New customer?{' '}
        <Link to="/register" className="text-brand-600 font-medium hover:underline">
          Create an account
        </Link>
      </p>

      <div className="mt-6 pt-5 border-t border-slate-200 text-xs text-slate-400 space-y-1">
        <p className="font-medium text-slate-500 mb-2">Demo credentials — click to fill</p>
        {[
          { label: 'Admin',      email: 'admin@tabletrack.com',      pw: 'admin@123'      },
          { label: 'Supervisor', email: 'supervisor@tabletrack.com', pw: 'supervisor@123' },
          { label: 'Customer',   email: 'customer@tabletrack.com',   pw: 'customer@123'   },
        ].map(({ label, email, pw }) => (
          <button
            key={email}
            type="button"
            onClick={() => setForm({ email, password: pw })}
            className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 transition-colors"
          >
            <span className="text-slate-500 font-medium">{label}:</span>{' '}
            {email} / {pw}
          </button>
        ))}
      </div>
    </div>
  )
}

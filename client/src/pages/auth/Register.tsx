import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface FormState {
  name: string
  email: string
  phone: string
  password: string
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(field: keyof FormState) {
    return (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(form)
      navigate('/customer/profile')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Create your account</h2>
      <p className="text-sm text-slate-500 mb-6">
        Sign up as a customer. An admin will need to approve your account before you can use the Scanner.
      </p>

      {error && <div className="mb-4 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Full name</label>
          <input required className="input-field" value={form.name} onChange={update('name')} placeholder="Jane Doe" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" required className="input-field" value={form.email} onChange={update('email')} placeholder="you@example.com" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input required className="input-field" value={form.phone} onChange={update('phone')} placeholder="+91 90000 00000" />
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" required minLength={6} className="input-field" value={form.password} onChange={update('password')} placeholder="••••••••" />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-sm text-slate-500 mt-5 text-center">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createCustomer, getCustomerById, updateCustomer } from '../../services/customerService'

interface FormState {
  name: string
  email: string
  phone: string
  isApproved: boolean
}

export default function CustomerForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>({ name: '', email: '', phone: '', isApproved: false })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isEdit && id) {
      getCustomerById(id).then((c) => {
        setForm({ name: c.name, email: c.email, phone: c.phone, isApproved: c.isApproved })
        setLoading(false)
      })
    }
  }, [id, isEdit])

  function update(field: keyof FormState) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [field]: field === 'isApproved' ? e.target.checked : e.target.value })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateCustomer(id, form)
        navigate(`/admin/customers/${id}`)
      } else {
        const created = await createCustomer(form)
        navigate(`/admin/customers/${created.id}`)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-slate-500">Loading…</p>

  return (
    <div className="max-w-lg">
      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-1">{isEdit ? 'Edit Customer' : 'Add New Customer'}</h3>
        <p className="text-sm text-slate-500 mb-6">
          {isEdit
            ? 'Update customer details below.'
            : 'New customers start unapproved — approve them once they can be trusted to self check-in.'}
        </p>

        {error && <div className="mb-4 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input required className="input-field" value={form.name} onChange={update('name')} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" required className="input-field" value={form.email} onChange={update('email')} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input required className="input-field" value={form.phone} onChange={update('phone')} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isApproved} onChange={update('isApproved')} className="rounded" />
            Approved for self check-in (Scanner)
          </label>
          {!isEdit && (
            <p className="text-xs text-slate-400">
              Default password will be set to <code className="bg-slate-100 px-1 rounded">changeme123</code> — the
              customer can change it after their first login.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Customer'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

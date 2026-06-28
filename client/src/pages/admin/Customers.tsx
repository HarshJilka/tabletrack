import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, Trash2, ShieldCheck, ShieldOff, UtensilsCrossed } from 'lucide-react'
import { getCustomers, deleteCustomer, setApproval } from '../../services/customerService'
import { getAttendanceBySource, recordSupervisorCheckIn, currentMealType } from '../../services/attendanceService'
import { useAuth } from '../../context/AuthContext'
import { formatDate, formatDateTime } from '../../utils/dateUtils'
import type { CustomerUser, AttendanceLog, MealType } from '../../types'

type Tab = 'supervisor' | 'self_scan'

const MEAL_OPTIONS: MealType[] = ['breakfast', 'lunch', 'dinner']

export default function Customers() {
  const { user: admin } = useAuth()
  const [tab, setTab] = useState<Tab>('supervisor')
  const [customers, setCustomers] = useState<CustomerUser[]>([])
  const [selfScanLogs, setSelfScanLogs] = useState<AttendanceLog[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [mealChoice, setMealChoice] = useState<Record<string, MealType>>({})
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function loadCustomers() {
    getCustomers().then((data) => {
      setCustomers(data)
      setLoading(false)
    })
  }

  function loadSelfScanLogs() {
    getAttendanceBySource('self_scan').then(setSelfScanLogs)
  }

  useEffect(() => {
    loadCustomers()
    loadSelfScanLogs()
  }, [])

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return
    await deleteCustomer(id)
    loadCustomers()
  }

  async function handleToggleApproval(customer: CustomerUser) {
    await setApproval(customer.id, !customer.isApproved)
    loadCustomers()
  }

  async function handleLogMeal(customerId: string) {
    setFeedback(null)
    const meal = mealChoice[customerId] ?? currentMealType() ?? 'lunch'
    try {
      await recordSupervisorCheckIn(customerId, meal)
      setFeedback({ type: 'success', message: `Logged ${meal} for this customer.` })
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message })
    }
  }

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.email.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('supervisor')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'supervisor' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Get meal by supervisor
        </button>
        <button
          onClick={() => setTab('self_scan')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'self_scan' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Get meal by customer
        </button>
      </div>

      {tab === 'supervisor' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input-field pl-9"
                placeholder="Search by name or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Link to="/admin/customers/new" className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Add Customer
            </Link>
          </div>

          {feedback && (
            <div
              className={`px-3 py-2 rounded-lg text-sm ${
                feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="card overflow-x-auto">
            {loading ? (
              <p className="text-slate-500">Loading customers…</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Approval</th>
                    <th className="py-2 pr-4">Log a meal</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4 font-medium text-slate-700">{c.name}</td>
                      <td className="py-3 pr-4 text-slate-600">{c.email}</td>
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => handleToggleApproval(c)}
                          className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                            c.isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}
                          title="Click to toggle approval"
                        >
                          {c.isApproved ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
                          {c.isApproved ? 'Approved' : 'Pending'}
                        </button>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <select
                            className="input-field py-1 text-xs w-auto"
                            value={mealChoice[c.id] ?? currentMealType() ?? 'lunch'}
                            onChange={(e) => setMealChoice({ ...mealChoice, [c.id]: e.target.value as MealType })}
                          >
                            {MEAL_OPTIONS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleLogMeal(c.id)}
                            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                          >
                            <UtensilsCrossed size={13} /> Log
                          </button>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/admin/customers/${c.id}`} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="View">
                            <Eye size={16} />
                          </Link>
                          <Link to={`/admin/customers/${c.id}/edit`} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Edit">
                            <Pencil size={16} />
                          </Link>
                          <button onClick={() => handleDelete(c.id, c.name)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No customers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'self_scan' && (
        <div className="card overflow-x-auto">
          <p className="text-sm text-slate-500 mb-3">
            Meals customers claimed themselves by scanning the restaurant's QR code.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Meal</th>
                <th className="py-2 pr-4">Check-in</th>
              </tr>
            </thead>
            <tbody>
              {selfScanLogs.map((log) => {
                const customer = customers.find((c) => c.id === log.customerId)
                return (
                  <tr key={log.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-700">{customer?.name ?? 'Unknown'}</td>
                    <td className="py-2 pr-4">{formatDate(log.date)}</td>
                    <td className="py-2 pr-4 capitalize">{log.mealType}</td>
                    <td className="py-2 pr-4 text-slate-500">{formatDateTime(log.checkInTime)}</td>
                  </tr>
                )
              })}
              {selfScanLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    No self check-ins yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, ArrowLeft, ShieldCheck, ShieldOff } from 'lucide-react'
import { getCustomerById, setApproval } from '../../services/customerService'
import { getSubscriptionForCustomer, markPayment } from '../../services/subscriptionService'
import { getAttendanceForCustomer } from '../../services/attendanceService'
import { formatDate, formatDateTime } from '../../utils/dateUtils'
import StatusBadge from '../../components/StatusBadge'
import type { CustomerUser, Subscription, AttendanceLog } from '../../types'

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<CustomerUser | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [attendance, setAttendance] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    if (!id) return
    Promise.all([getCustomerById(id), getSubscriptionForCustomer(id), getAttendanceForCustomer(id)]).then(
      ([c, s, a]) => {
        setCustomer(c)
        setSubscription(s)
        setAttendance(a)
        setLoading(false)
      },
    )
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function toggleApproval() {
    if (!customer) return
    await setApproval(customer.id, !customer.isApproved)
    load()
  }

  async function togglePayment() {
    if (!subscription) return
    await markPayment(subscription.id, subscription.paymentStatus === 'paid' ? 'pending' : 'paid')
    load()
  }

  if (loading) return <p className="text-slate-500">Loading customer…</p>
  if (!customer) return <p className="text-slate-500">Customer not found.</p>

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/admin/customers')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Back to customers
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">{customer.name}</h3>
              <p className="text-sm text-slate-500">{customer.email}</p>
            </div>
            <Link to={`/admin/customers/${id}/edit`} className="btn-secondary flex items-center gap-2 text-sm">
              <Pencil size={14} /> Edit
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-medium text-slate-700">{customer.phone}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Joined</dt>
              <dd className="font-medium text-slate-700">{formatDate(customer.joinedOn)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Approval status</dt>
              <dd>
                <button
                  onClick={toggleApproval}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                    customer.isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {customer.isApproved ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
                  {customer.isApproved ? 'Approved' : 'Pending — click to approve'}
                </button>
              </dd>
            </div>
          </dl>

          <div className="mt-6 pt-5 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Current Subscription</h4>
            {subscription ? (
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-700 capitalize">{subscription.planType} plan · {subscription.mealAllowance}</p>
                  <p className="text-slate-500">{formatDate(subscription.startDate)} – {formatDate(subscription.endDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={subscription.status} />
                  <button onClick={togglePayment} title="Click to toggle payment status">
                    <StatusBadge status={subscription.paymentStatus} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No subscription on record.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">About self check-in</h4>
          <p className="text-sm text-slate-500">
            This customer no longer has a personal QR code. They claim meals by scanning the restaurant's rotating
            QR code from the Scanner tab in their own app — only once their account is approved above.
          </p>
        </div>
      </div>

      <div className="card">
        <h4 className="font-semibold text-slate-800 mb-4">Attendance History</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Meal</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Check-in</th>
                <th className="py-2 pr-4">Check-out</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-4">{formatDate(a.date)}</td>
                  <td className="py-2 pr-4 capitalize">{a.mealType}</td>
                  <td className="py-2 pr-4 capitalize text-slate-500">{a.source.replace('_', ' ')}</td>
                  <td className="py-2 pr-4 text-slate-500">{formatDateTime(a.checkInTime)}</td>
                  <td className="py-2 pr-4 text-slate-500">{a.checkOutTime ? formatDateTime(a.checkOutTime) : '—'}</td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">No attendance recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

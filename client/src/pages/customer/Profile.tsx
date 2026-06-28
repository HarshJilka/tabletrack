import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getSubscriptionForCustomer } from '../../services/subscriptionService'
import { getAttendanceForCustomer } from '../../services/attendanceService'
import { formatDate, formatDateTime, daysUntil } from '../../utils/dateUtils'
import StatusBadge from '../../components/StatusBadge'
import type { CustomerUser, Subscription, AttendanceLog } from '../../types'

export default function Profile() {
  const { user } = useAuth()
  const customer = user as CustomerUser
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [recentAttendance, setRecentAttendance] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!customer) return
    Promise.all([getSubscriptionForCustomer(customer.id), getAttendanceForCustomer(customer.id)]).then(
      ([sub, attendance]) => {
        setSubscription(sub)
        setRecentAttendance(attendance.slice(0, 5))
        setLoading(false)
      },
    )
  }, [customer])

  if (!customer) return null

  return (
    <div className="max-w-lg space-y-6">
      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-semibold">
            {customer.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{customer.name}</h3>
            <p className="text-sm text-slate-500">Customer since {formatDate(customer.joinedOn)}</p>
          </div>
        </div>

        <dl className="space-y-4 text-sm">
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-700">{customer.email}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <dt className="text-slate-500">Phone</dt>
            <dd className="font-medium text-slate-700">{customer.phone}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Self check-in status</dt>
            <dd>
              <span
                className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                  customer.isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {customer.isApproved ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
                {customer.isApproved ? 'Approved' : 'Pending admin approval'}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="card">
        <h4 className="font-semibold text-slate-800 mb-4">Subscription Status</h4>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : !subscription ? (
          <p className="text-sm text-slate-500">
            You don't have an active subscription yet. Speak to the front desk to set one up, or pay daily at the counter.
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-700 capitalize">{subscription.planType} plan · {subscription.mealAllowance}</p>
              <StatusBadge status={subscription.status} />
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <dt className="text-slate-500">Period</dt>
              <dd className="font-medium text-slate-700">{formatDate(subscription.startDate)} – {formatDate(subscription.endDate)}</dd>
            </div>
            {subscription.mealsRemaining !== null && (
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Meals remaining</dt>
                <dd className="font-medium text-slate-700">{subscription.mealsRemaining}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Payment status</dt>
              <dd><StatusBadge status={subscription.paymentStatus} /></dd>
            </div>
            {subscription.status === 'active' && daysUntil(subscription.endDate) <= 5 && daysUntil(subscription.endDate) >= 0 && (
              <div className="px-3 py-2 bg-amber-50 text-amber-700 text-sm rounded-lg">
                Your plan renews in {daysUntil(subscription.endDate)} day(s). Visit the front desk to renew.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h4 className="font-semibold text-slate-800 mb-4">Recent Check-ins</h4>
        {recentAttendance.length === 0 ? (
          <p className="text-sm text-slate-400">No check-ins yet — head to the Scanner tab when you arrive for a meal.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recentAttendance.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-slate-100 last:border-0 pb-2">
                <span className="capitalize font-medium text-slate-700">{a.mealType}</span>
                <span className="text-slate-500">{formatDateTime(a.checkInTime)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

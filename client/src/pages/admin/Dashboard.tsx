import { useEffect, useState } from 'react'
import { Users, ClipboardCheck, CreditCard, AlertTriangle, Radio, Coffee, UtensilsCrossed, Moon, ShieldCheck } from 'lucide-react'
import { getCustomers, getSupervisors } from '../../services/customerService'
import { getAllAttendance } from '../../services/attendanceService'
import { getAllSubscriptions } from '../../services/subscriptionService'
import { subscribeToCheckins } from '../../services/mockEventBus'
import { formatDateTime } from '../../utils/dateUtils'
import RestaurantQrDisplay from '../../components/RestaurantQrDisplay'
import type { CustomerUser, SupervisorUser, AttendanceLog, Subscription, LiveCheckinEvent, MealType } from '../../types'
import type { LucideIcon } from 'lucide-react'

// ─── helpers ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${tone}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  )
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner']

const MEAL_META: Record<MealType, { label: string; icon: LucideIcon; time: string; bg: string; text: string; dot: string; badge: string }> = {
  breakfast: { label: 'Breakfast', icon: Coffee,          time: '07:00–10:30', bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700'  },
  lunch:     { label: 'Lunch',     icon: UtensilsCrossed, time: '12:00–15:30', bg: 'bg-sky-50',    text: 'text-sky-700',    dot: 'bg-sky-400',    badge: 'bg-sky-100 text-sky-700'      },
  dinner:    { label: 'Dinner',    icon: Moon,            time: '19:00–22:30', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400', badge: 'bg-violet-100 text-violet-700' },
}

// ─── component ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [customers,    setCustomers]    = useState<CustomerUser[]>([])
  const [supervisors,  setSupervisors]  = useState<SupervisorUser[]>([])
  const [attendance,   setAttendance]   = useState<AttendanceLog[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [liveFeed,     setLiveFeed]     = useState<LiveCheckinEvent[]>([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    Promise.all([getCustomers(), getSupervisors(), getAllAttendance(), getAllSubscriptions()])
      .then(([c, sv, a, s]) => {
        setCustomers(c)
        setSupervisors(sv)
        setAttendance(a)
        setSubscriptions(s)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    return subscribeToCheckins((event) => {
      setLiveFeed((prev) => [event, ...prev].slice(0, 10))
    })
  }, [])

  if (loading) return <p className="text-slate-500">Loading dashboard…</p>

  // ── derived data ──────────────────────────────────────────────────────────

  const today = new Date().toISOString().slice(0, 10)
  const todayLogs = attendance.filter((a) => a.date === today)

  // Total meals today: individual check-ins + bulk quantities
  const todayCount = todayLogs.reduce((sum, l) => sum + (l.quantity ?? 1), 0)

  const activeSubsCount = subscriptions.filter((s) => s.status === 'active').length
  const overdueCount    = subscriptions.filter((s) => s.paymentStatus === 'overdue').length

  // Lookup helpers
  const supervisorName = (id: string) => supervisors.find((sv) => sv.id === id)?.name ?? 'Supervisor'
  const customerName   = (id: string) => customers.find((c)  => c.id  === id)?.name  ?? 'Unknown'

  // Grouped by meal type for today
  const byMeal: Record<MealType, AttendanceLog[]> = {
    breakfast: todayLogs.filter((a) => a.mealType === 'breakfast'),
    lunch:     todayLogs.filter((a) => a.mealType === 'lunch'),
    dinner:    todayLogs.filter((a) => a.mealType === 'dinner'),
  }

  // Bulk supervisor claims today (for dedicated section)
  const bulkClaimsToday = todayLogs
    .filter((a) => a.source === 'bulk_supervisor')
    .sort((a, b) => +new Date(b.checkInTime) - +new Date(a.checkInTime))

  // Per-customer daily completion
  const customerDailyMap = new Map<string, { meals: Set<MealType>; lastTime: string }>()
  for (const log of attendance.filter((a) => a.source !== 'bulk_supervisor')) {
    if (!customerDailyMap.has(log.customerId)) {
      customerDailyMap.set(log.customerId, { meals: new Set(), lastTime: '' })
    }
    const entry = customerDailyMap.get(log.customerId)!
    if (log.date === today) entry.meals.add(log.mealType)
    if (!entry.lastTime || log.checkInTime > entry.lastTime) entry.lastTime = log.checkInTime
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}          label="Total Customers"     value={customers.length}  tone="bg-brand-50 text-brand-600"     />
        <StatCard icon={ClipboardCheck} label="Meals Served Today"  value={todayCount}        tone="bg-emerald-50 text-emerald-600" />
        <StatCard icon={CreditCard}     label="Active Subscriptions" value={activeSubsCount}  tone="bg-blue-50 text-blue-600"       />
        <StatCard icon={AlertTriangle}  label="Overdue Payments"    value={overdueCount}      tone="bg-red-50 text-red-600"         />
      </div>

      {/* Live feed + QR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Radio size={16} className="text-emerald-500" />
            <h3 className="font-semibold text-slate-800">Live Check-in Feed</h3>
            <span className="text-xs text-slate-400">(updates instantly on scan)</span>
          </div>
          {liveFeed.length === 0 ? (
            <p className="text-sm text-slate-400">
              Waiting for check-ins… open the Scanner in another tab and scan the QR code to see this update live.
            </p>
          ) : (
            <ul className="space-y-2">
              {liveFeed.map((event, idx) => (
                <li key={idx} className="flex items-center justify-between text-sm px-3 py-2 bg-emerald-50 rounded-lg">
                  <span className="font-medium text-slate-700">{event.customerName}</span>
                  <span className="capitalize text-slate-600">{event.mealType}</span>
                  <span className="text-slate-400">{formatDateTime(event.time)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card flex flex-col items-center">
          <h3 className="font-semibold text-slate-800 mb-4 self-start">Restaurant Check-in Code</h3>
          <RestaurantQrDisplay />
        </div>
      </div>

      {/* ── Supervisor Bulk Claims (Today) ── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={17} className="text-violet-500" />
          <h3 className="font-semibold text-slate-800">Supervisor Bulk Claims — Today</h3>
          {bulkClaimsToday.length > 0 && (
            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
              {bulkClaimsToday.reduce((s, l) => s + (l.quantity ?? 1), 0)} tiffins
            </span>
          )}
        </div>

        {bulkClaimsToday.length === 0 ? (
          <p className="text-sm text-slate-400">No bulk claims logged today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4 font-medium">Supervisor</th>
                  <th className="py-2 pr-4 font-medium">Shift</th>
                  <th className="py-2 pr-4 font-medium">Tiffins</th>
                  <th className="py-2 font-medium">Logged At</th>
                </tr>
              </thead>
              <tbody>
                {bulkClaimsToday.map((log) => {
                  const meta = MEAL_META[log.mealType]
                  return (
                    <tr key={log.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                            <ShieldCheck size={13} className="text-violet-600" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {supervisorName(log.recordedBy ?? '')}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.badge}`}>
                          <meta.icon size={11} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                          <Users size={13} className="text-slate-400" />
                          ×{log.quantity ?? 1}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 text-xs">{formatDateTime(log.checkInTime)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Today's shifts — grouped by meal type */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3">Today's Shifts</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MEAL_ORDER.map((meal) => {
            const meta = MEAL_META[meal]
            const MealIcon = meta.icon
            const logs = byMeal[meal]
            const totalServed = logs.reduce((s, l) => s + (l.quantity ?? 1), 0)

            return (
              <div key={meal} className="card space-y-3">
                {/* Shift header */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${meta.bg}`}>
                  <MealIcon size={15} className={meta.text} />
                  <span className={`text-sm font-semibold ${meta.text}`}>{meta.label}</span>
                  <span className={`text-xs ${meta.text} opacity-60 ml-auto`}>{meta.time}</span>
                </div>

                {/* Entries */}
                {logs.length === 0 ? (
                  <p className="text-xs text-slate-400 px-1">No check-ins yet</p>
                ) : (
                  <ul className="space-y-2">
                    {logs.map((log) => {
                      const isBulk = log.source === 'bulk_supervisor'
                      const name = isBulk
                        ? supervisorName(log.recordedBy ?? '')
                        : customerName(log.customerId)

                      return (
                        <li key={log.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full ${meta.dot} shrink-0`} />
                            <span className="text-slate-700 font-medium truncate">{name}</span>
                            {isBulk && (
                              <span className="shrink-0 inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
                                <Users size={10} />×{log.quantity ?? 1}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 ml-2 shrink-0">{formatDateTime(log.checkInTime)}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* Footer count */}
                <p className={`text-xs font-semibold pt-1 border-t border-slate-100 ${meta.text}`}>
                  {totalServed} served
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Daily completion per customer */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-4">Daily Completion</h3>
        {customers.length === 0 ? (
          <p className="text-sm text-slate-400">No customers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4 font-medium">Customer</th>
                  <th className="py-2 pr-4 font-medium">Today's Meals</th>
                  <th className="py-2 pr-4 font-medium">Shifts Taken</th>
                  <th className="py-2 font-medium">Last Meal</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const entry     = customerDailyMap.get(c.id)
                  const taken     = entry ? entry.meals.size : 0
                  const lastTime  = entry?.lastTime ?? null
                  const takenMeals = entry ? [...entry.meals] : []

                  return (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-slate-700">{c.name}</td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {MEAL_ORDER.map((m) => (
                              <span
                                key={m}
                                title={MEAL_META[m].label}
                                className={`w-3 h-3 rounded-full ${takenMeals.includes(m) ? MEAL_META[m].dot : 'bg-slate-200'}`}
                              />
                            ))}
                          </div>
                          <span className={`text-xs font-medium ${taken === 3 ? 'text-emerald-600' : taken > 0 ? 'text-brand-600' : 'text-slate-400'}`}>
                            {taken} of 3 meals today
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-slate-500">
                        {takenMeals.length > 0 ? takenMeals.map((m) => MEAL_META[m].label).join(', ') : '—'}
                      </td>
                      <td className="py-2.5 text-xs text-slate-500">
                        {lastTime ? formatDateTime(lastTime) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}

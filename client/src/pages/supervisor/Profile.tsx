import { useEffect, useState } from 'react'
import { User, Phone, Mail, ClipboardList, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getMyAttendance } from '../../services/attendanceService'
import { formatDateTime } from '../../utils/dateUtils'
import type { SupervisorUser, AttendanceLog, MealType } from '../../types'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

export default function SupervisorProfile() {
  const { user } = useAuth()
  const supervisor = user as SupervisorUser
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyAttendance().then((all) => {
      setLogs(all.slice(0, 10))
      setLoading(false)
    })
  }, [supervisor.id])

  return (
    <div className="max-w-2xl space-y-5">
      {/* Account info */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
            <User size={22} className="text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-lg">{supervisor.name}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
              Supervisor
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          <div className="flex items-center gap-3 py-3 text-sm">
            <Mail size={15} className="text-slate-400 shrink-0" />
            <span className="text-slate-500 w-20">Email</span>
            <span className="text-slate-700">{supervisor.email}</span>
          </div>
          <div className="flex items-center gap-3 py-3 text-sm">
            <Phone size={15} className="text-slate-400 shrink-0" />
            <span className="text-slate-500 w-20">Phone</span>
            <span className="text-slate-700">{supervisor.phone}</span>
          </div>
          <div className="flex items-center gap-3 py-3 text-sm">
            <ClipboardList size={15} className="text-slate-400 shrink-0" />
            <span className="text-slate-500 w-20">Joined</span>
            <span className="text-slate-700">{supervisor.joinedOn}</span>
          </div>
        </div>
      </div>

      {/* Bulk tiffin history */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-brand-500" />
          <h3 className="font-semibold text-slate-800">Recent Bulk Tiffin Logs</h3>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-slate-400">No bulk tiffins logged yet. Use the Scanner to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Shift</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2">Logged at</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 text-slate-600">{log.date}</td>
                    <td className="py-2 pr-4 font-medium text-slate-700">{MEAL_LABELS[log.mealType]}</td>
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center gap-1 text-brand-700 font-semibold">
                        <Users size={12} />
                        {log.quantity ?? 1}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500">{formatDateTime(log.checkInTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

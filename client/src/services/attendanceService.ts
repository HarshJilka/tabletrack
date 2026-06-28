import { api } from './api'
import type { AttendanceLog, MealType } from '../types'

const MEAL_WINDOWS: Record<MealType, { start: string; end: string }> = {
  breakfast: { start: '07:00', end: '10:30' },
  lunch:     { start: '12:00', end: '15:30' },
  dinner:    { start: '19:00', end: '22:30' },
}

/**
 * Client-side helper that mirrors the server's currentMealType().
 * Used only to pre-select a default in UI dropdowns — actual validation
 * is always enforced server-side.
 */
export function currentMealType(): MealType | null {
  const hhmm = new Date().toTimeString().slice(0, 5)
  for (const [meal, w] of Object.entries(MEAL_WINDOWS) as [MealType, { start: string; end: string }][]) {
    if (hhmm >= w.start && hhmm <= w.end) return meal
  }
  return null
}

// ── Read ──────────────────────────────────────────────────────────────────────

/** Admin only — all logs across all users. */
export async function getAllAttendance(): Promise<AttendanceLog[]> {
  const { data } = await api.get<AttendanceLog[]>('/attendance')
  return data
}

/** Admin only — client-side source filter on top of getAllAttendance. */
export async function getAttendanceBySource(
  source: 'supervisor' | 'self_scan' | 'bulk_supervisor',
): Promise<AttendanceLog[]> {
  const all = await getAllAttendance()
  return all.filter((a) => a.source === source)
}

export async function getAttendanceForCustomer(customerId: string): Promise<AttendanceLog[]> {
  const { data } = await api.get<AttendanceLog[]>(`/attendance/customer/${customerId}`)
  return data
}

/** Customer or supervisor — fetch the logged-in user's own attendance logs. */
export async function getMyAttendance(): Promise<AttendanceLog[]> {
  const { data } = await api.get<AttendanceLog[]>('/attendance/my')
  return data
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Customer self check-in using the restaurant's rotating QR token.
 * The server validates the token and determines the current meal from its clock.
 */
export async function recordSelfCheckIn(qrToken: string): Promise<AttendanceLog> {
  const { data } = await api.post<AttendanceLog>('/attendance/self-checkin', { qrToken })
  return data
}

/**
 * DEMO ONLY — bypasses QR scan and time-window check so you can test
 * outside real meal windows. Calls a dev-only server endpoint.
 */
export async function recordSelfCheckInDemo(mealType: MealType): Promise<AttendanceLog> {
  const { data } = await api.post<AttendanceLog>('/attendance/demo-checkin', { mealType })
  return data
}

/**
 * Admin manual override — logs a specific customer for a specific meal.
 * Recorded-by is derived from the admin's JWT on the server.
 */
export async function recordSupervisorCheckIn(
  customerId: string,
  mealType: MealType,
): Promise<AttendanceLog> {
  const { data } = await api.post<AttendanceLog>('/attendance/supervisor-checkin', { customerId, mealType })
  return data
}

/**
 * Supervisor bulk check-in after scanning the restaurant's QR code.
 * The qrToken was captured by the QR scanner and validated server-side.
 */
export async function recordBulkSupervisorCheckIn(
  mealType: MealType,
  quantity: number,
  qrToken: string,
): Promise<AttendanceLog> {
  const { data } = await api.post<AttendanceLog>('/attendance/bulk-checkin', { mealType, quantity, qrToken })
  return data
}

/**
 * DEMO ONLY — bulk supervisor checkin without a real QR scan.
 */
export async function recordBulkSupervisorCheckInDemo(
  mealType: MealType,
  quantity: number,
): Promise<AttendanceLog> {
  const { data } = await api.post<AttendanceLog>('/attendance/demo-checkin', { mealType, quantity })
  return data
}

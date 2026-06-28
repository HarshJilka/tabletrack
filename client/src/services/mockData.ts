// In-memory mock dataset. Each service function below is written with the
// same signature the real REST API will expose, so swapping the body for
// an axios call later is a small, mechanical change.
import type { StoredUser, Subscription, AttendanceLog, MealWindow, MealType } from '../types'

export const MEAL_WINDOWS: Record<MealType, MealWindow> = {
  breakfast: { start: '07:00', end: '10:30' },
  lunch: { start: '12:00', end: '15:30' },
  dinner: { start: '19:00', end: '22:30' },
}

/**
 * Stand-in for the server-side secret used to derive the rotating restaurant
 * QR token (see restaurantQrService.ts). In production this lives only in
 * the backend's environment variables — never shipped to the client.
 */
export const QR_ROTATION_SECRET = 'demo-only-secret-move-to-server-env'
export const QR_ROTATION_WINDOW_SECONDS = 30

export const users: StoredUser[] = [
  {
    id: 'u-admin-1',
    name: 'Restaurant Admin',
    email: 'admin@tabletrack.com',
    password: 'admin123',
    role: 'admin',
    phone: '+91 90000 00000',
  },
  {
    id: 'u-sup-1',
    name: 'Raj Supervisor',
    email: 'raj@tabletrack.com',
    password: 'supervisor123',
    role: 'supervisor',
    phone: '+91 98000 11111',
    isActive: true,
    joinedOn: '2026-01-01',
  },
  {
    id: 'u-cust-1',
    name: 'Aarav Mehta',
    email: 'aarav@example.com',
    password: 'customer123',
    role: 'customer',
    phone: '+91 98765 43210',
    isActive: true,
    isApproved: true,
    joinedOn: '2026-01-12',
  },
  {
    id: 'u-cust-2',
    name: 'Priya Sharma',
    email: 'priya@example.com',
    password: 'customer123',
    role: 'customer',
    phone: '+91 91234 56789',
    isActive: true,
    isApproved: true,
    joinedOn: '2026-02-03',
  },
  {
    id: 'u-cust-3',
    name: 'Rohan Gupta',
    email: 'rohan@example.com',
    password: 'customer123',
    role: 'customer',
    phone: '+91 99887 76655',
    isActive: true,
    isApproved: true,
    joinedOn: '2026-03-20',
  },
  {
    id: 'u-cust-4',
    name: 'Sneha Verma',
    email: 'sneha@example.com',
    password: 'customer123',
    role: 'customer',
    phone: '+91 90011 22334',
    isActive: true,
    isApproved: false, // intentionally unapproved — demonstrates the rejection path
    joinedOn: '2026-06-18',
  },
]

export const subscriptions: Subscription[] = [
  {
    id: 'sub-1',
    customerId: 'u-cust-1',
    planType: 'monthly',
    mealAllowance: 'all',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    mealsRemaining: null,
    status: 'active',
    paymentStatus: 'paid',
    amount: 4500,
  },
  {
    id: 'sub-2',
    customerId: 'u-cust-2',
    planType: 'weekly',
    mealAllowance: 'lunch',
    startDate: '2026-06-15',
    endDate: '2026-06-21',
    mealsRemaining: 3,
    status: 'active',
    paymentStatus: 'pending',
    amount: 900,
  },
  {
    id: 'sub-3',
    customerId: 'u-cust-3',
    planType: 'monthly',
    mealAllowance: 'dinner',
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    mealsRemaining: 0,
    status: 'expired',
    paymentStatus: 'overdue',
    amount: 4000,
  },
]

export const attendanceLogs: AttendanceLog[] = [
  { id: 'att-1', customerId: 'u-cust-1', date: '2026-06-19', checkInTime: '2026-06-19T08:05:00', checkOutTime: '2026-06-19T08:30:00', mealType: 'breakfast', source: 'self_scan' },
  { id: 'att-2', customerId: 'u-cust-1', date: '2026-06-19', checkInTime: '2026-06-19T19:45:00', checkOutTime: null, mealType: 'dinner', source: 'self_scan' },
  { id: 'att-3', customerId: 'u-cust-2', date: '2026-06-19', checkInTime: '2026-06-19T12:50:00', checkOutTime: '2026-06-19T13:40:00', mealType: 'lunch', source: 'supervisor', recordedBy: 'u-admin-1' },
  { id: 'att-4', customerId: 'u-cust-1', date: '2026-06-18', checkInTime: '2026-06-18T12:15:00', checkOutTime: '2026-06-18T13:05:00', mealType: 'lunch', source: 'self_scan' },
  { id: 'att-5', customerId: 'u-cust-3', date: '2026-06-17', checkInTime: '2026-06-17T20:00:00', checkOutTime: null, mealType: 'dinner', source: 'supervisor', recordedBy: 'u-admin-1' },
  { id: 'att-6', customerId: 'u-sup-1', date: '2026-06-24', checkInTime: '2026-06-24T12:10:00', checkOutTime: null, mealType: 'lunch', source: 'bulk_supervisor', recordedBy: 'u-sup-1', quantity: 10 },
]

let idCounter = 100
export const nextId = (prefix: string): string => `${prefix}-${idCounter++}`

export type Role = 'admin' | 'supervisor' | 'customer'

export type MealType = 'breakfast' | 'lunch' | 'dinner'

export type AttendanceSource = 'supervisor' | 'self_scan' | 'bulk_supervisor'

export type PlanType = 'daily' | 'weekly' | 'monthly'

export type MealAllowance = 'breakfast' | 'lunch' | 'dinner' | 'all'

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled'

export type PaymentStatus = 'paid' | 'pending' | 'overdue'

export interface BaseUser {
  id: string
  name: string
  email: string
  phone: string
  role: Role
}

export interface AdminUser extends BaseUser {
  role: 'admin'
}

export interface SupervisorUser extends BaseUser {
  role: 'supervisor'
  isActive: boolean
  joinedOn: string
}

export interface CustomerUser extends BaseUser {
  role: 'customer'
  isActive: boolean
  /** Gate for the new self-scan workflow — only admin-approved customers may claim a meal. */
  isApproved: boolean
  joinedOn: string
}

export type AppUser = AdminUser | SupervisorUser | CustomerUser

/** Internal-only shape used inside the mock data layer; password never leaves services/authService. */
export interface StoredUser extends BaseUser {
  password: string
  isActive?: boolean
  isApproved?: boolean
  joinedOn?: string
}

export interface Subscription {
  id: string
  customerId: string
  planType: PlanType
  mealAllowance: MealAllowance
  startDate: string
  endDate: string
  mealsRemaining: number | null
  status: SubscriptionStatus
  paymentStatus: PaymentStatus
  amount: number
}

export interface AttendanceLog {
  id: string
  customerId: string
  date: string
  mealType: MealType
  source: AttendanceSource
  checkInTime: string
  checkOutTime: string | null
  recordedBy?: string | null
  /** Only set for bulk_supervisor entries — number of tiffins logged in one action. */
  quantity?: number
}

/** Payload pushed from a self-checkin to anyone listening on the live feed (stand-in for the real SSE event). */
export interface LiveCheckinEvent {
  customerId: string
  customerName: string
  mealType: MealType
  source: AttendanceSource
  time: string
}

export interface MealWindow {
  start: string
  end: string
}

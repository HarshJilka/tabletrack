export type Role = 'admin' | 'supervisor' | 'customer'
export type MealType = 'breakfast' | 'lunch' | 'dinner'
export type AttendanceSource = 'self_scan' | 'supervisor' | 'bulk_supervisor'

export interface JwtPayload {
  userId: string
  role: Role
  name: string
  email: string
}

export interface MealWindow {
  start: string  // 'HH:MM'
  end: string
}

export const MEAL_WINDOWS: Record<MealType, MealWindow> = {
  breakfast: { start: '07:00', end: '10:30' },
  lunch:     { start: '12:00', end: '15:30' },
  dinner:    { start: '19:00', end: '22:30' },
}

export function currentMealType(): MealType | null {
  const hhmm = new Date().toTimeString().slice(0, 5)
  for (const [meal, w] of Object.entries(MEAL_WINDOWS) as [MealType, MealWindow][]) {
    if (hhmm >= w.start && hhmm <= w.end) return meal
  }
  return null
}

export interface LiveCheckinEvent {
  customerId:   string
  customerName: string
  mealType:     MealType
  source:       AttendanceSource
  time:         string
  quantity?:    number
}

// Augment Express Request with the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

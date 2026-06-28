import { api } from './api'
import type { Subscription, PaymentStatus } from '../types'

export async function getAllSubscriptions(): Promise<Subscription[]> {
  const { data } = await api.get<Subscription[]>('/subscriptions')
  return data
}

export async function getSubscriptionForCustomer(customerId: string): Promise<Subscription | null> {
  const { data } = await api.get<Subscription[]>(`/subscriptions/customer/${customerId}`)
  const active = data.find((s) => s.status === 'active')
  return active ?? data[0] ?? null
}

/** Fetch the logged-in customer's own subscriptions. */
export async function getMySubscriptions(): Promise<Subscription[]> {
  const { data } = await api.get<Subscription[]>('/subscriptions/my')
  return data
}

export async function createSubscription(
  input: Omit<Subscription, 'id'> & Partial<Pick<Subscription, 'status' | 'paymentStatus'>>,
): Promise<Subscription> {
  const { data } = await api.post<Subscription>('/subscriptions', input)
  return data
}

export async function markPayment(id: string, paymentStatus: PaymentStatus): Promise<Subscription> {
  const { data } = await api.patch<Subscription>(`/subscriptions/${id}/payment`, { paymentStatus })
  return data
}

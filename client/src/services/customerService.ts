import { api } from './api'
import type { CustomerUser, SupervisorUser } from '../types'

export async function getCustomers(): Promise<CustomerUser[]> {
  const { data } = await api.get<CustomerUser[]>('/customers')
  return data
}

export async function getSupervisors(): Promise<SupervisorUser[]> {
  const { data } = await api.get<SupervisorUser[]>('/customers', { params: { role: 'supervisor' } })
  return data
}

export async function getCustomerById(id: string): Promise<CustomerUser> {
  const { data } = await api.get<CustomerUser>(`/customers/${id}`)
  return data
}

export interface CreateCustomerInput {
  name: string
  email: string
  phone: string
  password?: string
  isApproved?: boolean
}

export async function createCustomer(input: CreateCustomerInput): Promise<CustomerUser> {
  const { data } = await api.post<CustomerUser>('/customers', input)
  return data
}

export async function updateCustomer(
  id: string,
  updates: Partial<CreateCustomerInput & { isActive: boolean }>,
): Promise<CustomerUser> {
  const { data } = await api.put<CustomerUser>(`/customers/${id}`, updates)
  return data
}

export async function setApproval(id: string, isApproved: boolean): Promise<CustomerUser> {
  const { data } = await api.patch<CustomerUser>(`/customers/${id}/approval`, { isApproved })
  return data
}

export async function deleteCustomer(id: string): Promise<{ success: true }> {
  const { data } = await api.delete<{ success: true }>(`/customers/${id}`)
  return data
}

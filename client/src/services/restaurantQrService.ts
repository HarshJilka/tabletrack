import { api } from './api'

/**
 * How long each QR token is valid. Must match server's WINDOW_SECONDS.
 * The server returns this as `windowSeconds` in the /restaurant-qr/current
 * response, but we keep it as a local constant to avoid an extra round-trip
 * just for the countdown timer.
 */
export const ROTATION_SECONDS = 30

interface QrResponse {
  token: string
  windowSeconds: number
}

/**
 * Admin-only: fetch the current restaurant QR token from the server.
 * The HMAC secret never leaves the server — this is the only way the
 * client gets a valid token to display.
 */
export async function getCurrentToken(): Promise<string> {
  const { data } = await api.get<QrResponse>('/restaurant-qr/current')
  return data.token
}

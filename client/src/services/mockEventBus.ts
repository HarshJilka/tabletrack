/**
 * Real-time event bus backed by Server-Sent Events.
 *
 * `publishCheckin` is now a no-op: the server broadcasts automatically after
 * every successful DB insert in the attendance routes.
 *
 * `subscribeToCheckins` opens an EventSource to the admin SSE stream. Because
 * EventSource doesn't support custom headers, the JWT is passed as a query
 * param (?token=…) and the server injects it into the Authorization header
 * before running auth middleware.
 */
import { TOKEN_KEY } from './api'
import type { LiveCheckinEvent } from '../types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function publishCheckin(_event: LiveCheckinEvent): void {
  // No-op: server handles broadcasting after each DB write.
}

export function subscribeToCheckins(onEvent: (event: LiveCheckinEvent) => void): () => void {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return () => {}

  const base = import.meta.env.VITE_API_URL ?? '/api'
  const url = `${base}/events/admin-stream?token=${encodeURIComponent(token)}`
  const source = new EventSource(url)

  source.onmessage = (e: MessageEvent<string>) => {
    try {
      onEvent(JSON.parse(e.data) as LiveCheckinEvent)
    } catch {
      // ignore malformed messages
    }
  }

  source.onerror = () => {
    // EventSource auto-reconnects; no action needed
  }

  return () => source.close()
}

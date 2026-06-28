import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import type { LiveCheckinEvent } from '../types'

const router = Router()

// In-memory set of active SSE connections (admin dashboard tabs)
const clients = new Set<Response>()

/** Called by attendance routes after a successful check-in to push to all admin tabs. */
export function broadcast(event: LiveCheckinEvent): void {
  if (!clients.size) return
  const data = `data: ${JSON.stringify(event)}\n\n`
  clients.forEach((res) => res.write(data))
}

/**
 * Middleware: EventSource cannot send custom headers, so we accept the JWT
 * as a query param (?token=…) and inject it as the Authorization header
 * before the standard requireAuth middleware runs.
 */
function injectQueryToken(req: Request, _res: Response, next: NextFunction): void {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token as string}`
  }
  next()
}

// GET /api/events/admin-stream  (admin only)
router.get(
  '/admin-stream',
  injectQueryToken,
  requireAuth,
  requireRole('admin'),
  (req: Request, res: Response) => {
    res.setHeader('Content-Type',      'text/event-stream')
    res.setHeader('Cache-Control',     'no-cache')
    res.setHeader('Connection',        'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')  // disable nginx buffering if proxied
    res.flushHeaders()

    // Heartbeat every 25 s to keep the connection alive through proxies
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25_000)

    clients.add(res)
    console.log(`SSE client connected — total: ${clients.size}`)

    req.on('close', () => {
      clearInterval(heartbeat)
      clients.delete(res)
      console.log(`SSE client disconnected — total: ${clients.size}`)
    })
  },
)

export default router

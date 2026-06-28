import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

const WINDOW_SECONDS = 30

function timeBucket(): number {
  return Math.floor(Date.now() / 1000 / WINDOW_SECONDS)
}

function makeToken(bucket: number): string {
  return crypto
    .createHmac('sha256', process.env.QR_ROTATION_SECRET!)
    .update(String(bucket))
    .digest('hex')
}

/** Called by the attendance route to validate a token from the client. */
export async function isTokenValid(token: string): Promise<boolean> {
  const current = timeBucket()
  // Accept current bucket and the previous one (30s grace window)
  return [current, current - 1].some((b) => makeToken(b) === token)
}

// GET /api/restaurant-qr/current  (admin only — shown on dashboard)
router.get('/current', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
  const token = makeToken(timeBucket())
  res.json({ token, windowSeconds: WINDOW_SECONDS })
})

export default router

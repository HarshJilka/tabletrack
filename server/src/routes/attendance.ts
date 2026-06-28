import { Router, Request, Response } from 'express'
import { pool } from '../db'
import { requireAuth, requireRole } from '../middleware/auth'
import { currentMealType, MEAL_WINDOWS } from '../types'
import { isTokenValid } from './qr'
import { broadcast } from './events'
import type { MealType } from '../types'

const router = Router()
router.use(requireAuth)

function mapLog(r: Record<string, unknown>) {
  return {
    id:            r.id,
    customerId:    r.customer_id,
    date:          r.date,
    mealType:      r.meal_type,
    source:        r.source,
    checkInTime:   r.check_in_time,
    checkOutTime:  r.check_out_time,
    recordedBy:    r.recorded_by,
    quantity:      r.quantity,
  }
}

// ── GET /api/attendance  (admin: all logs) ─────────────────────────────────
router.get('/', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM attendance_logs ORDER BY check_in_time DESC',
    )
    res.json(rows.map(mapLog))
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

// ── GET /api/attendance/my  (customer/supervisor: own logs) ───────────────
router.get('/my', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM attendance_logs WHERE customer_id = $1 ORDER BY check_in_time DESC',
      [req.user!.userId],
    )
    res.json(rows.map(mapLog))
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

// ── GET /api/attendance/customer/:id  (admin: a specific customer's logs) ─
router.get('/customer/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM attendance_logs WHERE customer_id = $1 ORDER BY check_in_time DESC',
      [req.params.id],
    )
    res.json(rows.map(mapLog))
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

// ── POST /api/attendance/self-checkin  (customer) ─────────────────────────
router.post('/self-checkin', requireRole('customer'), async (req: Request, res: Response) => {
  const { qrToken } = req.body as { qrToken: string }
  if (!qrToken) { res.status(400).json({ error: 'qrToken is required' }); return }

  // 1. Validate the rotating restaurant QR token
  const valid = await isTokenValid(qrToken)
  if (!valid) { res.status(400).json({ error: 'QR code has expired. Please scan a fresh code.' }); return }

  const userId = req.user!.userId

  // 2. Check customer is approved & active
  const { rows: userRows } = await pool.query(
    'SELECT is_approved, is_active, name FROM users WHERE id = $1',
    [userId],
  )
  const customer = userRows[0]
  if (!customer?.is_approved) {
    res.status(403).json({ error: 'Your account has not been approved for self check-in yet.' })
    return
  }
  if (!customer?.is_active) {
    res.status(403).json({ error: 'Your account is inactive. Please contact the restaurant.' })
    return
  }

  // 3. Determine current meal from server clock
  const meal = currentMealType()
  if (!meal) { res.status(400).json({ error: 'No meal is currently being served.' }); return }

  const today = new Date().toISOString().slice(0, 10)

  // 4. Check subscription allows this meal
  const { rows: subRows } = await pool.query(
    `SELECT meal_allowance, meals_remaining FROM subscriptions
     WHERE customer_id = $1 AND status = 'active' LIMIT 1`,
    [userId],
  )
  const sub = subRows[0]
  if (sub) {
    if (sub.meal_allowance !== 'all' && sub.meal_allowance !== meal) {
      res.status(400).json({ error: `Your subscription does not cover ${meal}.` }); return
    }
    if (sub.meals_remaining !== null && sub.meals_remaining <= 0) {
      res.status(400).json({ error: 'No meals remaining on your subscription.' }); return
    }
    if (sub.meals_remaining !== null) {
      await pool.query(
        'UPDATE subscriptions SET meals_remaining = meals_remaining - 1 WHERE customer_id = $1 AND status = $2',
        [userId, 'active'],
      )
    }
  }

  // 5. Insert (unique index will reject duplicate)
  try {
    const { rows } = await pool.query(
      `INSERT INTO attendance_logs (customer_id, date, meal_type, source, quantity)
       VALUES ($1, $2, $3, 'self_scan', 1)
       RETURNING *`,
      [userId, today, meal],
    )
    const log = mapLog(rows[0])

    broadcast({
      customerId:   userId,
      customerName: customer.name,
      mealType:     meal,
      source:       'self_scan',
      time:         rows[0].check_in_time,
    })

    res.status(201).json(log)
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: `Already checked in for ${meal} today.` })
    } else {
      console.error(err); res.status(500).json({ error: 'Server error' })
    }
  }
})

// ── POST /api/attendance/supervisor-checkin  (admin: manual per-customer) ─
router.post('/supervisor-checkin', requireRole('admin'), async (req: Request, res: Response) => {
  const { customerId, mealType } = req.body as { customerId: string; mealType: MealType }
  if (!customerId || !mealType || !MEAL_WINDOWS[mealType]) {
    res.status(400).json({ error: 'customerId and valid mealType required' }); return
  }
  const today = new Date().toISOString().slice(0, 10)
  try {
    const { rows } = await pool.query(
      `INSERT INTO attendance_logs (customer_id, date, meal_type, source, recorded_by, quantity)
       VALUES ($1, $2, $3, 'supervisor', $4, 1)
       RETURNING *`,
      [customerId, today, mealType, req.user!.userId],
    )
    res.status(201).json(mapLog(rows[0]))
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: `Already checked in for ${mealType} today.` })
    } else {
      console.error(err); res.status(500).json({ error: 'Server error' })
    }
  }
})

// ── POST /api/attendance/bulk-checkin  (supervisor) ───────────────────────
router.post('/bulk-checkin', requireRole('supervisor'), async (req: Request, res: Response) => {
  const { mealType, quantity, qrToken } = req.body as { mealType: MealType; quantity: number; qrToken: string }
  if (!mealType || !MEAL_WINDOWS[mealType]) { res.status(400).json({ error: 'Valid mealType required' }); return }
  if (!quantity || quantity < 1 || quantity > 200) { res.status(400).json({ error: 'Quantity must be 1–200' }); return }
  if (!qrToken) { res.status(400).json({ error: 'qrToken is required' }); return }

  const valid = await isTokenValid(qrToken)
  if (!valid) { res.status(400).json({ error: 'QR code has expired. Please scan a fresh code.' }); return }

  const supervisorId = req.user!.userId
  const today = new Date().toISOString().slice(0, 10)

  try {
    const { rows } = await pool.query(
      `INSERT INTO attendance_logs (customer_id, date, meal_type, source, recorded_by, quantity)
       VALUES ($1, $2, $3, 'bulk_supervisor', $4, $5)
       RETURNING *`,
      [supervisorId, today, mealType, supervisorId, quantity],
    )
    const log = mapLog(rows[0])

    broadcast({
      customerId:   supervisorId,
      customerName: `${req.user!.name} (team)`,
      mealType,
      source:       'bulk_supervisor',
      time:         rows[0].check_in_time,
      quantity,
    })

    res.status(201).json(log)
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

// ── POST /api/attendance/demo-checkin  (DEV ONLY — bypasses QR + time window) ─
// Handles both customer (source=self_scan) and supervisor (source=bulk_supervisor).
// Remove or gate behind NODE_ENV before deploying to production.
if (process.env.NODE_ENV !== 'production') {
  router.post('/demo-checkin', async (req: Request, res: Response) => {
    const { mealType, quantity } = req.body as { mealType?: MealType; quantity?: number }
    if (!mealType || !MEAL_WINDOWS[mealType]) {
      res.status(400).json({ error: 'Valid mealType required' }); return
    }

    const user = req.user!
    const today = new Date().toISOString().slice(0, 10)

    if (user.role === 'customer') {
      const { rows: uRows } = await pool.query(
        'SELECT is_approved, is_active, name FROM users WHERE id = $1', [user.userId],
      )
      const cu = uRows[0]
      if (!cu?.is_approved) { res.status(403).json({ error: 'Account not approved yet.' }); return }
      if (!cu?.is_active)   { res.status(403).json({ error: 'Account is inactive.' }); return }

      try {
        const { rows } = await pool.query(
          `INSERT INTO attendance_logs (customer_id, date, meal_type, source, quantity)
           VALUES ($1,$2,$3,'self_scan',1) RETURNING *`,
          [user.userId, today, mealType],
        )
        broadcast({ customerId: user.userId, customerName: cu.name, mealType, source: 'self_scan', time: rows[0].check_in_time })
        res.status(201).json(mapLog(rows[0]))
      } catch (err: unknown) {
        if ((err as { code?: string }).code === '23505') {
          res.status(409).json({ error: `Already checked in for ${mealType} today.` })
        } else { console.error(err); res.status(500).json({ error: 'Server error' }) }
      }
    } else if (user.role === 'supervisor') {
      const qty = Math.max(1, Math.min(200, Number(quantity) || 1))
      try {
        const { rows } = await pool.query(
          `INSERT INTO attendance_logs (customer_id, date, meal_type, source, recorded_by, quantity)
           VALUES ($1,$2,$3,'bulk_supervisor',$4,$5) RETURNING *`,
          [user.userId, today, mealType, user.userId, qty],
        )
        broadcast({ customerId: user.userId, customerName: `${user.name} (team)`, mealType, source: 'bulk_supervisor', time: rows[0].check_in_time, quantity: qty })
        res.status(201).json(mapLog(rows[0]))
      } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
    } else {
      res.status(403).json({ error: 'Demo checkin only available to customers and supervisors' })
    }
  })
}

export default router

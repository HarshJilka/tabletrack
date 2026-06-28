import { Router, Request, Response } from 'express'
import { pool } from '../db'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

function mapSub(r: Record<string, unknown>) {
  return {
    id:             r.id,
    customerId:     r.customer_id,
    planType:       r.plan_type,
    mealAllowance:  r.meal_allowance,
    startDate:      r.start_date,
    endDate:        r.end_date,
    mealsRemaining: r.meals_remaining,
    status:         r.status,
    paymentStatus:  r.payment_status,
    amount:         r.amount,
  }
}

// GET /api/subscriptions  (admin: all)
router.get('/', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM subscriptions ORDER BY created_at DESC')
    res.json(rows.map(mapSub))
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

// GET /api/subscriptions/my  (customer: own)
router.get('/my', requireRole('customer'), async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM subscriptions WHERE customer_id = $1 ORDER BY created_at DESC',
      [req.user!.userId],
    )
    res.json(rows.map(mapSub))
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

// GET /api/subscriptions/customer/:id  (admin: specific customer)
router.get('/customer/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM subscriptions WHERE customer_id = $1 ORDER BY created_at DESC',
      [req.params.id],
    )
    res.json(rows.map(mapSub))
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

// POST /api/subscriptions  (admin: create)
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  const { customerId, planType, mealAllowance, startDate, endDate, mealsRemaining, status, paymentStatus, amount } =
    req.body as Record<string, unknown>
  if (!customerId || !planType || !mealAllowance || !startDate || !endDate || !status || !paymentStatus || !amount) {
    res.status(400).json({ error: 'Missing required fields' }); return
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO subscriptions (customer_id, plan_type, meal_allowance, start_date, end_date, meals_remaining, status, payment_status, amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [customerId, planType, mealAllowance, startDate, endDate, mealsRemaining ?? null, status, paymentStatus, amount],
    )
    res.status(201).json(mapSub(rows[0]))
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

export default router

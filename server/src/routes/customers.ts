import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()
router.use(requireAuth, requireRole('admin'))

const SELECT_BY_ROLE = `
  SELECT id, name, email, phone, role, is_active, is_approved, joined_on, created_at
  FROM users WHERE role = $1
`

function mapRow(u: Record<string, unknown>) {
  return {
    id:         u.id,
    name:       u.name,
    email:      u.email,
    phone:      u.phone,
    role:       u.role,
    isActive:   u.is_active,
    isApproved: u.is_approved,
    joinedOn:   u.joined_on,
    createdAt:  u.created_at,
  }
}

// GET /api/customers?role=customer|supervisor  (default: customer)
router.get('/', async (req: Request, res: Response) => {
  const role = (req.query.role as string) ?? 'customer'
  if (!['customer', 'supervisor'].includes(role)) {
    res.status(400).json({ error: 'role must be "customer" or "supervisor"' }); return
  }
  try {
    const { rows } = await pool.query(`${SELECT_BY_ROLE} ORDER BY created_at DESC`, [role])
    res.json(rows.map(mapRow))
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

// GET /api/customers/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, role, is_active, is_approved, joined_on, created_at
       FROM users WHERE role = 'customer' AND id = $1`,
      [req.params.id],
    )
    if (!rows[0]) { res.status(404).json({ error: 'Customer not found' }); return }
    res.json(mapRow(rows[0]))
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

// POST /api/customers
router.post('/', async (req: Request, res: Response) => {
  const { name, email, phone, password = 'changeme123', isApproved = false } = req.body as Record<string, string | boolean>
  if (!name || !email) { res.status(400).json({ error: 'Name and email required' }); return }
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [(email as string).toLowerCase()])
    if (exists.rows.length) { res.status(409).json({ error: 'Email already exists' }); return }
    const hash = await bcrypt.hash(password as string, 10)
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role, is_active, is_approved)
       VALUES ($1,$2,$3,$4,'customer',true,$5)
       RETURNING id, name, email, phone, role, is_active, is_approved, joined_on, created_at`,
      [(name as string).trim(), (email as string).toLowerCase().trim(), phone ?? '', hash, isApproved],
    )
    res.status(201).json(mapRow(rows[0]))
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

// PUT /api/customers/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { name, email, phone, isActive } = req.body as Record<string, string | boolean>
  try {
    const { rows } = await pool.query(
      `UPDATE users SET
         name      = COALESCE($1, name),
         email     = COALESCE($2, email),
         phone     = COALESCE($3, phone),
         is_active = COALESCE($4, is_active)
       WHERE id = $5 AND role = 'customer'
       RETURNING id, name, email, phone, role, is_active, is_approved, joined_on, created_at`,
      [name ?? null, email ? (email as string).toLowerCase() : null, phone ?? null, isActive ?? null, req.params.id],
    )
    if (!rows[0]) { res.status(404).json({ error: 'Customer not found' }); return }
    res.json(mapRow(rows[0]))
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

// PATCH /api/customers/:id/approval
router.patch('/:id/approval', async (req: Request, res: Response) => {
  const { isApproved } = req.body as { isApproved: boolean }
  if (typeof isApproved !== 'boolean') { res.status(400).json({ error: 'isApproved (boolean) required' }); return }
  try {
    const { rows } = await pool.query(
      `UPDATE users SET is_approved = $1
       WHERE id = $2 AND role = 'customer'
       RETURNING id, name, email, phone, role, is_active, is_approved, joined_on`,
      [isApproved, req.params.id],
    )
    if (!rows[0]) { res.status(404).json({ error: 'Customer not found' }); return }
    res.json(mapRow(rows[0]))
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

// DELETE /api/customers/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM users WHERE id = $1 AND role = 'customer'`, [req.params.id],
    )
    if (!rowCount) { res.status(404).json({ error: 'Customer not found' }); return }
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

export default router

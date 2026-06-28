import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db'
import { requireAuth } from '../middleware/auth'
import type { JwtPayload } from '../types'

const router = Router()

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' })
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, phone, role, is_active, is_approved, joined_on, password_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()],
    )
    const user = rows[0]
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }
    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }
    const payload: JwtPayload = { userId: user.id, role: user.role, name: user.name, email: user.email }
    const token = signToken(payload)
    res.json({
      token,
      user: {
        id:         user.id,
        name:       user.name,
        email:      user.email,
        phone:      user.phone,
        role:       user.role,
        isActive:   user.is_active,
        isApproved: user.is_approved,
        joinedOn:   user.joined_on,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/register  (self-signup — creates unapproved customer)
router.post('/register', async (req: Request, res: Response) => {
  const { name, email, phone, password } = req.body as Record<string, string>
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email and password are required' })
    return
  }
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()])
    if (exists.rows.length) {
      res.status(409).json({ error: 'An account with this email already exists' })
      return
    }
    const hash = await bcrypt.hash(password, 10)
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role, is_active, is_approved)
       VALUES ($1, $2, $3, $4, 'customer', true, false)
       RETURNING id, name, email, phone, role, is_active, is_approved, joined_on`,
      [name.trim(), email.toLowerCase().trim(), phone?.trim() ?? '', hash],
    )
    const user = rows[0]
    const payload: JwtPayload = { userId: user.id, role: user.role, name: user.name, email: user.email }
    const token = signToken(payload)
    res.status(201).json({
      token,
      user: {
        id:         user.id,
        name:       user.name,
        email:      user.email,
        phone:      user.phone,
        role:       user.role,
        isActive:   user.is_active,
        isApproved: user.is_approved,
        joinedOn:   user.joined_on,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/me  (validate token + refresh user data)
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, phone, role, is_active, is_approved, joined_on FROM users WHERE id = $1',
      [req.user!.userId],
    )
    if (!rows[0]) { res.status(404).json({ error: 'User not found' }); return }
    const u = rows[0]
    res.json({
      id:         u.id,
      name:       u.name,
      email:      u.email,
      phone:      u.phone,
      role:       u.role,
      isActive:   u.is_active,
      isApproved: u.is_approved,
      joinedOn:   u.joined_on,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router

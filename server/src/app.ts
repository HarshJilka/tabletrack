import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

import authRouter          from './routes/auth'
import customersRouter     from './routes/customers'
import attendanceRouter    from './routes/attendance'
import subscriptionsRouter from './routes/subscriptions'
import qrRouter            from './routes/qr'
import eventsRouter        from './routes/events'

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true }))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// API routes
app.use('/api/auth',          authRouter)
app.use('/api/customers',     customersRouter)
app.use('/api/attendance',    attendanceRouter)
app.use('/api/subscriptions', subscriptionsRouter)
app.use('/api/restaurant-qr', qrRouter)
app.use('/api/events',        eventsRouter)

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }))

export default app

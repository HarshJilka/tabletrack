import app from './app'
import { pool } from './db'

const PORT = Number(process.env.PORT ?? 3001)

async function start() {
  // Verify DB connection before accepting traffic
  try {
    await pool.query('SELECT 1')
    console.log('✅ Database connected')
  } catch (err) {
    console.error('❌ Database connection failed:', err)
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`🚀 TableTrack API running on http://localhost:${PORT}`)
    console.log(`   Health → http://localhost:${PORT}/health`)
  })
}

start()

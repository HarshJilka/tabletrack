/**
 * Run once to reset all seeded accounts to password: password123
 * Usage: node reset-passwords.js
 */
const bcrypt = require('bcryptjs')
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres:3401@localhost:5432/tabletrack',
})

async function run() {
  const hash = await bcrypt.hash('password123', 10)
  console.log('Generated hash:', hash)

  const { rowCount } = await pool.query(
    'UPDATE users SET password_hash = $1',
    [hash],
  )
  console.log(`✅ Updated ${rowCount} user(s) — all passwords are now: password123`)
  await pool.end()
}

run().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})

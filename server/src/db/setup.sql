-- ============================================================
-- TableTrack — Full Setup (Schema + Seed in one script)
-- Paste this entire file into pgAdmin Query Tool and press F5
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Drop tables if re-running (safe to run multiple times) ──
DROP TABLE IF EXISTS attendance_logs CASCADE;
DROP TABLE IF EXISTS subscriptions   CASCADE;
DROP TABLE IF EXISTS users           CASCADE;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  phone         TEXT,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL CHECK (role IN ('admin', 'supervisor', 'customer')),
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  is_approved   BOOLEAN     NOT NULL DEFAULT false,
  joined_on     DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Subscriptions ────────────────────────────────────────────
CREATE TABLE subscriptions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type       TEXT          NOT NULL CHECK (plan_type IN ('daily', 'weekly', 'monthly')),
  meal_allowance  TEXT          NOT NULL CHECK (meal_allowance IN ('breakfast', 'lunch', 'dinner', 'all')),
  start_date      DATE          NOT NULL,
  end_date        DATE          NOT NULL,
  meals_remaining INTEGER,
  status          TEXT          NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
  payment_status  TEXT          NOT NULL CHECK (payment_status IN ('paid', 'pending', 'overdue')),
  amount          NUMERIC(10,2) NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Attendance Logs ──────────────────────────────────────────
CREATE TABLE attendance_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date           DATE        NOT NULL,
  meal_type      TEXT        NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  source         TEXT        NOT NULL CHECK (source IN ('self_scan', 'supervisor', 'bulk_supervisor')),
  check_in_time  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  recorded_by    UUID        REFERENCES users(id),
  quantity       INTEGER     NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent a customer claiming the same meal twice on the same day
CREATE UNIQUE INDEX attendance_individual_unique
  ON attendance_logs(customer_id, date, meal_type)
  WHERE source IN ('self_scan', 'supervisor');

-- Fast lookup indexes
CREATE INDEX idx_attendance_date        ON attendance_logs(date);
CREATE INDEX idx_attendance_customer    ON attendance_logs(customer_id);
CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);

-- ── Seed Data ────────────────────────────────────────────────
-- All demo passwords are hashed from: password123
-- (bcrypt hash of "password123" with 10 rounds)
-- Use these to log in during development, then change in production.

INSERT INTO users (id, name, email, phone, password_hash, role, is_active, is_approved, joined_on) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Restaurant Admin', 'admin@tabletrack.com', '+91 90000 00000',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKGgv9981', 'admin', true, true, '2026-01-01'),

  ('00000000-0000-0000-0000-000000000002', 'Raj Supervisor', 'raj@tabletrack.com', '+91 98000 11111',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKGgv9981', 'supervisor', true, true, '2026-01-01'),

  ('00000000-0000-0000-0000-000000000003', 'Aarav Mehta', 'aarav@example.com', '+91 98765 43210',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKGgv9981', 'customer', true, true, '2026-01-12'),

  ('00000000-0000-0000-0000-000000000004', 'Priya Sharma', 'priya@example.com', '+91 91234 56789',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKGgv9981', 'customer', true, true, '2026-02-03'),

  ('00000000-0000-0000-0000-000000000005', 'Rohan Gupta', 'rohan@example.com', '+91 99887 76655',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKGgv9981', 'customer', true, true, '2026-03-20'),

  ('00000000-0000-0000-0000-000000000006', 'Sneha Verma', 'sneha@example.com', '+91 90011 22334',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKGgv9981', 'customer', true, false, '2026-06-18');

INSERT INTO subscriptions (customer_id, plan_type, meal_allowance, start_date, end_date, meals_remaining, status, payment_status, amount) VALUES
  ('00000000-0000-0000-0000-000000000003', 'monthly', 'all',    '2026-06-01', '2026-06-30', NULL, 'active',  'paid',    4500),
  ('00000000-0000-0000-0000-000000000004', 'weekly',  'lunch',  '2026-06-15', '2026-06-21', 3,    'active',  'pending', 900),
  ('00000000-0000-0000-0000-000000000005', 'monthly', 'dinner', '2026-05-01', '2026-05-31', 0,    'expired', 'overdue', 4000);

INSERT INTO attendance_logs (customer_id, date, meal_type, source, check_in_time, recorded_by, quantity) VALUES
  ('00000000-0000-0000-0000-000000000003', '2026-06-19', 'breakfast', 'self_scan',       '2026-06-19T08:05:00Z', NULL,                                   1),
  ('00000000-0000-0000-0000-000000000003', '2026-06-19', 'dinner',    'self_scan',       '2026-06-19T19:45:00Z', NULL,                                   1),
  ('00000000-0000-0000-0000-000000000004', '2026-06-19', 'lunch',     'supervisor',      '2026-06-19T12:50:00Z', '00000000-0000-0000-0000-000000000001', 1),
  ('00000000-0000-0000-0000-000000000003', '2026-06-18', 'lunch',     'self_scan',       '2026-06-18T12:15:00Z', NULL,                                   1),
  ('00000000-0000-0000-0000-000000000005', '2026-06-17', 'dinner',    'supervisor',      '2026-06-17T20:00:00Z', '00000000-0000-0000-0000-000000000001', 1),
  ('00000000-0000-0000-0000-000000000002', '2026-06-24', 'lunch',     'bulk_supervisor', '2026-06-24T12:10:00Z', '00000000-0000-0000-0000-000000000002', 10);

-- ============================================================
-- TableTrack — Database Schema
-- Run this in pgAdmin Query Tool against the "tabletrack" DB
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type       TEXT        NOT NULL CHECK (plan_type IN ('daily', 'weekly', 'monthly')),
  meal_allowance  TEXT        NOT NULL CHECK (meal_allowance IN ('breakfast', 'lunch', 'dinner', 'all')),
  start_date      DATE        NOT NULL,
  end_date        DATE        NOT NULL,
  meals_remaining INTEGER,
  status          TEXT        NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
  payment_status  TEXT        NOT NULL CHECK (payment_status IN ('paid', 'pending', 'overdue')),
  amount          NUMERIC(10,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Attendance Logs ──────────────────────────────────────────
-- customer_id = the customer who ate (self_scan / supervisor)
-- customer_id = the supervisor's own id (bulk_supervisor)
-- recorded_by = supervisor or admin who logged it (nullable for self_scan)
-- quantity    = number of tiffins (always 1 for individual, N for bulk)
CREATE TABLE IF NOT EXISTS attendance_logs (
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
-- (only for individual claims — bulk_supervisor is excluded)
CREATE UNIQUE INDEX IF NOT EXISTS attendance_individual_unique
  ON attendance_logs(customer_id, date, meal_type)
  WHERE source IN ('self_scan', 'supervisor');

-- Fast lookups
CREATE INDEX IF NOT EXISTS idx_attendance_date        ON attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_customer    ON attendance_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);

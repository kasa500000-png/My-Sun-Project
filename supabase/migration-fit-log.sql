-- Fit log MVP tables
-- Run in Supabase SQL Editor before deploying the /fit-log page with cloud sync.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS fit_workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_date DATE NOT NULL,
  routine_name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fit_set_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES fit_workout_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL DEFAULT 1,
  weight NUMERIC,
  reps INTEGER,
  duration_seconds INTEGER,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fit_sessions_user_date
  ON fit_workout_sessions(user_id, workout_date DESC);

CREATE INDEX IF NOT EXISTS idx_fit_sets_session
  ON fit_set_logs(session_id, set_number);

ALTER TABLE fit_workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fit_set_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fit_sessions_select_own ON fit_workout_sessions;
CREATE POLICY fit_sessions_select_own ON fit_workout_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS fit_sessions_insert_own ON fit_workout_sessions;
CREATE POLICY fit_sessions_insert_own ON fit_workout_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS fit_sessions_update_own ON fit_workout_sessions;
CREATE POLICY fit_sessions_update_own ON fit_workout_sessions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS fit_sessions_delete_own ON fit_workout_sessions;
CREATE POLICY fit_sessions_delete_own ON fit_workout_sessions
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS fit_sets_select_own ON fit_set_logs;
CREATE POLICY fit_sets_select_own ON fit_set_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS fit_sets_insert_own ON fit_set_logs;
CREATE POLICY fit_sets_insert_own ON fit_set_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS fit_sets_update_own ON fit_set_logs;
CREATE POLICY fit_sets_update_own ON fit_set_logs
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS fit_sets_delete_own ON fit_set_logs;
CREATE POLICY fit_sets_delete_own ON fit_set_logs
  FOR DELETE USING (auth.uid() = user_id);

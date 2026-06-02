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

CREATE TABLE IF NOT EXISTS fit_user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_goal INTEGER NOT NULL DEFAULT 3 CHECK (weekly_goal BETWEEN 1 AND 14),
  favorite_exercise_ids TEXT[] NOT NULL DEFAULT '{}',
  gender TEXT NOT NULL DEFAULT '',
  height_cm NUMERIC,
  weight_kg NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fit_user_settings
  ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fit_sessions_duration_minutes_range'
  ) THEN
    ALTER TABLE fit_workout_sessions
      ADD CONSTRAINT fit_sessions_duration_minutes_range
      CHECK (duration_minutes BETWEEN 0 AND 1440) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fit_sets_set_number_range'
  ) THEN
    ALTER TABLE fit_set_logs
      ADD CONSTRAINT fit_sets_set_number_range
      CHECK (set_number BETWEEN 1 AND 200) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fit_sets_non_negative_metrics'
  ) THEN
    ALTER TABLE fit_set_logs
      ADD CONSTRAINT fit_sets_non_negative_metrics
      CHECK (
        (weight IS NULL OR weight >= 0)
        AND (reps IS NULL OR reps >= 0)
        AND (duration_seconds IS NULL OR duration_seconds >= 0)
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fit_settings_body_metrics_range'
  ) THEN
    ALTER TABLE fit_user_settings
      ADD CONSTRAINT fit_settings_body_metrics_range
      CHECK (
        (height_cm IS NULL OR height_cm BETWEEN 80 AND 230)
        AND (weight_kg IS NULL OR weight_kg BETWEEN 20 AND 250)
      ) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fit_sessions_user_date
  ON fit_workout_sessions(user_id, workout_date DESC);

CREATE INDEX IF NOT EXISTS idx_fit_sets_session
  ON fit_set_logs(session_id, set_number);

CREATE INDEX IF NOT EXISTS idx_fit_sets_user_session
  ON fit_set_logs(user_id, session_id);

ALTER TABLE fit_workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fit_set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fit_user_settings ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS fit_settings_select_own ON fit_user_settings;
CREATE POLICY fit_settings_select_own ON fit_user_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS fit_settings_insert_own ON fit_user_settings;
CREATE POLICY fit_settings_insert_own ON fit_user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS fit_settings_update_own ON fit_user_settings;
CREATE POLICY fit_settings_update_own ON fit_user_settings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS fit_settings_delete_own ON fit_user_settings;
CREATE POLICY fit_settings_delete_own ON fit_user_settings
  FOR DELETE USING (auth.uid() = user_id);

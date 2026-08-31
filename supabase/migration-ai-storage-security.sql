-- My-Sun AI usage protection and private diet-image storage.
-- Run after supabase/migration-fit-log.sql.

ALTER TABLE public.fit_diet_meal_logs
  ADD COLUMN IF NOT EXISTS image_path TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fit_diet_image_path_safe'
  ) THEN
    ALTER TABLE public.fit_diet_meal_logs
      ADD CONSTRAINT fit_diet_image_path_safe
      CHECK (
        image_path IS NULL
        OR (
          image_path !~ '(^/|\.\.)'
          AND length(image_path) BETWEEN 1 AND 512
        )
      ) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fit_diet_meals_image_path
  ON public.fit_diet_meal_logs(image_path)
  WHERE image_path IS NOT NULL;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'fit-diet-images',
  'fit-diet-images',
  FALSE,
  6291456,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::TEXT[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- This bucket is intentionally server-only. The Next.js API uses the service role
-- and returns short-lived signed URLs; authenticated clients receive no direct object grants.
DROP POLICY IF EXISTS fit_diet_images_select_own ON storage.objects;
DROP POLICY IF EXISTS fit_diet_images_insert_own ON storage.objects;
DROP POLICY IF EXISTS fit_diet_images_update_own ON storage.objects;
DROP POLICY IF EXISTS fit_diet_images_delete_own ON storage.objects;

CREATE TABLE IF NOT EXISTS public.fit_ai_usage_buckets (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket_kind TEXT NOT NULL,
  bucket_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, bucket_kind, bucket_start),
  CONSTRAINT fit_ai_usage_bucket_kind_valid
    CHECK (bucket_kind IN ('minute', 'day')),
  CONSTRAINT fit_ai_usage_request_count_non_negative
    CHECK (request_count >= 0)
);

ALTER TABLE public.fit_ai_usage_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.fit_ai_usage_buckets FROM anon, authenticated;
GRANT ALL ON TABLE public.fit_ai_usage_buckets TO service_role;

CREATE INDEX IF NOT EXISTS idx_fit_ai_usage_cleanup
  ON public.fit_ai_usage_buckets(bucket_start);

CREATE OR REPLACE FUNCTION public.consume_fit_ai_analysis_quota(
  p_user_id UUID,
  p_daily_limit INTEGER DEFAULT 20,
  p_minute_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
  allowed BOOLEAN,
  retry_after_seconds INTEGER,
  daily_remaining INTEGER,
  minute_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_day_start TIMESTAMPTZ;
  v_minute_start TIMESTAMPTZ;
  v_day_count INTEGER := 0;
  v_minute_count INTEGER := 0;
  v_daily_limit INTEGER := GREATEST(COALESCE(p_daily_limit, 20), 1);
  v_minute_limit INTEGER := GREATEST(COALESCE(p_minute_limit, 3), 1);
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service_role required' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required' USING ERRCODE = '22004';
  END IF;

  v_day_start := date_trunc('day', v_now AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';
  v_minute_start := date_trunc('minute', v_now);

  -- Serialize quota consumption per user so concurrent requests cannot overrun the limit.
  PERFORM pg_advisory_xact_lock(hashtextextended('fit-ai:' || p_user_id::TEXT, 0));

  DELETE FROM public.fit_ai_usage_buckets
  WHERE user_id = p_user_id
    AND bucket_start < v_now - INTERVAL '14 days';

  SELECT request_count
    INTO v_day_count
  FROM public.fit_ai_usage_buckets
  WHERE user_id = p_user_id
    AND bucket_kind = 'day'
    AND bucket_start = v_day_start;

  SELECT request_count
    INTO v_minute_count
  FROM public.fit_ai_usage_buckets
  WHERE user_id = p_user_id
    AND bucket_kind = 'minute'
    AND bucket_start = v_minute_start;

  v_day_count := COALESCE(v_day_count, 0);
  v_minute_count := COALESCE(v_minute_count, 0);

  IF v_day_count >= v_daily_limit THEN
    RETURN QUERY SELECT
      FALSE,
      GREATEST(CEIL(EXTRACT(EPOCH FROM ((v_day_start + INTERVAL '1 day') - v_now)))::INTEGER, 1),
      0,
      GREATEST(v_minute_limit - v_minute_count, 0);
    RETURN;
  END IF;

  IF v_minute_count >= v_minute_limit THEN
    RETURN QUERY SELECT
      FALSE,
      GREATEST(CEIL(EXTRACT(EPOCH FROM ((v_minute_start + INTERVAL '1 minute') - v_now)))::INTEGER, 1),
      GREATEST(v_daily_limit - v_day_count, 0),
      0;
    RETURN;
  END IF;

  INSERT INTO public.fit_ai_usage_buckets (
    user_id,
    bucket_kind,
    bucket_start,
    request_count,
    updated_at
  )
  VALUES (p_user_id, 'day', v_day_start, 1, v_now)
  ON CONFLICT (user_id, bucket_kind, bucket_start)
  DO UPDATE SET
    request_count = public.fit_ai_usage_buckets.request_count + 1,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.fit_ai_usage_buckets (
    user_id,
    bucket_kind,
    bucket_start,
    request_count,
    updated_at
  )
  VALUES (p_user_id, 'minute', v_minute_start, 1, v_now)
  ON CONFLICT (user_id, bucket_kind, bucket_start)
  DO UPDATE SET
    request_count = public.fit_ai_usage_buckets.request_count + 1,
    updated_at = EXCLUDED.updated_at;

  RETURN QUERY SELECT
    TRUE,
    0,
    GREATEST(v_daily_limit - v_day_count - 1, 0),
    GREATEST(v_minute_limit - v_minute_count - 1, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_fit_ai_analysis_quota(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_fit_ai_analysis_quota(UUID, INTEGER, INTEGER) TO service_role;

COMMENT ON COLUMN public.fit_diet_meal_logs.image_path IS
  'Private Supabase Storage object path. API responses expose a short-lived signed URL instead.';

COMMENT ON TABLE public.fit_ai_usage_buckets IS
  'Server-only per-user AI request quota buckets. No authenticated client access.';

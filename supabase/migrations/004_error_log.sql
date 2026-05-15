CREATE TABLE IF NOT EXISTS error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ DEFAULT now(),
  source TEXT NOT NULL,        -- 'client' | 'serverless' | 'bot'
  level TEXT NOT NULL DEFAULT 'error',  -- 'error' | 'warn' | 'info'
  message TEXT NOT NULL,
  stack TEXT,
  user_agent TEXT,
  url TEXT,
  context JSONB,
  resolved BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_error_ts ON error_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_error_source ON error_log(source);
CREATE INDEX IF NOT EXISTS idx_error_resolved ON error_log(resolved);
ALTER TABLE error_log DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS auth_lockouts (
  ip TEXT PRIMARY KEY,
  failures INTEGER NOT NULL,
  locked_until INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_lockouts_updated_at ON auth_lockouts(updated_at);

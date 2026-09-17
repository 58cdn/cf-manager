export interface LockoutEnv {
  AUTH_LOCKOUT_ENABLED?: string;
  AUTH_LOCKOUT_ATTEMPTS?: string;
  AUTH_LOCKOUT_MINUTES?: string;
  AUTH_LOCKOUT_REPEAT_MINUTES?: string;
}

export function lockoutPolicy(env: LockoutEnv) {
  const enabled = env.AUTH_LOCKOUT_ENABLED ?? 'true';
  if (!['true', 'false'].includes(enabled)) throw new Error('AUTH_LOCKOUT_ENABLED must be true or false');
  const integer = (name: keyof LockoutEnv, fallback: number, max: number) => {
    const value = env[name] ?? String(fallback);
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) {
      throw new Error(`${name} must be an integer between 1 and ${max}`);
    }
    return Number(value);
  };
  return {
    enabled: enabled === 'true',
    attempts: integer('AUTH_LOCKOUT_ATTEMPTS', 3, 1000),
    minutes: integer('AUTH_LOCKOUT_MINUTES', 5, 10080),
    repeatMinutes: integer('AUTH_LOCKOUT_REPEAT_MINUTES', 10, 10080),
  };
}

export const retentionMs = 30 * 24 * 60 * 60 * 1000;
export const readLockoutSql = 'SELECT locked_until FROM auth_lockouts WHERE ip = ?';
export const resetLockoutSql = 'DELETE FROM auth_lockouts WHERE ip = ? AND locked_until <= ?';
export const cleanupLockoutSql = 'DELETE FROM auth_lockouts WHERE updated_at < ? AND locked_until <= ?';

// One atomic upsert: concurrent failures cannot lose increments or extend an active lock.
export const failLockoutSql = `
INSERT INTO auth_lockouts (ip, failures, locked_until, updated_at)
VALUES (?, 1, CASE WHEN ? = 1 THEN ? + ? ELSE 0 END, ?)
ON CONFLICT(ip) DO UPDATE SET
  failures = MIN(auth_lockouts.failures + 1, ?),
  locked_until = CASE
    WHEN auth_lockouts.failures >= ? THEN ? + ?
    WHEN auth_lockouts.failures + 1 >= ? THEN ? + ?
    ELSE 0 END,
  updated_at = ?
WHERE auth_lockouts.locked_until <= ?
RETURNING locked_until`;

export function failureArgs(ip: string, now: number, policy: ReturnType<typeof lockoutPolicy>) {
  return [ip, policy.attempts, now, policy.minutes * 60000, now,
    policy.attempts, policy.attempts, now, policy.repeatMinutes * 60000,
    policy.attempts, now, policy.minutes * 60000, now, now];
}

export function lockoutError(seconds: number) {
  return { error: { code: 'AUTH_LOCKED', message: `Too many failed authentication attempts. Try again in ${seconds} seconds.`, retry_after: seconds } };
}

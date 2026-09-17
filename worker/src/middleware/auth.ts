import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';
import { cleanupLockoutSql, failureArgs, failLockoutSql, lockoutError, lockoutPolicy, readLockoutSql, resetLockoutSql, retentionMs } from '../services/authLockout';

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  // 未配置 API_SECRET 时跳过鉴权（开发/演示场景，向后兼容已有部署）。
  // 注意：这会导致所有管理接口处于无鉴权状态，存在安全风险，仅建议本地/内网使用。
  if (!c.env.API_SECRET) {
    await next();
    return;
  }

  const policy = lockoutPolicy(c.env);
  const now = Date.now();
  // Cloudflare supplies this header at the edge. Never trust X-Forwarded-For here.
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const db = policy.enabled ? c.env.DB : undefined;
  if (policy.enabled && !db) throw new Error('DB binding is required for authentication lockout');
  const remaining = async () => {
    const row = await db?.prepare(readLockoutSql).bind(ip).first<{ locked_until: number }>();
    return Math.max(0, Math.ceil(((row?.locked_until ?? 0) - now) / 1000));
  };
  const locked = (seconds: number) => {
    c.header('Retry-After', String(seconds));
    return c.json(lockoutError(seconds), 429);
  };
  await db?.prepare(cleanupLockoutSql).bind(now - retentionMs, now).run();
  const seconds = await remaining();
  if (seconds) return locked(seconds);

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } }, 401);
  }

  if (authHeader.substring(7) !== c.env.API_SECRET) {
    await db?.prepare(failLockoutSql).bind(...failureArgs(ip, now, policy)).first();
    const retryAfter = await remaining();
    if (retryAfter) return locked(retryAfter);
    return c.json({ error: { code: 'FORBIDDEN', message: 'Invalid API secret' } }, 403);
  }

  await db?.prepare(resetLockoutSql).bind(ip, now).run();
  // Another request may have reached the threshold since the initial check.
  const retryAfter = await remaining();
  if (retryAfter) return locked(retryAfter);
  await next();
});

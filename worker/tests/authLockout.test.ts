import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import type { Env } from '../src/types';
import { authMiddleware } from '../src/middleware/auth';
import unlockRouter from '../src/routes/unlock';

// Vitest 2 predates node:sqlite; load the built-in through Node's module loader.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
let db: InstanceType<typeof DatabaseSync>;
let now: number;
let env: Env;
let app: Hono<{ Bindings: Env }>;
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../src/db/migrations/0010_auth_lockouts.sql', import.meta.url), 'utf8'));
  now = 1_800_000_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  // Real SQLite SQL execution behind a D1-shaped adapter, not remote D1 validation.
  const binding = { prepare(sql: string) {
    return { bind(...args: (string | number)[]) {
      return {
        async first() { return db.prepare(sql).get(...args) ?? null; },
        async run() { db.prepare(sql).run(...args); return { success: true }; },
      };
    } };
  } };
  env = { DB: binding, API_SECRET: randomUUID(), UNLOCK_KEY: randomUUID() } as unknown as Env;
  app = new Hono<{ Bindings: Env }>();
  app.route('/admin/unlock', unlockRouter);
  app.use('*', authMiddleware);
  app.get('*', c => c.json({ ok: true }));
});
afterEach(() => { db.close(); vi.restoreAllMocks(); });
const request = (token?: string, ip = '192.0.2.1', forwarded = '192.0.2.100') => app.request('/api/settings', {
  headers: { ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }), 'CF-Connecting-IP': ip, 'X-Forwarded-For': forwarded },
}, env);

it('locks on the threshold without extending, repeats, isolates IPs and resets on success', async () => {
  for (let i = 0; i < 4; i++) expect((await request()).status).toBe(401);
  expect((await request('wrong')).status).toBe(403);
  expect((await request('wrong')).status).toBe(403);
  const locked = await request('wrong');
  expect(locked.status).toBe(429);
  expect(locked.headers.get('Retry-After')).toBe('300');
  expect(await locked.json()).toMatchObject({ error: { code: 'AUTH_LOCKED', retry_after: 300 } });
  now += 60_000;
  expect((await request(env.API_SECRET)).status).toBe(429);
  expect((await request('wrong', '192.0.2.1', '192.0.2.200')).headers.get('Retry-After')).toBe('240');
  expect((await request(env.API_SECRET, '192.0.2.2')).status).toBe(200);
  now += 240_000;
  expect((await request('wrong')).headers.get('Retry-After')).toBe('600');
  now += 600_000;
  expect((await request(env.API_SECRET)).status).toBe(200);
  expect((await request('wrong')).status).toBe(403);
});

it('supports custom thresholds and durations', async () => {
  Object.assign(env, { AUTH_LOCKOUT_ATTEMPTS: '1', AUTH_LOCKOUT_MINUTES: '2', AUTH_LOCKOUT_REPEAT_MINUTES: '4' });
  expect((await request('wrong')).headers.get('Retry-After')).toBe('120');
  now += 120_000;
  expect((await request('wrong')).headers.get('Retry-After')).toBe('240');
});

it('preserves disable and no-secret behavior without DB access', async () => {
  db.exec('DROP TABLE auth_lockouts');
  env.AUTH_LOCKOUT_ENABLED = 'false';
  for (let i = 0; i < 4; i++) expect((await request('wrong')).status).toBe(403);
  expect((await request(env.API_SECRET)).status).toBe(200);
  env.AUTH_LOCKOUT_ENABLED = 'true'; env.API_SECRET = '';
  expect((await request()).status).toBe(200);
});

it('handles concurrent failures atomically and expires inactive records', async () => {
  const responses = await Promise.all(Array.from({ length: 12 }, () => request('wrong')));
  expect(responses.every(r => r.status === 403 || r.status === 429)).toBe(true);
  expect(db.prepare('SELECT failures FROM auth_lockouts').get()).toMatchObject({ failures: 3 });
  expect((await request(env.API_SECRET)).status).toBe(429);
  now += 30 * 24 * 60 * 60 * 1000 + 1;
  expect((await request('wrong')).status).toBe(403);
});

it('fails closed when the database or migration is missing', async () => {
  app.onError((_err, c) => c.json({ error: 'database unavailable' }, 500));
  db.exec('DROP TABLE auth_lockouts');
  expect((await request(env.API_SECRET)).status).toBe(500);
  env.DB = undefined as unknown as Env['DB'];
  expect((await request(env.API_SECRET)).status).toBe(500);
});

const unlock = (key: string, ip = '192.0.2.1', method = 'GET') => app.request(`/admin/unlock/${key}`, {
  method, headers: { ...(ip ? { 'CF-Connecting-IP': ip } : {}), 'X-Forwarded-For': '192.0.2.99' },
}, env);

it('unlocks the current edge IP only and still requires authentication', async () => {
  for (const ip of ['192.0.2.1', '192.0.2.2']) {
    for (let i = 0; i < 3; i++) await request('wrong', ip);
  }
  expect((await unlock('wrong')).status).toBe(403);
  expect((await request(env.API_SECRET)).status).toBe(429);
  const response = await unlock(env.UNLOCK_KEY!);
  expect(response.status).toBe(303);
  expect(response.headers.get('Location')).toBe('/admin/');
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  expect((await request()).status).toBe(401);
  expect((await request(env.API_SECRET, '192.0.2.2')).status).toBe(429);
  expect((await request('wrong')).status).toBe(403);
  expect((await request(env.API_SECRET)).status).toBe(200);
});

it('rejects missing keys, missing edge IP and non-GET unlock requests', async () => {
  for (let i = 0; i < 3; i++) await request('wrong');
  expect((await unlock(env.UNLOCK_KEY!, '', 'GET')).status).toBe(400);
  expect((await unlock(env.UNLOCK_KEY!, '192.0.2.1', 'HEAD')).status).toBe(405);
  expect((await unlock(env.UNLOCK_KEY!, '192.0.2.1', 'POST')).status).toBe(404);
  env.UNLOCK_KEY = '';
  expect((await unlock('wrong')).status).toBe(403);
  expect((await request(env.API_SECRET)).status).toBe(429);
});

it('fails closed on unlock database errors without logging the secret-bearing path', async () => {
  const log = vi.spyOn(console, 'error');
  db.exec('DROP TABLE auth_lockouts');
  const response = await unlock(env.UNLOCK_KEY!);
  expect(response.status).toBe(503);
  expect(await response.text()).toBe('Unlock unavailable');
  expect(log).not.toHaveBeenCalled();
});

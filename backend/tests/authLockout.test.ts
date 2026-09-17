import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { authMiddleware } from '../src/middleware/auth';
import { lockoutPolicy, retentionMs } from '../src/services/authLockout';

const state = vi.hoisted(() => ({ db: undefined as unknown, secret: '', enabled: true }));
vi.mock('../src/db', () => ({ getDb: () => state.db }));
vi.mock('../src/config', () => ({ config: {
  get apiSecret() { return state.secret; },
  get authLockout() { return { enabled: state.enabled, attempts: 3, minutes: 5, repeatMinutes: 10 }; },
} }));

let db: Database.Database;
let server: Server | undefined;
let now: number;
beforeEach(() => {
  db = new Database(':memory:');
  db.exec(readFileSync(new URL('../../worker/src/db/migrations/0010_auth_lockouts.sql', import.meta.url), 'utf8'));
  state.db = db;
  state.secret = randomUUID();
  state.enabled = true;
  now = 1_800_000_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
});
afterEach(async () => {
  if (server) {
    const current = server;
    server = undefined;
    await new Promise<void>((resolve, reject) => current.close(err => err ? reject(err) : resolve()));
  }
  db.close();
  vi.restoreAllMocks();
});

async function client(trusted = false) {
  const app = express();
  if (trusted) app.set('trust proxy', ['loopback']);
  app.use(authMiddleware);
  app.use((_req, res) => res.json({ ok: true }));
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server!.once('listening', resolve));
  const port = (server.address() as { port: number }).port;
  return (token?: string, ip = '192.0.2.1') => fetch(`http://127.0.0.1:${port}/api/settings`, {
    headers: { ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }), 'X-Forwarded-For': ip },
  });
}

describe('Express lockout', () => {
  it('locks at 3 failures, rejects correct secrets while locked, then locks for 10 minutes', async () => {
    const request = await client();
    expect((await request('wrong')).status).toBe(403);
    expect((await request('wrong')).status).toBe(403);
    const locked = await request('wrong');
    expect(locked.status).toBe(429);
    expect(locked.headers.get('Retry-After')).toBe('300');
    expect(await locked.json()).toMatchObject({ error: { code: 'AUTH_LOCKED', retry_after: 300 } });
    now += 60_000;
    expect((await request(state.secret)).status).toBe(429);
    expect((await request('wrong')).headers.get('Retry-After')).toBe('240');
    now += 240_000;
    expect((await request('wrong')).headers.get('Retry-After')).toBe('600');
    now += 600_000;
    expect((await request(state.secret)).status).toBe(200);
    expect(db.prepare('SELECT COUNT(*) AS n FROM auth_lockouts').get()).toEqual({ n: 0 });
    expect((await request('wrong')).status).toBe(403);
  });

  it('does not count missing credentials and resets consecutive failures on success', async () => {
    const request = await client();
    for (let i = 0; i < 4; i++) expect((await request()).status).toBe(401);
    expect((await request('wrong')).status).toBe(403);
    expect((await request('wrong')).status).toBe(403);
    expect((await request(state.secret)).status).toBe(200);
    expect((await request('wrong')).status).toBe(403);
  });

  it('honors disable and missing-secret compatibility without database access', async () => {
    state.enabled = false;
    db.exec('DROP TABLE auth_lockouts');
    const request = await client();
    for (let i = 0; i < 4; i++) expect((await request('wrong')).status).toBe(403);
    expect((await request(state.secret)).status).toBe(200);
    state.secret = '';
    expect((await request()).status).toBe(200);
  });

  it('expires inactive records after 30 days', async () => {
    const request = await client();
    await request('wrong'); await request('wrong'); await request('wrong');
    now += retentionMs + 1;
    expect((await request('wrong')).status).toBe(403);
  });

  it('does not lose the threshold under concurrent failed requests', async () => {
    const request = await client();
    const responses = await Promise.all(Array.from({ length: 12 }, () => request('wrong')));
    expect(responses.filter(r => r.status === 403).length).toBeLessThanOrEqual(2);
    expect(responses.every(r => [403, 429].includes(r.status))).toBe(true);
    expect((await request(state.secret)).status).toBe(429);
    expect(db.prepare('SELECT failures FROM auth_lockouts').get()).toEqual({ failures: 3 });
  });
});

it('ignores forged forwarding headers by default', async () => {
  const request = await client();
  await request('wrong', '192.0.2.1'); await request('wrong', '192.0.2.2');
  expect((await request('wrong', '192.0.2.3')).status).toBe(429);
});

it('isolates trusted client IPs', async () => {
  const request = await client(true);
  await request('wrong'); await request('wrong'); await request('wrong');
  expect((await request(state.secret, '192.0.2.2')).status).toBe(200);
  expect((await request(state.secret)).status).toBe(429);
});

it('validates policy configuration', () => {
  expect(lockoutPolicy({})).toEqual({ enabled: true, attempts: 3, minutes: 5, repeatMinutes: 10 });
  expect(lockoutPolicy({ AUTH_LOCKOUT_ATTEMPTS: '1', AUTH_LOCKOUT_MINUTES: '2', AUTH_LOCKOUT_REPEAT_MINUTES: '4' })).toMatchObject({ attempts: 1, minutes: 2, repeatMinutes: 4 });
  for (const value of ['0', '-1', '1.5', 'NaN', '1001']) {
    expect(() => lockoutPolicy({ AUTH_LOCKOUT_ATTEMPTS: value })).toThrow();
  }
  expect(() => lockoutPolicy({ AUTH_LOCKOUT_ENABLED: 'yes' })).toThrow();
});

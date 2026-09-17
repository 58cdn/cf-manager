import { Hono } from 'hono';
import type { Env } from '../types';

const router = new Hono<{ Bindings: Env }>();
router.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  c.header('Referrer-Policy', 'no-referrer');
  await next();
});
router.get('/:key', async (c) => {
  if (c.req.method !== 'GET') return c.text('Method not allowed', 405);
  try {
    const expected = c.env.UNLOCK_KEY;
    if (!expected) return c.text('Invalid unlock key', 403);
    const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
    const [actualHash, expectedHash] = await Promise.all([digest(c.req.param('key')), digest(expected)]);
    let difference = 0;
    for (let i = 0; i < actualHash.length; i++) difference |= actualHash[i] ^ expectedHash[i];
    if (difference !== 0) return c.text('Invalid unlock key', 403);
    const ip = c.req.header('CF-Connecting-IP');
    if (!ip) return c.text('Client IP unavailable', 400);
    await c.env.DB.prepare('DELETE FROM auth_lockouts WHERE ip = ?').bind(ip).run();
    return c.redirect('/admin/', 303);
  } catch {
    // Do not log the request URL or underlying exception: the path contains the key.
    return c.text('Unlock unavailable', 503);
  }
});
router.all('*', c => c.text('Not found', 404));

export default router;

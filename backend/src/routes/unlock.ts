import { Router, type Request, type Response, type NextFunction } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { config } from '../config';
import { getDb } from '../db';

const router = Router();

// Mount before static files and authentication. Never pass a secret-bearing URL to loggers.
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
router.get('/:key', (req, res) => {
  if (req.method !== 'GET') { res.sendStatus(405); return; }
  try {
    const digest = (value: string) => createHash('sha256').update(value).digest();
    if (!config.unlockKey || !timingSafeEqual(digest(req.params.key as string), digest(config.unlockKey))) {
      res.status(403).send('Invalid unlock key');
      return;
    }
    const ip = req.ip || req.socket.remoteAddress;
    if (!ip) { res.status(400).send('Client IP unavailable'); return; }
    getDb().prepare('DELETE FROM auth_lockouts WHERE ip = ?').run(ip);
    res.redirect(303, '/');
  } catch {
    res.status(503).send('Unlock unavailable');
  }
});
router.use((_req, res) => { res.sendStatus(404); });
// Express decodes route parameters before entering the handler (malformed % escapes can fail).
router.use((_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  res.status(400).send('Invalid unlock request');
});

export default router;

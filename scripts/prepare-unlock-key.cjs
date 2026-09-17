const { randomBytes } = require('node:crypto');
const { appendFileSync } = require('node:fs');

// Deployment CI only. Never bake recovery credentials into frontend assets or Docker images.
function prepareUnlockKey(env, output = console.log) {
  if (!env.GITHUB_ENV) throw new Error('GITHUB_ENV is required');
  const supplied = env.UNLOCK_KEY || '';
  if (/[\r\n\0]/.test(supplied)) throw new Error('UNLOCK_KEY must be a single-line value');
  const key = supplied || randomBytes(32).toString('hex');
  // Explicit operator recovery output: generated values are printed once, then masked.
  if (!supplied) output(`Generated UNLOCK_KEY (save privately): ${key}`);
  const escaped = key.replace(/%/g, '%25');
  output(`::add-mask::${escaped}`);
  appendFileSync(env.GITHUB_ENV, `UNLOCK_KEY=${key}\n`, { encoding: 'utf8' });
}

module.exports = { prepareUnlockKey };
if (require.main === module) prepareUnlockKey(process.env);

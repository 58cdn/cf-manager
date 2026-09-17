import path from 'path';
import { lockoutPolicy } from './services/authLockout';

// Load .env from project root so encryption key stays stable across restarts
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: path.join(__dirname, '..', '..', '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  encryptionKey: process.env.ENCRYPTION_KEY || 'feiyu',
  apiSecret: process.env.API_SECRET || '',
  unlockKey: process.env.UNLOCK_KEY || '',
  authLockout: lockoutPolicy(process.env),
  authTrustedProxies: process.env.AUTH_TRUSTED_PROXIES || '',
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'cf-manager.db'),
  proxyUrl: process.env.PROXY_URL || '',
  demoAccountIds: process.env.DEMO_ACCOUNT_IDS || '',
  logDir: process.env.LOG_DIR || path.join(__dirname, '..', '..', 'data', 'logs'),
  workerDeployUrlAllowlist: process.env.WORKER_DEPLOY_URL_ALLOWLIST || '',
};

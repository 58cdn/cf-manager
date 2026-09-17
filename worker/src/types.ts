import type { LockoutEnv } from './services/authLockout';

export interface Env extends LockoutEnv {
  DB: D1Database;
  API_SECRET: string;
  UNLOCK_KEY?: string;
  ENCRYPTION_KEY: string;
  DEMO_ACCOUNT_IDS?: string;
  ASSETS: Fetcher;
  KV: KVNamespace;
}

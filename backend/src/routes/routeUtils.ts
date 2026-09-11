import { Request, Response, NextFunction } from 'express';
import { getAccountById, Account } from '../models/account';
import { config } from '../config';

export function getAccountOr404(req: Request, res: Response): Account | null {
  const account = getAccountById(parseInt(req.params.accountId as string, 10));
  if (!account) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Account not found' } });
    return null;
  }
  return account;
}

// 判断某个账户是否为演示（Demo）保护账户
export function isDemoAccountId(id: number): boolean {
  if (!config.demoAccountIds) return false;
  return config.demoAccountIds.split(',').map(s => parseInt(s.trim(), 10)).includes(id);
}

/**
 * 判断当前是否为演示（Demo）部署。
 * 约定：配置了 DEMO_ACCOUNT_IDS 即视为演示实例（对外只读展示）。
 * 用于禁用会把账户清单/凭证整体带出的功能（如 CSV 导出）。
 */
export function isDemoMode(): boolean {
  return !!config.demoAccountIds;
}

/**
 * 演示账户「只读」保护中间件。
 * 演示账户应保持只读：拦截除 GET/HEAD/OPTIONS 外的所有写操作（含 PUT/PATCH/POST/DELETE），
 * 命中即返回 403 DEMO_PROTECTED。
 * 例外：D1 查询接口（POST .../d1/:dbId/query）属于只读 SELECT，允许执行；其写 SQL（INSERT/UPDATE/DELETE 等）
 * 已在 storage 路由的 query handler 内单独拦截。
 */
export function demoDestructiveGuard(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  const path = req.path || '';
  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const isD1Query = method === 'POST' && /\/d1\/[^/]+\/query$/.test(path);
  const isDestructive = isWrite && !isD1Query;

  if (isDestructive) {
    const accountId = parseInt(req.params.accountId as string, 10);
    if (!isNaN(accountId) && isDemoAccountId(accountId)) {
      res.status(403).json({ error: { code: 'DEMO_PROTECTED', message: '演示账户不可被修改或删除' } });
      return;
    }
  }
  next();
}

// 判断某个账户是否为演示（Demo）保护账户
export function isDemoAccount(id: number, demoIds: string | undefined): boolean {
  if (!demoIds) return false;
  return demoIds.split(',').map(s => parseInt(s.trim(), 10)).includes(id);
}

/**
 * 判断当前是否为演示（Demo）部署。
 * 约定：配置了 DEMO_ACCOUNT_IDS 即视为演示实例（对外只读展示）。
 * 用于禁用会把账户清单/凭证整体带出的功能（如 CSV 导出）。
 */
export function isDemoMode(demoIds: string | undefined): boolean {
  return !!demoIds;
}

/**
 * Hono 中间件：演示账户「毁灭性操作」保护。
 * 拦截所有针对演示账户的销毁/删除类操作，返回 403 DEMO_PROTECTED：
 *  - 所有 DELETE 请求（删 KV 命名空间/键、删 D1 库、删 R2 桶/对象、删 Worker/Pages、删 Secret/Domain/Route 等）
 *  - 批量删除类 POST 请求（KV/R2 的 bulk-delete）
 * 注：D1 写查询（INSERT/UPDATE/DELETE/DROP/ALTER 等）在 storage 路由的 query handler 内单独拦截。
 */
export function demoDestructiveGuard() {
  return async (c: any, next: any) => {
    const method = c.req.method.toUpperCase();
    const path = c.req.path || '';
    // 演示账户只读：拦截除 GET/HEAD/OPTIONS 外的所有写操作（含 PUT/PATCH/POST/DELETE）。
    // 例外：D1 查询接口（POST .../d1/:dbId/query）属于只读 SELECT，允许执行（写 SQL 在该 handler 内单独拦截）。
    const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const isD1Query = method === 'POST' && /\/d1\/[^/]+\/query$/.test(path);
    const isDestructive = isWrite && !isD1Query;

    if (isDestructive) {
      const id = parseInt(c.req.param('accountId'), 10);
      if (!isNaN(id) && isDemoAccount(id, c.env.DEMO_ACCOUNT_IDS)) {
        return c.json({ error: { code: 'DEMO_PROTECTED', message: '演示账户不可被修改或删除' } }, 403);
      }
    }
    await next();
  };
}

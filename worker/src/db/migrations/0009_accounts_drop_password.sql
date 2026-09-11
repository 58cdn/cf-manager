-- 移除 accounts.password（登录密码）：该字段仅由早期 CSV 导入写入、界面从未提供填写入口，
-- 现已彻底废弃，CSV 导入/导出与凭证接口都不再包含它。
--
-- 同时删除了历史迁移 0002_accounts_password.sql（原来负责 ADD COLUMN password）：
--   * 已部署的库已在 _migrations 中记录 0002，删掉文件不影响它们，本迁移负责把列删掉；
--   * 全新库由 schema.sql 建表（已不含该列），不会重放 0002，本迁移命中「no such column」
--     被 migrate.mjs 视为幂等成功（仅对 DROP COLUMN 语句放宽，见该脚本注释）。
-- 两条路径的净效果一致：accounts 最终不含 password 列。
ALTER TABLE accounts DROP COLUMN password;

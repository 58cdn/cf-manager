#!/usr/bin/env bash
# Cloudflare REST API 认证辅助脚本 —— 供 .github/actions/deploy-cf/action.yml 的各步骤 source
#
# 设计背景：
#   Cloudflare 官方已把 Global API Key 的文档页标记为 "Get Global API key (legacy)"，
#   明确建议新集成改用 API Token。因此部署链路同时支持两种凭证，按环境变量自动择一：
#     1. CLOUDFLARE_API_TOKEN 非空 → Authorization: Bearer <token>（推荐）
#     2. 否则回退 CLOUDFLARE_GLOBAL_KEY + CLOUDFLARE_EMAIL → X-Auth-Key / X-Auth-Email（legacy）
#
# 用法：
#   source "${{ github.action_path }}/cf-auth.sh"
#   cf_auth_args || exit 1
#   curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/d1/database" \
#     "${CF_AUTH_ARGS[@]}"
#
# 约定：
#   - 本文件只做 source，不执行任何命令；不设置 -e，避免影响调用方脚本。
#   - 认证方式与 accounts 表的 auth_type 取值对齐：token / global_key
#     （schema.sql 的 CHECK 约束为 IN ('token','global_key')）。

# 解析认证方式：token 或 global_key
# token 有值即优先，保证即使同时存在 legacy 变量也走更安全的路径
cf_auth_type() {
  if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
    echo "token"
  else
    echo "global_key"
  fi
}

# 构建 curl 认证参数数组 CF_AUTH_ARGS
# 无任何凭证时返回非 0，调用方应立即退出，避免发出必然 401 的请求
cf_auth_args() {
  if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
    CF_AUTH_ARGS=(-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")
  elif [ -n "${CLOUDFLARE_GLOBAL_KEY:-}" ] && [ -n "${CLOUDFLARE_EMAIL:-}" ]; then
    CF_AUTH_ARGS=(-H "X-Auth-Email: $CLOUDFLARE_EMAIL" -H "X-Auth-Key: $CLOUDFLARE_GLOBAL_KEY")
  else
    echo "ERROR: 未提供任何 Cloudflare 凭证。" >&2
    echo "  请设置 CLOUDFLARE_API_TOKEN（推荐，API Token）" >&2
    echo "  或 CLOUDFLARE_GLOBAL_KEY + CLOUDFLARE_EMAIL（legacy）" >&2
    return 1
  fi
  return 0
}

# 解析 Cloudflare Account ID，两级回退：
#   1. CLOUDFLARE_ACCOUNT_ID —— 前序步骤已解析并写入 $GITHUB_ENV
#   2. wrangler whoami      —— 从输出中抓取 32 位十六进制
# 与改造前行为完全一致：部署不要求用户提供 Account ID，统一由脚本自行获取。
cf_resolve_account_id() {
  local id="${CLOUDFLARE_ACCOUNT_ID:-}"
  if [ -z "$id" ]; then
    id="$(wrangler whoami 2>/dev/null | grep -oE '[0-9a-f]{32}' | head -1 || echo "")"
  fi
  echo "$id"
}

# 校验 Account ID 格式（32 位十六进制），非空且格式错误时告警
# 用于 demo_mode 的 SQL 拼接前防御，避免把未转义的用户输入直接拼进 WHERE 子句
cf_assert_account_id() {
  local id="${1:-}"
  if [ -z "$id" ]; then
    return 1
  fi
  if ! printf '%s' "$id" | grep -qE '^[0-9a-fA-F]{32}$'; then
    echo "ERROR: Cloudflare Account ID 格式非法（应为 32 位十六进制）: $id" >&2
    return 1
  fi
  return 0
}
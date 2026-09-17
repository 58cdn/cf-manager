<template>
  <div class="dashboard-page">
    <n-space align="center" justify="space-between" style="width: 100%" :wrap="true">
      <n-space align="center">
        <n-h2 style="margin: 0">{{ t('dashboard.title') }}</n-h2>
        <n-tag size="small" type="info">{{ t('dashboard.todayQuota') }}</n-tag>
      </n-space>
      <n-space align="center">
        <n-select
          v-model:value="sortBy"
          :options="sortOptions"
          style="width: 160px"
        />
        <n-input
          v-model:value="searchQuery"
          :placeholder="t('dashboard.searchAccounts')"
          clearable
          style="width: 200px"
        />
        <n-button
          secondary
          type="primary"
          :loading="quotaStore.syncing"
          @click="quotaStore.fetchQuota(true)"
        >
          {{ quotaStore.syncing ? t('dashboard.syncingQuota') : t('dashboard.syncQuota') }}
        </n-button>
      </n-space>
    </n-space>

    <div v-if="uiTheme === 'verdant'" class="dashboard-stats">
      <div v-for="stat in summaryStats" :key="stat.label" class="stat-block">
        <div class="stat-label"><n-icon :component="stat.icon" :size="18" />{{ stat.label }}</div>
        <strong class="stat-value">{{ stat.value }}</strong>
        <p v-if="stat.exhausted" class="stat-alert">{{ t('appearance.exhaustedAccounts', { count: stat.exhausted }) }}</p>
      </div>
    </div>
    <n-space v-if="uiTheme === 'default' && globalStats.totalAccounts > 0" style="margin: 12px 0; flex-shrink: 0" :wrap="true">
      <n-tag>{{ globalStats.totalAccounts }} {{ t('dashboard.accounts') }}</n-tag>
      <n-tag v-if="globalStats.aiExhausted > 0" type="error">🤖 {{ globalStats.aiExhausted }}</n-tag>
      <n-tag v-if="globalStats.browserExhausted > 0" type="error">🖥️ {{ globalStats.browserExhausted }}</n-tag>
      <n-tag type="info">
        AI {{ formatCompact(globalStats.aiNeuronsTotal) }} · W {{ formatCompact(globalStats.workersRequestsTotal) }} · R {{ formatCompact(globalStats.browserRenderTotal) }}s
      </n-tag>
    </n-space>




      <n-spin :show="quotaStore.loading" style="flex-shrink: 0; width: 100%">
      <div class="card-grid-scroll" style="width: 100%" :style="{ maxHeight: isMobile ? '150px' : '200px' }">

        <n-grid
          v-if="quotaWithResources.length > 0"
          cols="1 s:2 m:5 l:6 xl:8"
          :x-gap="8"
          :y-gap="8"
          responsive="screen"
          style="width: 100%"
        >
        <n-gi v-for="acct in quotaWithResources" :key="acct.accountId">
          <CompactAccountCard :account-name="acct.accountName" :resources="acct.resources" />
        </n-gi>
      </n-grid>
      </div>
      <n-empty v-if="!quotaStore.loading && quotaWithResources.length === 0" :description="t('dashboard.noAccountData')" />
    </n-spin>

    <n-h3 style="margin: 0; flex-shrink: 0">{{ t('dashboard.recentLogs') }}</n-h3>
    <n-space style="flex-shrink: 0" :wrap="true" align="center" :size="8">
      <n-select
        v-model:value="logFilter.action"
        :options="actionOptions"
        :placeholder="t('dashboard.actionType')"
        clearable
        filterable
        size="small"
        style="width: 160px"
      />
      <n-date-picker
        v-model:value="logFilter.startDate"
        type="date"
        value-format="yyyy-MM-dd"
        :placeholder="t('dashboard.startDate')"
        clearable
        size="small"
        style="width: 140px"
      />
      <n-date-picker
        v-model:value="logFilter.endDate"
        type="date"
        value-format="yyyy-MM-dd"
        :placeholder="t('dashboard.endDate')"
        clearable
        size="small"
        style="width: 140px"
      />
      <n-button size="small" type="primary" :loading="loadingLogs" @click="fetchLogs">{{ t('dashboard.query') }}</n-button>
    </n-space>
    <div class="log-table-wrapper" style="flex: 1; min-height: 0; overflow: auto">

        <n-data-table
        :columns="logColumns"
        :data="auditLogs"
        :loading="loadingLogs"
        size="small"
        :bordered="false"
        :scroll-x="scrollX"
        :flex-height="true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuotaStore } from '../stores/quotaStore';
import apiClient from '../api/client';
import type { DataTableColumns } from 'naive-ui';
import { formatCN, formatCNShort } from '../utils/dateFormat';
import CompactAccountCard from '../components/CompactAccountCard.vue';
import { PeopleOutline, SparklesOutline, ConstructOutline, TimeOutline } from '@vicons/ionicons5';
import { useUiTheme } from '../composables/useUiTheme';

const { t } = useI18n();
const { uiTheme } = useUiTheme();
const summaryStats = computed(() => [
  { label: t('dashboard.accounts'), value: globalStats.value.totalAccounts, icon: PeopleOutline },
  { label: t('compactCard.aiNeurons'), value: formatCompact(globalStats.value.aiNeuronsTotal), icon: SparklesOutline, exhausted: globalStats.value.aiExhausted },
  { label: t('compactCard.workersRequests'), value: formatCompact(globalStats.value.workersRequestsTotal), icon: ConstructOutline },
  { label: t('compactCard.browserRender'), value: `${formatCompact(globalStats.value.browserRenderTotal)}s`, icon: TimeOutline, exhausted: globalStats.value.browserExhausted },
]);

const quotaStore = useQuotaStore();
const searchQuery = ref('');
const sortBy = ref('name');
const windowWidth = ref(window.innerWidth);

function onResize() {
  windowWidth.value = window.innerWidth;
}

const sortOptions = computed(() => [
  { label: t('dashboard.sortNameAsc'), value: 'name' },
  { label: t('dashboard.sortNameDesc'), value: 'name-desc' },
  { label: t('dashboard.sortUsageDesc'), value: 'usage-desc' },
  { label: t('dashboard.sortUsageAsc'), value: 'usage-asc' },
]);

function getMaxUsage(account: any) {
  return Math.max(
    0,
    ...account.resources.map((r: any) => {
      if (!r.limit) return 0;
      return Math.min(100, Math.round(((r.count || 0) / r.limit) * 100));
    }),
  );
}

const quotaWithResources = computed(() => {
  let accounts = quotaStore.quota.filter(
    (acct: any) => acct.resources && acct.resources.length > 0,
  );

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    accounts = accounts.filter((acct: any) =>
      acct.accountName.toLowerCase().includes(query),
    );
  }

  accounts = [...accounts].sort((a: any, b: any) => {
    switch (sortBy.value) {
      case 'name':
        return a.accountName.localeCompare(b.accountName);
      case 'name-desc':
        return b.accountName.localeCompare(a.accountName);
      case 'usage-desc':
        return getMaxUsage(b) - getMaxUsage(a);
      case 'usage-asc':
        return getMaxUsage(a) - getMaxUsage(b);
      default:
        return 0;
    }
  });

  return accounts;
});

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return n.toString();
}

const globalStats = computed(() => {
  const accounts = quotaStore.quota.filter(
    (acct: any) => acct.resources && acct.resources.length > 0,
  );
  const totalAccounts = accounts.length;

  const aiExhausted = accounts.filter((acct: any) =>
    acct.resources.some((r: any) => r.resource === 'ai_neurons' && r.exhausted),
  ).length;

  const browserExhausted = accounts.filter((acct: any) =>
    acct.resources.some((r: any) => r.resource === 'browser_render_seconds' && r.exhausted),
  ).length;

  const aiNeuronsTotal = accounts.reduce((sum: number, acct: any) => {
    const aiResource = acct.resources.find(
      (r: any) => r.resource === 'ai_neurons',
    );
    return sum + (aiResource?.count || 0);
  }, 0);

  const workersRequestsTotal = accounts.reduce((sum: number, acct: any) => {
    const w = acct.resources.find(
      (r: any) => r.resource === 'workers_requests',
    );
    return sum + (w?.count || 0);
  }, 0);

  const browserRenderTotal = accounts.reduce((sum: number, acct: any) => {
    const r = acct.resources.find(
      (r: any) => r.resource === 'browser_render_seconds',
    );
    return sum + (r?.count || 0);
  }, 0);

  return { totalAccounts, aiExhausted, browserExhausted, aiNeuronsTotal, workersRequestsTotal, browserRenderTotal };
});

const auditLogs = ref<any[]>([]);
const loadingLogs = ref(false);
const ACTION_KEYS = [
  'ai_chat_completion', 'browser_render', 'create_account', 'import_account',
  'delete_account', 'update_features', 'test_account', 'view_credentials',
  'clear_exhausted', 'create_dns', 'update_dns', 'delete_dns',
  'deploy_worker', 'delete_worker', 'deploy_pages', 'delete_pages',
  'batch_deploy', 'batch_deploy_pages', 'env_sync', 'kv_write',
  'task_create', 'task_delete', 'task_run',
];
const actionOptions = computed(() => ACTION_KEYS.map(k => ({ label: t(`dashboard.actions.${k}`), value: k })));
function actionLabel(action: string): string {
  return ACTION_KEYS.includes(action) ? t(`dashboard.actions.${action}`) : action;
}
function statusLabel(status: string): string {
  if (status === 'success') return t('dashboard.statusSuccess');
  if (status === 'error') return t('dashboard.statusError');
  return status;
}
const logFilter = reactive<{ action: string | null; startDate: number | null; endDate: number | null }>({
  action: null,
  startDate: null,
  endDate: null,
});

async function fetchLogs() {
  loadingLogs.value = true;
  try {
    const params: Record<string, string> = {};
    if (logFilter.action) params.action = logFilter.action;
    if (logFilter.startDate) params.startDate = toDateStr(logFilter.startDate);
    if (logFilter.endDate) params.endDate = toDateStr(logFilter.endDate);
    const { data } = await apiClient.get('/audit-log', { params });
    auditLogs.value = data;
  } catch {
    auditLogs.value = [];
  } finally {
    loadingLogs.value = false;
  }
}

function toDateStr(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const isMobile = computed(() => windowWidth.value < 640);

const logColumns = computed<DataTableColumns<any>>(() => {
  if (isMobile.value) {
    return [
      { title: t('dashboard.time'), key: 'created_at', width: 70, render: (row) => formatCNShort(row.created_at) },
      { title: t('dashboard.account'), key: 'account_name', width: 65, render: (row) => row.account_name || '-' },
      { title: t('dashboard.action'), key: 'action', width: 60, render: (row) => actionLabel(row.action) },
      { title: t('dashboard.target'), key: 'target', width: 85, ellipsis: { tooltip: true } },
      { title: t('dashboard.detail'), key: 'detail', width: 70, minWidth: 60, ellipsis: { tooltip: true } },
      { title: t('dashboard.status'), key: 'status', width: 45, render: (row) => statusLabel(row.status) },
    ];
  }
  return [
    { title: t('dashboard.time'), key: 'created_at', width: 150, render: (row) => formatCN(row.created_at) },
    { title: t('dashboard.account'), key: 'account_name', width: 120, render: (row) => row.account_name || '-' },
    { title: t('dashboard.action'), key: 'action', width: 150, render: (row) => actionLabel(row.action) },
    { title: t('dashboard.target'), key: 'target', width: 150, ellipsis: { tooltip: true } },
    { title: t('dashboard.detail'), key: 'detail', width: 180, minWidth: 120, ellipsis: { tooltip: true } },
    { title: t('dashboard.status'), key: 'status', width: 80, render: (row) => statusLabel(row.status) },
  ];
});

const scrollX = computed(() => {
  const colWidths = isMobile.value ? [70, 65, 60, 85, 70, 45] : [180, 120, 150, 150, 160, 80];
  return colWidths.reduce((a, b) => a + b, 0);
});



onMounted(async () => {
  window.addEventListener('resize', onResize);
  quotaStore.fetchQuota();
  await fetchLogs();
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.log-table-wrapper {
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  flex: 1;
  min-height: 0;
}

.card-grid-scroll {
  max-height: 200px;
  overflow-y: auto;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
}

:global(.n-data-table) {
  height: 100% !important;
}

:global(.n-tooltip) {
  max-width: 400px !important;
  word-break: break-all;
}

</style>

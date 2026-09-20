<template>
  <div class="theme-control">
    <label class="theme-label">
      <span class="sr-only">{{ t('appearance.theme') }}</span>
      <select
        :value="uiTheme"
        :aria-label="t('appearance.theme')"
        @change="onChange"
      >
        <option value="default">{{ t('appearance.default') }}</option>
        <option value="verdant">{{ t('appearance.verdant') }}</option>
      </select>
    </label>
    <span
      v-if="storageUnavailable"
      class="storage-warning"
      role="status"
      :title="t('appearance.storageUnavailable')"
    >{{ t('appearance.sessionOnly') }}</span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useUiTheme } from '../composables/useUiTheme';
const { t } = useI18n();
const { uiTheme, setUiTheme, storageUnavailable } = useUiTheme();
function onChange(event: Event) { setUiTheme((event.target as HTMLSelectElement).value); }
</script>

<style scoped>
.theme-control { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.theme-label select { font: inherit; font-size: 13px; max-width: 148px; height: 32px; padding: 0 8px; border: 1px solid var(--app-border); border-radius: 6px; color: var(--app-text-primary); background: var(--app-bg-card); cursor: pointer; color-scheme: light; }
:global(.app-dark) .theme-label select { color-scheme: dark; }
.theme-label select:focus-visible { outline: 2px solid var(--ui-primary, #18a058); outline-offset: 2px; }
.storage-warning { font-size: 11px; color: var(--app-text-secondary); max-width: 140px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>

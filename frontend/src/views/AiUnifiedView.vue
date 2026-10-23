<template>
  <div class="ai-unified-root">
    <n-tabs
      v-model:value="activeTab"
      type="line"
      animated
      size="large"
      @update:value="onTabChange"
      class="ai-unified-tabs"
    >
      <n-tab-pane name="stats" :tab="t('aiTabs.stats')" display-directive="show:lazy">
        <AiStatsView />
      </n-tab-pane>
      <n-tab-pane name="chat" :tab="t('aiTabs.chat')" display-directive="show:lazy">
        <AiChatView />
      </n-tab-pane>
      <n-tab-pane name="image" :tab="t('aiTabs.image')" display-directive="show:lazy">
        <AiImageView />
      </n-tab-pane>
      <n-tab-pane name="audio" :tab="t('aiTabs.audio')" display-directive="show:lazy">
        <AiAudioView />
      </n-tab-pane>
      <n-tab-pane name="translate" :tab="t('aiTabs.translate')" display-directive="show:lazy">
        <AiTranslateView />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AiStatsView from './AiStatsView.vue';
import AiChatView from './AiChatView.vue';
import AiImageView from './AiImageView.vue';
import AiAudioView from './AiAudioView.vue';
import AiTranslateView from './AiTranslateView.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const activeTab = ref('stats');

const validTabs = ['stats', 'chat', 'image', 'audio', 'translate'];

// 从 URL query 读取初始 tab
onMounted(() => {
  const tab = route.query.tab as string;
  if (tab && validTabs.includes(tab)) {
    activeTab.value = tab;
  }
});

// 监听路由 query 变化（如浏览器前进/后退）
watch(() => route.query.tab, (newTab) => {
  if (newTab && typeof newTab === 'string' && validTabs.includes(newTab)) {
    activeTab.value = newTab;
  }
});

function onTabChange(tab: string) {
  // 更新 URL query 但不触发导航
  router.replace({ query: { ...route.query, tab } });
}
</script>

<style scoped>
.ai-unified-root {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-unified-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-unified-tabs :deep(.n-tabs-pane-wrapper) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-unified-tabs :deep(.n-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.ai-unified-tabs :deep(.n-tabs-nav) {
  padding: 0 16px;
  border-bottom: 1px solid var(--app-border-input);
}
</style>

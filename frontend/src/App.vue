<template>
  <n-config-provider v-bind="uiConfig">
    <n-dialog-provider>
      <n-message-provider>
        <n-notification-provider>
          <n-loading-bar-provider>
            <!-- 初始加载 -->
            <div v-if="authChecking" style="display: flex; justify-content: center; align-items: center; height: 100vh">
              <n-spin size="large" />
            </div>

            <!-- 登录界面 -->
            <div v-else-if="showLogin" class="login-page" style="display: flex; justify-content: center; align-items: center; height: 100vh; padding: 16px">
              <div class="login-preferences">
                <ThemeSelector />
                <n-button quaternary circle :aria-label="t(isDark ? 'appearance.light' : 'appearance.dark')" @click="toggleTheme"><template #icon><n-icon :component="isDark ? SunnyOutline : MoonOutline" /></template></n-button>
                <n-dropdown trigger="click" :options="languageOptions" @select="handleLanguageChange"><n-button quaternary circle :aria-label="t('appearance.language')"><template #icon><n-icon :component="LanguageOutline" /></template></n-button></n-dropdown>
              </div>
              <div v-if="uiTheme === 'verdant'" class="login-brand">
                <div class="brand-mark"><n-icon :component="GlobeOutline" :size="28" /></div>
                <span class="brand-eyebrow">CF MANAGER</span>
                <h1>{{ t('appearance.loginHeading') }}</h1>
                <p>{{ t('appearance.loginDescription') }}</p>
              </div>
              <n-card :title="t('app.title')" style="width: 400px; max-width: 100%">
                <n-form @submit.prevent="handleLogin">
                  <n-form-item :label="t('app.apiSecret')">
                    <n-input v-model:value="loginSecret" type="password" :placeholder="t('app.enterApiSecret')" show-password-on="click" @keyup.enter="handleLogin" />
                  </n-form-item>
                  <n-button type="primary" block :loading="loginLoading" @click="handleLogin">{{ t('app.login') }}</n-button>
                </n-form>
              </n-card>
            </div>

            <!-- Desktop Layout -->
            <n-layout v-else-if="!isMobile" has-sider class="desktop-layout" style="height: 100vh">
              <n-layout-sider bordered :width="uiTheme === 'verdant' ? 232 : 220" :collapsed-width="64" collapse-mode="width" :collapsed="collapsed">
                <div class="sidebar-brand" style="padding: 16px; text-align: center; font-weight: bold; font-size: 18px">
                  {{ collapsed ? 'CF' : 'CF Manager' }}
                </div>
                <n-menu v-model:value="activeMenuKey" :options="menuOptions" :collapsed="collapsed" @update:value="handleMenuClick" />
              </n-layout-sider>
              <n-layout class="workspace-layout">
                <n-layout-header class="workspace-header" bordered style="height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px">
                  <n-button quaternary circle :aria-label="t('appearance.toggleSidebar')" :aria-expanded="!collapsed" @click="collapsed = !collapsed">
                    <template #icon><n-icon :component="MenuOutline" /></template>
                  </n-button>
                  <span v-if="uiTheme === 'verdant'" class="current-section">{{ navItems.find(item => item.key === activeMenuKey)?.label }}</span>
                  <n-space>
                    <ThemeSelector />
                    <n-dropdown trigger="click" :options="languageOptions" @select="handleLanguageChange">
                      <n-button quaternary circle :aria-label="t('appearance.language')">
                        <template #icon><n-icon :component="LanguageOutline" /></template>
                      </n-button>
                    </n-dropdown>
                    <n-button quaternary circle :aria-label="t(isDark ? 'appearance.light' : 'appearance.dark')" @click="toggleTheme">
                      <template #icon><n-icon :component="isDark ? SunnyOutline : MoonOutline" /></template>
                    </n-button>
                    <n-button v-if="isAuthenticated" quaternary size="small" @click="handleLogout">{{ t('app.logout') }}</n-button>
                  </n-space>
                </n-layout-header>
                <n-layout-content class="workspace-content" content-style="padding: 24px; height: 100%; box-sizing: border-box;" style="height: calc(100vh - 48px - 32px); overflow-y: auto">
                  <router-view />
                </n-layout-content>
                <n-layout-footer bordered style="height: 32px; display: flex; align-items: center; justify-content: flex-end; padding: 0 16px; font-size: 12px; color: #999">
                  <span v-if="appVersion">CF Manager v{{ appVersion }}<template v-if="appCommit"> · {{ appCommit }}</template></span>
                </n-layout-footer>
              </n-layout>
            </n-layout>

            <!-- Mobile Layout -->
            <div v-else class="mobile-layout">
              <div class="mobile-content">
                <router-view />
                <div class="app-footer" v-if="appVersion">CF Manager v{{ appVersion }}<template v-if="appCommit"> · {{ appCommit }}</template></div>
              </div>

              <!-- FAB Overlay -->
              <transition name="fab-overlay">
                <div v-if="fabOpen" class="fab-overlay" @click="closeNavigation" />
              </transition>

              <!-- FAB Panel -->
              <transition name="fab-panel">
                <div v-if="fabOpen" id="mobile-navigation" ref="navigationPanel" role="dialog" aria-modal="true" :aria-label="t('appearance.navigation')" class="fab-panel" :class="{ 'fab-panel--dark': isDark }" @keydown="onNavigationKeydown">
                  <div class="fab-panel-header">
                    <span class="fab-panel-title">CF Manager</span>
                    <div class="fab-panel-actions">
                      <n-dropdown trigger="click" :options="languageOptions" placement="bottom-end" @select="handleLanguageChange">
                        <n-button circle size="small" quaternary :aria-label="t('appearance.language')">
                          <template #icon><n-icon :component="LanguageOutline" :size="16" /></template>
                        </n-button>
                      </n-dropdown>
                      <n-button circle size="small" quaternary :aria-label="t(isDark ? 'appearance.light' : 'appearance.dark')" @click="toggleTheme">
                        <template #icon><n-icon :component="isDark ? SunnyOutline : MoonOutline" :size="16" /></template>
                      </n-button>
                      <n-button circle size="small" quaternary type="error" :aria-label="t('app.logout')" @click="handleLogout">
                        <template #icon><n-icon :component="LogOutOutline" :size="16" /></template>
                      </n-button>
                    </div>
                  </div>
                  <div class="mobile-theme-row"><ThemeSelector /><n-button quaternary size="small" @click="closeNavigation">{{ t('common.close') }}</n-button></div>
                  <div class="fab-panel-body">
                    <div class="fab-grid">
                      <button
                        v-for="item in navItems"
                        :key="item.key"
                        class="fab-item"
                        type="button"
                        :aria-current="activeMenuKey === item.key ? 'page' : undefined"
                        :class="{ 'fab-item--active': activeMenuKey === item.key }"
                        @click="handleMenuClick(item.key); closeNavigation()"
                      >
                        <n-icon :component="item.iconComponent" :size="22" />
                        <span class="fab-item-label">{{ item.label }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </transition>

              <!-- FAB Button -->
              <button
                ref="navigationTrigger"
                type="button"
                :aria-label="t(fabOpen ? 'common.close' : 'appearance.navigation')"
                :aria-expanded="fabOpen"
                aria-controls="mobile-navigation"
                class="fab-btn"
                :class="{ 'fab-btn--open': fabOpen, 'fab-btn--dragging': fabDragging, 'fab-btn--dark': isDark }"
                :style="fabStyle"
                @click.prevent="onFabClick"
                @touchstart.passive="onFabTouchStart"
                @touchmove.prevent="onFabTouchMove"
                @touchend.passive="onFabTouchEnd"
              >
                <n-icon :component="fabOpen ? CloseOutline : GridOutline" :size="24" />
              </button>
            </div>
          </n-loading-bar-provider>
        </n-notification-provider>
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, reactive, computed, h, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { Component } from 'vue';
import { NIcon } from 'naive-ui';
import {
  SpeedometerOutline, PeopleOutline, GlobeOutline, ConstructOutline,
  SparklesOutline, ImageOutline, SettingsOutline,
  MenuOutline, SunnyOutline, MoonOutline, ServerOutline,
  CloseOutline, GridOutline, LogOutOutline, StorefrontOutline,
  GitBranchOutline, LanguageOutline,
} from '@vicons/ionicons5';
import apiClient from './api/client';
import { message as globalMessage } from './utils/discreteApi';
import { uiConfig, useUiTheme } from './composables/useUiTheme';
import ThemeSelector from './components/ThemeSelector.vue';
import { saveLocale, type Locale } from './i18n';

const { t, locale } = useI18n();
const router = useRouter();
const route = useRoute();
const collapsed = ref(false);
const { uiTheme, isDark, toggleDark: toggleTheme } = useUiTheme();
const activeMenuKey = ref(route.name as string);

// Language options
const languageOptions = computed(() => [
  { label: '中文', key: 'zh-CN' },
  { label: 'English', key: 'en' },
]);

function handleLanguageChange(key: string) {
  locale.value = key;
  saveLocale(key as Locale);
}

const isAuthenticated = ref(false);
try { isAuthenticated.value = !!localStorage.getItem('api_token'); } catch { /* Login remains accessible when browser storage is disabled. */ }
const showLogin = ref(false);
const authChecking = ref(true);
const loginSecret = ref('');
const loginLoading = ref(false);
const appVersion = ref('');
const appCommit = ref('');

function applyVersion(data: any) {
  appVersion.value = data?.version || '';
  appCommit.value = data?.git_commit || '';
}

const isMobile = ref(window.innerWidth <= 768);
const fabOpen = ref(false);
const navigationTrigger = ref<HTMLButtonElement>();
const navigationPanel = ref<HTMLDivElement>();
watch(fabOpen, async (open) => {
  if (open) { await nextTick(); navigationPanel.value?.querySelector<HTMLElement>('button, select')?.focus(); }
});
function closeNavigation() { fabOpen.value = false; navigationTrigger.value?.focus(); }
function onNavigationKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); closeNavigation(); }
  if (event.key !== 'Tab') return;
  const items = navigationPanel.value?.querySelectorAll<HTMLElement>('button:not([disabled]), select');
  if (!items?.length) return;
  const first = items[0]!; const last = items[items.length - 1]!;
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
const fabDragging = ref(false);
const fabPos = reactive({ x: -1, y: -1 });
let dragStartX = 0, dragStartY = 0, dragStartPosX = 0, dragStartPosY = 0;
let dragMoved = false;

const fabStyle = computed(() => {
  if (fabPos.x < 0) return {};
  return { right: 'auto', bottom: 'auto', left: fabPos.x + 'px', top: fabPos.y + 'px' };
});

const navItems = computed(() => [
  { label: t('nav.dashboard'), key: 'dashboard', iconComponent: SpeedometerOutline },
  { label: t('nav.accounts'), key: 'accounts', iconComponent: PeopleOutline },
  { label: t('nav.dns'), key: 'dns', iconComponent: GlobeOutline },
  { label: t('nav.workers'), key: 'workers', iconComponent: ConstructOutline },
  { label: t('nav.storage'), key: 'storage', iconComponent: ServerOutline },
{ label: t('nav.ai'), key: 'ai', iconComponent: SparklesOutline },
  { label: t('nav.render'), key: 'browser-render', iconComponent: ImageOutline },
  { label: t('nav.store'), key: 'store', iconComponent: StorefrontOutline },
  { label: t('nav.tunnels'), key: 'tunnels', iconComponent: GitBranchOutline },
  { label: t('nav.settings'), key: 'settings', iconComponent: SettingsOutline },
]);

function initFabPos() {
  if (fabPos.x < 0) {
    fabPos.x = window.innerWidth - 72;
    fabPos.y = window.innerHeight - 72;
  }
}

function clampFab() {
  fabPos.x = Math.max(8, Math.min(window.innerWidth - 64, fabPos.x));
  fabPos.y = Math.max(8, Math.min(window.innerHeight - 64, fabPos.y));
}

function snapToEdge() {
  const center = fabPos.x + 28;
  fabPos.x = center < window.innerWidth / 2 ? 12 : window.innerWidth - 68;
}

function onFabClick() {
  if (dragMoved) return;
  fabOpen.value = !fabOpen.value;
}

function onFabTouchStart(e: TouchEvent) {
  const t = e.touches[0];
  dragStartX = t.clientX; dragStartY = t.clientY;
  dragStartPosX = fabPos.x; dragStartPosY = fabPos.y;
  dragMoved = false;
  fabDragging.value = true;
}

function onFabTouchMove(e: TouchEvent) {
  if (!fabDragging.value) return;
  const t = e.touches[0];
  const dx = t.clientX - dragStartX, dy = t.clientY - dragStartY;
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragMoved = true;
  fabPos.x = dragStartPosX + dx;
  fabPos.y = dragStartPosY + dy;
  clampFab();
}

function onFabTouchEnd() {
  fabDragging.value = false;
  clampFab();
  snapToEdge();
}

function onResize() {
  isMobile.value = window.innerWidth <= 768;
  if (isMobile.value && fabPos.x >= 0) clampFab();
}

function onAuthExpired() {
  isAuthenticated.value = false;
  showLogin.value = true;
}

onMounted(async () => {
  initFabPos();
  window.addEventListener('resize', onResize);
  window.addEventListener('auth-expired', onAuthExpired);
  try {
    const resp: any = await apiClient.get('/settings', { _silent: true });
    applyVersion(resp.data);
    showLogin.value = false;
  } catch (err: any) {
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      showLogin.value = true;
    }
  } finally {
    authChecking.value = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  window.removeEventListener('auth-expired', onAuthExpired);
});

async function handleLogin() {
  if (!loginSecret.value) return;
  loginLoading.value = true;
  try {
    localStorage.setItem('api_token', loginSecret.value);
    const resp: any = await apiClient.get('/settings', { _silent: true });
    applyVersion(resp.data);
    isAuthenticated.value = true;
    showLogin.value = false;
  } catch {
    try { localStorage.removeItem('api_token'); } catch { /* No stored session to clear. */ }
    isAuthenticated.value = false;
    globalMessage.error(t('app.invalidApiSecret'));
  } finally {
    loginLoading.value = false;
  }
}

function handleLogout() {
  try { localStorage.removeItem('api_token'); } catch { /* No stored session to clear. */ }
  fabOpen.value = false;
  isAuthenticated.value = false;
  showLogin.value = true;
  loginSecret.value = '';
}

watch(() => route.name, (newName) => {
  if (newName) activeMenuKey.value = newName as string;
});

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) });
}

const menuOptions = computed(() => [
  { label: t('menu.dashboard'), key: 'dashboard', icon: renderIcon(SpeedometerOutline) },
  { label: t('menu.accounts'), key: 'accounts', icon: renderIcon(PeopleOutline) },
  { label: t('menu.dns'), key: 'dns', icon: renderIcon(GlobeOutline) },
  { label: t('menu.workers'), key: 'workers', icon: renderIcon(ConstructOutline) },
  { label: t('menu.storage'), key: 'storage', icon: renderIcon(ServerOutline) },
  { label: t('menu.tunnels'), key: 'tunnels', icon: renderIcon(GitBranchOutline) },
  { label: t('menu.ai'), key: 'ai', icon: renderIcon(SparklesOutline) },
  { label: t('menu.browserRender'), key: 'browser-render', icon: renderIcon(ImageOutline) },
  { label: t('menu.store'), key: 'store', icon: renderIcon(StorefrontOutline) },
  { label: t('menu.settings'), key: 'settings', icon: renderIcon(SettingsOutline) },
]);

function handleMenuClick(key: string) {
  router.push({ name: key }).catch(() => {});
}

</script>

<style scoped>
.login-preferences { position: absolute; top: 16px; right: 16px; display: flex; align-items: center; gap: 8px; }
.mobile-theme-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; }
.fab-item { border: 0; background: transparent; color: inherit; font: inherit; }
.fab-btn { padding: 0; border: 0; font: inherit; }
.fab-item:focus-visible, .fab-btn:focus-visible { outline: 2px solid var(--ui-primary, #18a058); outline-offset: 2px; }
/* Mobile Layout */
.mobile-layout {
  height: 100vh;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  display: flex;
  flex-direction: column;
  background-color: var(--app-bg);
  color: var(--app-text-primary);
  transition: background-color 0.2s ease, color 0.2s ease;
}
.mobile-layout::-webkit-scrollbar {
  display: none;
}

.mobile-content {
  flex: 1;
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.app-footer {
  margin-top: auto;
  padding: 12px 4px 4px;
  text-align: center;
  font-size: 12px;
  color: var(--app-text-muted);
}

.page-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

/* FAB Button */
.fab-btn {
  position: fixed;
  bottom: 20px;
  right: 16px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #18a058;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1100;
  box-shadow: 0 4px 16px rgba(24, 160, 88, 0.4);
  transition: transform 0.2s ease, background 0.2s, box-shadow 0.2s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.fab-btn:active { transform: scale(0.92); }
.fab-btn--dragging { transition: none !important; transform: scale(1.08); opacity: 0.85; }

.fab-btn--open {
  background: #fff;
  color: #333;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.fab-btn--open.fab-btn--dark {
  background: #2c2c32;
  color: #e0e0e0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

/* FAB Overlay */
.fab-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1090;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* FAB Panel */
.fab-panel {
  position: fixed;
  bottom: 88px;
  right: 16px;
  width: calc(100vw - 32px);
  max-width: 360px;
  max-height: 70vh;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(230, 230, 230, 0.8);
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  z-index: 1095;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.fab-panel--dark {
  background: rgba(36, 36, 40, 0.95);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.fab-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(230, 230, 230, 0.6);
  flex-shrink: 0;
}

.fab-panel--dark .fab-panel-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.fab-panel-title {
  font-size: 0.95rem;
  font-weight: 600;
}

.fab-panel-actions {
  display: flex;
  gap: 4px;
}

.fab-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

/* FAB Grid */
.fab-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.fab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 6px;
  border-radius: 14px;
  cursor: pointer;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.fab-item:active {
  transform: scale(0.95);
}

.fab-item:hover {
  background: rgba(24, 160, 88, 0.06);
}

.fab-item--active {
  background: rgba(24, 160, 88, 0.12);
  color: #18a058;
}

.fab-panel--dark .fab-item:hover {
  background: rgba(24, 160, 88, 0.12);
}

.fab-panel--dark .fab-item--active {
  background: rgba(24, 160, 88, 0.2);
}

.fab-item-label {
  font-size: 0.7rem;
  font-weight: 500;
  white-space: nowrap;
}

/* Transitions */
.fab-overlay-enter-active,
.fab-overlay-leave-active {
  transition: opacity 0.2s ease;
}
.fab-overlay-enter-from,
.fab-overlay-leave-to {
  opacity: 0;
}

.fab-panel-enter-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}
.fab-panel-leave-active {
  transition: transform 0.2s ease, opacity 0.15s ease;
}
.fab-panel-enter-from {
  transform: translateY(20px) scale(0.95);
  opacity: 0;
}
.fab-panel-leave-to {
  transform: translateY(10px) scale(0.97);
  opacity: 0;
}
</style>

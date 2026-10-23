<template>
  <n-popover trigger="click" placement="bottom-end" :width="310" raw>
    <template #trigger>
      <slot>
        <n-button quaternary circle :title="t('theme.theme')">
          <template #icon>
            <n-icon :component="ColorPaletteOutline" />
          </template>
        </n-button>
      </slot>
    </template>

    <div class="theme-panel">
      <div class="theme-header">
        <div class="theme-title">
          <n-icon :component="SparklesOutline" :size="16" style="color: var(--theme-primary)" />
          <span>{{ t('theme.theme') }}</span>
        </div>
      </div>

      <!-- Appearance Mode -->
      <div class="theme-section">
        <div class="section-title">{{ t('theme.mode') }}</div>
        <div class="mode-options">
          <div
            v-for="item in modeList"
            :key="item.key"
            class="mode-item"
            :class="{ 'mode-item--active': currentMode === item.key }"
            @click="setThemeMode(item.key)"
          >
            <n-icon :component="item.icon" :size="16" />
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>

      <!-- Accent Color Selection -->
      <div class="theme-section">
        <div class="section-title">{{ t('theme.accentColor') }}</div>
        <div class="accent-grid">
          <div
            v-for="preset in ACCENT_PRESETS"
            :key="preset.id"
            class="accent-chip"
            :class="{ 'accent-chip--active': currentAccent === preset.id }"
            @click="setAccent(preset.id)"
          >
            <span class="accent-dot" :style="{ backgroundColor: preset.primary }">
              <n-icon v-if="currentAccent === preset.id" :component="CheckmarkOutline" :size="12" style="color: #fff" />
            </span>
            <span class="accent-label">{{ t(preset.nameKey) }}</span>
          </div>
        </div>
      </div>

      <!-- Frosted Glass Switch Section -->
      <div class="theme-section">
        <div class="glass-header-row">
          <span class="section-title" style="margin-bottom: 0;">{{ t('theme.frostedGlass') }}</span>
          <n-switch :value="frostedGlass" @update:value="setFrostedGlass" size="small" />
        </div>
      </div>

      <!-- Glass Blur Intensity Selector Section -->
      <div class="theme-section" style="margin-bottom: 0;">
        <div class="intensity-container" :class="{ 'intensity-container--disabled': !frostedGlass }">
          <div class="intensity-label-row">
            <span class="intensity-sublabel">{{ t('theme.glassIntensity') }}</span>
            <span class="intensity-current-badge">{{ currentIntensityLabel }}</span>
          </div>
          <div class="intensity-options">
            <div
              v-for="item in intensityList"
              :key="item.key"
              class="intensity-item"
              :class="{ 'intensity-item--active': frostedGlass && glassIntensity === item.key }"
              @click="frostedGlass && setGlassIntensity(item.key)"
            >
              <span>{{ item.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </n-popover>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  ColorPaletteOutline,
  SunnyOutline,
  MoonOutline,
  DesktopOutline,
  CheckmarkOutline,
  SparklesOutline,
} from '@vicons/ionicons5';
import {
  useAppTheme,
  ACCENT_PRESETS,
  type ThemeMode,
  type GlassIntensity,
} from '../utils/theme';

const { t } = useI18n();
const {
  currentMode,
  currentAccent,
  frostedGlass,
  glassIntensity,
  setThemeMode,
  setAccent,
  setFrostedGlass,
  setGlassIntensity,
} = useAppTheme();

const modeList = computed<{ key: ThemeMode; label: string; icon: any }[]>(() => [
  { key: 'auto', label: t('theme.auto'), icon: DesktopOutline },
  { key: 'light', label: t('theme.light'), icon: SunnyOutline },
  { key: 'dark', label: t('theme.dark'), icon: MoonOutline },
]);

const intensityList = computed<{ key: GlassIntensity; label: string }[]>(() => [
  { key: 'low', label: t('theme.intensityLow') },
  { key: 'medium', label: t('theme.intensityMedium') },
  { key: 'strong', label: t('theme.intensityStrong') },
  { key: 'ultra', label: t('theme.intensityUltra') },
]);

const currentIntensityLabel = computed(() => intensityList.value.find(i => i.key === glassIntensity.value)?.label || '');
</script>

<style scoped>
.theme-panel {
  padding: 16px;
  border-radius: 14px;
  background: var(--glass-card-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  color: var(--app-text-primary);
  font-size: 13px;
}

.theme-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.theme-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
}

.theme-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--app-text-secondary);
  margin-bottom: 8px;
}

.mode-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  background: var(--app-bg-secondary);
  padding: 4px;
  border-radius: 8px;
}

.mode-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 4px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  color: var(--app-text-secondary);
}

.mode-item:hover {
  color: var(--app-text-primary);
}

.mode-item--active {
  background: var(--app-bg-card);
  color: var(--theme-primary);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.accent-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.accent-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  /* 用控件描边色而非 --app-border：后者是白色高光，在浅色面板上看不见边框 */
  border: 1px solid var(--app-border-input);
  background: var(--app-bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.accent-chip:hover {
  background: var(--app-bg-hover);
  border-color: var(--theme-primary-hover);
}

.accent-chip--active {
  background: var(--theme-primary-suppl);
  border-color: var(--theme-primary);
  font-weight: 600;
}

.accent-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.accent-label {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.glass-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0;
}

.intensity-container {
  transition: opacity 0.2s ease;
}

.intensity-container--disabled {
  opacity: 0.4;
  pointer-events: none;
}

.intensity-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.intensity-sublabel {
  font-size: 12px;
  font-weight: 500;
  color: var(--app-text-secondary);
}

.intensity-current-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--theme-primary);
}

.intensity-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  background: var(--app-bg-secondary);
  padding: 4px;
  border-radius: 8px;
}

.intensity-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 2px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  color: var(--app-text-secondary);
  text-align: center;
}

.intensity-item:hover {
  color: var(--app-text-primary);
}

.intensity-item--active {
  background: var(--app-bg-card);
  color: var(--theme-primary);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
</style>

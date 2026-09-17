import { computed, readonly, ref, watch } from 'vue';
import { darkTheme, zhCN, dateZhCN, enUS, dateEnUS } from 'naive-ui';
import type { ConfigProviderProps, GlobalThemeOverrides } from 'naive-ui';
import i18n from '../i18n';

export type UiTheme = 'default' | 'verdant';
const root = document.documentElement;
const style = ref<UiTheme>(root.dataset.uiTheme === 'verdant' ? 'verdant' : 'default');
const dark = ref(root.classList.contains('app-dark'));
const storageUnavailable = ref(root.dataset.preferenceStorage === 'unavailable');

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Keep the current session usable; the selector displays the persistence limitation.
    storageUnavailable.value = true;
  }
}

const theme = computed(() => dark.value ? darkTheme : null);
const themeOverrides = computed<GlobalThemeOverrides | undefined>(() => {
  if (style.value === 'default') return undefined;
  const isDark = dark.value;
  const primary = isDark ? '#63d69b' : '#16794b';
  const surface = isDark ? '#1b2433' : '#ffffff';
  const background = isDark ? '#111827' : '#f5f7f9';
  const border = isDark ? '#38465a' : '#dce3e9';
  const secondary = isDark ? '#a8b3c4' : '#526071';
  return {
    common: {
      primaryColor: primary, primaryColorHover: isDark ? '#8be5b4' : '#11613c',
      primaryColorPressed: isDark ? '#40bd80' : '#0f5535', primaryColorSuppl: primary,
      bodyColor: background, cardColor: surface, modalColor: surface, popoverColor: surface,
      tableColor: surface, inputColor: surface, borderColor: border, dividerColor: border,
      textColorBase: isDark ? '#e5e7eb' : '#1f2937',
      textColor1: isDark ? '#e5e7eb' : '#1f2937', textColor2: secondary, textColor3: secondary,
      borderRadius: '8px', borderRadiusSmall: '6px', fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
      heightMedium: '34px',
    },
    Layout: { color: background, headerColor: surface, siderColor: surface, footerColor: background },
    Card: { borderRadius: '12px', borderColor: border },
    Button: { textColorPrimary: isDark ? '#111827' : '#ffffff', textColorHoverPrimary: isDark ? '#111827' : '#ffffff', textColorPressedPrimary: isDark ? '#111827' : '#ffffff', textColorFocusPrimary: isDark ? '#111827' : '#ffffff' },
    DataTable: { thColor: isDark ? '#222f41' : '#edf2f5', tdColor: surface, tdColorHover: isDark ? '#263449' : '#f2f7f4', borderColor: border, borderRadius: '12px' },
    Menu: { itemColorActive: isDark ? '#234238' : '#e7f3ec', itemTextColorActive: primary, itemIconColorActive: primary, itemTextColorActiveHover: primary },
  };
});

export const uiConfig = computed<ConfigProviderProps>(() => ({
  theme: theme.value, themeOverrides: themeOverrides.value,
  locale: i18n.global.locale.value === 'zh-CN' ? zhCN : enUS,
  dateLocale: i18n.global.locale.value === 'zh-CN' ? dateZhCN : dateEnUS,
}));

watch([style, dark], () => {
  root.dataset.uiTheme = style.value;
  root.classList.toggle('app-dark', dark.value);
  root.style.backgroundColor = style.value === 'verdant' ? (dark.value ? '#111827' : '#f5f7f9') : '';
}, { flush: 'sync' });

function setUiTheme(value: string) {
  style.value = value === 'verdant' ? 'verdant' : 'default';
  persist('cf-manager.ui-theme', style.value);
}
function toggleDark() {
  dark.value = !dark.value;
  persist('darkMode', String(dark.value));
}

export function useUiTheme() {
  return { uiTheme: readonly(style), isDark: readonly(dark), storageUnavailable: readonly(storageUnavailable), setUiTheme, toggleDark };
}

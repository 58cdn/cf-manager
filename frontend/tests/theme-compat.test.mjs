import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import * as vue from 'vue';

const testDir = fileURLToPath(new URL('.', import.meta.url));

// Exercise the real reactive theme modules with only browser storage/DOM adapters.
function loadThemes(saved = {}, blocked = false) {
  const values = new Map(Object.entries(saved));
  const classes = new Set();
  const css = new Map();
  const root = {
    dataset: {},
    classList: {
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
      contains: name => classes.has(name),
    },
    style: { setProperty: (name, value) => css.set(name, value) },
  };
  const storage = {
    getItem(key) { if (blocked) throw new Error('Storage unavailable'); return values.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw new Error('Storage unavailable'); values.set(key, value); },
  };
  let onSystemChange;
  const context = vm.createContext({
    document: { documentElement: root }, localStorage: storage,
    window: { matchMedia: () => ({ matches: false, addEventListener: (_, fn) => { onSystemChange = fn; } }) },
  });
  vm.runInContext(readFileSync(join(testDir, '../public/theme-init.js'), 'utf8'), context);
  const modules = new Map();
  const load = name => {
    if (modules.has(name)) return modules.get(name);
    const source = readFileSync(join(testDir, '../src', name + '.ts'), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const module = { exports: {} };
    const localRequire = id => {
      if (id === 'vue') return vue;
      if (id === 'naive-ui') return { darkTheme: { name: 'dark' }, zhCN: {}, dateZhCN: {}, enUS: {}, dateEnUS: {} };
      if (id === '../i18n') return { __esModule: true, default: { global: { locale: vue.ref('en') } } };
      if (id === '../utils/theme') return load('utils/theme');
      throw new Error('Unexpected dependency: ' + id);
    };
    vm.runInContext('(function(require,module,exports){' + code + '\n})', context)(localRequire, module, module.exports);
    modules.set(name, module.exports);
    return module.exports;
  };
  const theme = load('utils/theme');
  const ui = load('composables/useUiTheme');
  return { theme, ui, root, css, values, systemChange: matches => onSystemChange({ matches }) };
}

test('legacy Verdant and darkMode preferences survive, sharing upstream dark state', () => {
  const { theme, ui, root, css, values } = loadThemes({ 'cf-manager.ui-theme': 'verdant', darkMode: 'true' });
  const controls = ui.useUiTheme();
  assert.equal(controls.uiTheme.value, 'verdant');
  assert.equal(controls.isDark.value, true);
  assert.equal(ui.uiConfig.value.themeOverrides.common.primaryColor, '#63d69b');
  assert.equal(root.classList.contains('app-glass'), false);
  controls.toggleDark();
  assert.equal(theme.isDark.value, false);
  assert.equal(values.get('themeMode'), 'light');
  assert.equal(values.get('darkMode'), 'false');
  assert.equal(css.get('--theme-primary'), '#16794b');
  controls.setUiTheme('default');
  theme.setAccent('blue');
  assert.equal(ui.uiConfig.value.themeOverrides.common.primaryColor, '#3b82f6');
  assert.equal(root.classList.contains('app-glass'), true);
  controls.setUiTheme('verdant');
  assert.equal(values.get('cf-manager.ui-theme'), 'verdant');
  assert.equal(ui.uiConfig.value.themeOverrides.common.primaryColor, '#16794b');
  controls.setUiTheme('default');
  assert.equal(ui.uiConfig.value.themeOverrides.common.primaryColor, '#3b82f6');
});

test('blocked storage keeps both theme systems usable for the current session', () => {
  const { theme, ui } = loadThemes({}, true);
  const controls = ui.useUiTheme();
  assert.equal(controls.storageUnavailable.value, true);
  assert.doesNotThrow(() => {
    controls.setUiTheme('verdant');
    controls.toggleDark();
    theme.setAccent('purple');
    theme.setFrostedGlass(false);
    theme.setGlassIntensity('low');
  });
  assert.equal(controls.uiTheme.value, 'verdant');
  assert.equal(controls.isDark.value, true);
});

test('explicit upstream mode wins over legacy darkMode and auto follows the system', () => {
  const { theme, ui, root, systemChange } = loadThemes({ themeMode: 'light', darkMode: 'true' });
  assert.equal(root.classList.contains('app-dark'), false);
  theme.setThemeMode('auto');
  systemChange(true);
  assert.equal(ui.useUiTheme().isDark.value, true);
  assert.equal(root.classList.contains('app-dark'), true);
  assert.equal(ui.uiConfig.value.theme.name, 'dark');
});

import { createDiscreteApi } from 'naive-ui';
import { uiConfig } from '../composables/useUiTheme';

const { message, notification, dialog, loadingBar } = createDiscreteApi(
  ['message', 'notification', 'dialog', 'loadingBar'],
  { configProviderProps: uiConfig }
);

export { message, notification, dialog, loadingBar };

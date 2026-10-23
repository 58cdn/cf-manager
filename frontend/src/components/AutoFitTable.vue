<template>
  <div
    class="autofit-table-wrapper"
    :class="{
      'autofit-table--fit': autoHeight,
      'autofit-table--glass': glass,
    }"
  >
    <!-- 可选表格顶栏工具区 -->
    <div v-if="$slots.header || title" class="autofit-table__header">
      <slot name="header">
        <span class="autofit-table__title">{{ title }}</span>
      </slot>
    </div>

    <!-- 表格主体容器：自适应撑满与内部滚动 -->
    <div class="autofit-table__body">
      <n-data-table
        ref="tableRef"
        v-bind="$attrs"
        :scroll-x="scrollX"
        :size="size"
        :bordered="bordered"
        :flex-height="autoHeight"
      >
        <!-- 透传 n-data-table 支持的所有具名插槽 -->
        <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
          <slot :name="slotName" v-bind="slotProps" />
        </template>
      </n-data-table>
    </div>

    <!-- 可选固底栏：用于统计汇总、批量选中提示、分页等 -->
    <div v-if="$slots.footer" class="autofit-table__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue';
import type { DataTableInst } from 'naive-ui';

interface AutoFitTableProps {
  /** 是否开启自动吸收父容器剩余高度（开启后 flex-height 且表头吸顶固定） */
  autoHeight?: boolean;
  /** 是否应用磨砂玻璃背景容器 */
  glass?: boolean;
  /** 表格尺寸，默认 small */
  size?: 'small' | 'medium' | 'large';
  /** 是否显示内部边框，默认 false */
  bordered?: boolean;
  /** 表格标题 */
  title?: string;
}

withDefaults(defineProps<AutoFitTableProps>(), {
  autoHeight: true,
  glass: true,
  size: 'small',
  bordered: false,
  title: '',
});

const tableRef = ref<DataTableInst | null>(null);

const attrs = useAttrs();

/**
 * 横向滚动宽度 = max(显式传入的 scroll-x, 列宽合计)。
 * Naive 会用 scroll-x 作为横向滚动内容宽度：一旦列宽合计超过它，
 * 表格实际比内容容器更宽，最右侧的列会被裁掉且无法滚动到（移动端尤为明显）。
 */
const scrollX = computed<number | undefined>(() => {
  const raw = (attrs as Record<string, unknown>)['scroll-x'] ?? (attrs as Record<string, unknown>).scrollX;
  const provided = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10) || 0;

  const columns = (attrs as Record<string, unknown>).columns;
  if (!Array.isArray(columns)) return provided || undefined;

  const total = columns.reduce((sum, column) => {
    const width = (column as { width?: number | string } | null)?.width;
    if (typeof width === 'number') return sum + width;
    if (typeof width === 'string') {
      const parsed = Number.parseInt(width, 10);
      return Number.isNaN(parsed) ? sum : sum + parsed;
    }
    return sum;
  }, 0);

  return Math.max(provided, total) || undefined;
});

defineExpose({
  tableRef,
});
</script>

<style scoped>
.autofit-table-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  margin-top: 14px;
  position: relative;
}

/* 自适应撑满父级剩余空间 */
.autofit-table--fit {
  flex: 1 1 0%;
  min-height: 0;
}

/* 表格容器风格。
   数据密集区（表格）是「实色」面板，不跟随页面底色：
   整表与固定列/表头/hover/分页栏共用同一块实色，且容器与固定列都不用
   backdrop-filter —— 任何半透明层 + 背景采样都会让固定列与中间列出现色差。 */
.autofit-table--glass {
  background: var(--glass-surface-opaque, #f8fafc);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: 12px;
  overflow: hidden;
}

.autofit-table__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--app-border-light, rgba(226, 232, 240, 0.6));
  flex-shrink: 0;
}

.autofit-table__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text-heading);
}

.autofit-table__body {
  flex: 1 1 0%;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.autofit-table__body :deep(.n-data-table) {
  flex: 1 1 0%;
  min-height: 0;
  height: 100% !important;
  display: flex;
  flex-direction: column;
}

.autofit-table__body :deep(.n-data-table-wrapper) {
  flex: 1 1 0%;
  min-height: 0;
  display: flex !important;
  flex-direction: column !important;
}

.autofit-table__body :deep(.n-data-table-base-table) {
  flex: 1 1 0% !important;
  min-height: 0 !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

.autofit-table__body :deep(.n-data-table-base-table-body) {
  flex: 1 1 0% !important;
  min-height: 0 !important;
  overflow-y: auto !important;
}

/* 空状态居中撑开 */
.autofit-table__body :deep(.n-data-table-empty) {
  flex: 1 1 0% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* 去掉内层自带的重叠背景，让毛玻璃质感纯净透出 */
.autofit-table--glass :deep(.n-data-table-base-table) {
  background: transparent !important;
}

.autofit-table--glass :deep(.n-data-table-base-table-body) {
  background: transparent !important;
}

/* 关键：Naive 的 <table> 元素自带 background-color: var(--n-merged-td-color)，
   而 DataTable 的 tdColor 取自 cardColor（暗色玻璃下是白色 0.08）。
   这层半透明白罩会提亮所有「非固定列」，固定列却是实色盖在上面，
   导致左右固定列与中间列永远差一截。这里清掉它，让整表落在容器的实色上。 */
.autofit-table--glass :deep(.n-data-table-table) {
  background-color: transparent !important;
}

/* 表头滚动容器同样不允许自带底色 */
.autofit-table--glass :deep(.n-data-table-base-table-header) {
  background-color: transparent !important;
}

/* thead 自带 Naive 默认 thColor（暗色下是白色 0.14 的半透明白罩），
   会把中间表头提亮，而固定列表头是实色盖在上面，出现色差。清掉。 */
.autofit-table--glass :deep(.n-data-table-thead) {
  background-color: transparent !important;
}

/* 单元格跟随玻璃：Naive 的 th/td 自带近实白底色，会把容器的磨砂整体盖住，
   表格看起来像「贴在玻璃卡片上的一块白纸」，既与周围面板割裂，
   也让磨砂档位差异在这里完全体现不出来。
   行内单元格改为透明（hover 仍交给 Naive 的行高亮），表头只留很轻的白维持层次。
   固定列另有不透明规则（!important）不受影响。 */
.autofit-table--glass :deep(.n-data-table-tr:not(:hover) > .n-data-table-td) {
  background-color: transparent;
}

.autofit-table--glass :deep(.n-data-table-th) {
  background-color: var(--glass-th-bg, rgba(255, 255, 255, 0.32));
}

/* 分页栏区域内边距与顶线：与表格同面的固定操作区 */
.autofit-table--glass :deep(.n-data-table__pagination) {
  margin: auto 0 0 0 !important;
  flex-shrink: 0 !important;
  padding: 12px 16px !important;
  border-top: 1px solid var(--app-border-light, rgba(226, 232, 240, 0.6));
  background: var(--glass-surface-opaque, #f8fafc);
}

.autofit-table--glass :deep(.n-data-table-td) {
  border-bottom: 1px solid var(--app-border-light, rgba(226, 232, 240, 0.4)) !important;
}

/* 固定列（sticky 列）：与容器同一块实色（不带透明度、不用 backdrop-filter）。
   实色保证横向滚动时滚过的内容被完全盖住（无文字重影），
   同色保证固定列与中间列之间没有可感知的色差。 */
.autofit-table--glass :deep(.n-data-table-td--fixed-left),
.autofit-table--glass :deep(.n-data-table-td--fixed-right) {
  background-color: var(--glass-surface-opaque, #f8fafc) !important;
}

/* 表头固定列：同一实色基色 + 与普通表头同量的浅色叠加（th-bg），
   与相邻表头完全同色 */
.autofit-table--glass :deep(.n-data-table-th--fixed-left),
.autofit-table--glass :deep(.n-data-table-th--fixed-right) {
  background-color: var(--glass-surface-opaque, #f8fafc) !important;
  background-image: linear-gradient(
    var(--glass-th-bg, rgba(255, 255, 255, 0.32)),
    var(--glass-th-bg, rgba(255, 255, 255, 0.32))
  );
}

/* 行 hover：整行（含固定列）统一使用同一种不透明底色。
   固定列若不透明、中间列走半透明 hover 色，交界处会出现色差；
   而固定列若跟着变半透明，又会重新透出横向滚过的内容（文字重影）。 */
.autofit-table--glass :deep(.n-data-table-tbody .n-data-table-tr:hover > .n-data-table-td) {
  background-color: var(--glass-surface-opaque-hover, #e8eef7) !important;
}

/* 可选固底栏 */
.autofit-table__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid var(--app-border-light, rgba(226, 232, 240, 0.6));
  background: var(--glass-surface-opaque, #f8fafc);
  flex-shrink: 0;
  min-height: 38px;
}
</style>

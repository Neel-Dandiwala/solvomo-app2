<script setup lang="ts">
import type { DataTableColumn } from "~/types/app-shell";

const props = withDefaults(
  defineProps<{
    columns: DataTableColumn[];
    rows: Record<string, unknown>[];
    rowKey: string;
    emptyLabel?: string;
    /** Flush inside a parent SurfaceCard (no outer radius / top border). */
    embed?: boolean;
    /** When set, that row gets a subtle selected background (e.g. detail panel sync). */
    highlightRowKey?: string | null;
  }>(),
  {
    columns: () => [],
    rows: () => [],
    rowKey: "id",
    embed: false,
    highlightRowKey: null,
  },
);

const emit = defineEmits<{
  "row-click": [row: Record<string, unknown>];
}>();

function cell(row: Record<string, unknown>, key: string) {
  return row[key];
}
</script>

<template>
  <div
    class="data-table-wrap overflow-hidden bg-white"
    :class="
      props.embed
        ? 'rounded-b-[1.25rem] border border-t-0 border-black/[0.08]'
        : 'rounded-[1.5rem] border border-black/8'
    "
  >
    <div class="overflow-x-auto">
      <table class="data-table min-w-full text-left text-[15px]">
        <thead>
          <tr class="data-table-head-row">
            <th
              v-for="col in props.columns"
              :key="col.key"
              scope="col"
              class="data-table-th px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-black/52"
              :class="col.headerClass"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.rows.length === 0">
            <td :colspan="Math.max(props.columns.length, 1)" class="data-table-empty px-6 py-14 text-center text-[15px] text-black/52">
              {{ props.emptyLabel || "No rows yet." }}
            </td>
          </tr>
          <tr
            v-for="(row, idx) in props.rows"
            :key="String(row[props.rowKey] || idx)"
            class="data-table-row cursor-pointer transition-colors hover:bg-black/[0.02]"
            :class="
              props.highlightRowKey != null && String(row[props.rowKey]) === props.highlightRowKey
                ? 'bg-[rgba(91,123,225,0.06)] hover:bg-[rgba(91,123,225,0.08)]'
                : ''
            "
            @click="emit('row-click', row)"
          >
            <td
              v-for="col in props.columns"
              :key="col.key"
              class="data-table-td border-t border-black/6 px-6 py-4 text-black/86"
              :class="col.class"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="cell(row, col.key)">
                {{ cell(row, col.key) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

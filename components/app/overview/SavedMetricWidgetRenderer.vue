<script setup lang="ts">
import type { SavedWidgetPayload } from "~/types/saved-view";

const props = defineProps<{
  payload: SavedWidgetPayload | null;
  widgetSubtype?: string;
}>();

const isArea = computed(() => props.widgetSubtype === "area");
const isBarComparison = computed(
  () => props.widgetSubtype === "bar" && props.payload?.kind === "comparison",
);

const chartMax = computed(() => {
  if (props.payload?.kind !== "time_series") return 1;
  return Math.max(...props.payload.series.flatMap((s) => s.values), 1);
});

const barMax = computed(() => {
  if (props.payload?.kind !== "comparison") return 1;
  return Math.max(...props.payload.items.map((i) => i.value), 1);
});

function formatValue(value: number, metric?: string) {
  if (metric === "SPEND" || metric?.includes("COST") || metric?.includes("VALUE")) {
    return `$${Intl.NumberFormat("en", { notation: "compact" }).format(value)}`;
  }
  if (metric?.includes("CTR") || metric === "ROAS") {
    return value.toFixed(2);
  }
  return Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

function linePoints(values: number[]) {
  const max = chartMax.value || 1;
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 48 - (value / max) * 44;
      return `${x},${y}`;
    })
    .join(" ");
}

function areaPath(values: number[]) {
  const line = linePoints(values);
  if (!line) return "";
  const firstX = values.length === 1 ? 50 : 0;
  const lastX = values.length === 1 ? 50 : 100;
  return `M ${firstX},48 L ${line} L ${lastX},48 Z`;
}
</script>

<template>
  <div v-if="payload?.kind === 'scorecard'" class="space-y-3">
    <p class="sv-kpi-value tabular-nums">
      {{ formatValue(payload.value, payload.metric) }}
    </p>
    <p class="text-[12px] font-medium text-black/45">
      {{ payload.label }}
    </p>
  </div>

  <div v-else-if="payload?.kind === 'time_series'" class="space-y-3">
    <svg viewBox="0 0 100 52" class="h-40 w-full overflow-visible" preserveAspectRatio="none">
      <path
        v-if="isArea && payload.series[0]"
        :d="areaPath(payload.series[0].values)"
        fill="rgba(91,123,225,0.18)"
      />
      <polyline
        v-for="series in payload.series"
        :key="series.metric"
        fill="none"
        :stroke="isArea ? '#5B7BE1' : 'currentColor'"
        class="text-[#5B7BE1]"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        :points="linePoints(series.values)"
      />
    </svg>
    <div class="flex flex-wrap gap-2">
      <span
        v-for="series in payload.series"
        :key="series.metric"
        class="rounded-full border border-black/8 bg-black/[0.03] px-2 py-1 text-[11px] font-semibold text-black/55"
      >
        {{ series.label }}
      </span>
    </div>
  </div>

  <div v-else-if="payload?.kind === 'comparison' && isBarComparison" class="space-y-2">
    <div v-for="item in payload.items" :key="item.metric" class="space-y-1">
      <div class="flex justify-between text-[11px] text-black/55">
        <span>{{ item.label }}</span>
        <span>{{ formatValue(item.value, item.metric) }}</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-black/[0.06]">
        <div
          class="h-full rounded-full bg-[#5B7BE1]"
          :style="{ width: `${Math.min(100, (item.value / barMax) * 100)}%` }"
        />
      </div>
    </div>
  </div>

  <div v-else-if="payload?.kind === 'comparison'" class="grid gap-2 sm:grid-cols-3">
    <div
      v-for="item in payload.items"
      :key="item.metric"
      class="rounded-xl border border-black/[0.06] bg-black/[0.02] p-3"
    >
      <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-black/35">
        {{ item.label }}
      </p>
      <p class="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-black">
        {{ formatValue(item.value, item.metric) }}
      </p>
    </div>
  </div>

  <div v-else-if="payload?.kind === 'table'" class="overflow-x-auto">
    <table class="min-w-full text-left text-[12px]">
      <thead class="text-black/40">
        <tr>
          <th v-for="col in payload.columns" :key="col.key" class="px-2 py-1 font-semibold">
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-black/[0.05]">
        <tr v-for="(row, idx) in payload.rows" :key="idx">
          <td v-for="col in payload.columns" :key="col.key" class="px-2 py-1.5 text-black/65">
            {{ row[col.key] }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <EmptyState
    v-else
    class="border-0 bg-transparent px-0 py-0 text-left"
    title="No data"
    :description="payload?.kind === 'empty' ? payload.message : 'No payload returned for this widget.'"
  />
</template>

<script setup lang="ts">
import { AlertTriangle } from "lucide-vue-next";
import type { SavedWidgetPayload } from "~/types/saved-view";

const props = defineProps<{
  payload: SavedWidgetPayload | null;
  widgetSubtype?: string;
}>();

const isArea = computed(() => props.widgetSubtype === "area");
const isBarComparison = computed(
  () => props.widgetSubtype === "bar" && props.payload?.kind === "comparison",
);

const timeSeriesTicks = computed(() => {
  if (props.payload?.kind !== "time_series") return [];
  const labels = props.payload.labels ?? [];
  if (!labels.length) return [];
  const indices =
    labels.length <= 3
      ? labels.map((_, i) => i)
      : [0, Math.floor((labels.length - 1) / 2), labels.length - 1];
  return indices.map((i) => formatDateLabel(labels[i] ?? ""));
});

function formatDateLabel(label: string) {
  if (!label) return "";
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(label) ? `${label}T00:00:00` : label;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? label
    : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const chartMax = computed(() => {
  if (props.payload?.kind !== "time_series") return 1;
  return Math.max(...props.payload.series.flatMap((s) => s.values), 1);
});

const barMax = computed(() => {
  if (props.payload?.kind !== "comparison") return 1;
  return Math.max(...props.payload.items.map((i) => i.value), 1);
});

const tableColumns = computed(() => {
  if (props.payload?.kind !== "table") return [];
  return props.payload.columns.map((col) => ({
    key: col.key,
    label: col.label,
  }));
});

const tableRows = computed(() => {
  if (props.payload?.kind !== "table") return [];
  return props.payload.rows.map((row, index) => ({
    ...row,
    id: `row-${index}`,
  }));
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
    <div
      v-if="timeSeriesTicks.length"
      class="flex justify-between text-[10px] font-medium tabular-nums text-black/40"
    >
      <span v-for="(tick, idx) in timeSeriesTicks" :key="`${tick}-${idx}`">{{ tick }}</span>
    </div>
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

  <DataTable
    v-else-if="payload?.kind === 'table'"
    :columns="tableColumns"
    :rows="tableRows"
    row-key="id"
    embed
  />

  <EmptyState
    v-else-if="payload?.kind === 'empty'"
    class="border-0 bg-transparent px-0 py-0 text-left"
    title="No data"
    :description="payload.message"
  />

  <div
    v-else
    class="flex items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50/70 px-3 py-2.5 text-left"
  >
    <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-amber-600" :stroke-width="1.9" />
    <div class="min-w-0">
      <p class="text-[12px] font-semibold text-amber-900">Metric unavailable</p>
      <p class="mt-0.5 text-[11px] leading-4 text-amber-800/80">
        This widget's data could not be loaded. Try refreshing the view.
      </p>
    </div>
  </div>
</template>

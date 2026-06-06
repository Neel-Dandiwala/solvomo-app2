<script setup lang="ts">
import type { OverviewWidgetPayload } from "~/composables/useOverviewWidgetPayloads";

const props = withDefaults(
  defineProps<{
    payload: OverviewWidgetPayload;
    compact?: boolean;
    tableExpanded?: boolean;
  }>(),
  { compact: false, tableExpanded: false },
);

const chartBarAreaClass = computed(() =>
  props.compact ? "flex h-[11.5rem] items-end gap-1.5 sm:gap-2" : "flex h-48 items-end gap-2 sm:h-52",
);

const chartLineSvgClass = computed(() =>
  props.compact ? "h-[10rem] w-full overflow-visible sm:h-[11rem]" : "h-52 w-full overflow-visible sm:h-56 lg:h-[15rem]",
);

const tableRowsView = computed(() => {
  if (props.payload.kind !== "table") return [];
  const rows = props.payload.rows;
  return props.tableExpanded ? rows : rows.slice(0, 5);
});

function buildSparkPoints(values: number[]) {
  const w = 100;
  const h = 28;
  return values
    .map((v, i) => {
      const nv = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
      const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
      const y = h - 3 - nv * (h - 6);
      return `${x},${y}`;
    })
    .join(" ");
}

const chartMax = computed(() => {
  if (props.payload.kind !== "chart") return 0;
  return Math.max(...props.payload.series.flatMap((series: { values: number[] }) => series.values), 1);
});

const chartTicks = computed(() => {
  if (props.payload.kind !== "chart") return [];
  const fmt = props.payload.orientation === "horizontal" ? formatAxisTick : formatScaleValue;
  return [chartMax.value, chartMax.value * 0.66, chartMax.value * 0.33, 0].map((value) => fmt(value));
});

const donutTotal = computed(() => {
  if (props.payload.kind !== "donut") return 0;
  return props.payload.segments.reduce((sum: number, segment: { value: number }) => sum + segment.value, 0);
});

function colorClass(color: "brand" | "product" | "interaction" | "depth") {
  switch (color) {
    case "brand":
      return "preview-chart-brand";
    case "interaction":
      return "preview-chart-interaction";
    case "depth":
      return "preview-chart-depth";
    default:
      return "preview-chart-product";
  }
}

function colorValue(color: "brand" | "product" | "interaction" | "depth") {
  switch (color) {
    case "brand":
      return "#D88F8D";
    case "interaction":
      return "#5A4FCF";
    case "depth":
      return "#5B7BE1";
    default:
      return "#5FC7D4";
  }
}

function formatScaleValue(value: number) {
  if (value >= 100) return `${Math.round(value)}k`;
  if (value >= 10) return `${value.toFixed(0)}k`;
  if (value > 0) return `${value.toFixed(1)}k`;
  return "0";
}

/** Axis ticks for ROI-like scales (no `k` suffix). */
function formatAxisTick(value: number) {
  if (value <= 0) return "0";
  if (value < 20) return value.toFixed(1);
  return formatScaleValue(value);
}

function segmentShare(value: number) {
  return donutTotal.value ? `${Math.round((value / donutTotal.value) * 100)}%` : "0%";
}

function buildLinePoints(values: number[]) {
  const width = 100;
  const height = 56;
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - (value / chartMax.value) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

function buildAreaPath(values: number[]) {
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = 56 - (value / chartMax.value) * 56;
    return `${index === 0 ? "M" : "L"} ${x} ${y}`;
  });
  return `${points.join(" ")} L 100 56 L 0 56 Z`;
}

const donutStyle = computed(() => {
  if (props.payload.kind !== "donut") return {};
  const total = props.payload.segments.reduce((sum: number, segment: { value: number }) => sum + segment.value, 0) || 1;
  let cursor = 0;
  const stops = props.payload.segments.map((segment: { value: number; color: "brand" | "product" | "interaction" | "depth" }) => {
    const start = (cursor / total) * 100;
    cursor += segment.value;
    const end = (cursor / total) * 100;
    return `${colorValue(segment.color)} ${start}% ${end}%`;
  });
  return {
    background: `conic-gradient(${stops.join(", ")})`,
  };
});
</script>

<template>
  <div>
    <template v-if="payload.kind === 'kpi'">
      <!-- Executive / dense tiles: stack value → sparkline → delta so lines never cross numbers -->
      <template v-if="compact">
        <div class="min-w-0 space-y-2">
          <p class="text-[1.35rem] font-semibold tabular-nums leading-none tracking-[-0.04em] text-black sm:text-[1.5rem]">
            {{ payload.kpi.value }}
          </p>
          <div
            v-if="payload.sparkline?.length"
            class="h-5 w-full max-w-[7.5rem] overflow-hidden sm:h-6 sm:max-w-[9rem]"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 100 28"
              class="h-full w-full overflow-hidden text-[#5B7BE1]"
              preserveAspectRatio="none"
            >
              <polyline
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
                :points="buildSparkPoints(payload.sparkline)"
              />
            </svg>
          </div>
          <div class="flex flex-wrap items-center gap-2 pt-0.5">
            <p
              class="inline-flex max-w-full items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-[-0.01em] sm:px-2.5 sm:text-[12px]"
              :class="
                payload.kpi.tone === 'positive'
                  ? 'border-[rgba(91,123,225,0.14)] bg-[rgba(91,123,225,0.08)] text-[rgba(30,58,138,0.86)]'
                  : payload.kpi.tone === 'negative'
                    ? 'border-[rgba(239,68,68,0.12)] bg-[rgba(239,68,68,0.06)] text-[rgba(127,29,29,0.86)]'
                    : 'border-black/8 bg-black/[0.03] text-black/62'
              "
            >
              {{ payload.kpi.change }}
            </p>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="flex min-w-0 items-start justify-between gap-2 overflow-hidden sm:gap-3">
          <p class="sv-kpi-value min-w-0 flex-1 tabular-nums">
            {{ payload.kpi.value }}
          </p>
          <div
            v-if="payload.sparkline?.length"
            class="h-7 w-[5.5rem] max-w-[42%] shrink-0 overflow-hidden sm:max-w-none sm:w-[5.5rem]"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 100 28"
              class="h-full w-full overflow-hidden text-[#5B7BE1]"
              preserveAspectRatio="none"
            >
              <polyline
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                :points="buildSparkPoints(payload.sparkline)"
              />
            </svg>
          </div>
        </div>
        <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p
            class="inline-flex min-h-[1.75rem] items-center rounded-full border px-2.5 py-0.5 text-[13px] font-semibold tracking-[-0.01em] sm:px-3 sm:py-1 sm:text-[14px]"
            :class="
              payload.kpi.tone === 'positive'
                ? 'border-[rgba(91,123,225,0.14)] bg-[rgba(91,123,225,0.08)] text-[rgba(30,58,138,0.86)]'
                : payload.kpi.tone === 'negative'
                  ? 'border-[rgba(239,68,68,0.12)] bg-[rgba(239,68,68,0.06)] text-[rgba(127,29,29,0.86)]'
                  : 'border-black/8 bg-black/[0.03] text-black/62'
            "
          >
            {{ payload.kpi.change }}
          </p>
          <p class="max-w-[12rem] text-right text-[12px] text-black/52 sm:text-[14px]">
            {{ payload.kpi.helper }}
          </p>
        </div>
      </template>
    </template>

    <template v-else-if="payload.kind === 'chart'">
      <template v-if="payload.visualization === 'bar' && payload.orientation === 'horizontal'">
        <div class="min-w-0 space-y-2">
          <div
            v-for="(label, index) in payload.labels"
            :key="label"
            class="grid grid-cols-[minmax(0,5.5rem)_1fr] items-center gap-2 sm:grid-cols-[minmax(0,7rem)_1fr] sm:gap-3"
          >
            <span class="truncate text-[11px] font-medium leading-tight text-black/55" :title="label">{{ label }}</span>
            <div class="flex min-w-0 items-center gap-2">
              <div class="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  v-for="series in payload.series"
                  :key="series.label"
                  class="h-full rounded-full"
                  :class="colorClass(series.color)"
                  :style="{ width: `${((series.values[index] || 0) / chartMax) * 100}%` }"
                />
              </div>
              <span class="w-10 shrink-0 text-right text-[11px] font-semibold tabular-nums text-black/70">
                {{ formatAxisTick(payload.series[0]?.values[index] || 0) }}
              </span>
            </div>
          </div>
        </div>
      </template>
      <template v-else-if="payload.visualization === 'bar'">
        <div class="min-w-0">
          <div class="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-3">
            <div class="hidden flex-col justify-between pb-6 pt-1 text-[11px] tabular-nums text-black/35 sm:flex">
              <span v-for="tick in chartTicks" :key="tick">{{ tick }}</span>
            </div>
            <div>
              <div :class="chartBarAreaClass">
                <div v-for="(label, index) in payload.labels" :key="label" class="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <div class="flex h-full w-full items-end justify-center gap-1 px-0.5 pt-2">
                    <div
                      v-for="series in payload.series"
                      :key="`${label}-${series.label}`"
                      class="w-full max-w-[2.25rem] rounded-t-md sm:max-w-none sm:rounded-t-lg"
                      :class="colorClass(series.color)"
                      :style="{ height: `${((series.values[index] || 0) / chartMax) * 100}%` }"
                    />
                  </div>
                  <span class="text-center text-[11px] font-medium leading-tight text-black/50">{{ label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="payload.visualization === 'stacked_bar'">
        <div class="space-y-3">
          <div v-for="(label, index) in payload.labels" :key="label" class="space-y-2 border-b border-black/[0.05] pb-3 last:border-0 last:pb-0">
            <div class="flex items-center justify-between gap-3">
              <span class="text-[13px] font-semibold text-black/75">{{ label }}</span>
              <span class="text-[12px] font-medium tabular-nums text-black/50">
                {{ formatScaleValue(payload.series.reduce((sum, series) => sum + (series.values[index] || 0), 0)) }}
              </span>
            </div>
            <div class="flex h-3 overflow-hidden rounded-full bg-black/[0.04]">
              <div
                v-for="series in payload.series"
                :key="`${label}-${series.label}`"
                :class="colorClass(series.color)"
                :style="{ width: `${(series.values[index] / chartMax) * 100}%` }"
              />
            </div>
            <div class="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-black/50">
              <div v-for="series in payload.series" :key="series.label" class="flex items-center gap-1.5">
                <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: colorValue(series.color) }" />
                <span>{{ series.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="min-w-0">
          <div class="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-3">
            <div class="hidden flex-col justify-between pb-6 pt-1 text-[11px] tabular-nums text-black/35 sm:flex">
              <span v-for="tick in chartTicks" :key="tick">{{ tick }}</span>
            </div>
            <div class="min-w-0">
              <svg viewBox="0 0 100 64" :class="chartLineSvgClass">
                <line x1="0" y1="14" x2="100" y2="14" stroke="rgba(0,0,0,0.04)" stroke-width="1" />
                <line x1="0" y1="28" x2="100" y2="28" stroke="rgba(0,0,0,0.04)" stroke-width="1" />
                <line x1="0" y1="42" x2="100" y2="42" stroke="rgba(0,0,0,0.04)" stroke-width="1" />
                <line x1="0" y1="56" x2="100" y2="56" stroke="rgba(0,0,0,0.06)" stroke-width="1" />
                <g v-for="series in payload.series" :key="series.label">
                  <path
                    v-if="payload.visualization === 'area' && series === payload.series[0]"
                    :d="buildAreaPath(series.values)"
                    :fill="colorValue(series.color)"
                    opacity="0.12"
                  />
                  <polyline
                    fill="none"
                    :stroke="colorValue(series.color)"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    :points="buildLinePoints(series.values)"
                  />
                </g>
              </svg>
              <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-black/52">
                <div v-for="series in payload.series" :key="series.label" class="flex items-center gap-1.5">
                  <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: colorValue(series.color) }" />
                  <span class="font-medium">{{ series.label }}</span>
                </div>
              </div>
              <div class="mt-1.5 flex justify-between gap-2 text-[11px] text-black/45">
                <span v-for="label in payload.labels" :key="label" class="min-w-0 truncate">{{ label }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <template v-else-if="payload.kind === 'donut'">
      <div class="grid gap-3 lg:grid-cols-[9.5rem_minmax(0,1fr)] lg:items-center lg:gap-4">
        <div
          class="mx-auto flex items-center justify-center rounded-full border border-black/[0.07]"
          :class="compact ? 'h-[7.25rem] w-[7.25rem]' : 'h-36 w-36'"
          :style="donutStyle"
        >
          <div
            class="flex flex-col items-center justify-center rounded-full bg-white"
            :class="compact ? 'h-[4.75rem] w-[4.75rem]' : 'h-[5.5rem] w-[5.5rem]'"
          >
            <span class="text-[10px] font-semibold uppercase tracking-wide text-black/40">Total</span>
            <span class="mt-0.5 text-lg font-semibold tracking-tight text-black sm:text-xl">
              {{ donutTotal }}
            </span>
          </div>
        </div>
        <div class="min-w-0 divide-y divide-black/[0.06]">
          <div v-for="segment in payload.segments" :key="segment.label" class="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
            <div class="flex min-w-0 items-center gap-2">
              <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: colorValue(segment.color) }" />
              <span class="truncate text-[13px] font-medium text-black/70">{{ segment.label }}</span>
            </div>
            <div class="shrink-0 text-right">
              <div class="text-[13px] font-semibold tabular-nums text-black">{{ segment.value }}</div>
              <div class="text-[11px] text-black/45">{{ segmentShare(segment.value) }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="payload.kind === 'table'">
      <div class="overflow-x-auto rounded-lg border border-black/[0.07]">
        <table class="min-w-full text-left text-[13px]">
          <thead>
            <tr class="border-b border-black/[0.06] bg-black/[0.02]">
              <th v-for="column in payload.columns" :key="column.key" class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-black/45">
                {{ column.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in tableRowsView" :key="index" class="border-b border-black/[0.04] last:border-0">
              <td v-for="column in payload.columns" :key="column.key" class="px-3 py-2 text-black/80">
                {{ row[column.key] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else-if="payload.kind === 'funnel'">
      <div class="flex min-w-0 flex-col gap-1">
        <div
          v-for="(stage, idx) in payload.stages"
          :key="stage.label"
        >
          <div
            class="flex items-center justify-between gap-2 rounded-lg border border-black/[0.06] bg-black/[0.02] px-3 py-2"
            :style="{ width: `${Math.max(28, 28 + (stage.value / (payload.stages[0]?.value || 1)) * 72)}%` }"
          >
            <span class="truncate text-[12px] font-semibold text-black/80">{{ stage.label }}</span>
            <span class="shrink-0 text-[12px] font-semibold tabular-nums text-black/60">{{ stage.value.toLocaleString() }}</span>
          </div>
          <p
            v-if="idx < payload.stages.length - 1 && payload.stages[idx + 1]?.rateFromPrev != null"
            class="mt-1 mb-1 pl-1 text-[10px] font-medium tabular-nums text-black/40"
          >
            → {{ (payload.stages[idx + 1]?.rateFromPrev || 0).toFixed(1) }}% to next
          </p>
        </div>
      </div>
    </template>

    <template v-else-if="payload.kind === 'signal_list'">
      <ul class="space-y-2.5">
        <li
          v-for="item in payload.items"
          :key="item.id"
          class="flex gap-2.5 rounded-lg border border-black/[0.06] bg-white px-3 py-2.5"
          :class="
            item.severity === 'critical'
              ? 'border-red-500/20 bg-red-500/[0.04]'
              : item.severity === 'warning'
                ? 'border-amber-500/25 bg-amber-500/[0.05]'
                : 'border-black/[0.06]'
          "
        >
          <span
            class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
            :class="
              item.severity === 'critical'
                ? 'bg-red-500'
                : item.severity === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-[#5B7BE1]'
            "
            aria-hidden="true"
          />
          <div class="min-w-0 flex-1">
            <p class="text-[13px] font-semibold leading-snug text-black">{{ item.headline }}</p>
            <p v-if="item.delta" class="mt-0.5 text-[11px] font-medium tabular-nums text-black/45">{{ item.delta }}</p>
          </div>
        </li>
      </ul>
    </template>

    <template v-else-if="payload.kind === 'metric_delta'">
      <ul class="divide-y divide-black/[0.06]">
        <li v-for="row in payload.items" :key="row.id" class="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <div class="min-w-0">
            <p class="text-[13px] font-semibold text-black">{{ row.label }}</p>
            <p class="text-[11px] text-black/45">{{ row.period }}</p>
          </div>
          <span
            class="shrink-0 text-[13px] font-semibold tabular-nums"
            :class="
              row.tone === 'positive'
                ? 'text-[rgba(30,58,138,0.9)]'
                : row.tone === 'negative'
                  ? 'text-red-800/90'
                  : 'text-black/70'
            "
          >
            {{ row.delta }}
          </span>
        </li>
      </ul>
    </template>

    <template v-else-if="payload.kind === 'insights'">
      <div class="grid gap-4 lg:grid-cols-2">
        <article
          v-for="item in payload.items"
          :key="item.id"
          class="sv-card-inset rounded-[1.5rem] px-5 py-5"
        >
          <p class="text-[1.02rem] font-semibold tracking-[-0.025em] text-black">
            {{ item.title }}
          </p>
          <p class="mt-3 text-[15px] leading-7 text-black/64">
            {{ item.summary }}
          </p>
          <NuxtLink v-if="item.linkLabel && item.linkTo" :to="item.linkTo" class="nav-link mt-5 inline-flex text-[15px] font-semibold">
            {{ item.linkLabel }}
          </NuxtLink>
        </article>
      </div>
    </template>

    <template v-else-if="payload.kind === 'alerts'">
      <div class="divide-y divide-black/[0.06]">
        <article
          v-for="item in payload.items"
          :key="item.id"
          class="py-2.5 first:pt-0 last:pb-0"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="text-[13px] font-semibold leading-snug text-black">
              {{ item.title }}
            </p>
            <span class="shrink-0 text-[11px] tabular-nums text-black/40">{{ item.createdAt }}</span>
          </div>
          <p class="mt-1 text-[12px] leading-5 text-black/58">
            {{ item.summary }}
          </p>
        </article>
      </div>
    </template>

    <template v-else-if="payload.kind === 'connections'">
      <div class="space-y-3">
        <div class="flex divide-x divide-black/[0.06]">
          <div class="min-w-0 flex-1 pr-3">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-black/40">Connected</p>
            <p class="mt-1 text-xl font-semibold tabular-nums tracking-tight text-black sm:text-2xl">{{ payload.summary.connected }}</p>
          </div>
          <div class="min-w-0 flex-1 px-3">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-black/40">Syncing</p>
            <p class="mt-1 text-xl font-semibold tabular-nums tracking-tight text-black sm:text-2xl">{{ payload.summary.syncing }}</p>
          </div>
          <div class="min-w-0 flex-1 pl-3">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-black/40">Attention</p>
            <p class="mt-1 text-xl font-semibold tabular-nums tracking-tight text-black sm:text-2xl">{{ payload.summary.attention }}</p>
          </div>
        </div>
        <p v-if="payload.summary.lastSyncLabel" class="text-[11px] font-medium text-black/50">
          {{ payload.summary.lastSyncLabel }}
        </p>
        <p
          v-if="payload.summary.delayedSources?.length"
          class="rounded-md border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-1.5 text-[11px] leading-snug text-amber-950/80"
        >
          <span class="font-semibold">Delayed:</span>
          {{ payload.summary.delayedSources.join(" · ") }}
        </p>
      </div>
    </template>
  </div>
</template>

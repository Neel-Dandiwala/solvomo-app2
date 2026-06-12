<script setup lang="ts">
import type {
  InsightIndicator,
  InsightKind,
  InsightSeverity,
  TrendData,
} from "~/types/insights";
import InsightWidgetHeader from "./InsightWidgetHeader.vue";

defineProps<{
  display_title: string;
  headline: string;
  narrative: string;
  insight_kind: InsightKind;
  severity: InsightSeverity;
  indicators: InsightIndicator[];
  data: TrendData;
}>();

function formatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function sparklinePath(
  days: { current: number }[],
  width = 200,
  height = 40,
): string {
  if (days.length < 2) return "";
  const max = Math.max(...days.map((d) => d.current), 0.01);
  const pts = days.map((d, i) => {
    const x = (i / (days.length - 1)) * width;
    const y = height - (d.current / max) * height;
    return `${x},${y}`;
  });
  return `M${pts.join(" L")}`;
}

function deltaToneClass(delta_pct: number, insight_kind: InsightKind): string {
  if (delta_pct === 0) return "bg-slate-50 text-slate-500";
  if (delta_pct > 0) {
    return insight_kind === "risk"
      ? "bg-red-50 text-red-700"
      : "bg-emerald-50 text-emerald-700";
  }
  return insight_kind === "opportunity"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-red-50 text-red-700";
}
</script>

<template>
  <div class="space-y-4">
    <InsightWidgetHeader
      :headline="headline"
      :narrative="narrative"
      :insight_kind="insight_kind"
      :severity="severity"
      :indicators="indicators"
    />

    <div class="border-t border-black/[0.06] pt-3">
      <div class="flex items-end justify-between gap-4">
        <div>
          <p class="text-[11px] font-medium uppercase tracking-wide text-black/35">
            {{ data.label }} — current period
          </p>
          <p class="mt-0.5 text-[22px] font-bold tracking-[-0.02em] text-black">
            {{ formatValue(data.current_total) }}
          </p>
          <p class="mt-0.5 text-[12px] text-black/45">
            vs {{ formatValue(data.previous_total) }} prior
          </p>
        </div>
        <div
          class="flex items-center gap-1 rounded-xl px-3 py-1.5 text-[13px] font-semibold"
          :class="deltaToneClass(data.delta_pct, insight_kind)"
        >
          <span>{{ data.delta_pct > 0 ? "↑" : data.delta_pct < 0 ? "↓" : "→" }}</span>
          <span>{{ Math.abs(data.delta_pct) }}%</span>
        </div>
      </div>

      <svg
        v-if="data.days.length >= 2"
        class="mt-3 w-full"
        viewBox="0 0 200 40"
        preserveAspectRatio="none"
        height="40"
      >
        <path
          :d="sparklinePath(data.days)"
          fill="none"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          :class="{
            'stroke-emerald-500': insight_kind === 'opportunity',
            'stroke-red-500': insight_kind === 'risk',
            'stroke-slate-400': insight_kind === 'neutral',
          }"
        />
      </svg>
    </div>
  </div>
</template>

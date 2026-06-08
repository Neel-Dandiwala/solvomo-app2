<script setup lang="ts">
import type {
  AnomalyData,
  InsightIndicator,
  InsightKind,
  InsightSeverity,
} from "~/types/insights";
import InsightWidgetHeader from "./InsightWidgetHeader.vue";

defineProps<{
  display_title: string;
  headline: string;
  narrative: string;
  insight_kind: InsightKind;
  severity: InsightSeverity;
  indicators: InsightIndicator[];
  data: AnomalyData;
}>();

function formatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
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

    <div
      class="flex items-start gap-4 rounded-2xl border p-4 border-t border-black/[0.06] pt-3"
      :class="{
        'border-red-100 bg-red-50': insight_kind === 'risk',
        'border-emerald-100 bg-emerald-50': insight_kind === 'opportunity',
        'border-slate-100 bg-slate-50': insight_kind === 'neutral',
      }"
    >
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
        :class="{
          'bg-red-100': insight_kind === 'risk',
          'bg-emerald-100': insight_kind === 'opportunity',
          'bg-slate-100': insight_kind === 'neutral',
        }"
      >
        ⚡
      </div>
      <div class="min-w-0 space-y-2">
        <div>
          <p class="text-[11px] font-medium uppercase tracking-wide text-black/35">
            {{ data.label.replace(/_/g, " ") }} on {{ formatDate(data.anomaly_date) }}
          </p>
          <p class="mt-0.5 text-[20px] font-bold tracking-tight text-black">
            {{ formatValue(data.anomaly_value) }}
          </p>
        </div>
        <div class="flex items-center gap-3 text-[12px] text-black/55">
          <span>Baseline: {{ formatValue(data.baseline_value) }}</span>
          <span
            class="font-semibold"
            :class="insight_kind === 'risk' ? 'text-red-600' : 'text-emerald-600'"
          >
            {{ data.magnitude_pct > 0 ? "+" : "" }}{{ data.magnitude_pct }}% deviation
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

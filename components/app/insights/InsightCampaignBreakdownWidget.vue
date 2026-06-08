<script setup lang="ts">
import type {
  CampaignBreakdownData,
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
  data: CampaignBreakdownData;
}>();

function formatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function vsLabel(pct: number): string {
  if (pct === 0) return "avg";
  return `${pct > 0 ? "+" : ""}${pct}% vs avg`;
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
      <p class="mb-2 text-[11px] font-medium uppercase tracking-wide text-black/35">
        {{ data.connection_slug.replace(/_/g, " ") }} — campaigns
      </p>
      <div class="space-y-1">
        <div
          v-for="row in data.rows"
          :key="row.id"
          class="flex items-center justify-between gap-2 rounded-xl px-3 py-2 even:bg-black/[0.02]"
        >
          <p class="min-w-0 truncate text-[12px] font-medium text-black/80">
            {{ row.name }}
          </p>
          <div class="flex shrink-0 flex-wrap justify-end gap-x-3 gap-y-0.5">
            <span
              v-for="metric in data.metrics.slice(0, 3)"
              :key="metric"
              class="text-[11px]"
              :class="{
                'text-emerald-600 font-semibold': (row.vs_average[metric] ?? 0) > 10,
                'text-red-600 font-semibold': (row.vs_average[metric] ?? 0) < -10,
                'text-black/45': Math.abs(row.vs_average[metric] ?? 0) <= 10,
              }"
            >
              {{ metric.replace(/_/g, " ") }}
              {{ formatValue(row.metrics[metric] ?? 0) }}
              <span class="text-[10px] opacity-70">
                ({{ vsLabel(row.vs_average[metric] ?? 0) }})
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

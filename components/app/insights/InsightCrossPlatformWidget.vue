<script setup lang="ts">
import type {
  CrossPlatformData,
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
  data: CrossPlatformData;
}>();

function formatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
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
    <div class="space-y-2 border-t border-black/[0.06] pt-3">
      <p class="text-[11px] font-medium uppercase tracking-wide text-black/35">
        {{ data.metric.replace(/_/g, " ") }}
      </p>
      <div v-for="item in data.items" :key="item.connection_slug" class="space-y-1">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[12px] font-medium text-black/70 capitalize">
            {{ item.label.replace(/_/g, " ") }}
          </span>
          <span
            class="text-[13px] font-semibold"
            :class="item.is_winner ? 'text-emerald-600' : 'text-black/55'"
          >
            {{ formatValue(item.value) }}
            <span v-if="item.is_winner" class="ml-0.5 text-[10px]">▲</span>
          </span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
          <div
            class="h-full rounded-full transition-all"
            :class="item.is_winner ? 'bg-emerald-500' : 'bg-black/20'"
            :style="{
              width: `${Math.max(4, (item.value / (Math.max(...data.items.map((i) => i.value)) || 1)) * 100)}%`,
            }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

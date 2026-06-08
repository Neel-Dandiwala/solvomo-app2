<script setup lang="ts">
import type { InsightKind, InsightSeverity, InsightIndicator } from "~/types/insights";

defineProps<{
  headline: string;
  narrative: string;
  insight_kind: InsightKind;
  severity: InsightSeverity;
  indicators: InsightIndicator[];
}>();
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center gap-1.5">
      <span
        class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        :class="{
          'bg-emerald-100 text-emerald-700': insight_kind === 'opportunity',
          'bg-red-100 text-red-700': insight_kind === 'risk',
          'bg-slate-100 text-slate-600': insight_kind === 'neutral',
        }"
      >
        {{ insight_kind }}
      </span>
      <span
        class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        :class="{
          'bg-red-50 text-red-600 ring-1 ring-red-200': severity === 'high',
          'bg-amber-50 text-amber-600 ring-1 ring-amber-200': severity === 'medium',
          'bg-slate-50 text-slate-500 ring-1 ring-slate-200': severity === 'low',
        }"
      >
        {{ severity }}
      </span>
    </div>
    <p class="text-[14px] font-semibold leading-snug tracking-[-0.01em] text-black">
      {{ headline }}
    </p>
    <p class="text-[12px] leading-relaxed text-black/55">{{ narrative }}</p>
    <div v-if="indicators.length" class="flex flex-wrap gap-2 pt-1">
      <span
        v-for="ind in indicators"
        :key="ind.label"
        class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium"
        :class="{
          'bg-emerald-50 text-emerald-700': ind.is_positive,
          'bg-red-50 text-red-700': !ind.is_positive && ind.direction !== 'flat',
          'bg-slate-50 text-slate-600': ind.direction === 'flat',
        }"
      >
        <span v-if="ind.direction === 'up'">↑</span>
        <span v-else-if="ind.direction === 'down'">↓</span>
        <span v-else>→</span>
        {{ ind.label }}
      </span>
    </div>
  </div>
</template>

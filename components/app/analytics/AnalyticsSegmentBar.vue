<script setup lang="ts">
// @ts-nocheck
import { computed } from "vue";

const props = defineProps<{
  segments: Array<{
    label: string;
    value: number;
    valueLabel?: string;
    tone?: "product" | "depth" | "brand" | "neutral";
  }>;
}>();

const segmentList = computed(() => props.segments || []);

/** Plain number for template math (avoid ref edge cases in :style bindings). */
const segmentTotal = computed(() =>
  segmentList.value.reduce((sum, segment) => sum + segment.value, 0),
);

function toneClass(tone?: string) {
  switch (tone) {
    case "depth":
      return "bg-[linear-gradient(90deg,rgba(91,123,225,0.96),rgba(90,79,207,0.92))]";
    case "brand":
      return "bg-[linear-gradient(90deg,rgba(242,213,138,0.96),rgba(216,143,141,0.92))]";
    case "neutral":
      return "bg-black/35";
    default:
      return "bg-[linear-gradient(90deg,rgba(95,199,212,0.96),rgba(91,123,225,0.92))]";
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex h-4 overflow-hidden rounded-full bg-black/[0.05]">
      <div
        v-for="segment in segmentList"
        :key="segment.label"
        class="min-h-[1rem] flex-shrink-0"
        :class="toneClass(segment.tone)"
        :style="{ width: `${(segment.value / Math.max(segmentTotal, 1)) * 100}%` }"
      />
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <div
        v-for="segment in segmentList"
        :key="`${segment.label}-legend`"
        class="sv-card-inset flex items-center justify-between gap-3 rounded-[1rem] px-4 py-3"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="h-2.5 w-2.5 rounded-full" :class="toneClass(segment.tone)" />
          <span class="truncate text-[14px] font-medium text-black/72">{{ segment.label }}</span>
        </div>
        <div class="text-right">
          <div class="text-[14px] font-semibold text-black">
            {{ segment.valueLabel || `${Math.round((segment.value / Math.max(segmentTotal, 1)) * 100)}%` }}
          </div>
          <div class="text-[12px] text-black/46">
            {{ Math.round((segment.value / Math.max(segmentTotal, 1)) * 100) }}%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

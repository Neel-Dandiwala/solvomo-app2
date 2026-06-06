<script setup lang="ts">
// @ts-nocheck

type SegmentColor = "brand" | "product" | "interaction" | "depth";

const props = withDefaults(
  defineProps<{
    segments: Array<{ label: string; value: number; color: SegmentColor; detail?: string }>;
    compact?: boolean;
    centerLabel?: string;
    centerValue?: string;
  }>(),
  {
    compact: true,
    centerLabel: "Mix",
    centerValue: "",
  },
);

function colorValue(color: SegmentColor) {
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

const total = computed(() => props.segments.reduce((sum, s) => sum + s.value, 0) || 1);

const donutStyle = computed(() => {
  let cursor = 0;
  const stops = props.segments.map((segment) => {
    const start = (cursor / total.value) * 100;
    cursor += segment.value;
    const end = (cursor / total.value) * 100;
    return `${colorValue(segment.color)} ${start}% ${end}%`;
  });
  return { background: `conic-gradient(${stops.join(", ")})` };
});

function segmentShare(value: number) {
  return `${Math.round((value / total.value) * 100)}%`;
}

function formatCompactTotal(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

const centerDisplay = computed(() => props.centerValue || formatCompactTotal(total.value));
</script>

<template>
  <div class="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] sm:items-center sm:gap-4">
    <div
      class="mx-auto flex shrink-0 items-center justify-center rounded-full border border-black/[0.07]"
      :class="compact ? 'h-[6.5rem] w-[6.5rem] sm:h-[7.25rem] sm:w-[7.25rem]' : 'h-36 w-36'"
      :style="donutStyle"
    >
      <div
        class="flex flex-col items-center justify-center rounded-full bg-white"
        :class="compact ? 'h-[4.25rem] w-[4.25rem] sm:h-[4.75rem] sm:w-[4.75rem]' : 'h-[5.5rem] w-[5.5rem]'"
      >
        <span class="text-[10px] font-semibold uppercase tracking-wide text-black/40">{{ centerLabel }}</span>
        <span class="mt-0.5 text-center text-[0.8125rem] font-semibold tabular-nums leading-tight tracking-tight text-black sm:text-lg">
          {{ centerDisplay }}
        </span>
      </div>
    </div>
    <div class="min-w-0 divide-y divide-black/[0.06]">
      <div
        v-for="segment in segments"
        :key="segment.label"
        class="flex items-start justify-between gap-2 py-2 first:pt-0 last:pb-0"
      >
        <div class="flex min-w-0 items-center gap-2">
          <span class="mt-1 h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: colorValue(segment.color) }" />
          <span class="text-[12px] font-medium leading-snug text-black/70 sm:text-[13px]">{{ segment.label }}</span>
        </div>
        <div class="shrink-0 text-right">
          <div class="text-[12px] font-semibold tabular-nums text-black sm:text-[13px]">{{ segmentShare(segment.value) }}</div>
          <div class="text-[11px] tabular-nums text-black/45">{{ segment.detail || segment.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

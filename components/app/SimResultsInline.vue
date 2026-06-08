<script setup lang="ts">
import type { SimulationRunResult } from "~/types/simulation";

defineProps<{
  result: SimulationRunResult;
  totals: { spend: number; value: number; conversions: number };
  isPlayground: boolean;
}>();
</script>

<template>
  <div class="px-4 py-4">
    <!-- Confidence + sandbox note -->
    <div class="mb-4 flex items-center gap-3">
      <span class="font-mono text-[11px] text-black/45">
        {{ Math.round((result.confidence_score || 0) * 100) }}% conf.
      </span>
      <span v-if="isPlayground" class="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
        Sandbox
      </span>
    </div>

    <!-- Key metric grid -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="sim-result-cell">
        <div class="sim-result-label">ROAS</div>
        <div class="sim-result-value">
          {{ totals.spend > 0 ? (totals.value / totals.spend).toFixed(2) : "—" }}x
        </div>
      </div>
      <div class="sim-result-cell">
        <div class="sim-result-label">Revenue</div>
        <div class="sim-result-value">{{ formatCompactCurrency(totals.value) }}</div>
      </div>
      <div class="sim-result-cell">
        <div class="sim-result-label">Conversions</div>
        <div class="sim-result-value">{{ formatCompactNumber(totals.conversions) }}</div>
      </div>
      <div class="sim-result-cell">
        <div class="sim-result-label">CPA</div>
        <div class="sim-result-value">
          {{ totals.conversions > 0 ? formatCurrency(totals.spend / totals.conversions, 0) : "—" }}
        </div>
      </div>
    </div>

    <!-- Summary -->
    <p v-if="result.summary" class="mt-4 text-[13px] leading-relaxed text-black/60">
      {{ result.summary }}
    </p>

    <!-- Reasoning claims (collapsed by default) -->
    <details v-if="result.reasoning?.length" class="mt-3">
      <summary class="cursor-pointer select-none text-[11px] font-bold uppercase tracking-wide text-black/38 hover:text-black/55">
        Assumptions ({{ result.reasoning.length }})
      </summary>
      <ul class="mt-2 space-y-1">
        <li
          v-for="(item, i) in result.reasoning"
          :key="i"
          class="flex items-start gap-2 text-[12px] leading-relaxed text-black/55"
        >
          <span class="mt-0.5 shrink-0 font-mono text-[10px] text-black/28">{{ String(i + 1).padStart(2, "0") }}</span>
          <span>{{ typeof item === "string" ? item : item.claim }}</span>
        </li>
      </ul>
    </details>

    <!-- Warnings -->
    <div v-if="result.warnings?.length" class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
      <p
        v-for="(w, i) in result.warnings"
        :key="i"
        class="text-[12px] leading-relaxed text-amber-800"
      >
        {{ w }}
      </p>
    </div>

    <!-- Source coverage chips -->
    <div v-if="result.source_coverage" class="mt-3 flex flex-wrap gap-1.5">
      <span
        v-for="[key, active] in Object.entries(result.source_coverage)"
        :key="key"
        class="rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        :class="active ? 'border-black/[0.08] bg-black/[0.03] text-black/45' : 'border-black/[0.04] text-black/20 line-through'"
      >
        {{ key.replace(/^used_/, "").replace(/_/g, " ") }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.sim-result-cell {
  @apply rounded-xl border border-black/[0.07] bg-black/[0.02] px-3 py-3;
}

.sim-result-label {
  @apply text-[10px] font-bold uppercase tracking-wide text-black/38;
}

.sim-result-value {
  @apply mt-1 font-mono text-[18px] font-semibold leading-tight text-black;
}
</style>

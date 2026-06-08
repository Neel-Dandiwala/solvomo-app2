<script setup lang="ts">
import {
  ArrowLeft,
  BarChart2,
  BookOpen,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  DatabaseZap,
  FileText,
  Lightbulb,
  TriangleAlert,
  Zap,
} from "lucide-vue-next";
import type { SimulationAnalysisTab, SimulationRunResult } from "~/types/simulation";

definePageMeta({ layout: "app" });

const route = useRoute();
const { stored } = useSimulationResult();

const simId = computed(() => String(route.params.id));

const runData = computed(() => {
  if (stored.value?.sim_id === simId.value) return stored.value;
  return null;
});

const result = computed<SimulationRunResult | null>(() => runData.value?.result ?? null);
const analysisTab = computed<SimulationAnalysisTab>(() => runData.value?.analysis_tab ?? "forecast");
const simName = computed(() => runData.value?.sim_name ?? "Simulation");

useHead({ title: computed(() => `${simName.value} — Results`) });

// ── Navigation ───────────────────────────────────────────────────────────────
type Section = "summary" | "focused" | "forecast" | "reasoning" | "evidence" | "assumptions" | "pipeline" | "coverage";

const activeSection = ref<Section>("summary");

const NAV_ITEMS: { id: Section; label: string; icon: unknown }[] = [
  { id: "summary", label: "Summary", icon: FileText },
  { id: "focused", label: "Focused Analysis", icon: Zap },
  { id: "forecast", label: "Forecast", icon: BarChart2 },
  { id: "reasoning", label: "Reasoning", icon: Lightbulb },
  { id: "evidence", label: "Evidence", icon: BookOpen },
  { id: "assumptions", label: "Assumptions", icon: ClipboardList },
  { id: "pipeline", label: "Pipeline Steps", icon: ChevronRight },
  { id: "coverage", label: "Source Coverage", icon: DatabaseZap },
];

const FOCUS_LABELS: Record<SimulationAnalysisTab, { label: string; description: string }> = {
  forecast: { label: "Overall Forecast", description: "Full-funnel performance estimate using all available inputs." },
  creative: { label: "Creative Performance", description: "Variant comparison by theme, format, and historical signals." },
  copy: { label: "Copy & CTA", description: "Copy clarity, CTA alignment, and messaging trends." },
  audience: { label: "Audience Fit", description: "Audience quality, saturation, and brand alignment." },
  placement: { label: "Placement Fit", description: "Feed, story, and reels eligibility per variant." },
  platform: { label: "Platform Readiness", description: "Platform performance and connection coverage." },
  budget: { label: "Budget Sufficiency", description: "Budget adequacy for the selected performance goals." },
  offer: { label: "Offer Strength", description: "Offer competitiveness and conversion fit." },
  timing: { label: "Timing & Seasonality", description: "Timing, holidays, and seasonal impact." },
};

// ── Derived metrics ───────────────────────────────────────────────────────────
const outputMetrics = ["SPEND", "CLICKS_ALL", "CTR_ALL", "CONVERSIONS", "ROAS", "COST_PER_CONVERSION"] as const;
type OutputMetric = (typeof outputMetrics)[number];
const selectedMetric = ref<OutputMetric>("ROAS");

const totals = computed(() => {
  if (!result.value) return { spend: 0, value: 0, conversions: 0, roas: 0, cpa: 0 };
  return result.value.daily_forecast.reduce(
    (t, r) => {
      t.spend += r.metrics.SPEND || 0;
      t.value += r.metrics.CONVERSION_VALUE || 0;
      t.conversions += r.metrics.CONVERSIONS || 0;
      return t;
    },
    { spend: 0, value: 0, conversions: 0, roas: 0, cpa: 0 }
  );
});

const roasDerived = computed(() => totals.value.spend > 0 ? totals.value.value / totals.value.spend : 0);
const cpaDerived = computed(() => totals.value.conversions > 0 ? totals.value.spend / totals.value.conversions : 0);

const confidencePct = computed(() => Math.round((result.value?.confidence_score ?? 0) * 100));

const coverageBadges = computed(() => {
  const c = result.value?.source_coverage;
  if (!c) return [];
  return [
    { label: "Config", active: c.used_config },
    { label: "AI", active: c.used_ai },
    { label: "Web", active: c.used_web },
    { label: "Integration", active: c.used_integration },
    { label: "Market Data", active: c.used_market_data },
    { label: "Calibrated Model", active: c.used_calibrated_model },
    { label: "Assumptions", active: c.used_assumptions },
    { label: "Provider Fallback", active: c.used_provider_fallback },
  ];
});

const chartMax = computed(() => {
  if (!result.value) return 1;
  const vals = result.value.daily_forecast.map((r) => r.metrics[selectedMetric.value] ?? 0);
  return Math.max(...vals, 0.001);
});
</script>

<template>
  <div v-if="!result" class="flex flex-col items-center justify-center py-24 text-center">
    <p class="text-[15px] font-semibold text-black/60">No results found for this simulation.</p>
    <p class="mt-1 text-[13px] text-black/40">Run the simulation first from the builder.</p>
    <NuxtLink to="/app/simulation" class="mt-4 app-button button-secondary gap-1.5 px-4">
      <ArrowLeft class="h-4 w-4" :stroke-width="1.9" />
      Back to builder
    </NuxtLink>
  </div>

  <div v-else class="max-w-full pb-16">
    <!-- Top bar -->
    <div class="mb-4 flex items-center gap-3">
      <NuxtLink to="/app/simulation" class="flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] font-semibold text-black/55 hover:bg-black/[0.03] transition-colors">
        <ArrowLeft class="h-3.5 w-3.5" :stroke-width="2" />
        Builder
      </NuxtLink>
      <div class="flex-1 min-w-0">
        <h1 class="text-[15px] font-bold leading-snug text-black truncate">{{ simName }}</h1>
        <p class="text-[12px] text-black/40">
          {{ FOCUS_LABELS[analysisTab].label }} ·
          ran {{ runData?.ran_at ? new Date(runData.ran_at).toLocaleString() : "just now" }}
        </p>
      </div>
      <!-- Status badges -->
      <span
        class="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
        :class="result.status === 'complete' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'"
      >
        {{ result.status }}
      </span>
      <span
        v-if="result.eval_status"
        class="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
        :class="result.eval_status === 'accepted' ? 'border-black/10 bg-black/[0.03] text-black/50' : 'border-amber-200 bg-amber-50 text-amber-700'"
      >
        {{ result.eval_status }}
      </span>
    </div>

    <!-- Two-column layout: left nav + main content -->
    <div class="grid gap-4 lg:grid-cols-[13rem_1fr] items-start">

      <!-- Left sidebar nav -->
      <nav class="lg:sticky lg:top-4 rounded-2xl border border-black/[0.07] bg-white p-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <button
          v-for="item in NAV_ITEMS"
          :key="item.id"
          type="button"
          class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors duration-150"
          :class="activeSection === item.id ? 'bg-black/[0.05]' : 'hover:bg-black/[0.03]'"
          @click="activeSection = item.id"
        >
          <component :is="item.icon" class="h-3.5 w-3.5 shrink-0" :class="activeSection === item.id ? 'text-black' : 'text-black/35'" :stroke-width="1.9" />
          <span class="text-[13px] font-semibold" :class="activeSection === item.id ? 'text-black' : 'text-black/55'">{{ item.label }}</span>
        </button>
      </nav>

      <!-- Main content -->
      <main class="min-w-0 space-y-4">

        <!-- ── SUMMARY ── -->
        <div v-show="activeSection === 'summary'" class="space-y-4">
          <!-- Confidence + key metrics -->
          <div class="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div class="mb-4 flex items-center justify-between gap-4">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-wide text-black/40">Confidence Score</p>
                <p class="mt-1 font-mono text-[28px] font-semibold text-black">{{ confidencePct }}%</p>
              </div>
              <div class="flex-1">
                <div class="h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="confidencePct >= 70 ? 'bg-emerald-500' : confidencePct >= 45 ? 'bg-amber-400' : 'bg-rose-400'"
                    :style="{ width: `${confidencePct}%` }"
                  />
                </div>
                <p class="mt-1.5 text-[12px] text-black/40">
                  Forecast window: <strong class="text-black/60">{{ result.forecast_days }} days</strong>
                  <span v-if="result.winner_variant_id"> · Winner: <strong class="text-black/60">{{ result.winner_variant_id }}</strong></span>
                </p>
              </div>
            </div>

            <!-- Key metrics grid -->
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div class="rounded-xl border border-black/[0.07] bg-black/[0.02] px-3 py-3">
                <p class="text-[10px] font-bold uppercase tracking-wide text-black/38">ROAS</p>
                <p class="mt-1 font-mono text-[20px] font-semibold text-black">{{ roasDerived.toFixed(2) }}x</p>
              </div>
              <div class="rounded-xl border border-black/[0.07] bg-black/[0.02] px-3 py-3">
                <p class="text-[10px] font-bold uppercase tracking-wide text-black/38">Revenue</p>
                <p class="mt-1 font-mono text-[20px] font-semibold text-black">{{ formatCompactCurrency(totals.value) }}</p>
              </div>
              <div class="rounded-xl border border-black/[0.07] bg-black/[0.02] px-3 py-3">
                <p class="text-[10px] font-bold uppercase tracking-wide text-black/38">Conversions</p>
                <p class="mt-1 font-mono text-[20px] font-semibold text-black">{{ formatCompactNumber(totals.conversions) }}</p>
              </div>
              <div class="rounded-xl border border-black/[0.07] bg-black/[0.02] px-3 py-3">
                <p class="text-[10px] font-bold uppercase tracking-wide text-black/38">CPA</p>
                <p class="mt-1 font-mono text-[20px] font-semibold text-black">{{ cpaDerived > 0 ? formatCurrency(cpaDerived, 0) : "—" }}</p>
              </div>
            </div>
          </div>

          <!-- Summary narrative -->
          <div class="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p class="mb-3 text-[11px] font-bold uppercase tracking-wide text-black/40">Summary</p>
            <p class="text-[14px] leading-relaxed text-black/80">{{ result.summary }}</p>
          </div>

          <!-- Warnings -->
          <div v-if="result.warnings?.length" class="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div class="mb-2 flex items-center gap-2">
              <TriangleAlert class="h-4 w-4 text-amber-600" :stroke-width="2" />
              <p class="text-[12px] font-bold uppercase tracking-wide text-amber-700">Warnings</p>
            </div>
            <ul class="space-y-1">
              <li v-for="(w, i) in result.warnings" :key="i" class="text-[13px] leading-relaxed text-amber-800">{{ w }}</li>
            </ul>
          </div>

          <!-- Source coverage mini -->
          <div class="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p class="mb-2 text-[11px] font-bold uppercase tracking-wide text-black/40">Sources used</p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="badge in coverageBadges"
                :key="badge.label"
                class="rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                :class="badge.active ? 'border-black/[0.12] bg-black/[0.05] text-black/60' : 'border-black/[0.06] bg-transparent text-black/25 line-through'"
              >
                {{ badge.label }}
              </span>
            </div>
          </div>
        </div>

        <!-- ── FOCUSED ANALYSIS ── -->
        <div v-show="activeSection === 'focused'" class="space-y-4">
          <div class="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div class="mb-4 flex items-start gap-3">
              <Zap class="mt-0.5 h-5 w-5 shrink-0 text-[#5B7BE1]" :stroke-width="1.9" />
              <div>
                <h2 class="text-[15px] font-bold text-black">{{ FOCUS_LABELS[analysisTab].label }}</h2>
                <p class="mt-0.5 text-[13px] text-black/50">{{ FOCUS_LABELS[analysisTab].description }}</p>
              </div>
            </div>

            <p class="mb-4 text-[14px] leading-relaxed text-black/75">{{ result.summary }}</p>

            <!-- Top reasoning claims -->
            <div v-if="result.reasoning?.length" class="space-y-2">
              <p class="text-[11px] font-bold uppercase tracking-wide text-black/40">Key findings</p>
              <div
                v-for="(item, i) in result.reasoning.slice(0, 4)"
                :key="i"
                class="flex items-start gap-3 rounded-xl border border-black/[0.06] bg-black/[0.015] px-4 py-3"
              >
                <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/[0.06] font-mono text-[10px] font-bold text-black/50">
                  {{ i + 1 }}
                </span>
                <p class="text-[13px] leading-relaxed text-black/70">
                  {{ typeof item === "string" ? item : item.claim }}
                </p>
              </div>
            </div>

            <!-- Winner variant -->
            <div v-if="result.winner_variant_id" class="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle class="h-4 w-4 shrink-0 text-emerald-600" :stroke-width="2" />
              <div>
                <p class="text-[12px] font-bold text-emerald-800">Recommended variant</p>
                <p class="font-mono text-[13px] font-semibold text-emerald-900">{{ result.winner_variant_id }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── FORECAST ── -->
        <div v-show="activeSection === 'forecast'" class="space-y-4">
          <div class="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div class="mb-4 flex items-center justify-between gap-4">
              <p class="text-[11px] font-bold uppercase tracking-wide text-black/40">Daily Forecast</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="m in outputMetrics"
                  :key="m"
                  type="button"
                  class="rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors duration-150"
                  :class="selectedMetric === m ? 'border-black bg-black text-white' : 'border-black/[0.10] bg-white text-black/55 hover:border-black/[0.20]'"
                  @click="selectedMetric = m as OutputMetric"
                >
                  {{ m.replace(/_ALL$/, "").replace(/_/g, " ") }}
                </button>
              </div>
            </div>

            <!-- Simple bar chart -->
            <div class="flex items-end gap-1 overflow-x-auto" style="height: 120px;">
              <div
                v-for="(row, i) in result.daily_forecast"
                :key="i"
                class="relative flex flex-1 flex-col items-center"
                style="min-width: 12px;"
              >
                <div
                  class="w-full rounded-t-sm bg-[#5B7BE1]/60 transition-all duration-300"
                  :style="{ height: `${Math.max(2, ((row.metrics[selectedMetric] ?? 0) / chartMax) * 104)}px` }"
                  :title="`${row.date}: ${row.metrics[selectedMetric] ?? 0}`"
                />
              </div>
            </div>
            <div class="mt-1 flex justify-between text-[10px] text-black/30">
              <span>{{ result.daily_forecast[0]?.date }}</span>
              <span>{{ result.daily_forecast[result.daily_forecast.length - 1]?.date }}</span>
            </div>
          </div>

          <!-- Forecast table -->
          <div class="rounded-2xl border border-black/[0.07] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-[12px]">
                <thead>
                  <tr class="border-b border-black/[0.06] bg-black/[0.02]">
                    <th class="px-4 py-2.5 text-left font-bold uppercase tracking-wide text-black/40">Date</th>
                    <th v-for="m in outputMetrics" :key="m" class="px-3 py-2.5 text-right font-bold uppercase tracking-wide text-black/40">
                      {{ m.replace(/_ALL$/, "").replace(/_/g, " ") }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, i) in result.daily_forecast"
                    :key="i"
                    class="border-b border-black/[0.04] hover:bg-black/[0.015]"
                  >
                    <td class="px-4 py-2 font-mono text-black/60">{{ row.date }}</td>
                    <td v-for="m in outputMetrics" :key="m" class="px-3 py-2 text-right font-mono text-black/70">
                      {{ row.metrics[m] != null ? (m === 'CTR_ALL' ? `${(row.metrics[m]! * 100).toFixed(2)}%` : m === 'ROAS' ? `${(row.metrics[m]!).toFixed(2)}x` : formatCompactCurrency(row.metrics[m]!)) : "—" }}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="border-t border-black/[0.10] bg-black/[0.02] font-bold">
                    <td class="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-black/50">{{ result.forecast_days }}d Total</td>
                    <td class="px-3 py-2.5 text-right font-mono text-black">{{ formatCompactCurrency(totals.spend) }}</td>
                    <td class="px-3 py-2.5 text-right text-black/30">—</td>
                    <td class="px-3 py-2.5 text-right text-black/30">—</td>
                    <td class="px-3 py-2.5 text-right font-mono text-black">{{ formatCompactNumber(totals.conversions) }}</td>
                    <td class="px-3 py-2.5 text-right font-mono text-black">{{ roasDerived.toFixed(2) }}x</td>
                    <td class="px-3 py-2.5 text-right font-mono text-black">{{ cpaDerived > 0 ? formatCurrency(cpaDerived, 0) : "—" }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <!-- ── REASONING ── -->
        <div v-show="activeSection === 'reasoning'" class="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p class="mb-4 text-[11px] font-bold uppercase tracking-wide text-black/40">Reasoning claims</p>
          <div v-if="result.reasoning?.length" class="space-y-2">
            <div
              v-for="(item, i) in result.reasoning"
              :key="i"
              class="rounded-xl border border-black/[0.06] px-4 py-3"
            >
              <div class="flex items-start gap-3">
                <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/[0.06] font-mono text-[10px] font-bold text-black/50">
                  {{ i + 1 }}
                </span>
                <div class="min-w-0">
                  <p class="text-[13px] leading-relaxed text-black/75">
                    {{ typeof item === "string" ? item : item.claim }}
                  </p>
                  <div v-if="typeof item !== 'string' && item.evidence_ids?.length" class="mt-1.5 flex flex-wrap gap-1">
                    <span
                      v-for="eid in item.evidence_ids"
                      :key="eid"
                      class="rounded border border-black/[0.08] bg-black/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-black/45"
                    >
                      {{ eid }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="text-[13px] text-black/40">No reasoning claims returned.</p>
        </div>

        <!-- ── EVIDENCE ── -->
        <div v-show="activeSection === 'evidence'" class="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p class="mb-4 text-[11px] font-bold uppercase tracking-wide text-black/40">Evidence ({{ result.evidence?.length ?? 0 }})</p>
          <div v-if="result.evidence?.length" class="space-y-2">
            <details
              v-for="(ev, i) in result.evidence"
              :key="i"
              class="rounded-xl border border-black/[0.07] px-4 py-3"
            >
              <summary class="flex cursor-pointer items-center gap-3">
                <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-black/[0.08] font-mono text-[10px] font-bold text-black/45">
                  {{ String(i + 1).padStart(2, "0") }}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="text-[13px] font-semibold text-black">{{ ev.label }}</p>
                  <p class="text-[11px] text-black/40">{{ ev.source }} · confidence {{ Math.round((ev.confidence ?? 0) * 100) }}%</p>
                </div>
              </summary>
              <pre v-if="ev.data" class="mt-3 overflow-x-auto rounded-lg bg-black/[0.03] p-3 text-[11px] text-black/60">{{ JSON.stringify(ev.data, null, 2) }}</pre>
            </details>
          </div>
          <p v-else class="text-[13px] text-black/40">No evidence items returned.</p>
        </div>

        <!-- ── ASSUMPTIONS ── -->
        <div v-show="activeSection === 'assumptions'" class="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p class="mb-4 text-[11px] font-bold uppercase tracking-wide text-black/40">Assumptions ({{ result.assumptions?.length ?? 0 }})</p>
          <ul v-if="result.assumptions?.length" class="space-y-2">
            <li
              v-for="(a, i) in result.assumptions"
              :key="i"
              class="flex items-start gap-3 text-[13px] leading-relaxed text-black/65"
            >
              <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-black/25" />
              {{ a }}
            </li>
          </ul>
          <p v-else class="text-[13px] text-black/40">No assumptions logged.</p>
        </div>

        <!-- ── PIPELINE STEPS ── -->
        <div v-show="activeSection === 'pipeline'" class="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p class="mb-4 text-[11px] font-bold uppercase tracking-wide text-black/40">Pipeline steps ({{ result.step_results?.length ?? 0 }})</p>
          <div v-if="result.step_results?.length" class="overflow-x-auto">
            <table class="w-full text-[12px]">
              <thead>
                <tr class="border-b border-black/[0.06]">
                  <th class="pb-2 pr-4 text-left font-bold uppercase tracking-wide text-black/40">Step</th>
                  <th class="pb-2 pr-4 text-left font-bold uppercase tracking-wide text-black/40">Status</th>
                  <th class="pb-2 pr-4 text-right font-bold uppercase tracking-wide text-black/40">Duration</th>
                  <th class="pb-2 text-left font-bold uppercase tracking-wide text-black/40">Warnings</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(step, i) in result.step_results"
                  :key="i"
                  class="border-b border-black/[0.04]"
                >
                  <td class="py-2 pr-4 font-mono text-black/65">{{ step.step_name }}</td>
                  <td class="py-2 pr-4">
                    <span
                      class="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      :class="step.status === 'ok' || step.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'"
                    >
                      {{ step.status }}
                    </span>
                  </td>
                  <td class="py-2 pr-4 text-right font-mono text-black/45">{{ step.duration_ms }}ms</td>
                  <td class="py-2 text-black/40">{{ step.warnings?.join("; ") || "—" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-[13px] text-black/40">No pipeline steps returned.</p>
        </div>

        <!-- ── SOURCE COVERAGE ── -->
        <div v-show="activeSection === 'coverage'" class="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p class="mb-4 text-[11px] font-bold uppercase tracking-wide text-black/40">Source Coverage</p>
          <p class="mb-4 text-[13px] leading-relaxed text-black/55">
            Indicates which data layers were used during inference. Active layers improve confidence; missing layers reduce it.
          </p>
          <div class="grid gap-2 sm:grid-cols-2">
            <div
              v-for="badge in coverageBadges"
              :key="badge.label"
              class="flex items-center gap-3 rounded-xl border px-4 py-3"
              :class="badge.active ? 'border-black/[0.07] bg-black/[0.02]' : 'border-black/[0.05] bg-transparent opacity-40'"
            >
              <span
                class="h-2.5 w-2.5 shrink-0 rounded-full"
                :class="badge.active ? 'bg-emerald-500' : 'bg-black/20'"
              />
              <span class="text-[13px] font-semibold text-black">{{ badge.label }}</span>
              <span class="ml-auto text-[11px] font-bold uppercase tracking-wide" :class="badge.active ? 'text-emerald-600' : 'text-black/25'">
                {{ badge.active ? "Used" : "Not used" }}
              </span>
            </div>
          </div>
        </div>

      </main>
    </div>
  </div>
</template>

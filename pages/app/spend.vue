<script setup lang="ts">
import { CalendarRange, Download, Plug } from "lucide-vue-next";
import {
  formatSpendDelta,
  useSpendTab,
  type SpendCampaignRow,
} from "~/composables/useSpendTab";

definePageMeta({ layout: "app" });

useHead({ title: "Spend — Solvomo" });

const ALL_SCOPE = "All";


const {
  summary,
  byConnection,
  series,
  campaigns,
  loading,
  error,
  hasSpendConnections,
  refresh,
} = useSpendTab();

const selectedRange = ref("Last 30 days");
const selectedChannel = ref(ALL_SCOPE);
const compareEnabled = ref(true);

const rangeDays = computed(() => {
  switch (selectedRange.value) {
    case "Last 8 weeks":
      return 56;
    case "Quarter to date":
      return 90;
    default:
      return 30;
  }
});

onMounted(() => {
  void refresh({ days: rangeDays.value, compare: compareEnabled.value });
});

watch([selectedRange, compareEnabled], () => {
  void refresh({ days: rangeDays.value, compare: compareEnabled.value });
});

const performanceChannels = computed(() => {
  const names =
    byConnection.value?.connections
      .filter((c) => c.status === "ok")
      .map((c) => c.name) ?? [];
  return [ALL_SCOPE, ...Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))];
});

const filteredCampaigns = computed(() => {
  const rows = campaigns.value?.campaigns ?? [];
  if (selectedChannel.value === ALL_SCOPE) return rows;
  return rows.filter((c: SpendCampaignRow) => c.channel === selectedChannel.value);
});

const filteredTotals = computed(() => {
  if (selectedChannel.value === ALL_SCOPE && summary.value?.totals) {
    return {
      spend: summary.value.totals.spend,
      revenue: summary.value.totals.revenue,
      cac: summary.value.totals.cac,
      mer: summary.value.totals.roas,
    };
  }
  const conn = byConnection.value?.connections.find((c) => c.name === selectedChannel.value);
  if (conn?.metrics) {
    return {
      spend: conn.metrics.spend,
      revenue: conn.metrics.revenue,
      cac: conn.metrics.cac,
      mer: conn.metrics.roas,
    };
  }
  const spend = filteredCampaigns.value.reduce((t, r) => t + r.spend, 0);
  const revenue = filteredCampaigns.value.reduce((t, r) => t + r.revenue, 0);
  const conversions = filteredCampaigns.value.reduce((t, r) => t + r.conversions, 0);
  return {
    spend,
    revenue,
    cac: conversions ? spend / conversions : 0,
    mer: spend ? revenue / spend : 0,
  };
});

const blendedBudgetFromPacing = computed(() =>
  filteredCampaigns.value.reduce((t, row) => t + row.budget, 0),
);
const blendedActualFromPacing = computed(() =>
  filteredCampaigns.value.reduce((t, row) => t + row.spend, 0),
);
const budgetPacingPct = computed(() =>
  blendedBudgetFromPacing.value
    ? (blendedActualFromPacing.value / blendedBudgetFromPacing.value) * 100
    : 0,
);

const dailyAverageSpend = computed(() => {
  const days = summary.value?.days ?? rangeDays.value;
  return days > 0 ? filteredTotals.value.spend / days : 0;
});

const metadataItems = computed(() => [
  {
    label: "Period",
    value: selectedRange.value,
  },
  {
    label: "Compared",
    value: compareEnabled.value ? `vs previous ${rangeDays.value} days` : "Off",
  },
  {
    label: "Campaigns in view",
    value: `${filteredCampaigns.value.length}`,
  },
  {
    label: "Connections",
    value: `${byConnection.value?.connections.filter((c) => c.status === "ok").length ?? 0}`,
  },
]);

const seriesPoints = computed(() => {
  if (selectedChannel.value === ALL_SCOPE) {
    return series.value?.points ?? [];
  }
  const conn = series.value?.by_connection.find((c) => c.name === selectedChannel.value);
  return conn?.points ?? [];
});

const kpis = computed(() => {
  const totals = filteredTotals.value;
  const spendDelta = formatSpendDelta(summary.value?.spend_change_pct);
  const roasDelta = formatSpendDelta(summary.value?.roas_change_pct);
  const trend = seriesPoints.value.map((p) => p.spend);

  return [
    {
      title: "Total Spend",
      value: loading.value ? "…" : formatCompactCurrency(totals.spend),
      delta: compareEnabled.value ? spendDelta : "—",
      helper: "Paid + tracked",
      tone: "info" as const,
      trend,
    },
    {
      title: "Daily Avg",
      value: loading.value ? "…" : formatCurrency(dailyAverageSpend.value),
      delta: "—",
      helper: `${summary.value?.days ?? rangeDays.value}-day avg`,
      tone: "neutral" as const,
      trend,
    },
    {
      title: "Budget Pacing",
      value: loading.value ? "…" : formatPercent(budgetPacingPct.value, 1),
      delta: budgetPacingPct.value > 100 ? "Over plan" : "Within plan",
      helper: "Actual vs campaign budget",
      tone: budgetPacingPct.value > 100 ? ("warning" as const) : ("success" as const),
      trend,
    },
    {
      title: "CAC",
      value: loading.value ? "…" : formatCurrency(totals.cac),
      delta: "—",
      helper: "Blended",
      tone: "neutral" as const,
      trend,
    },
    {
      title: "Blended ROAS",
      value: loading.value ? "…" : formatMultiplier(totals.mer, 1),
      delta: compareEnabled.value ? roasDelta : "—",
      helper: "Revenue / spend",
      tone: "success" as const,
      trend,
    },
  ];
});

function kpiColClass(index: number) {
  return index < 3 ? "col-span-12 sm:col-span-6 xl:col-span-4" : "col-span-12 sm:col-span-6 xl:col-span-6";
}

const channelBreakdownSpend = computed(() => {
  const grouped = new Map<string, { spend: number; revenue: number }>();
  for (const c of filteredCampaigns.value) {
    const cur = grouped.get(c.channel) || { spend: 0, revenue: 0 };
    cur.spend += c.spend;
    cur.revenue += c.revenue;
    grouped.set(c.channel, cur);
  }
  if (!grouped.size && byConnection.value) {
    for (const conn of byConnection.value.connections) {
      if (conn.status !== "ok" || !conn.metrics) continue;
      grouped.set(conn.name, {
        spend: conn.metrics.spend,
        revenue: conn.metrics.revenue,
      });
    }
  }
  return Array.from(grouped.entries())
    .map(([label, v]) => ({
      label,
      spend: v.spend,
      revenue: v.revenue,
      roas: v.spend > 0 ? v.revenue / v.spend : 0,
    }))
    .sort((a, b) => b.spend - a.spend);
});

const objectiveBreakdownSpend = computed(() => {
  const grouped = new Map<string, { spend: number; revenue: number }>();
  filteredCampaigns.value.forEach((c: SpendCampaignRow) => {
    const cur = grouped.get(c.objective) || { spend: 0, revenue: 0 };
    cur.spend += c.spend;
    cur.revenue += c.revenue;
    grouped.set(c.objective, cur);
  });
  return Array.from(grouped.entries())
    .map(([label, v]) => ({
      label,
      spend: v.spend,
      revenue: v.revenue,
      roas: v.spend > 0 ? v.revenue / v.spend : 0,
    }))
    .sort((a, b) => b.spend - a.spend);
});

const budgetSplitRows = computed(() => {
  const rows = channelBreakdownSpend.value;
  const total = rows.reduce((s, r) => s + r.spend, 0) || 1;
  return rows.map((r) => ({ ...r, widthPct: (r.spend / total) * 100 }));
});

const objectiveBarsMax = computed(() =>
  Math.max(1, ...objectiveBreakdownSpend.value.map((r) => r.spend)),
);

const weeklyRows = computed(() => {
  const points = seriesPoints.value;
  if (!points.length) return [];
  const weeks: { label: string; actual: number; roas: number }[] = [];
  for (let i = 0; i < points.length; i += 7) {
    const chunk = points.slice(i, i + 7);
    const actual = chunk.reduce((s, p) => s + p.spend, 0);
    weeks.push({
      label: `Wk ${weeks.length + 1}`,
      actual,
      roas: 0,
    });
  }
  return weeks.map((row, index) => ({
    id: `wk-${index + 1}`,
    week: row.label,
    actual: formatCompactCurrency(row.actual),
    budget: "—",
    variance: "—",
    driver: "—",
    roas: "—",
  }));
});

const pacingRows = computed(() =>
  [...filteredCampaigns.value]
    .sort((left, right) => right.spend - left.spend)
    .map((row) => ({
      id: row.id,
      campaign: row.name,
      channel: row.channel,
      objective: row.objective,
      budget: formatCompactCurrency(row.budget),
      actual: formatCompactCurrency(row.spend),
      pace: formatPercent(row.pace_pct, 0),
      alert: row.alert,
      rawPace: row.pace_pct,
    })),
);

const chartMax = computed(() =>
  Math.max(1, ...seriesPoints.value.map((p) => p.spend)),
);

const lineChartPointsActual = computed(() => {
  const pts = seriesPoints.value;
  if (!pts.length) return "";
  return pts
    .map((p, i) => {
      const x = pts.length === 1 ? 50 : (i / (pts.length - 1)) * 100;
      const y = 56 - (p.spend / chartMax.value) * 56;
      return `${x},${y}`;
    })
    .join(" ");
});

const chartLabels = computed(() => {
  const pts = seriesPoints.value;
  if (!pts.length) return [];
  return pts.map((p, index) => {
    if (index === 0 || index === pts.length - 1 || index % 7 === 0) {
      const d = new Date(`${p.date}T00:00:00Z`);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    return "";
  });
});

const weeklyColumns = [
  { key: "week", label: "Week" },
  { key: "actual", label: "Spend" },
];

const pacingColumns = [
  { key: "campaign", label: "Campaign" },
  { key: "channel", label: "Channel" },
  { key: "objective", label: "Objective" },
  { key: "budget", label: "Budget" },
  { key: "actual", label: "Actual" },
  { key: "pace", label: "Pace" },
  { key: "alert", label: "Alert" },
];
</script>

<template>
  <motion.div class="max-w-full space-y-5 overflow-x-hidden pb-2">
    <PageHeader
      title="Spend"
      description="Paid spend from connected ad platforms."
      dense
      metadata-tight
      hide-context
    >
      <template v-if="hasSpendConnections" #actions>
        <NuxtLink
          :to="`/app/simulation?from=budget&amount=${Math.round(filteredTotals.spend || 0)}`"
          class="app-button button-primary text-sm"
        >
          Use budget in simulation
        </NuxtLink>
      </template>
    </PageHeader>

    <p v-if="error" class="text-[13px] font-medium text-red-600">{{ error }}</p>

    <EmptyState
      v-if="!loading && !hasSpendConnections"
      title="No spend data sources"
      description="Connect Meta Ads (or another paid ads integration) for this brand to see spend, ROAS, and campaign pacing here."
    >
      <NuxtLink to="/app/connections" class="app-button button-primary text-sm">
        <Plug class="h-4 w-4" :stroke-width="2" />
        Create connection
      </NuxtLink>
    </EmptyState>

    <template v-else-if="hasSpendConnections || loading">
      <FilterBar compact>
        <div class="flex min-w-0 flex-col gap-1.5">
          <span class="sv-section-title">Period</span>
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="option in ['Last 8 weeks', 'Last 30 days', 'Quarter to date']"
              :key="option"
              type="button"
              class="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition"
              :class="selectedRange === option ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-black/60'"
              @click="selectedRange = option"
            >
              <CalendarRange class="h-4 w-4 shrink-0 text-black/55" :stroke-width="1.9" />
              {{ option }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="spend-filter-channel" class="sv-section-title">Channel</label>
          <select id="spend-filter-channel" v-model="selectedChannel" class="app-control min-w-[12rem]">
            <option v-for="option in performanceChannels" :key="`ch-${option}`" :value="option">
              {{ option === ALL_SCOPE ? "All channels" : option }}
            </option>
          </select>
        </div>
        <div
          class="inline-flex min-h-[3rem] items-center gap-2.5 rounded-[var(--sv-radius-control)] border border-[var(--sv-line)] bg-white px-3.5 text-sm font-semibold text-black/85 shadow-[0_10px_24px_-26px_rgba(15,23,42,0.18)]"
        >
          <span class="text-[13px] font-semibold text-black/72">Compare</span>
          <button
            type="button"
            role="switch"
            :aria-checked="compareEnabled"
            :aria-label="compareEnabled ? 'Period comparison on' : 'Period comparison off'"
            :class="compareEnabled ? 'bg-[rgba(91,123,225,0.95)]' : 'bg-black/15'"
            class="relative h-7 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,123,225,0.35)] focus-visible:ring-offset-2"
            @click="compareEnabled = !compareEnabled"
          >
            <span
              class="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200"
              :class="compareEnabled ? 'translate-x-[1.125rem]' : 'translate-x-0'"
              aria-hidden="true"
            />
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled
            class="inline-flex min-h-[3rem] shrink-0 cursor-not-allowed items-center gap-2 rounded-[var(--sv-radius-control)] border border-[var(--sv-line)] bg-white px-3.5 text-sm font-semibold text-black/40 opacity-60"
          >
            <Download class="h-4 w-4" :stroke-width="1.9" aria-hidden="true" />
            Export
          </button>
        </div>
      </FilterBar>

      <SurfaceCard variant="soft" padding="sm" class="border border-black/[0.05]">
        <AnalyticsMetadataStrip :items="metadataItems" />
      </SurfaceCard>

      <p v-if="loading" class="text-[13px] text-black/50">Loading spend data…</p>

      <section v-else class="grid grid-cols-12 content-start items-start gap-3 lg:gap-4">
        <AnalyticsMetricCard
          v-for="(item, idx) in kpis"
          :key="item.title"
          :class="kpiColClass(idx)"
          :title="item.title"
          :value="item.value"
          :delta="item.delta"
          :helper="item.helper"
          :tone="item.tone"
          :trend="item.trend"
          dense
        />

        <SurfaceCard
          v-if="channelBreakdownSpend.length"
          variant="frame"
          padding="sm"
          class="col-span-12 min-h-0 lg:col-span-6"
        >
          <motion.div class="mb-3">
            <h3 class="sv-card-title">Spend by connection</h3>
          </motion.div>
          <div class="border-t border-black/[0.06] pt-3">
            <div class="space-y-4">
              <div class="flex h-4 w-full overflow-hidden rounded-full bg-black/[0.05]">
                <motion.div
                  v-for="row in budgetSplitRows"
                  :key="row.label"
                  class="min-h-[1rem] flex-shrink-0 bg-black/35"
                  :style="{ width: `${row.widthPct}%` }"
                />
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <div
                  v-for="row in budgetSplitRows"
                  :key="`${row.label}-split`"
                  class="sv-card-inset flex items-center justify-between gap-3 rounded-[1rem] px-4 py-3"
                >
                  <span class="truncate text-[14px] font-medium text-black/72">{{ row.label }}</span>
                  <div class="text-right text-[14px] font-semibold text-black">
                    {{ formatCompactCurrency(row.spend) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard
          v-if="objectiveBreakdownSpend.length"
          variant="frame"
          padding="sm"
          class="col-span-12 min-h-0 lg:col-span-6"
        >
          <div class="mb-3">
            <h3 class="sv-card-title">Spend by goal</h3>
          </div>
          <div class="border-t border-black/[0.06] pt-3">
            <div class="space-y-3">
              <div
                v-for="row in objectiveBreakdownSpend"
                :key="row.label"
                class="sv-card-inset rounded-[1.25rem] px-4 py-4"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="text-[15px] font-semibold tracking-[-0.02em] text-black">
                      {{ row.label }}
                    </p>
                    <p class="mt-1 text-[13px] text-black/54">
                      {{ formatCompactCurrency(row.revenue) }} revenue
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-[15px] font-semibold text-black">{{ formatCompactCurrency(row.spend) }}</p>
                    <p class="mt-1 text-[12px] text-black/46">{{ formatMultiplier(row.roas, 1) }} ROAS</p>
                  </div>
                </div>
                <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-black/[0.05]">
                  <div
                    class="h-full rounded-full bg-[linear-gradient(90deg,rgba(95,199,212,0.96),rgba(91,123,225,0.92))]"
                    :style="{ width: `${Math.max(10, (row.spend / objectiveBarsMax) * 100)}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard
          v-if="seriesPoints.length"
          variant="frame"
          padding="sm"
          class="col-span-12 flex min-h-[12rem] min-w-0 w-full flex-col"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <h3 class="sv-card-title">Spend trend</h3>
            </div>
            <StatusBadge label="Daily actual" variant="info" />
          </div>
          <div class="mt-3 border-t border-black/[0.06] pt-3">
            <div class="sv-chart-panel min-h-0 w-full min-w-0">
              <svg viewBox="0 0 100 64" class="h-60 w-full overflow-visible lg:h-72" preserveAspectRatio="none">
                <line x1="0" y1="14" x2="100" y2="14" stroke="rgba(0,0,0,0.05)" stroke-width="0.8" />
                <line x1="0" y1="28" x2="100" y2="28" stroke="rgba(0,0,0,0.05)" stroke-width="0.8" />
                <line x1="0" y1="42" x2="100" y2="42" stroke="rgba(0,0,0,0.05)" stroke-width="0.8" />
                <line x1="0" y1="56" x2="100" y2="56" stroke="rgba(0,0,0,0.08)" stroke-width="0.8" />
                <polyline
                  fill="none"
                  stroke="#5B7BE1"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  :points="lineChartPointsActual"
                />
              </svg>
              <div class="mt-4 flex flex-wrap justify-between gap-2 text-[13px] text-black/52">
                <span v-for="(label, index) in chartLabels" :key="index" class="min-w-0 truncate">
                  {{ label }}
                </span>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard v-if="pacingRows.length" variant="frame" padding="sm" class="col-span-12">
          <div class="mb-3">
            <h3 class="sv-card-title">Campaign progress</h3>
          </div>
          <div class="space-y-3 border-t border-black/[0.06] pt-3">
            <div
              v-for="row in pacingRows"
              :key="row.id"
              class="sv-card-inset rounded-[1rem] px-4 py-4"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-[14px] font-semibold text-black">{{ row.campaign }}</p>
                  <p class="mt-1 text-[12px] text-black/46">{{ row.objective }} · {{ row.channel }}</p>
                </div>
                <StatusBadge :label="row.alert" :variant="statusVariant(row.alert)" />
              </div>
              <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  class="h-full rounded-full bg-black/40"
                  :style="{ width: `${Math.min(row.rawPace, 120)}%` }"
                />
              </div>
              <div class="mt-3 flex items-center justify-between gap-3 text-[13px] text-black/52">
                <span>{{ row.actual }} actual</span>
                <span>{{ row.budget }} budget</span>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <div v-if="weeklyRows.length || pacingRows.length" class="col-span-12 grid grid-cols-12 gap-3 lg:gap-4">
          <SurfaceCard v-if="weeklyRows.length" variant="frame" padding="sm" class="col-span-12 xl:col-span-6">
            <div class="mb-3">
              <h3 class="sv-card-title">Weekly summary</h3>
            </div>
            <DataTable
              :columns="weeklyColumns"
              :rows="weeklyRows"
              row-key="id"
              embed
            />
          </SurfaceCard>

          <SurfaceCard v-if="pacingRows.length" variant="frame" padding="sm" class="col-span-12 xl:col-span-6">
            <div class="mb-3">
              <h3 class="sv-card-title">Budget detail</h3>
            </div>
            <DataTable
              :columns="pacingColumns"
              :rows="pacingRows"
              row-key="id"
              embed
            >
              <template #cell-channel="{ row }">
                <StatusBadge :label="row.channel" :variant="channelVariant(row.channel)" />
              </template>
              <template #cell-pace="{ row }">
                <div class="min-w-[7rem]">
                  <p class="text-[13px] font-semibold text-black">{{ row.pace }}</p>
                  <div class="mt-2 h-2 overflow-hidden rounded-full bg-black/[0.06]">
                    <div
                      class="h-full rounded-full bg-black/40"
                      :style="{ width: `${Math.min(Number(row.rawPace), 120)}%` }"
                    />
                  </div>
                </div>
              </template>
              <template #cell-alert="{ row }">
                <StatusBadge :label="row.alert" :variant="statusVariant(row.alert)" />
              </template>
            </DataTable>
          </SurfaceCard>
        </div>
      </section>
    </template>
  </motion.div>
</template>

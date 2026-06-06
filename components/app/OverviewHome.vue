<script setup lang="ts">
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Circle,
  ExternalLink,
  Gauge,
  HardDrive,
  Plug,
  Wallet,
  Zap,
} from "lucide-vue-next";
import AnalyticsLineChart from "~/components/app/analytics/AnalyticsLineChart.vue";
import type { OverviewInsight } from "~/types/mock";
import { brandScopeQuery } from "~/utils/apiScope";
import {
  formatCreditUsageCategory,
  formatPlanMaximum,
  formatStorageBytes,
  useOverviewWorkspaceStats,
} from "~/composables/useOverviewWorkspaceStats";

const workspace = useWorkspaceContext();
const { overview, overviewHero, dataStatus, spend } = useAppData();
const {
  userConnections,
  userConnectionsLoaded,
  refreshConnectionsData,
  integrationBySlug,
} = useConnectionsData();
const { views, viewsLoading, refreshViews } = useOverviewViews();
const api = useApiClient();
const {
  credit,
  connections,
  storage,
  creditUsage,
  loading: statsLoading,
  refresh: refreshStats,
} = useOverviewWorkspaceStats();

const recentSimulations = ref<
  Array<{ id: string; name: string; platform?: string; createdAt?: string }>
>([]);
const simulationsLoading = ref(false);

onMounted(() => {
  void refreshConnectionsData();
  void refreshViews({ force: true });
  void loadRecentSimulations();
  void refreshStats();
});

const activeConnections = computed(() => {
  const brandId = workspace.currentBrandProfileId.value;
  return userConnections.value.filter((c) => {
    if (!c.isActive) return false;
    if (!brandId || !c.brandProfileId) return true;
    return c.brandProfileId === brandId;
  });
});

const insightItems = computed(() => overview.value?.insights || []);

const recentInsights = computed(() =>
  insightItems.value.slice(0, 4).map((i: OverviewInsight) => ({
    id: i.id,
    title: i.headline || i.title,
    summary: i.summary,
    to: i.linkTo || "/app/insights",
  })),
);

const recentDashboards = computed(() =>
  views.value.slice(0, 4).map((v) => ({
    id: v.id,
    name: v.name,
    to: `/app/dashboards?view_id=${encodeURIComponent(v.id)}`,
  })),
);

const quickPerformance = computed(() => {
  const hero = overviewHero.value;
  if (!hero) return null;
  return [
    { label: "Spend", value: hero.periodSpend },
    { label: "Revenue", value: hero.attributedRevenue },
    { label: "ROI", value: hero.roi },
    { label: "CAC", value: hero.cac },
  ];
});

const setupItems = computed(() => {
  const items: Array<{ id: string; label: string; done: boolean; to: string; cta: string }> = [];
  const connCount = connections.value?.created ?? activeConnections.value.length;
  if (!connCount) {
    items.push({
      id: "connections",
      label: "Connect Meta Ads to unlock campaign performance.",
      done: false,
      to: "/app/connections",
      cta: "Create connection",
    });
  }
  if (!(spend.value?.length || 0)) {
    items.push({
      id: "budget",
      label: "Add a budget to improve simulation accuracy.",
      done: false,
      to: "/app/spend",
      cta: "Add budget",
    });
  }
  if (connCount && !views.value.length) {
    items.push({
      id: "dashboard",
      label: "Create your first dashboard from connected data.",
      done: false,
      to: "/app/dashboards",
      cta: "Create dashboard",
    });
  }
  if (connCount && !recentSimulations.value.length) {
    items.push({
      id: "simulation",
      label: "Upload a creative to start your first simulation.",
      done: false,
      to: "/app/simulation",
      cta: "Start simulation",
    });
  }
  return items;
});

const recommendedAction = computed(() => {
  const pending = setupItems.value.find((i) => !i.done);
  if (pending) return pending;
  if (recentInsights.value.length) {
    return {
      id: "insight",
      label: recentInsights.value[0]!.title,
      done: false,
      to: "/app/insights",
      cta: "Review insight",
    };
  }
  return {
    id: "dashboards",
    label: "Review performance in your dashboards.",
    done: false,
    to: "/app/dashboards",
    cta: "Open dashboards",
  };
});

const budgetHealth = computed(() => {
  if (!(spend.value?.length || 0)) {
    return {
      label: "No budget configured",
      detail: "Add planned spend to improve simulation accuracy.",
      tone: "warn" as const,
    };
  }
  return {
    label: "Budget on track",
    detail: "Planned spend is configured for this brand.",
    tone: "ok" as const,
  };
});

const creditDisplay = computed(() => {
  if (!credit.value) {
    return { used: "—", maximum: "—" };
  }
  return {
    used: credit.value.used.toLocaleString(),
    maximum: formatPlanMaximum(credit.value.plan_maximum),
  };
});

const connectionsDisplay = computed(() => {
  if (!connections.value) {
    return { created: "—", maximum: "—" };
  }
  return {
    created: connections.value.created.toLocaleString(),
    maximum: formatPlanMaximum(connections.value.plan_maximum),
  };
});

const storageDisplay = computed(() => {
  if (!storage.value) {
    return { used: "—", maximum: "—" };
  }
  return {
    used: formatStorageBytes(storage.value.used_bytes),
    maximum: formatPlanMaximum(storage.value.plan_maximum_bytes, { bytes: true }),
  };
});

const creditTags = computed(() =>
  (credit.value?.top_usage_categories || []).map((item) => ({
    label: formatCreditUsageCategory(item.key),
    count: item.count.toLocaleString(),
  })),
);

const connectionTags = computed(() =>
  (connections.value?.top_integration_types || []).map((item) => ({
    label: connectionLabel(item.key),
    count: item.count.toLocaleString(),
  })),
);

const storageTags = computed(() =>
  (storage.value?.largest_items || []).map((item) => ({
    label: item.name,
    count: formatStorageBytes(item.bytes),
  })),
);

const creditChartLabels = computed(() => {
  const points = creditUsage.value?.points || [];
  if (!points.length) return [];
  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1 || index % 7 === 0) {
      const d = new Date(`${point.date}T00:00:00Z`);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    return "";
  });
});

const creditChartSeries = computed(() => {
  const values = (creditUsage.value?.points || []).map((p) => p.credits);
  if (!values.length) return [];
  return [{ label: "Credits used", values, color: "depth" as const }];
});

async function loadRecentSimulations() {
  const ws = workspace.currentWorkspaceId.value;
  const bp = workspace.currentBrandProfileId.value;
  if (!api.hasBase.value || !ws || !bp) return;
  simulationsLoading.value = true;
  try {
    const res = await api.getJson<
      Array<{ id: string; name: string; createdAt?: string; variants?: Array<{ platform?: string }> }>
    >(
      `/simulations${brandScopeQuery(ws, bp)}&limit=5`,
    );
    recentSimulations.value = (res || []).map((s) => ({
      id: s.id,
      name: s.name,
      platform: s.variants?.[0]?.platform,
      createdAt: s.createdAt,
    }));
  } catch {
    recentSimulations.value = [];
  } finally {
    simulationsLoading.value = false;
  }
}

watch(
  () => [workspace.currentWorkspaceId.value, workspace.currentBrandProfileId.value] as const,
  () => {
    void loadRecentSimulations();
  },
);

function connectionLabel(slug: string) {
  return integrationBySlug(slug)?.name || slug;
}

function formatCreditTick(value: number) {
  return value.toLocaleString();
}
</script>

<template>
  <div class="max-w-full space-y-5 overflow-x-hidden pb-2">
    <MockDataState :status="dataStatus" />

    <PageHeader
      title="Overview"
      description="Workspace usage, connections, and credit activity."
      dense
      metadata-tight
      hide-context
    />

    <motion.div class="grid gap-4 lg:grid-cols-3">
      <SurfaceCard variant="soft" padding="md" class="border border-black/[0.06]">
        <div class="flex items-start justify-between gap-3">
          <p class="sv-section-title">Credits</p>
          <NuxtLink to="/app/settings" class="text-black/35 hover:text-black/60" aria-label="Billing settings">
            <ExternalLink class="h-4 w-4" :stroke-width="1.9" />
          </NuxtLink>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p class="text-[12px] font-medium text-black/45">Used</p>
            <p class="mt-1 text-[1.75rem] font-semibold tracking-[-0.04em] text-black">
              {{ statsLoading ? "…" : creditDisplay.used }}
            </p>
          </div>
          <div>
            <p class="text-[12px] font-medium text-black/45">Plan maximum</p>
            <p class="mt-1 text-[1.75rem] font-semibold tracking-[-0.04em] text-black">
              {{ statsLoading ? "…" : creditDisplay.maximum }}
            </p>
          </div>
        </div>
        <div v-if="creditTags.length" class="mt-5 border-t border-black/[0.06] pt-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-black/40">
            Top usage categories
          </p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="tag in creditTags"
              :key="tag.label"
              class="inline-flex items-center gap-1.5 rounded-full border border-[rgba(91,123,225,0.28)] bg-[rgba(91,123,225,0.06)] px-2.5 py-1 text-[12px] font-medium text-[rgba(55,88,190,0.95)]"
            >
              {{ tag.label }}: {{ tag.count }}
            </span>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard variant="soft" padding="md" class="border border-black/[0.06]">
        <div class="flex items-start justify-between gap-3">
          <p class="sv-section-title">Connections</p>
          <NuxtLink to="/app/connections" class="text-black/35 hover:text-black/60" aria-label="Connections">
            <ExternalLink class="h-4 w-4" :stroke-width="1.9" />
          </NuxtLink>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p class="text-[12px] font-medium text-black/45">Created</p>
            <p class="mt-1 text-[1.75rem] font-semibold tracking-[-0.04em] text-black">
              {{ statsLoading ? "…" : connectionsDisplay.created }}
            </p>
          </div>
          <div>
            <p class="text-[12px] font-medium text-black/45">Plan maximum</p>
            <p class="mt-1 text-[1.75rem] font-semibold tracking-[-0.04em] text-black">
              {{ statsLoading ? "…" : connectionsDisplay.maximum }}
            </p>
          </div>
        </div>
        <div v-if="connectionTags.length" class="mt-5 border-t border-black/[0.06] pt-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-black/40">
            Top integration types
          </p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="tag in connectionTags"
              :key="tag.label"
              class="inline-flex items-center gap-1.5 rounded-full border border-[rgba(91,123,225,0.28)] bg-[rgba(91,123,225,0.06)] px-2.5 py-1 text-[12px] font-medium text-[rgba(55,88,190,0.95)]"
            >
              {{ tag.label }}: {{ tag.count }}
            </span>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard variant="soft" padding="md" class="border border-black/[0.06]">
        <motion.div class="flex items-start justify-between gap-3">
          <p class="sv-section-title">Storage</p>
          <HardDrive class="h-4 w-4 text-black/35" :stroke-width="1.9" />
        </motion.div>
        <div class="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p class="text-[12px] font-medium text-black/45">Used</p>
            <p class="mt-1 text-[1.75rem] font-semibold tracking-[-0.04em] text-black">
              {{ statsLoading ? "…" : storageDisplay.used }}
            </p>
          </div>
          <div>
            <p class="text-[12px] font-medium text-black/45">Plan maximum</p>
            <p class="mt-1 text-[1.75rem] font-semibold tracking-[-0.04em] text-black">
              {{ statsLoading ? "…" : storageDisplay.maximum }}
            </p>
          </div>
        </div>
        <div v-if="storageTags.length" class="mt-5 border-t border-black/[0.06] pt-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-black/40">
            Largest files
          </p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="tag in storageTags"
              :key="tag.label"
              class="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[rgba(91,123,225,0.28)] bg-[rgba(91,123,225,0.06)] px-2.5 py-1 text-[12px] font-medium text-[rgba(55,88,190,0.95)]"
            >
              <span class="truncate">{{ tag.label }}</span>: {{ tag.count }}
            </span>
          </div>
        </div>
      </SurfaceCard>
    </motion.div>

    <SurfaceCard variant="frame" padding="md" class="border border-black/[0.06]">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-[15px] font-semibold text-black">Statistics</p>
          <p class="mt-0.5 text-[13px] text-black/50">Credit usage over the last 30 days</p>
        </div>
        <span class="inline-flex items-center rounded-full border border-black/10 bg-black/[0.02] px-3 py-1.5 text-[12px] font-semibold text-black/55">
          Credit usage
        </span>
      </div>
      <div v-if="creditChartSeries.length" class="mt-5">
        <AnalyticsLineChart
          :labels="creditChartLabels"
          :series="creditChartSeries"
          :value-formatter="formatCreditTick"
          variant="line"
          compact
        />
      </div>
      <p v-else-if="statsLoading" class="mt-5 text-[13px] text-black/50">Loading chart…</p>
      <EmptyState
        v-else
        class="mt-5"
        title="No credit usage yet"
        description="Run a simulation or use AI features to see daily credit usage here."
      />
    </SurfaceCard>

    <SurfaceCard variant="soft" padding="md" class="border border-[rgba(91,123,225,0.15)] bg-[rgba(91,123,225,0.04)]">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="sv-section-title">Recommended next action</p>
          <p class="mt-2 text-[15px] font-semibold text-black">{{ recommendedAction.label }}</p>
        </div>
        <NuxtLink :to="recommendedAction.to" class="app-button button-primary text-sm">
          {{ recommendedAction.cta }}
          <ArrowRight class="h-4 w-4" :stroke-width="2" />
        </NuxtLink>
      </div>
    </SurfaceCard>

    <div class="grid gap-4 lg:grid-cols-2">
      <SurfaceCard variant="frame" padding="md" class="border border-black/[0.06]">
        <div class="flex items-center justify-between gap-3">
          <p class="text-[15px] font-semibold text-black">Recent simulations</p>
          <NuxtLink to="/app/simulation" class="text-[12px] font-semibold text-black/50 hover:text-black">View all</NuxtLink>
        </div>
        <p v-if="simulationsLoading" class="mt-4 text-[13px] text-black/50">Loading…</p>
        <ul v-else-if="recentSimulations.length" class="mt-4 space-y-3">
          <li v-for="sim in recentSimulations" :key="sim.id">
            <NuxtLink
              :to="`/app/evolve?simulation_id=${encodeURIComponent(sim.id)}`"
              class="flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] px-3 py-2.5 hover:bg-black/[0.02]"
            >
              <span class="min-w-0">
                <span class="block truncate text-[14px] font-semibold text-black">{{ sim.name }}</span>
                <span class="text-[12px] text-black/45">{{ sim.platform || "Simulation" }}</span>
              </span>
              <Gauge class="h-4 w-4 shrink-0 text-black/35" :stroke-width="1.9" />
            </NuxtLink>
          </li>
        </ul>
        <EmptyState v-else class="mt-4" title="No simulations yet" description="Start a simulation to test possible outcomes.">
          <NuxtLink to="/app/simulation" class="app-button button-primary text-sm">Start simulation</NuxtLink>
        </EmptyState>
      </SurfaceCard>

      <SurfaceCard variant="frame" padding="md" class="border border-black/[0.06]">
        <div class="flex items-center justify-between gap-3">
          <p class="text-[15px] font-semibold text-black">Recent dashboards</p>
          <NuxtLink to="/app/dashboards" class="text-[12px] font-semibold text-black/50 hover:text-black">View all</NuxtLink>
        </div>
        <p v-if="viewsLoading" class="mt-4 text-[13px] text-black/50">Loading…</p>
        <ul v-else-if="recentDashboards.length" class="mt-4 space-y-3">
          <li v-for="dash in recentDashboards" :key="dash.id">
            <NuxtLink
              :to="dash.to"
              class="flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] px-3 py-2.5 hover:bg-black/[0.02]"
            >
              <span class="block truncate text-[14px] font-semibold text-black">{{ dash.name }}</span>
              <BarChart3 class="h-4 w-4 shrink-0 text-black/35" :stroke-width="1.9" />
            </NuxtLink>
          </li>
        </ul>
        <EmptyState v-else class="mt-4" title="No dashboards yet" description="Create your first dashboard from connected data.">
          <NuxtLink to="/app/dashboards" class="app-button button-primary text-sm">Open dashboards</NuxtLink>
        </EmptyState>
      </SurfaceCard>

      <SurfaceCard variant="frame" padding="md" class="border border-black/[0.06]">
        <div class="flex items-center justify-between gap-3">
          <p class="text-[15px] font-semibold text-black">Recent insights</p>
          <NuxtLink to="/app/insights" class="text-[12px] font-semibold text-black/50 hover:text-black">View all</NuxtLink>
        </div>
        <ul v-if="recentInsights.length" class="mt-4 space-y-3">
          <li v-for="ins in recentInsights" :key="ins.id">
            <NuxtLink
              :to="ins.to"
              class="block rounded-xl border border-black/[0.06] px-3 py-2.5 hover:bg-black/[0.02]"
            >
              <span class="block text-[14px] font-semibold text-black">{{ ins.title }}</span>
              <span class="mt-1 block text-[12px] text-black/50 line-clamp-2">{{ ins.summary }}</span>
            </NuxtLink>
          </li>
        </ul>
        <EmptyState v-else class="mt-4" title="No insights yet" description="Solvomo will surface findings once connected data is available.">
          <NuxtLink to="/app/insights" class="app-button button-secondary text-sm">View insights</NuxtLink>
        </EmptyState>
      </SurfaceCard>

      <SurfaceCard variant="frame" padding="md" class="border border-black/[0.06]">
        <p class="text-[15px] font-semibold text-black">Quick performance summary</p>
        <motion.div v-if="quickPerformance" class="mt-4 grid grid-cols-2 gap-3">
          <motion.div
            v-for="metric in quickPerformance"
            :key="metric.label"
            class="rounded-xl border border-black/[0.06] bg-black/[0.02] px-3 py-3"
          >
            <p class="sv-section-title">{{ metric.label }}</p>
            <p class="mt-2 text-[18px] font-semibold tracking-[-0.02em] text-black">{{ metric.value }}</p>
          </motion.div>
        </motion.div>
        <EmptyState
          v-else
          class="mt-4"
          title="Performance unavailable"
          description="Connect a data source to unlock performance summaries."
        >
          <NuxtLink to="/app/connections" class="app-button button-primary text-sm">
            <Plug class="h-4 w-4" :stroke-width="2" />
            Create connection
          </NuxtLink>
        </EmptyState>
      </SurfaceCard>
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.38fr)]">
      <SurfaceCard variant="soft" padding="md" class="border border-black/[0.06]">
        <p class="text-[15px] font-semibold text-black">Setup checklist</p>
        <ul class="mt-4 space-y-3">
          <li
            v-for="item in setupItems"
            :key="item.id"
            class="flex items-start gap-3 rounded-xl border border-black/[0.06] px-3 py-3"
          >
            <Circle v-if="!item.done" class="mt-0.5 h-4 w-4 shrink-0 text-amber-600" :stroke-width="2" />
            <CheckCircle2 v-else class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" :stroke-width="2" />
            <div class="min-w-0 flex-1">
              <p class="text-[14px] font-medium text-black">{{ item.label }}</p>
              <NuxtLink :to="item.to" class="mt-1 inline-flex text-[12px] font-semibold text-[rgba(91,123,225,0.95)]">
                {{ item.cta }}
              </NuxtLink>
            </div>
          </li>
          <li v-if="!setupItems.length" class="text-[13px] text-black/50">
            Setup looks complete for this brand profile.
          </li>
        </ul>
      </SurfaceCard>

      <SurfaceCard
        variant="soft"
        padding="md"
        class="border border-black/[0.06]"
        :class="budgetHealth.tone === 'warn' ? 'bg-amber-50/50' : ''"
      >
        <div class="flex items-center gap-2">
          <Wallet class="h-4 w-4 text-black/45" :stroke-width="1.9" />
          <p class="text-[15px] font-semibold text-black">Budget health</p>
        </div>
        <p class="mt-3 text-[14px] font-semibold text-black">{{ budgetHealth.label }}</p>
        <p class="mt-1 text-[12px] text-black/55">{{ budgetHealth.detail }}</p>
        <NuxtLink to="/app/spend" class="app-button button-secondary mt-5 w-full text-sm">
          Manage in Spend
          <Zap class="h-4 w-4" :stroke-width="2" />
        </NuxtLink>
      </SurfaceCard>
    </div>
  </div>
</template>

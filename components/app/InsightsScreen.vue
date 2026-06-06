<script setup lang="ts">
import {
  Bookmark,
  Check,
  ExternalLink,
  FlaskConical,
  X,
} from "lucide-vue-next";
import type { OverviewInsight, OverviewInsightKind } from "~/types/mock";
import type { InsightDashboardDraft, LiveInsight } from "~/composables/useInsightsTab";
import { brandScopeBody } from "~/utils/apiScope";

const { overview, dataStatus } = useAppData();
const api = useApiClient();
const router = useRouter();
const workspace = useWorkspaceContext();
const {
  insights: liveInsights,
  recipes,
  loading: insightsLoading,
  error: insightsError,
  refreshWithScope,
} = useInsightsTab();
const { statusFor, setStatus, setNote, noteFor } = useInsightState();
const route = useRoute();

type Severity = "critical" | "high" | "medium" | "low";
type InsightFilterStatus = "all" | "new" | "saved" | "reviewed" | "dismissed";

const severityFilter = ref<Severity | "all">("all");
const statusFilter = ref<InsightFilterStatus>("all");
const typeFilter = ref<OverviewInsightKind | "all">("all");
const noteDraft = ref<Record<string, string>>({});
const actionBusy = ref<Record<string, string>>({});
const actionError = ref<string | null>(null);
const scopeBusy = ref<Record<string, boolean>>({});
const selectedScopeByInsight = ref<Record<string, string>>({});

function primaryDatasource(insight: LiveInsight) {
  return insight.datasources[0];
}

function scopeSelectorKey(insight: LiveInsight) {
  const ds = primaryDatasource(insight);
  return ds ? `${insight.id}:${ds.connection_id}` : insight.id;
}

function showScopeSelector(insight: LiveInsight) {
  const ds = primaryDatasource(insight);
  return (ds?.available_scopes?.length ?? 0) > 1;
}

function selectedScopeId(insight: LiveInsight) {
  const ds = primaryDatasource(insight);
  if (!ds) return "";
  const key = scopeSelectorKey(insight);
  return selectedScopeByInsight.value[key] ?? ds.scope_id;
}

async function onScopeChange(insight: LiveInsight, scopeId: string) {
  const ds = primaryDatasource(insight);
  if (!ds || !scopeId || scopeId === selectedScopeId(insight)) return;
  const key = scopeSelectorKey(insight);
  selectedScopeByInsight.value = { ...selectedScopeByInsight.value, [key]: scopeId };
  scopeBusy.value = { ...scopeBusy.value, [insight.id]: true };
  actionError.value = null;
  try {
    await refreshWithScope({
      recipe_id: insight.recipe_id,
      connection_id: ds.connection_id,
      scope_id: scopeId,
    });
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : "Could not update scope.";
  } finally {
    const next = { ...scopeBusy.value };
    delete next[insight.id];
    scopeBusy.value = next;
  }
}

type EnrichedInsight = {
  id: string;
  title: string;
  headline?: string;
  summary: string;
  because?: string;
  kind: OverviewInsightKind;
  severity: Severity;
  platform: string;
  metric_change?: string;
  recommendation: string;
  confidence?: string;
  user_status: Exclude<InsightFilterStatus, "all">;
  linkTo?: string;
  live?: LiveInsight;
};

function severityFor(insight: OverviewInsight): Severity {
  if (insight.kind === "risk") return "high";
  if (insight.kind === "opportunity") return "medium";
  return "low";
}

const mockInsights = computed(() => overview.value?.insights || []);
const usingLiveInsights = computed(() => liveInsights.value.length > 0);

const enrichedInsights = computed<EnrichedInsight[]>(() => {
  if (usingLiveInsights.value) {
    return liveInsights.value.map((insight) => ({
      id: insight.id,
      title: insight.title,
      headline: insight.headline,
      summary: insight.summary,
      because: insight.because,
      kind: insight.kind,
      severity: insight.severity,
      platform: insight.platform,
      metric_change: insight.because,
      recommendation: insight.recommendation,
      confidence: insight.confidence,
      user_status: statusFor(insight.id),
      live: insight,
    }));
  }
  return mockInsights.value.map((insight: OverviewInsight) => ({
    id: insight.id,
    title: insight.title,
    headline: insight.headline,
    summary: insight.summary,
    because: insight.because,
    kind: insight.kind || "neutral",
    severity: severityFor(insight),
    platform: insight.tone === "brand" ? "Meta Ads" : insight.tone === "product" ? "Google Ads" : "Cross-connection",
    metric_change: insight.because || insight.summary,
    recommendation:
      insight.kind === "risk"
        ? "Review source data and test a change in Simulation."
        : "Consider validating this change with a simulation.",
    confidence: insight.kind === "risk" ? "High" : "Medium",
    user_status: statusFor(insight.id),
    linkTo: insight.linkTo,
  }));
});

const filteredInsights = computed(() =>
  enrichedInsights.value.filter((insight) => {
    if (severityFilter.value !== "all" && insight.severity !== severityFilter.value) return false;
    if (statusFilter.value !== "all" && insight.user_status !== statusFilter.value) return false;
    if (typeFilter.value !== "all" && insight.kind !== typeFilter.value) return false;
    return insight.user_status !== "dismissed" || statusFilter.value === "dismissed";
  }),
);

onMounted(() => {
  const fromQuery = route.query.insight_id;
  if (typeof fromQuery === "string" && fromQuery) {
    const el = document.getElementById(`insight-${fromQuery}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});

function simulationLink(insightId: string) {
  return `/app/simulation?from=insight&insight_id=${encodeURIComponent(insightId)}`;
}

function sourceLink(insight: EnrichedInsight) {
  return insight.linkTo || "/app/dashboards";
}

function dashboardBody(draft: InsightDashboardDraft) {
  const ws = workspace.currentWorkspaceId.value?.trim();
  const bp = workspace.currentBrandProfileId.value?.trim();
  if (!ws || !bp) {
    throw new Error("Workspace scope is missing.");
  }
  return {
    ...brandScopeBody(ws, bp),
    name: draft.name,
    description: draft.description,
    is_default: draft.is_default,
    datasources: draft.datasources,
    widgets: draft.widgets,
    layout: draft.layout,
  };
}

async function createViewFromInsight(insight: LiveInsight, mode: "source" | "saved") {
  const draft =
    mode === "source"
      ? insight.actions.view_source_dashboard.dashboard_draft
      : insight.actions.create_dashboard_view;
  actionBusy.value = { ...actionBusy.value, [insight.id]: mode };
  actionError.value = null;
  try {
    const created = await api.postJson<{ id: string }>("/views", dashboardBody(draft));
    if (created?.id) {
      await router.push(`/app/dashboards/${encodeURIComponent(created.id)}`);
    }
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : "Could not create dashboard view.";
  } finally {
    const next = { ...actionBusy.value };
    delete next[insight.id];
    actionBusy.value = next;
  }
}

async function startSimulationFromInsight(insight: LiveInsight) {
  actionBusy.value = { ...actionBusy.value, [insight.id]: "simulation" };
  actionError.value = null;
  try {
    const created = await api.postJson<{ id: string }>(
      "/simulations",
      insight.actions.start_simulation.draft,
    );
    if (created?.id) {
      await router.push(
        `/app/simulation?from=insight&simulation_id=${encodeURIComponent(created.id)}&insight_id=${encodeURIComponent(insight.id)}`,
      );
    } else {
      await router.push(`/app/simulation?from=insight&insight_id=${encodeURIComponent(insight.id)}`);
    }
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : "Could not create simulation draft.";
  } finally {
    const next = { ...actionBusy.value };
    delete next[insight.id];
    actionBusy.value = next;
  }
}

function isBusy(insight: EnrichedInsight, action: string) {
  return actionBusy.value[insight.id] === action;
}
</script>

<template>
  <div class="max-w-full space-y-5 overflow-x-hidden pb-2">
    <MockDataState :status="dataStatus" />

    <PageHeader
      title="Insights"
      description="What did Solvomo detect? Recipe-based findings from metric_report-compatible connected data."
      dense
      metadata-tight
      hide-context
    />

    <SurfaceCard
      v-if="usingLiveInsights || insightsLoading || insightsError || recipes.length"
      variant="soft"
      padding="sm"
      class="border border-black/[0.06]"
    >
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-[13px] font-semibold text-black">
            {{ usingLiveInsights ? "Live recipe insights" : insightsLoading ? "Loading live insights" : "Recipe readiness" }}
          </p>
          <p class="text-[12px] text-black/50">
            Uses metric_report sources and connector compatibility checks before creating dashboard or simulation JSON.
          </p>
        </div>
        <p v-if="insightsError" class="text-[12px] text-red-700">{{ insightsError }}</p>
      </div>
      <div v-if="recipes.length" class="mt-3 flex flex-wrap gap-2">
        <StatusBadge
          v-for="recipe in recipes"
          :key="recipe.id"
          :label="`${recipe.title}: ${recipe.eligible ? 'ready' : 'not ready'}`"
          :variant="recipe.eligible ? 'success' : 'neutral'"
        />
      </div>
    </SurfaceCard>

    <SurfaceCard variant="soft" padding="sm" class="border border-black/[0.06]">
      <div class="flex flex-wrap gap-3">
        <select v-model="severityFilter" class="app-control min-h-[2.5rem] text-sm">
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select v-model="statusFilter" class="app-control min-h-[2.5rem] text-sm">
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="saved">Saved</option>
          <option value="reviewed">Reviewed</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select v-model="typeFilter" class="app-control min-h-[2.5rem] text-sm">
          <option value="all">All types</option>
          <option value="risk">Risk</option>
          <option value="opportunity">Opportunity</option>
          <option value="neutral">Neutral</option>
        </select>
      </div>
    </SurfaceCard>

    <EmptyState
      v-if="!filteredInsights.length"
      title="No insights in this view"
      :description="usingLiveInsights ? 'No live insights match these filters.' : 'Solvomo will surface detected changes once connected metric_report data is available.'"
    >
      <NuxtLink to="/app/connections" class="app-button button-primary text-sm">Create connection</NuxtLink>
    </EmptyState>

    <div v-else class="space-y-4">
      <p v-if="actionError" class="text-[13px] text-red-700">{{ actionError }}</p>
      <SurfaceCard
        v-for="insight in filteredInsights"
        :id="`insight-${insight.id}`"
        :key="insight.id"
        variant="frame"
        padding="md"
        class="border border-black/[0.06]"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <StatusBadge :label="insight.severity" variant="warning" />
              <StatusBadge :label="insight.platform" variant="neutral" />
              <StatusBadge :label="insight.user_status" variant="info" />
            </div>
            <div
              v-if="insight.live && showScopeSelector(insight.live)"
              class="mt-3 flex flex-wrap items-center gap-2"
            >
              <label
                :for="`scope-${insight.id}`"
                class="text-[12px] font-semibold text-black/55"
              >
                Scope
              </label>
              <select
                :id="`scope-${insight.id}`"
                class="app-control min-h-[2.25rem] text-sm"
                :value="selectedScopeId(insight.live)"
                :disabled="Boolean(scopeBusy[insight.id])"
                @change="onScopeChange(insight.live, ($event.target as HTMLSelectElement).value)"
              >
                <option
                  v-for="scope in primaryDatasource(insight.live)!.available_scopes"
                  :key="scope.id"
                  :value="scope.id"
                >
                  {{ scope.name }}
                </option>
              </select>
            </div>
            <h2 class="mt-3 text-[1.15rem] font-semibold tracking-[-0.03em] text-black">
              {{ insight.headline || insight.title }}
            </h2>
            <p class="mt-2 text-[14px] leading-relaxed text-black/58">{{ insight.summary }}</p>
            <p v-if="insight.metric_change" class="mt-3 text-[13px] font-medium text-black/70">
              Signal: {{ insight.metric_change }}
            </p>
            <div
              v-if="insight.live?.chart.kind === 'metric_delta'"
              class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div
                v-for="item in insight.live.chart.items.slice(0, 6)"
                :key="item.metric"
                class="rounded-xl border border-black/[0.06] bg-black/[0.02] p-3"
              >
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40">{{ item.label }}</p>
                <p class="mt-1 text-[18px] font-semibold text-black">{{ item.current.toFixed(2) }}</p>
                <p class="text-[12px] text-black/50">
                  Previous {{ item.previous.toFixed(2) }}
                  <span v-if="item.delta_pct !== undefined">
                    · {{ item.delta_pct >= 0 ? "+" : "" }}{{ item.delta_pct.toFixed(1) }}%
                  </span>
                </p>
              </div>
            </div>
            <div
              v-else-if="insight.live?.chart.kind === 'platform_comparison'"
              class="mt-4 rounded-xl border border-black/[0.06] bg-black/[0.02] p-3"
            >
              <p class="text-[12px] font-semibold text-black/65">
                {{ insight.live.chart.metric }} comparison
              </p>
              <div class="mt-3 space-y-2">
                <div
                  v-for="item in insight.live.chart.items"
                  :key="`${item.integration_slug}-${item.label}`"
                  class="flex items-center justify-between gap-3 text-[13px]"
                >
                  <span class="text-black/60">{{ item.label }}</span>
                  <span class="font-semibold text-black">{{ item.value.toFixed(2) }}</span>
                </div>
              </div>
            </div>
            <p class="mt-2 text-[13px] text-black/55">
              Recommended action: {{ insight.recommendation }}
            </p>
            <p v-if="insight.confidence" class="mt-1 text-[12px] text-black/45">
              Confidence: {{ insight.confidence }}
            </p>
          </div>
          <div class="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <button
              v-if="insight.live"
              type="button"
              class="app-button button-secondary text-sm"
              :disabled="Boolean(actionBusy[insight.id])"
              @click="createViewFromInsight(insight.live, 'source')"
            >
              <ExternalLink class="h-4 w-4" :stroke-width="1.9" />
              {{ isBusy(insight, 'source') ? 'Opening…' : 'View source dashboard' }}
            </button>
            <NuxtLink v-else :to="sourceLink(insight)" class="app-button button-secondary text-sm">
              <ExternalLink class="h-4 w-4" :stroke-width="1.9" />
              View source data
            </NuxtLink>
            <button
              v-if="insight.live"
              type="button"
              class="app-button button-secondary text-sm"
              :disabled="Boolean(actionBusy[insight.id])"
              @click="createViewFromInsight(insight.live, 'saved')"
            >
              <Bookmark class="h-4 w-4" :stroke-width="1.9" />
              {{ isBusy(insight, 'saved') ? 'Creating…' : 'Create dashboard view' }}
            </button>
            <button
              v-if="insight.live"
              type="button"
              class="app-button button-secondary text-sm"
              :disabled="Boolean(actionBusy[insight.id])"
              @click="startSimulationFromInsight(insight.live)"
            >
              <FlaskConical class="h-4 w-4" :stroke-width="1.9" />
              {{ isBusy(insight, 'simulation') ? 'Creating…' : 'Start simulation' }}
            </button>
            <NuxtLink v-else :to="simulationLink(insight.id)" class="app-button button-secondary text-sm">
              <FlaskConical class="h-4 w-4" :stroke-width="1.9" />
              Create simulation
            </NuxtLink>
            <button
              type="button"
              class="app-button button-secondary text-sm"
              @click="setStatus(insight.id, 'saved')"
            >
              <Bookmark class="h-4 w-4" :stroke-width="1.9" />
              Save
            </button>
            <button
              type="button"
              class="app-button button-secondary text-sm"
              @click="setStatus(insight.id, 'dismissed')"
            >
              <X class="h-4 w-4" :stroke-width="1.9" />
              Dismiss
            </button>
            <button
              type="button"
              class="app-button button-secondary text-sm"
              @click="setStatus(insight.id, 'reviewed')"
            >
              <Check class="h-4 w-4" :stroke-width="1.9" />
              Mark reviewed
            </button>
          </div>
        </div>
        <div class="mt-4 border-t border-black/[0.06] pt-4">
          <label class="sv-section-title text-[12px]" :for="`note-${insight.id}`">Internal note</label>
          <textarea
            :id="`note-${insight.id}`"
            v-model="noteDraft[insight.id]"
            class="app-control mt-2 min-h-[4rem] w-full text-sm"
            :placeholder="noteFor(insight.id) || 'Add a note for your team…'"
            @blur="setNote(insight.id, noteDraft[insight.id] || '')"
          />
        </div>
      </SurfaceCard>
    </div>
  </div>
</template>

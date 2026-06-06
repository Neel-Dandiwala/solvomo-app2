<script setup lang="ts">
import {
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  LineChart,
  Loader2,
  PencilLine,
  Play,
  Plus,
  RefreshCcw,
  Save,
} from "lucide-vue-next";
import { brandScopeQuery } from "~/utils/apiScope";
import type {
  SimulationAnalysisTab,
  SimulationConfig,
  SimulationMetricKey,
  SimulationRecord,
  SimulationRunResult,
  SimulationVariantConfig,
} from "~/types/simulation";
import { ApiRequestError } from "~/utils/routeResponse";

definePageMeta({ layout: "app" });

useHead({ title: "Simulation — Solvomo" });

// Aliases for brevity within this file
type AnalysisTab = SimulationAnalysisTab;
type MetricKey = SimulationMetricKey;

type AssetOption = {
  id: string;
  label: string;
  kind: SimulationVariantConfig["object_type"];
  platform: string;
  format?: SimulationVariantConfig["format"];
  metric: string;
};

const api = useApiClient();
const auth = useAuth();
const workspace = useWorkspaceContext();
const playground = useAppData();
const { persistFromConfig } = useSimulationPersist();
const { creditLabel, creditsRemaining, refreshCredit } = useBillingCredit();
const route = useRoute();
// Canonical region options with ISO country codes for the timing/holiday pipeline
const AUDIENCE_REGIONS = [
  { label: "United States", name: "United States", country_code: "US" },
  { label: "United Kingdom", name: "United Kingdom", country_code: "GB" },
  { label: "Canada", name: "Canada", country_code: "CA" },
  { label: "Australia", name: "Australia", country_code: "AU" },
  { label: "Germany", name: "Germany", country_code: "DE" },
  { label: "France", name: "France", country_code: "FR" },
  { label: "North America (US + CA)", name: "North America", country_code: "US" },
  { label: "EMEA", name: "EMEA", country_code: "GB" },
  { label: "Global", name: "Global", country_code: "" },
] as const;

const analysisTabs: Array<{ id: AnalysisTab; label: string; helper: string }> = [
  { id: "creative", label: "Creative", helper: "Compare hooks and formats" },
  { id: "copy", label: "Copy", helper: "Headline and text quality" },
  { id: "audience", label: "Audience", helper: "Stress test fit and overlap" },
  { id: "placement", label: "Placement", helper: "Format and placement fit" },
  { id: "budget", label: "Budget", helper: "Forecast allocation curves" },
  { id: "offer", label: "Offer", helper: "Model pricing and urgency" },
  { id: "timing", label: "Timing", helper: "Seasonality and dayparting" },
  { id: "forecast", label: "Forecast", helper: "Full funnel projection" },
];

const outputMetrics: MetricKey[] = [
  "SPEND",
  "IMPRESSIONS",
  "CLICKS_ALL",
  "CTR_ALL",
  "CONVERSIONS",
  "CONVERSION_VALUE",
  "ROAS",
  "COST_PER_CONVERSION",
];

const selectedAnalysisTab = ref<AnalysisTab>("creative");
const simulations = ref<SimulationRecord[]>([]);
const selectedSimulationId = ref("");
const runResult = ref<SimulationRunResult | null>(null);
const loadingList = ref(false);
const saving = ref(false);
const running = ref(false);
const statusMessage = ref("Simulation Lab is ready.");
const apiMode = ref<"api" | "mock">("mock");

// Real asset data from API (replaces demo fixtures)
type RealAsset = { id: string; name: string; platform?: string; format?: string; object_type: string; headline?: string | null; source?: { connection_id: string; object_id: string } | null };
const realVariants = ref<RealAsset[]>([]);
const realCreatives = ref<RealAsset[]>([]);
const assetsLoading = ref(false);
// Credit/billing error state
const creditError = ref<string | null>(null);

const scenarioName = ref("New simulation");
const budget = ref(10000);
const durationDays = ref(14);
const startDate = ref(new Date().toISOString().slice(0, 10));
const audienceRegion = ref("United States");
const audienceSize = ref(100000);
const offerValue = ref("");
const targetRoas = ref(2.0);
const cpaTarget = ref(50);
const selectedAssetIds = ref<string[]>([]);

const activeScope = computed(() => {
  const workspaceId = workspace.currentWorkspaceId.value?.trim();
  const brandprofileId = workspace.currentBrandProfileId.value?.trim();
  if (!workspaceId || !brandprofileId) return null;
  return { workspaceId, brandprofileId };
});

const canUseApi = computed(() => Boolean(auth.isAuthenticated.value && api.hasBase.value && activeScope.value));

// Real assets from API (no demo data in production paths)
const availableAssets = computed<AssetOption[]>(() => {
  const fromVariants = realVariants.value.map((v) => ({
    id: v.id,
    label: v.name,
    kind: (v.object_type || "ads_ad") as SimulationVariantConfig["object_type"],
    platform: v.platform || "",
    format: (v.format as SimulationVariantConfig["format"]) || undefined,
    metric: v.headline ? `"${v.headline.slice(0, 40)}${v.headline.length > 40 ? "…" : ""}"` : "No copy",
  }));
  const fromCreatives = realCreatives.value
    .filter((c) => !realVariants.value.some((v) => v.id === c.id))
    .map((c) => ({
      id: c.id,
      label: c.name,
      kind: "ads_creative" as const,
      platform: c.platform || "",
      format: (c.format as SimulationVariantConfig["format"]) || undefined,
      metric: c.headline ? `"${c.headline.slice(0, 40)}${c.headline.length > 40 ? "…" : ""}"` : "No copy",
    }));
  return [...fromVariants, ...fromCreatives];
});

const selectedAssets = computed(() =>
  availableAssets.value.filter((asset) => selectedAssetIds.value.includes(asset.id)),
);

const selectedSimulation = computed(() =>
  simulations.value.find((simulation) => simulation.id === selectedSimulationId.value) || simulations.value[0] || null,
);

const totalBudgetLabel = computed(() => formatCompactCurrency(budget.value));
const dailyBudget = computed(() => budget.value / Math.max(1, durationDays.value));

const forecastTotals = computed(() => {
  const rows = runResult.value?.daily_forecast || [];
  return rows.reduce(
    (totals, row) => {
      totals.spend += row.metrics.SPEND || 0;
      totals.impressions += row.metrics.IMPRESSIONS || 0;
      totals.clicks += row.metrics.CLICKS_ALL || 0;
      totals.conversions += row.metrics.CONVERSIONS || 0;
      totals.value += row.metrics.CONVERSION_VALUE || 0;
      return totals;
    },
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, value: 0 },
  );
});

const projectedRoas = computed(() =>
  forecastTotals.value.spend ? forecastTotals.value.value / forecastTotals.value.spend : 0,
);

const projectedCpa = computed(() =>
  forecastTotals.value.conversions ? forecastTotals.value.spend / forecastTotals.value.conversions : 0,
);

const coverageItems = computed(() => {
  const coverage = runResult.value?.source_coverage;
  if (!coverage) {
    return [
      { label: "Config", active: true },
      { label: "Connections", active: canUseApi.value },
      { label: "Fallbacks", active: true },
      { label: "Assumptions", active: true },
    ];
  }
  return [
    { label: "Config", active: coverage.used_config },
    { label: "Connections", active: coverage.used_integration },
    { label: "Fallbacks", active: coverage.used_provider_fallback },
    { label: "Assumptions", active: coverage.used_assumptions },
  ];
});

function simulationQuery() {
  const scope = activeScope.value;
  if (!scope) return "";
  return `${brandScopeQuery(scope.workspaceId, scope.brandprofileId)}&limit=20`;
}

function brandConfig(): SimulationConfig["brand"] {
  const brand = workspace.currentBrandProfile.value;
  return {
    brand_name: brand?.brandName || brand?.name || "",
    industry: brand?.industry || undefined,
    brand_recognition: brand?.brandRecognition || undefined,
    website_url: brand?.websiteUrl || undefined,
    reviews_count: brand?.reviewsCount,
    average_rating: brand?.averageRating,
    trust_signals: brand?.trustSignals?.length ? brand.trustSignals : undefined,
    social_handles: brand?.socialHandles?.map((handle) => ({
      platform: handle.platform,
      handle: handle.handle,
      profile_url: handle.profileUrl,
      connection_id: handle.connectionId,
      follower_count: handle.followerCount,
      following_count: handle.followingCount,
      page_likes: handle.pageLikes,
      media_count: handle.mediaCount,
      is_verified: handle.isVerified,
      bio: handle.bio,
      last_fetched_at: handle.lastFetchedAt,
    })),
  };
}

function buildConfig(name = scenarioName.value): SimulationConfig {
  const scope = activeScope.value;
  // Map real variant assets; use actual copy fields, never inject placeholder text
  const variants = selectedAssets.value.map((asset) => {
    const realVariant = realVariants.value.find((v) => v.id === asset.id);
    const realCreative = realCreatives.value.find((c) => c.id === asset.id);
    return {
      variant_id: asset.id,
      label: asset.label,
      platform: asset.platform || undefined,
      object_type: asset.kind,
      format: asset.format || undefined,
      // Use real copy from the asset; if none, leave null so pipeline flags the gap
      headline: realVariant?.headline ?? realCreative?.headline ?? null,
      primary_text: null,
      hook: null,
      call_to_action: null,
      source: realVariant?.source ?? null,
    };
  });

  // Resolve the selected region to a structured location with country_code
  const region = AUDIENCE_REGIONS.find((r) => r.name === audienceRegion.value)
    || AUDIENCE_REGIONS[0];

  return {
    workspace_id: scope?.workspaceId || "",
    brandprofile_id: scope?.brandprofileId || "",
    name,
    connections: [],
    brand: brandConfig(),
    variants,
    audience: {
      location: {
        type: region.country_code ? "country" : "region",
        name: region.name,
        ...(region.country_code ? { country_code: region.country_code } : {}),
      },
      age_range: { min: 25, max: 55 },
      interests: [],
      retargeting: false,
      estimated_audience_size: audienceSize.value,
    },
    offer: {
      product_type: undefined,
      price_usd: undefined,
      discount_percentage: undefined,
      limited_time_offer: selectedAnalysisTab.value === "offer",
      value_proposition: offerValue.value || undefined,
    },
    target_metrics: {
      ROAS: targetRoas.value,
      COST_PER_CONVERSION: cpaTarget.value,
    },
    output_metrics: outputMetrics,
    budget: {
      daily_budget_amount: Math.round(dailyBudget.value), // T1-B fix: was daily_budget_usd
      duration_days: durationDays.value,
      total_budget_usd: budget.value,
    },
    bid_strategy: "LOWEST_COST",
    run_request: {
      forecast_days: durationDays.value,
      granularity: "day",
      start_date: startDate.value,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
    },
  };
}

function localId() {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeLocalSimulation(overrides: Partial<SimulationConfig> = {}): SimulationRecord {
  return {
    id: localId(),
    ...buildConfig(),
    ...overrides,
    _local: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function seedMockSimulations() {
  const seed: SimulationRecord[] = [
    makeLocalSimulation({ name: "New simulation" }),
  ];
  simulations.value = seed;
  selectedSimulationId.value = seed[0]?.id || "";
  applySimulationToForm(seed[0] || null);
}

async function loadRealAssets() {
  // Playground bypass: populate assets from pre-bundled data.
  if (playground.isPlayground.value && playground.assetsData.value) {
    const ad = playground.assetsData.value;
    realVariants.value = ad.variants.map((v) => ({
      id: v.id,
      name: v.name,
      object_type: String(v.object_type ?? "ads_ad"),
      platform: String(v.platform ?? ""),
      format: v.format != null ? String(v.format) : undefined,
      headline: v.headline != null ? String(v.headline) : null,
      source: null,
    }));
    realCreatives.value = ad.creative.map((c) => ({
      id: c.id,
      name: c.name,
      object_type: String(c.object_type ?? "ads_creative"),
      platform: String(c.platform ?? ""),
      format: c.format != null ? String(c.format) : undefined,
      headline: c.headline != null ? String(c.headline) : null,
      source: null,
    }));
    return;
  }

  const scope = activeScope.value;
  if (!scope || !canUseApi.value) return;
  assetsLoading.value = true;
  try {
    const qs = `?workspace_id=${encodeURIComponent(scope.workspaceId)}&brandprofile_id=${encodeURIComponent(scope.brandprofileId)}&status=active&limit=50`;
    const [variantRes, creativeRes] = await Promise.allSettled([
      api.getJson<RealAsset[]>(`/assets/variants${qs}`),
      api.getJson<RealAsset[]>(`/assets/creative${qs}`),
    ]);
    realVariants.value = variantRes.status === "fulfilled" ? (variantRes.value || []) : [];
    realCreatives.value = creativeRes.status === "fulfilled" ? (creativeRes.value || []) : [];
  } catch {
    realVariants.value = [];
    realCreatives.value = [];
  } finally {
    assetsLoading.value = false;
  }
}

function applySimulationToForm(simulation: SimulationRecord | null) {
  if (!simulation) return;
  const cfg = simulation.hydrated;
  scenarioName.value = simulation.name;
  budget.value = cfg?.budget?.total_budget_usd || 84000;
  durationDays.value = cfg?.budget?.duration_days || cfg?.run_request?.forecast_days || 21;
  startDate.value = cfg?.run_request?.start_date || startDate.value;
  audienceRegion.value = cfg?.audience?.location?.name || "North America";
  audienceSize.value = cfg?.audience?.estimated_audience_size || 280000;
  offerValue.value = cfg?.offer?.value_proposition || simulation.offer?.value_proposition || "Executive benchmark consultation";
  targetRoas.value = cfg?.target_metrics?.ROAS || simulation.target_metrics?.ROAS || 4.8;
  cpaTarget.value = cfg?.target_metrics?.COST_PER_CONVERSION || simulation.target_metrics?.COST_PER_CONVERSION || 125;
  const ids = (cfg?.variants || []).map((variant) => variant.variant_id).filter(Boolean);
  selectedAssetIds.value = ids.length ? ids : ["cmp-meta-prospecting", "cr-founder-pov"];
}

async function refreshSimulations() {
  loadingList.value = true;
  runResult.value = null;
  try {
    // Playground bypass: serve pre-bundled simulation records.
    if (playground.isPlayground.value && playground.simulationData.value) {
      const pgSims = playground.simulationData.value.simulations;
      simulations.value = pgSims.map((s) => ({
        id: s.id,
        workspace_id: s.workspace_id,
        brandprofile_id: s.brandprofile_id,
        name: s.name,
        output_metrics: s.output_metrics,
        run_request: s.run_request,
        brand: s.brand,
        connections: s.connections,
        variants: [],
        evolve_status: s.evolve_status,
        created_at: s.created_at,
        updated_at: s.updated_at,
        _local: false,
      }));
      apiMode.value = "api";
      statusMessage.value = "Loaded sandbox simulations.";
      selectedSimulationId.value = simulations.value[0]?.id || "";
      applySimulationToForm(simulations.value[0] || null);
      return;
    }

    if (!canUseApi.value) {
      apiMode.value = "mock";
      statusMessage.value = "Using workspace drafts until live simulation services are available.";
      seedMockSimulations();
      return;
    }

    const rows = await api.getJson<SimulationRecord[]>(
      `/simulations${simulationQuery()}`,
    );
    apiMode.value = "api";
    simulations.value = rows;
    statusMessage.value = rows.length
      ? "Loaded saved simulations for this workspace."
      : "No saved simulations yet. Create a draft to begin.";
    selectedSimulationId.value = rows[0]?.id || "";
    applySimulationToForm(rows[0] || null);
  } catch {
    apiMode.value = "mock";
    statusMessage.value = "Live simulation services are unavailable for this scope, so this page is using workspace drafts.";
    seedMockSimulations();
  } finally {
    loadingList.value = false;
  }
}

async function createSimulation() {
  const name = scenarioName.value.trim() || "Untitled simulation";
  saving.value = true;
  runResult.value = null;
  try {
    const config = buildConfig(name);
    if (canUseApi.value) {
      const persistBody = await persistFromConfig(config, name);
      const created = await api.postJson<SimulationRecord>("/simulations", persistBody);
      if (created?.id) {
        apiMode.value = "api";
        simulations.value = [created, ...simulations.value.filter((simulation) => simulation.id !== created.id)];
        selectedSimulationId.value = created.id;
        statusMessage.value = "Created simulation draft for this workspace.";
        return;
      }
    }
    const local = makeLocalSimulation(config);
    simulations.value = [local, ...simulations.value];
    selectedSimulationId.value = local.id;
    apiMode.value = "mock";
    statusMessage.value = "Created a workspace draft.";
  } catch {
    const local = makeLocalSimulation(buildConfig(name));
    simulations.value = [local, ...simulations.value];
    selectedSimulationId.value = local.id;
    apiMode.value = "mock";
    statusMessage.value = "Created a workspace draft.";
  } finally {
    saving.value = false;
  }
}

async function saveSimulation() {
  const current = selectedSimulation.value;
  if (!current) {
    await createSimulation();
    return;
  }

  saving.value = true;
  const config = buildConfig(scenarioName.value.trim() || current.name);
  try {
    if (canUseApi.value && !current._local) {
      const persistBody = await persistFromConfig(config, config.name);
      const updated = await api.patchJson<SimulationRecord>(
        `/simulations/${encodeURIComponent(current.id)}`,
        persistBody,
      );
      if (updated?.id) {
        simulations.value = simulations.value.map((simulation) => simulation.id === updated.id ? updated : simulation);
        statusMessage.value = "Saved simulation changes.";
        return;
      }
    }

    const updated: SimulationRecord = {
      ...current,
      ...config,
      updated_at: new Date().toISOString(),
      _local: current._local || apiMode.value === "mock",
    };
    simulations.value = simulations.value.map((simulation) => simulation.id === current.id ? updated : simulation);
    statusMessage.value = updated._local ? "Saved as a workspace draft." : "Saved simulation changes.";
  } catch {
    const updated: SimulationRecord = {
      ...current,
      ...config,
      updated_at: new Date().toISOString(),
      _local: true,
    };
    simulations.value = simulations.value.map((simulation) => simulation.id === current.id ? updated : simulation);
    apiMode.value = "mock";
    statusMessage.value = "Saved as a workspace draft.";
  } finally {
    saving.value = false;
  }
}

async function runSimulation() {
  running.value = true;
  runResult.value = null;
  creditError.value = null;

  // Playground bypass: return the pre-computed run result without any API call or credit debit.
  if (playground.isPlayground.value && playground.simulationData.value?.run_result) {
    await saveSimulation();
    apiMode.value = "api";
    runResult.value = playground.simulationData.value.run_result as SimulationRunResult;
    statusMessage.value = "Sandbox simulation completed.";
    running.value = false;
    return;
  }

  await saveSimulation();
  const current = selectedSimulation.value;
  const config = buildConfig(scenarioName.value.trim() || current?.name || "Untitled simulation");

  if (!canUseApi.value || !current || current._local) {
    apiMode.value = "mock";
    runResult.value = null;
    statusMessage.value = "Connect to a live workspace to run a real simulation.";
    running.value = false;
    return;
  }

  try {
    const result = await api.postJson<SimulationRunResult>(
      `/simulations/${encodeURIComponent(current.id)}/run`,
      { analysis_tab: selectedAnalysisTab.value },
    );
    if (result?.run_id) {
      apiMode.value = "api";
      runResult.value = result;
      statusMessage.value = "Simulation run completed.";
      void refreshCredit();
    } else {
      statusMessage.value = "Simulation returned an unexpected response.";
    }
  } catch (err) {
    runResult.value = null;
    if (err instanceof ApiRequestError && err.status === 402) {
      creditError.value = err.errors[0] || "You've run out of credits for this billing period. Upgrade your plan to continue.";
      statusMessage.value = "Insufficient credits.";
    } else {
      const message = err instanceof Error ? err.message : String(err);
      statusMessage.value = `Run failed: ${message}`;
    }
  } finally {
    running.value = false;
  }
}

function toggleAsset(id: string) {
  selectedAssetIds.value = selectedAssetIds.value.includes(id)
    ? selectedAssetIds.value.filter((assetId) => assetId !== id)
    : [...selectedAssetIds.value, id];
}

function selectSimulation(id: string) {
  selectedSimulationId.value = id;
  runResult.value = null;
  applySimulationToForm(selectedSimulation.value);
}

async function applyPrefillFromRoute() {
  const q = route.query;
  if (q.from === "budget" && typeof q.amount === "string") {
    const amt = Number(q.amount);
    if (Number.isFinite(amt) && amt > 0) budget.value = amt;
    selectedAnalysisTab.value = "budget";
    statusMessage.value = "Prefilled from Spend.";
  }
  if (q.from === "audience") {
    selectedAnalysisTab.value = "audience";
    statusMessage.value = "Prefilled from Audience.";
  }
  if (q.from === "creative" && typeof q.creative_id === "string") {
    selectedAssetIds.value = [q.creative_id];
    selectedAnalysisTab.value = "creative";
    statusMessage.value = "Prefilled from Creatives.";
  }
  if (q.from === "insight") {
    selectedAnalysisTab.value = "forecast";
    statusMessage.value = "Prefilled from an insight.";
  }
  const duplicateFrom =
    typeof q.duplicate_from === "string"
      ? q.duplicate_from
      : typeof q.simulation_id === "string"
        ? q.simulation_id
        : null;
  if (duplicateFrom && canUseApi.value) {
    try {
      const row = await api.getJson<SimulationRecord>(
        `/simulations/${encodeURIComponent(duplicateFrom)}`,
      );
      applySimulationToForm(row);
      scenarioName.value = `${row.name} (copy)`;
      statusMessage.value = "Prefilled from previous simulation.";
    } catch {
      /* keep current form */
    }
  }
}

function statusTone(status?: string) {
  if (status === "failed") return "bg-rose-50 text-rose-700 border-rose-200";
  if (status === "complete") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-black/[0.035] text-black/55 border-black/10";
}

watch(
  () => [activeScope.value?.workspaceId, activeScope.value?.brandprofileId, auth.activeUserId.value, api.hasBase.value] as const,
  async () => {
    await Promise.all([
      refreshSimulations(),
      loadRealAssets(),
    ]);
    await applyPrefillFromRoute();
  },
  { immediate: true },
);
</script>

<template>
  <div class="simulation-lab max-w-full space-y-5 overflow-x-hidden pb-2">
    <PageHeader
      title="Simulation"
      description="What could happen if we try this? Create a scenario, choose the analysis lens, and forecast outcomes."
      dense
      metadata-tight
      hide-context
    >
      <template #actions>
        <button
          type="button"
          class="app-button button-secondary min-h-[2.75rem] gap-2 px-3 text-sm"
          :disabled="loadingList"
          @click="refreshSimulations"
        >
          <RefreshCcw class="h-4 w-4" :class="loadingList ? 'animate-spin' : ''" :stroke-width="1.9" />
          Refresh
        </button>
        <button
          type="button"
          class="app-button button-secondary min-h-[2.75rem] gap-2 px-3 text-sm"
          :disabled="saving"
          @click="createSimulation"
        >
          <Plus class="h-4 w-4" :stroke-width="1.9" />
          New draft
        </button>
        <button
          type="button"
          class="app-button button-primary min-h-[2.75rem] gap-2 px-4 text-sm text-white"
          :disabled="running || saving || selectedAssets.length === 0"
          @click="runSimulation"
        >
          <Loader2 v-if="running" class="h-4 w-4 animate-spin" :stroke-width="1.9" />
          <Play v-else class="h-4 w-4" :stroke-width="1.9" />
          Run simulation
        </button>
      </template>
    </PageHeader>

    <!-- Credit error: surface prominently, never silently fall to mock -->
    <div
      v-if="creditError"
      class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800"
    >
      {{ creditError }}
    </div>

    <div class="flex flex-wrap items-center gap-2 rounded-2xl border border-black/[0.06] bg-white/75 px-4 py-3 text-sm shadow-[0_12px_30px_-28px_rgba(15,23,42,0.3)]">
      <span
        class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
        :class="apiMode === 'api' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-black/10 bg-black/[0.04] text-black/50'"
      >
        {{ apiMode === "api" ? (playground.isPlayground.value ? "Sandbox forecast" : "Live forecast") : "Not connected" }}
      </span>
      <span class="text-black/55">{{ statusMessage }}</span>
      <span
        v-if="creditLabel"
        class="ml-auto text-[12px] font-semibold"
        :class="(creditsRemaining ?? 999) <= 25 ? 'text-amber-600' : 'text-black/40'"
      >
        {{ creditLabel }}
      </span>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)_minmax(18rem,22rem)]">
      <aside class="space-y-4">
        <SurfaceCard variant="frame" padding="sm" class="border border-black/[0.06]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="sv-section-title">Saved simulations</p>
              <p class="mt-1 text-[13px] text-black/45">Choose a draft or run history.</p>
            </div>
            <FlaskConical class="h-5 w-5 text-[#5B7BE1]/80" :stroke-width="1.9" />
          </div>

          <div v-if="loadingList" class="mt-5 flex items-center gap-2 text-sm text-black/45">
            <Loader2 class="h-4 w-4 animate-spin" :stroke-width="1.9" />
            Loading simulations
          </div>

          <div v-else-if="!simulations.length" class="mt-5 rounded-2xl border border-dashed border-black/12 bg-black/[0.015] p-4 text-sm text-black/45">
            No drafts yet. Create one from the builder.
          </div>

          <div v-else class="mt-4 space-y-2">
            <button
              v-for="simulation in simulations"
              :key="simulation.id"
              type="button"
              class="w-full rounded-2xl border p-3 text-left transition"
              :class="selectedSimulationId === simulation.id ? 'border-black/20 bg-black/[0.035]' : 'border-black/8 bg-white hover:border-black/14'"
              @click="selectSimulation(simulation.id)"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="line-clamp-2 text-sm font-semibold leading-snug text-black">{{ simulation.name }}</p>
                <span
                  v-if="simulation._local"
                  class="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700"
                >
                  Sandbox
                </span>
              </div>
              <p class="mt-2 text-[12px] text-black/42">
                {{ formatCompactCurrency(simulation.budget?.total_budget_usd || 0) }} ·
                {{ simulation.run_request.forecast_days }} days ·
                {{ simulation.variants.length }} variants
              </p>
            </button>
          </div>
        </SurfaceCard>

        <SurfaceCard variant="soft" padding="sm" class="border border-black/[0.05]">
          <p class="sv-section-title">Analysis lens</p>
          <div class="mt-3 space-y-2">
            <button
              v-for="tab in analysisTabs"
              :key="tab.id"
              type="button"
              class="w-full rounded-2xl border px-3 py-2.5 text-left transition"
              :class="selectedAnalysisTab === tab.id ? 'border-black bg-black text-white' : 'border-black/10 bg-white/80 text-black hover:border-black/18'"
              @click="selectedAnalysisTab = tab.id"
            >
              <span class="block text-sm font-semibold">{{ tab.label }}</span>
              <span class="mt-0.5 block text-[12px]" :class="selectedAnalysisTab === tab.id ? 'text-white/65' : 'text-black/42'">
                {{ tab.helper }}
              </span>
            </button>
          </div>
        </SurfaceCard>
      </aside>

      <main class="min-w-0 space-y-4">
        <SurfaceCard variant="frame" padding="sm" class="border border-black/[0.06]">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="sv-section-title">Scenario builder</p>
              <h2 class="sv-card-title mt-1">Configure the run</h2>
              <p class="mt-1 max-w-2xl text-[13px] leading-snug text-black/48">
                Set the forecast assumptions, budget guardrails, audience, and creative inputs for this scenario.
              </p>
            </div>
            <button
              type="button"
              class="app-button button-secondary min-h-[2.5rem] gap-2 px-3 text-sm"
              :disabled="saving"
              @click="saveSimulation"
            >
              <Save class="h-4 w-4" :stroke-width="1.9" />
              Save draft
            </button>
          </div>

          <div class="mt-5 grid gap-3 md:grid-cols-2">
            <label class="block">
              <span class="sv-section-title">Scenario name</span>
              <input v-model="scenarioName" type="text" class="app-control mt-2 min-h-[2.75rem] text-sm" placeholder="Q3 pipeline acceleration">
            </label>
            <label class="block">
              <span class="sv-section-title">Start date</span>
              <input v-model="startDate" type="date" class="app-control mt-2 min-h-[2.75rem] text-sm">
            </label>
            <label class="block">
              <span class="sv-section-title">Total budget</span>
              <div class="mt-2 rounded-2xl border border-black/10 bg-white px-4 py-3">
                <div class="flex items-center justify-between gap-3 text-sm font-semibold">
                  <span>{{ totalBudgetLabel }}</span>
                  <span class="text-black/45">{{ formatCurrency(dailyBudget, 0) }}/day</span>
                </div>
                <input v-model.number="budget" type="range" min="10000" max="220000" step="1000" class="simulation-range mt-3 w-full">
              </div>
            </label>
            <label class="block">
              <span class="sv-section-title">Duration</span>
              <div class="mt-2 rounded-2xl border border-black/10 bg-white px-4 py-3">
                <div class="flex items-center justify-between gap-3 text-sm font-semibold">
                  <span>{{ durationDays }} days</span>
                  <span class="text-black/45">Daily granularity</span>
                </div>
                <input v-model.number="durationDays" type="range" min="7" max="45" step="1" class="simulation-range mt-3 w-full">
              </div>
            </label>
            <label class="block">
              <span class="sv-section-title">Audience region</span>
              <select v-model="audienceRegion" class="app-control mt-2 min-h-[2.75rem] text-sm">
                <option v-for="r in AUDIENCE_REGIONS" :key="r.name" :value="r.name">
                  {{ r.label }}
                </option>
              </select>
            </label>
            <label class="block">
              <span class="sv-section-title">Estimated audience</span>
              <input v-model.number="audienceSize" type="number" min="10000" step="5000" class="app-control mt-2 min-h-[2.75rem] text-sm">
            </label>
            <label class="block md:col-span-2">
              <span class="sv-section-title">Offer value proposition</span>
              <input v-model="offerValue" type="text" class="app-control mt-2 min-h-[2.75rem] text-sm" placeholder="Executive benchmark consultation">
            </label>
          </div>

          <div class="mt-5 grid gap-3 md:grid-cols-2">
            <label class="rounded-2xl border border-black/10 bg-black/[0.015] p-4">
              <div class="flex items-center justify-between gap-3 text-sm font-semibold text-black">
                <span>Target ROAS</span>
                <span>{{ formatMultiplier(targetRoas, 1) }}</span>
              </div>
              <input v-model.number="targetRoas" type="range" min="1.5" max="9" step="0.1" class="simulation-range mt-3 w-full">
            </label>
            <label class="rounded-2xl border border-black/10 bg-black/[0.015] p-4">
              <div class="flex items-center justify-between gap-3 text-sm font-semibold text-black">
                <span>CPA guardrail</span>
                <span>{{ formatCurrency(cpaTarget, 0) }}</span>
              </div>
              <input v-model.number="cpaTarget" type="range" min="40" max="420" step="5" class="simulation-range mt-3 w-full">
            </label>
          </div>
        </SurfaceCard>

        <SurfaceCard variant="frame" padding="sm" class="border border-black/[0.06]">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="sv-section-title">Variants and context</p>
              <h3 class="sv-card-title mt-1">Choose campaign or creative inputs</h3>
            </div>
            <span class="rounded-full border border-black/10 bg-white px-3 py-1 text-[12px] font-semibold text-black/55">
              {{ selectedAssets.length }} selected
            </span>
          </div>

          <!-- Loading state -->
          <div v-if="assetsLoading" class="mt-4 flex items-center gap-2 text-sm text-black/45">
            <Loader2 class="h-4 w-4 animate-spin" :stroke-width="1.9" />
            Loading assets…
          </div>

          <!-- Empty state when connected but no assets exist -->
          <div
            v-else-if="canUseApi && !assetsLoading && availableAssets.length === 0"
            class="mt-4 rounded-2xl border border-dashed border-black/12 bg-black/[0.015] p-4 text-sm leading-relaxed text-black/52"
          >
            No variant or creative assets found for this brand profile. Go to
            <NuxtLink to="/app/assets/creative" class="font-semibold text-[#5B7BE1] underline">Assets → Creative</NuxtLink>
            to upload or import assets, then return here to select them.
          </div>

          <!-- Not connected to API -->
          <div
            v-else-if="!canUseApi && !assetsLoading"
            class="mt-4 rounded-2xl border border-dashed border-black/12 bg-black/[0.015] p-4 text-sm leading-relaxed text-black/52"
          >
            Connect to a workspace to load your real creative assets.
          </div>

          <!-- Real asset grid -->
          <div v-else class="mt-4 grid gap-2 md:grid-cols-2">
            <button
              v-for="asset in availableAssets"
              :key="asset.id"
              type="button"
              class="group rounded-2xl border p-3 text-left transition"
              :class="selectedAssetIds.includes(asset.id) ? 'border-black/24 bg-black/[0.035]' : 'border-black/8 bg-white hover:border-black/16'"
              @click="toggleAsset(asset.id)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-black">{{ asset.label }}</p>
                  <p class="mt-1 text-[12px] text-black/42">{{ asset.platform || asset.kind }} · {{ asset.metric }}</p>
                </div>
                <CheckCircle2
                  class="h-4 w-4 shrink-0"
                  :class="selectedAssetIds.includes(asset.id) ? 'text-[#5B7BE1]' : 'text-black/18'"
                  :stroke-width="2"
                />
              </div>
            </button>
          </div>
        </SurfaceCard>
      </main>

      <aside class="space-y-4">
        <!-- Run output -->
        <SurfaceCard v-if="runResult" variant="depth" padding="sm" class="relative overflow-hidden text-white">
          <div class="relative">
            <p class="text-[11px] font-bold uppercase tracking-wide text-white/60">
              {{ apiMode === 'api' ? (playground.isPlayground.value ? 'Sandbox forecast' : 'Run output') : 'Directional preview' }}
            </p>
            <h2 class="mt-2 text-2xl font-semibold tracking-tight">
              {{ formatMultiplier(projectedRoas, 1) }}
            </h2>
            <p class="mt-1 text-sm text-white/62">Projected ROAS · {{ runResult.analysis_tab }}</p>
            <div class="mt-5 grid grid-cols-2 gap-2">
              <div class="rounded-2xl border border-white/10 bg-white/10 p-3">
                <p class="text-[10px] font-bold uppercase tracking-wide text-white/50">Revenue</p>
                <p class="mt-2 text-lg font-semibold">{{ formatCompactCurrency(forecastTotals.value) }}</p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/10 p-3">
                <p class="text-[10px] font-bold uppercase tracking-wide text-white/50">CPA</p>
                <p class="mt-2 text-lg font-semibold">{{ formatCurrency(projectedCpa, 0) }}</p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/10 p-3">
                <p class="text-[10px] font-bold uppercase tracking-wide text-white/50">Conversions</p>
                <p class="mt-2 text-lg font-semibold">{{ formatCompactNumber(forecastTotals.conversions) }}</p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/10 p-3">
                <p class="text-[10px] font-bold uppercase tracking-wide text-white/50">Confidence</p>
                <p class="mt-2 text-lg font-semibold">{{ Math.round(runResult.confidence_score * 100) }}%</p>
              </div>
            </div>
          </div>
          <div class="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        </SurfaceCard>

        <!-- Placeholder when not yet run -->
        <SurfaceCard v-else variant="frame" padding="sm" class="border border-black/[0.06]">
          <p class="text-[11px] font-bold uppercase tracking-wide text-black/40">Run output</p>
          <p class="mt-3 text-sm text-black/52">
            <template v-if="creditError">Out of credits — upgrade to run a simulation.</template>
            <template v-else-if="running">Running…</template>
            <template v-else-if="apiMode === 'mock'">Save a draft and click Run simulation to see a directional preview.</template>
            <template v-else>Save a draft and click Run simulation to see results here.</template>
          </p>
        </SurfaceCard>

        <SurfaceCard variant="frame" padding="sm" class="border border-black/[0.06]">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="sv-section-title">Workflow trace</p>
              <p class="mt-1 text-[13px] text-black/45">Evidence, steps, and assumptions.</p>
            </div>
            <LineChart class="h-5 w-5 text-black/35" :stroke-width="1.9" />
          </div>

          <div v-if="runResult" class="mt-4 space-y-4">
            <div class="rounded-2xl border px-3 py-2 text-sm font-semibold" :class="statusTone(runResult.status)">
              {{ runResult.status }} · {{ runResult.eval_status }} · {{ runResult.analysis_tab }}
            </div>
            <p class="text-sm leading-relaxed text-black/62">{{ runResult.summary }}</p>

            <div>
              <p class="sv-section-title">Coverage</p>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <span
                  v-for="item in coverageItems"
                  :key="item.label"
                  class="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                  :class="item.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-black/10 bg-black/[0.03] text-black/38'"
                >
                  {{ item.label }}
                </span>
              </div>
            </div>

            <div>
              <p class="sv-section-title">Reasoning</p>
              <ul class="mt-2 space-y-2">
                <li v-for="claim in runResult.reasoning" :key="claim.claim" class="rounded-2xl bg-black/[0.025] p-3 text-[13px] leading-snug text-black/62">
                  {{ claim.claim }}
                </li>
              </ul>
            </div>

            <div v-if="runResult.warnings.length">
              <p class="sv-section-title">Warnings</p>
              <ul class="mt-2 space-y-2">
                <li v-for="warning in runResult.warnings" :key="warning" class="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[13px] leading-snug text-amber-800">
                  {{ warning }}
                </li>
              </ul>
            </div>
          </div>

          <div v-else class="mt-4 rounded-2xl border border-dashed border-black/12 bg-black/[0.015] p-4 text-sm leading-relaxed text-black/45">
            Select assets, save a draft, then run the selected analysis when you are ready.
          </div>
        </SurfaceCard>

        <SurfaceCard variant="soft" padding="sm" class="border border-black/[0.05]">
          <div class="flex gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white">
              <PencilLine class="h-5 w-5 text-[#5B7BE1]" :stroke-width="1.9" />
            </div>
            <div>
              <p class="text-sm font-semibold text-black">Implemented journey</p>
              <p class="mt-1 text-[13px] leading-relaxed text-black/48">
                Choose or create a simulation, configure scope, select variants, save, and run a forecast.
              </p>
              <div class="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-black/42">
                <span>Draft</span>
                <ArrowRight class="h-3.5 w-3.5" :stroke-width="2" />
                <span>Save</span>
                <ArrowRight class="h-3.5 w-3.5" :stroke-width="2" />
                <span>Run</span>
                <ArrowRight class="h-3.5 w-3.5" :stroke-width="2" />
                <span>Review</span>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.simulation-range {
  accent-color: rgba(91, 123, 225, 0.95);
  height: 0.35rem;
}

.simulation-lab :deep(.surface-depth) {
  background:
    radial-gradient(circle at 88% 0%, rgba(95, 199, 212, 0.34) 0%, transparent 32%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 58%, rgba(91, 123, 225, 0.92) 100%);
}
</style>

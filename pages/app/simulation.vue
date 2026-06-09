<script setup lang="ts">
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleDot,
  Image,
  Loader2,
  Minus,
  Play,
  Plus,
  RefreshCcw,
} from "lucide-vue-next";
import type {
  SimulationAnalysisTab,
  SimulationConfig,
  SimulationCreativeFormat,
  SimulationRecord,
  SimulationRunResult,
  SimulationVariantObjectType,
} from "~/types/simulation";
import { getPlaygroundExampleAssets } from "~/data/playground-example-assets";
import { ApiRequestError } from "~/utils/routeResponse";

definePageMeta({ layout: "app" });
useHead({ title: "Simulation — Solvomo" });

const OBJECT_TYPES: SimulationVariantObjectType[] = [
  "ads_ad", "ads_creative", "ads_campaign", "ads_group", "social_post", "social_media",
];
const FORMATS: SimulationCreativeFormat[] = [
  "IMAGE", "VIDEO", "CAROUSEL", "REELS", "STORY", "TEXT", "LIVE", "AUDIO",
];
const AUDIENCE_REGIONS = [
  { label: "United States", name: "United States", country_code: "US" },
  { label: "United Kingdom", name: "United Kingdom", country_code: "GB" },
  { label: "Canada", name: "Canada", country_code: "CA" },
  { label: "Australia", name: "Australia", country_code: "AU" },
  { label: "Germany", name: "Germany", country_code: "DE" },
  { label: "France", name: "France", country_code: "FR" },
  { label: "North America", name: "North America", country_code: "US" },
  { label: "EMEA", name: "EMEA", country_code: "GB" },
  { label: "Global", name: "Global", country_code: "" },
] as const;
const AUDIENCE_TYPES = ["broad", "interest_based", "lookalike", "retargeting"] as const;
const GRANULARITIES = ["day", "week", "month"] as const;
const BID_STRATEGIES = [
  "LOWEST_COST", "LOWEST_COST_WITH_BID_CAP", "COST_CAP", "BID_CAP", "TARGET_COST",
] as const;
const OUTPUT_METRICS = [
  "SPEND", "IMPRESSIONS", "CLICKS_ALL", "CTR_ALL",
  "CONVERSIONS", "CONVERSION_VALUE", "ROAS", "COST_PER_CONVERSION",
] as const;

interface VariantForm {
  id: string;
  label: string;
  platform: string;
  object_type: SimulationVariantObjectType;
  format: SimulationCreativeFormat | "";
  headline: string;
  primary_text: string;
  call_to_action: string;
  asset_url: string;
  source_asset_id: string;
}

const FOCUS_OPTIONS: { tab: SimulationAnalysisTab; label: string; description: string }[] = [
  { tab: "forecast", label: "Overall Forecast", description: "Estimate full-funnel performance using all available inputs." },
  { tab: "creative", label: "Creative Performance", description: "Compare variants by theme, format, and historical signals." },
  { tab: "copy", label: "Copy & CTA", description: "Evaluate copy clarity, CTA alignment, and messaging trends." },
  { tab: "audience", label: "Audience Fit", description: "Assess audience quality, saturation, and brand alignment." },
  { tab: "placement", label: "Placement Fit", description: "Check feed, story, and reels eligibility per variant." },
  { tab: "platform", label: "Platform Readiness", description: "Evaluate platform performance and connection coverage." },
  { tab: "budget", label: "Budget Sufficiency", description: "Check if your budget can hit the selected performance goals." },
  { tab: "offer", label: "Offer Strength", description: "Analyse offer competitiveness and conversion fit." },
  { tab: "timing", label: "Timing & Seasonality", description: "Analyse timing, holidays, and seasonal impact." },
];

const api = useApiClient();
const auth = useAuth();
const workspace = useWorkspaceContext();
const playground = useAppData();
const { persistFromConfig } = useSimulationPersist();
const { storeResult } = useSimulationResult();
const { creditLabel, creditsRemaining, refreshCredit } = useBillingCredit();
const router = useRouter();

// ── Scope ────────────────────────────────────────────────────────────────────
const activeScope = computed(() => {
  const workspaceId = workspace.currentWorkspaceId.value?.trim();
  const brandprofileId = workspace.currentBrandProfileId.value?.trim();
  if (!workspaceId || !brandprofileId) return null;
  return { workspaceId, brandprofileId };
});
const canUseApi = computed(() => Boolean(auth.isAuthenticated.value && api.hasBase.value && activeScope.value));

// ── Current simulation ID (editing existing) ─────────────────────────────────
const editingSimId = ref<string | null>(null);

// ── Section 1: Basics ────────────────────────────────────────────────────────
const simName = ref("My Campaign Simulation");
const forecastDays = ref(14);
const granularity = ref<"day" | "week" | "month">("day");
const startDate = ref(new Date().toISOString().slice(0, 10));
const timezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York");

// ── Section 2: Creative Variants ─────────────────────────────────────────────
function emptyVariant(n: number): VariantForm {
  return {
    id: `v${n}`, label: `Variant ${String.fromCharCode(64 + n)}`,
    platform: "instagram", object_type: "ads_ad", format: "",
    headline: "", primary_text: "", call_to_action: "Learn More",
    asset_url: "", source_asset_id: "",
  };
}

const variants = ref<VariantForm[]>([emptyVariant(1)]);
const expandedVariant = ref(0);

type RealAsset = {
  id: string; name: string; platform?: string; format?: string;
  object_type: string; headline?: string | null; asset_url?: string | null;
};
const libraryAssets = ref<RealAsset[]>([]);
const assetsLoading = ref(false);

function mapPlaygroundCreatives(
  creatives: Array<{ id: string; name: string; platform?: string; format?: string; headline?: string | null; asset_url?: string | null }>,
): RealAsset[] {
  return creatives.slice(0, 2).map((c) => ({
    id: c.id,
    name: c.name,
    platform: String(c.platform ?? ""),
    format: c.format != null ? String(c.format) : undefined,
    object_type: "ads_creative" as const,
    headline: c.headline != null ? String(c.headline) : null,
    asset_url: c.asset_url != null ? String(c.asset_url) : null,
  }));
}

async function loadAssets() {
  const scope = activeScope.value;
  if (playground.isPlayground.value) {
    const fromBundle = playground.assetsData.value?.creative;
    const creatives = fromBundle?.length ? fromBundle : getPlaygroundExampleAssets("creative");
    libraryAssets.value = mapPlaygroundCreatives(creatives);
    return;
  }
  if (!scope || !canUseApi.value) return;
  assetsLoading.value = true;
  try {
    const qs = `?workspace_id=${encodeURIComponent(scope.workspaceId)}&brandprofile_id=${encodeURIComponent(scope.brandprofileId)}&status=active&limit=60`;
    let variants: RealAsset[] = [];
    let creative: RealAsset[] = [];
    try {
      variants = await api.getJson<RealAsset[]>(`/assets/variants${qs}`);
    } catch { /* ignore */ }
    try {
      creative = await api.getJson<RealAsset[]>(`/assets/creative${qs}`);
    } catch { /* ignore */ }
    libraryAssets.value = [...(variants || []), ...(creative || [])];
  } finally {
    assetsLoading.value = false;
  }
}

function applyLibraryAsset(variantIndex: number, asset: RealAsset) {
  const v = variants.value[variantIndex];
  if (!v) return;
  v.source_asset_id = asset.id;
  v.asset_url = asset.asset_url || "";
  v.platform = asset.platform || v.platform;
  v.format = (asset.format as SimulationCreativeFormat) || v.format;
  v.object_type = (asset.object_type as SimulationVariantObjectType) || v.object_type;
  if (asset.headline) v.headline = String(asset.headline);
}

function addVariant() {
  variants.value.push(emptyVariant(variants.value.length + 1));
  expandedVariant.value = variants.value.length - 1;
}

function removeVariant(i: number) {
  if (variants.value.length === 1) return;
  variants.value.splice(i, 1);
  expandedVariant.value = Math.min(expandedVariant.value, variants.value.length - 1);
}

// ── Section 3: Audience ──────────────────────────────────────────────────────
const audienceRegion = ref("United States");
const audienceType = ref<"broad" | "interest_based" | "lookalike" | "retargeting">("broad");
const audienceMinAge = ref(25);
const audienceMaxAge = ref(55);
const audienceSize = ref(500000);
const interests = ref("");

// ── Section 4: Offer ─────────────────────────────────────────────────────────
const offerProductType = ref("");
const offerPriceUsd = ref<number | "">("");
const offerDiscount = ref<number | "">("");
const offerLimitedTime = ref(false);
const offerFreeShipping = ref(false);
const offerValueProp = ref("");

// ── Section 5: Budget & Goals ─────────────────────────────────────────────────
const dailyBudget = ref(100);
const durationDays = ref(14);
const currency = ref("USD");
const bidStrategy = ref<"LOWEST_COST" | "LOWEST_COST_WITH_BID_CAP" | "COST_CAP" | "BID_CAP" | "TARGET_COST">("LOWEST_COST");
const targetRoas = ref(2.0);
const targetCpa = ref(50);

const totalBudget = computed({
  get: () => Math.round(dailyBudget.value * durationDays.value),
  set: (v: number) => { dailyBudget.value = durationDays.value > 0 ? Math.round(v / durationDays.value) : dailyBudget.value; },
});

const budgetMismatch = computed(() => {
  const expected = dailyBudget.value * durationDays.value;
  return Math.abs(expected - totalBudget.value) > 1;
});

// ── Section 6: Connections ───────────────────────────────────────────────────
type ConnectionItem = { id: string; slug: string; label: string; connected: boolean };
const connections = ref<ConnectionItem[]>([]);

async function loadConnections() {
  if (!canUseApi.value) return;
  try {
    const raw = await api.getJson<{
      connections: { id: string; connection_slug: string; is_active?: boolean }[];
    }>("/auth/connections");
    connections.value = (raw.connections || []).map((c) => ({
      id: c.id, slug: c.connection_slug,
      label: c.connection_slug, connected: c.is_active !== false,
    }));
  } catch {
    connections.value = [];
  }
}

// ── Analysis Focus ────────────────────────────────────────────────────────────
const analysisTab = ref<SimulationAnalysisTab>("forecast");

// ── Readiness ────────────────────────────────────────────────────────────────
type ReadinessStatus = "ready" | "partial" | "missing" | "warning";

const readiness = computed<Record<string, { status: ReadinessStatus; note: string }>>(() => {
  const v0 = variants.value[0];
  const hasAsset = !!v0?.asset_url || !!v0?.source_asset_id;
  const hasHeadline = variants.value.some((v) => !!v.headline);
  const hasCopy = variants.value.some((v) => !!v.primary_text);
  const hasCta = variants.value.some((v) => !!v.call_to_action);
  const hasFormat = variants.value.some((v) => !!v.format);
  const hasPlatform = variants.value.some((v) => !!v.platform);
  const platformsNeeded = [...new Set(variants.value.map((v) => v.platform).filter(Boolean))];
  const connectedSlugs = connections.value.filter((c) => c.connected).map((c) => c.slug);
  const platformConnected = platformsNeeded.every((p) =>
    connectedSlugs.some((s) => s.includes(p) || p.includes(s.replace("ads", "").replace("_", "")))
  );
  const budgetOk = dailyBudget.value > 0 && durationDays.value > 0;
  const hasOffer = !!offerValueProp.value || !!offerProductType.value;

  return {
    creative: {
      status: variants.value.length === 0 ? "missing" : hasAsset || hasHeadline ? "ready" : "partial",
      note: variants.value.length === 0 ? "Add at least one variant" : !hasAsset ? "No asset selected" : "",
    },
    copy: {
      status: hasHeadline && hasCta ? "ready" : hasHeadline || hasCopy ? "partial" : "missing",
      note: !hasHeadline ? "Missing headline" : !hasCta ? "Missing CTA on a variant" : "",
    },
    audience: {
      status: audienceRegion.value ? "ready" : "missing",
      note: !audienceRegion.value ? "Set a target region" : "",
    },
    placement: {
      status: hasFormat ? "ready" : "partial",
      note: !hasFormat ? "Set format on variants to determine placement eligibility" : "",
    },
    platform: {
      status: !hasPlatform ? "missing" : !platformConnected ? "warning" : "ready",
      note: !hasPlatform ? "Set platform on variants" : !platformConnected ? `${platformsNeeded.join(", ")} not connected` : "",
    },
    budget: {
      status: !budgetOk ? "missing" : budgetMismatch.value ? "warning" : "ready",
      note: !budgetOk ? "Set daily budget and duration" : budgetMismatch.value ? "Daily × duration ≠ total" : "",
    },
    offer: {
      status: hasOffer ? "ready" : "partial",
      note: !hasOffer ? "Add value proposition or product type" : "",
    },
    timing: {
      status: startDate.value ? "ready" : "missing",
      note: !startDate.value ? "Set a start date" : "",
    },
  };
});

const overallReadiness = computed(() => {
  const statuses = Object.values(readiness.value).map((r) => r.status);
  if (statuses.every((s) => s === "ready")) return 100;
  const score = statuses.filter((s) => s === "ready").length * 100 / statuses.length;
  return Math.round(score);
});

const canRun = computed(() => variants.value.length > 0 && !running.value);

// ── Run ──────────────────────────────────────────────────────────────────────
const saving = ref(false);
const running = ref(false);
const runError = ref<string | null>(null);
const creditError = ref<string | null>(null);

function buildSimulationConfig(): SimulationConfig {
  const scope = activeScope.value;
  const brand = workspace.currentBrandProfile.value;
  const region = AUDIENCE_REGIONS.find((r) => r.name === audienceRegion.value) || AUDIENCE_REGIONS[0];

  return {
    workspace_id: scope?.workspaceId || "",
    brandprofile_id: scope?.brandprofileId || "",
    name: simName.value,
    connections: connections.value
      .filter((c) => c.connected)
      .map((c) => ({ connection_id: c.id, connection_slug: c.slug as any, category: "ads" as any })),
    brand: {
      brand_name: brand?.brandName || brand?.name || "",
      industry: brand?.industry || undefined,
      brand_recognition: brand?.brandRecognition || undefined,
      website_url: brand?.websiteUrl || undefined,
      reviews_count: brand?.reviewsCount,
      average_rating: brand?.averageRating,
      trust_signals: brand?.trustSignals?.length ? brand.trustSignals : undefined,
    },
    variants: variants.value.map((v) => ({
      variant_id: v.id,
      label: v.label,
      platform: v.platform || undefined,
      object_type: v.object_type,
      format: (v.format as SimulationCreativeFormat) || undefined,
      headline: v.headline || null,
      primary_text: v.primary_text || null,
      call_to_action: v.call_to_action || null,
      hook: null, description: null, caption: null,
      final_url: null, asset_url: v.asset_url || undefined,
      thumbnail_url: undefined, video_duration_seconds: null,
      published_at: null,
      source: null,
    })),
    audience: {
      location: {
        type: region.country_code ? "country" : "region",
        name: region.name,
        ...(region.country_code ? { country_code: region.country_code } : {}),
      },
      age_range: { min: audienceMinAge.value, max: audienceMaxAge.value },
      interests: interests.value ? interests.value.split(",").map((s) => s.trim()).filter(Boolean) : [],
      retargeting: audienceType.value === "retargeting",
      lookalike_audience: audienceType.value === "lookalike",
      custom_audience: audienceType.value === "interest_based",
      estimated_audience_size: audienceSize.value,
    },
    offer: {
      product_type: offerProductType.value || undefined,
      price_usd: offerPriceUsd.value !== "" ? Number(offerPriceUsd.value) : undefined,
      discount_percentage: offerDiscount.value !== "" ? Number(offerDiscount.value) : undefined,
      limited_time_offer: offerLimitedTime.value,
      free_shipping: offerFreeShipping.value,
      value_proposition: offerValueProp.value || undefined,
    },
    target_metrics: { ROAS: targetRoas.value, COST_PER_CONVERSION: targetCpa.value },
    output_metrics: [...OUTPUT_METRICS],
    budget: {
      daily_budget_amount: dailyBudget.value,
      currency: currency.value,
      duration_days: durationDays.value,
      total_budget_usd: totalBudget.value,
    },
    bid_strategy: bidStrategy.value,
    run_request: {
      forecast_days: forecastDays.value,
      granularity: granularity.value,
      start_date: startDate.value,
      timezone: timezone.value,
    },
  };
}

async function runSimulation() {
  if (!canRun.value) return;
  runError.value = null;
  creditError.value = null;

  // ── Save first (skipped in playground — no API writes allowed) ───────────
  saving.value = true;
  let simId = editingSimId.value;
  try {
    const config = buildSimulationConfig();
    if (canUseApi.value && !playground.isPlayground.value) {
      const persistBody = await persistFromConfig(config, simName.value);
      if (simId) {
        const updated = await api.patchJson<{ id: string }>(`/simulations/${encodeURIComponent(simId)}`, persistBody);
        simId = updated?.id || simId;
      } else {
        const created = await api.postJson<{ id: string }>("/simulations", persistBody);
        simId = created?.id || null;
        editingSimId.value = simId;
      }
    } else if (playground.isPlayground.value) {
      // Use a stable playground sim ID so the results page can hydrate from session.
      simId = "playground-sim";
    }
  } catch (err) {
    runError.value = err instanceof Error ? err.message : String(err);
    saving.value = false;
    return;
  } finally {
    saving.value = false;
  }

  if (!simId) {
    runError.value = "Could not save simulation — check your connection.";
    return;
  }

  // ── Run ──────────────────────────────────────────────────────────────────
  running.value = true;
  try {
    let result: SimulationRunResult;

    if (playground.isPlayground.value) {
      // Use the canned playground run result — no API call, no credit deduction.
      const pgResult = playground.simulationData.value?.run_result;
      if (!pgResult) {
        runError.value = "Playground simulation data not available.";
        return;
      }
      result = pgResult as SimulationRunResult;
    } else {
      result = await api.postJson<SimulationRunResult>(
        `/simulations/${encodeURIComponent(simId)}/run`,
        { analysis_tab: analysisTab.value }
      );
    }

    if (result?.run_id) {
      storeResult({
        sim_id: simId,
        sim_name: simName.value,
        analysis_tab: analysisTab.value,
        result,
        ran_at: new Date().toISOString(),
      });
      if (!playground.isPlayground.value) void refreshCredit();
      await router.push(`/app/simulation/${simId}/results`);
    } else {
      runError.value = "Simulation returned an unexpected response.";
    }
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 402) {
      creditError.value = err.errors[0] || "Out of credits — upgrade to continue.";
    } else {
      runError.value = err instanceof Error ? err.message : String(err);
    }
  } finally {
    running.value = false;
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────────────
watch(
  () => [
    activeScope.value?.workspaceId,
    auth.activeUserId.value,
    api.hasBase.value,
    playground.assetsData.value,
  ],
  async () => {
    await loadAssets();
    await loadConnections();
  },
  { immediate: true },
);
</script>

<template>
  <div class="max-w-full pb-16">
    <PageHeader
      title="Simulation Builder"
      description="Build your campaign simulation once. Choose what you want to analyse."
      dense
      hide-context
    >
      <template #actions>
        <span
          v-if="creditLabel"
          class="text-[12px] font-semibold"
          :class="(creditsRemaining ?? 999) <= 25 ? 'text-amber-600' : 'text-black/40'"
        >
          {{ creditLabel }}
        </span>
      </template>
    </PageHeader>

    <div class="mt-4 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">

      <!-- ════ LEFT: SECTIONS ════ -->
      <div class="space-y-4">

        <!-- §1 Simulation Basics -->
        <section class="sim-section">
          <div class="sim-section-header">
            <span class="sim-section-number">1</span>
            <div>
              <h2 class="sim-section-title">Simulation Basics</h2>
              <p class="sim-section-sub">Name, forecast window, and schedule</p>
            </div>
          </div>
          <div class="sim-section-body grid gap-3 sm:grid-cols-2">
            <label class="block sm:col-span-2">
              <span class="sim-label">Simulation name</span>
              <input v-model="simName" type="text" class="app-control mt-1.5 text-sm" placeholder="e.g. Summer Sale Campaign" />
            </label>
            <label class="block">
              <span class="sim-label">Forecast days</span>
              <input v-model.number="forecastDays" type="number" min="7" max="90" class="app-control mt-1.5 text-sm" />
            </label>
            <label class="block">
              <span class="sim-label">Granularity</span>
              <select v-model="granularity" class="app-control mt-1.5 text-sm">
                <option v-for="g in GRANULARITIES" :key="g" :value="g">{{ g.charAt(0).toUpperCase() + g.slice(1) }}</option>
              </select>
            </label>
            <label class="block">
              <span class="sim-label">Start date</span>
              <input v-model="startDate" type="date" class="app-control mt-1.5 text-sm" />
            </label>
            <label class="block">
              <span class="sim-label">Timezone</span>
              <input v-model="timezone" type="text" class="app-control mt-1.5 text-sm" placeholder="America/New_York" />
            </label>
          </div>
        </section>

        <!-- §2 Creative Variants -->
        <section class="sim-section">
          <div class="sim-section-header">
            <span class="sim-section-number">2</span>
            <div class="flex-1">
              <h2 class="sim-section-title">Creative Variants</h2>
              <p class="sim-section-sub">Each variant drives creative, copy, placement, and platform analysis</p>
            </div>
            <button type="button" class="app-button button-secondary gap-1.5 px-3 text-[13px]" @click="addVariant">
              <Plus class="h-3.5 w-3.5" :stroke-width="2" />
              Add variant
            </button>
          </div>

          <div class="sim-section-body space-y-3">
            <div
              v-for="(variant, vi) in variants"
              :key="variant.id"
              class="rounded-xl border border-black/[0.07] bg-white"
            >
              <!-- Variant header -->
              <div
                class="flex cursor-pointer items-center gap-3 px-4 py-3"
                role="button"
                tabindex="0"
                @click="expandedVariant = expandedVariant === vi ? -1 : vi"
                @keydown.enter.prevent="expandedVariant = expandedVariant === vi ? -1 : vi"
              >
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-black/[0.10] bg-black/[0.03] text-[11px] font-bold text-black/55">
                  {{ String.fromCharCode(65 + vi) }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-[13px] font-semibold text-black">{{ variant.label || `Variant ${String.fromCharCode(65 + vi)}` }}</p>
                  <p class="mt-0.5 font-mono text-[11px] text-black/40">
                    {{ [variant.platform, variant.format, variant.headline ? `"${variant.headline.slice(0, 30)}…"` : ""].filter(Boolean).join(" · ") || "Not configured" }}
                  </p>
                </div>
                <button
                  v-if="variants.length > 1"
                  type="button"
                  class="shrink-0 rounded-lg p-1.5 text-black/30 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Remove variant"
                  @click.stop="removeVariant(vi)"
                >
                  <Minus class="h-3.5 w-3.5" :stroke-width="2.5" />
                </button>
                <component :is="expandedVariant === vi ? ChevronUp : ChevronDown" class="h-4 w-4 shrink-0 text-black/30" :stroke-width="1.9" />
              </div>

              <!-- Variant body -->
              <div v-show="expandedVariant === vi" class="border-t border-black/[0.06] px-4 py-4">
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label class="block">
                    <span class="sim-label">Label</span>
                    <input v-model="variant.label" type="text" class="app-control mt-1.5 text-sm" placeholder="Variant A" />
                  </label>
                  <label class="block">
                    <span class="sim-label">Platform</span>
                    <select v-model="variant.platform" class="app-control mt-1.5 text-sm">
                      <option value="">Select…</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="tiktok">TikTok</option>
                      <option value="google">Google</option>
                      <option value="linkedin">LinkedIn</option>
                    </select>
                  </label>
                  <label class="block">
                    <span class="sim-label">Format</span>
                    <select v-model="variant.format" class="app-control mt-1.5 text-sm">
                      <option value="">Select…</option>
                      <option v-for="f in FORMATS" :key="f" :value="f">{{ f }}</option>
                    </select>
                  </label>
                  <label class="block">
                    <span class="sim-label">Object type</span>
                    <select v-model="variant.object_type" class="app-control mt-1.5 text-sm">
                      <option v-for="t in OBJECT_TYPES" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </label>
                  <label class="block">
                    <span class="sim-label">Call to action</span>
                    <select v-model="variant.call_to_action" class="app-control mt-1.5 text-sm">
                      <option>Learn More</option>
                      <option>Shop Now</option>
                      <option>Sign Up</option>
                      <option>Get Quote</option>
                      <option>Book Now</option>
                      <option>Contact Us</option>
                      <option>Download</option>
                      <option>Subscribe</option>
                    </select>
                  </label>
                  <label class="block sm:col-span-2 lg:col-span-3">
                    <span class="sim-label">Headline</span>
                    <input v-model="variant.headline" type="text" class="app-control mt-1.5 text-sm" placeholder="e.g. Summer Fly Ya'll, Live In Adventure" />
                  </label>
                  <label class="block sm:col-span-2 lg:col-span-3">
                    <span class="sim-label">Primary text</span>
                    <textarea v-model="variant.primary_text" rows="2" class="app-control mt-1.5 resize-none text-sm" placeholder="Body copy for the ad…" />
                  </label>
                </div>

                <!-- Asset library picker -->
                <div class="mt-4">
                  <div class="mb-2 flex items-center gap-2">
                    <span class="sim-label">From asset library</span>
                    <span v-if="assetsLoading" class="flex items-center gap-1 text-[11px] text-black/40">
                      <Loader2 class="h-3 w-3 animate-spin" />Loading
                    </span>
                  </div>
                  <div v-if="libraryAssets.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <button
                      v-for="asset in libraryAssets.slice(0, 8)"
                      :key="asset.id"
                      type="button"
                      class="group overflow-hidden rounded-xl border text-left transition-all duration-150"
                      :class="variant.source_asset_id === asset.id
                        ? 'border-[#5B7BE1]/40 ring-2 ring-[#5B7BE1]/20'
                        : 'border-black/[0.10] hover:border-black/[0.20]'"
                      @click="applyLibraryAsset(vi, asset)"
                    >
                      <!-- Thumbnail -->
                      <div class="relative aspect-[3/4] w-full overflow-hidden bg-black/[0.04]">
                        <img
                          v-if="asset.asset_url"
                          :src="asset.asset_url"
                          :alt="asset.name"
                          class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                        <div v-else class="flex h-full items-center justify-center text-black/20">
                          <component :is="Image" class="h-8 w-8" :stroke-width="1.5" />
                        </div>
                        <!-- Selected overlay -->
                        <div
                          v-if="variant.source_asset_id === asset.id"
                          class="absolute inset-0 flex items-center justify-center bg-[#5B7BE1]/20"
                        >
                          <span class="rounded-full bg-[#5B7BE1] px-2.5 py-1 text-[11px] font-bold text-white">Selected</span>
                        </div>
                      </div>
                      <!-- Label -->
                      <div class="px-2.5 py-2">
                        <p class="truncate text-[12px] font-semibold text-black">{{ asset.name }}</p>
                        <p v-if="asset.format || asset.platform" class="mt-0.5 font-mono text-[10px] text-black/40">
                          {{ [asset.format, asset.platform].filter(Boolean).join(" · ") }}
                        </p>
                      </div>
                    </button>
                  </div>
                  <p v-else-if="!assetsLoading && playground.isPlayground.value" class="text-[12px] text-black/35">
                    No example creatives available.
                  </p>
                  <p v-else-if="!assetsLoading" class="text-[12px] text-black/35">
                    No assets in library.
                    <NuxtLink to="/app/assets/creative" class="text-[#5B7BE1] underline">Upload assets →</NuxtLink>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- §3 Audience Targeting -->
        <section class="sim-section">
          <div class="sim-section-header">
            <span class="sim-section-number">3</span>
            <div>
              <h2 class="sim-section-title">Audience Targeting</h2>
              <p class="sim-section-sub">Who you are reaching with this campaign</p>
            </div>
          </div>
          <div class="sim-section-body grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="sim-label">Region</span>
              <select v-model="audienceRegion" class="app-control mt-1.5 text-sm">
                <option v-for="r in AUDIENCE_REGIONS" :key="r.name" :value="r.name">{{ r.label }}</option>
              </select>
            </label>
            <label class="block">
              <span class="sim-label">Estimated audience size</span>
              <input v-model.number="audienceSize" type="number" min="1000" step="10000" class="app-control mt-1.5 text-sm" />
            </label>
            <div class="block sm:col-span-2">
              <span class="sim-label block mb-1.5">Audience type</span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="t in AUDIENCE_TYPES"
                  :key="t"
                  type="button"
                  class="rounded-full border px-3 py-1.5 text-[12px] font-semibold capitalize transition-colors duration-150"
                  :class="audienceType === t
                    ? 'border-[#5B7BE1]/40 bg-[#5B7BE1]/[0.06] text-[#5B7BE1]'
                    : 'border-black/[0.10] bg-white text-black/55 hover:border-black/[0.20]'"
                  @click="audienceType = t"
                >
                  {{ t.replace("_", " ") }}
                </button>
              </div>
            </div>
            <label class="block">
              <span class="sim-label">Min age</span>
              <input v-model.number="audienceMinAge" type="number" min="13" max="64" class="app-control mt-1.5 text-sm" />
            </label>
            <label class="block">
              <span class="sim-label">Max age</span>
              <input v-model.number="audienceMaxAge" type="number" min="14" max="65" class="app-control mt-1.5 text-sm" />
            </label>
            <label class="block sm:col-span-2">
              <span class="sim-label">Interests (comma-separated)</span>
              <input v-model="interests" type="text" class="app-control mt-1.5 text-sm" placeholder="Fashion, Shopping, Travel, Outdoor Activities" />
            </label>
          </div>
        </section>

        <!-- §4 Offer & Product -->
        <section class="sim-section">
          <div class="sim-section-header">
            <span class="sim-section-number">4</span>
            <div>
              <h2 class="sim-section-title">Offer &amp; Product</h2>
              <p class="sim-section-sub">What you are selling and how it is positioned</p>
            </div>
          </div>
          <div class="sim-section-body grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="sim-label">Product type</span>
              <input v-model="offerProductType" type="text" class="app-control mt-1.5 text-sm" placeholder="e.g. Apparel" />
            </label>
            <label class="block">
              <span class="sim-label">Price (USD)</span>
              <input v-model="offerPriceUsd" type="number" min="0" step="0.01" class="app-control mt-1.5 text-sm" placeholder="39.99" />
            </label>
            <label class="block">
              <span class="sim-label">Discount %</span>
              <input v-model="offerDiscount" type="number" min="0" max="100" class="app-control mt-1.5 text-sm" placeholder="30" />
            </label>
            <label class="block sm:col-span-2">
              <span class="sim-label">Value proposition</span>
              <input v-model="offerValueProp" type="text" class="app-control mt-1.5 text-sm" placeholder="e.g. 30% off everything — ends Jun 15" />
            </label>
            <div class="flex flex-wrap gap-4">
              <label class="flex items-center gap-2 text-[13px] text-black/70">
                <input v-model="offerLimitedTime" type="checkbox" class="accent-[#5B7BE1]" />
                Limited time offer
              </label>
              <label class="flex items-center gap-2 text-[13px] text-black/70">
                <input v-model="offerFreeShipping" type="checkbox" class="accent-[#5B7BE1]" />
                Free shipping
              </label>
            </div>
          </div>
        </section>

        <!-- §5 Budget & Goals -->
        <section class="sim-section">
          <div class="sim-section-header">
            <span class="sim-section-number">5</span>
            <div>
              <h2 class="sim-section-title">Budget &amp; Goals</h2>
              <p class="sim-section-sub">Spend allocation, pacing, and performance targets</p>
            </div>
          </div>
          <div class="sim-section-body grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label class="block">
              <span class="sim-label">Daily budget</span>
              <div class="relative mt-1.5">
                <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-black/40">$</span>
                <input v-model.number="dailyBudget" type="number" min="1" class="app-control pl-6 text-sm" />
              </div>
            </label>
            <label class="block">
              <span class="sim-label">Duration (days)</span>
              <input v-model.number="durationDays" type="number" min="1" class="app-control mt-1.5 text-sm" />
            </label>
            <label class="block">
              <span class="sim-label">Currency</span>
              <select v-model="currency" class="app-control mt-1.5 text-sm">
                <option>USD</option><option>EUR</option><option>GBP</option><option>CAD</option><option>AUD</option>
              </select>
            </label>
            <div class="sm:col-span-2 lg:col-span-3">
              <div class="rounded-xl border px-4 py-3 text-[13px]" :class="budgetMismatch ? 'border-amber-200 bg-amber-50' : 'border-black/[0.07] bg-black/[0.02]'">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-black">Total budget</span>
                  <span class="font-mono font-semibold">{{ formatCompactCurrency(totalBudget) }}</span>
                </div>
                <p v-if="budgetMismatch" class="mt-1 text-amber-700">
                  Daily budget × duration = {{ formatCompactCurrency(dailyBudget * durationDays) }}. We'll use this value.
                </p>
                <p v-else class="mt-1 text-black/40">{{ formatCurrency(dailyBudget) }}/day × {{ durationDays }} days</p>
              </div>
            </div>
            <label class="block">
              <span class="sim-label">Bid strategy</span>
              <select v-model="bidStrategy" class="app-control mt-1.5 text-sm">
                <option v-for="s in BID_STRATEGIES" :key="s" :value="s">{{ s.replace(/_/g, " ") }}</option>
              </select>
            </label>
            <label class="block">
              <span class="sim-label">Target ROAS</span>
              <input v-model.number="targetRoas" type="number" min="0.1" step="0.1" class="app-control mt-1.5 text-sm" placeholder="2.0" />
            </label>
            <label class="block">
              <span class="sim-label">Target CPA ($)</span>
              <input v-model.number="targetCpa" type="number" min="1" class="app-control mt-1.5 text-sm" placeholder="50" />
            </label>
          </div>
        </section>

        <!-- §6 Connections -->
        <section class="sim-section">
          <div class="sim-section-header">
            <span class="sim-section-number">6</span>
            <div class="flex-1">
              <h2 class="sim-section-title">Connected Data Sources</h2>
              <p class="sim-section-sub">Live integrations improve forecast accuracy for platform and budget analysis</p>
            </div>
            <NuxtLink to="/app/connections" class="app-button button-secondary gap-1.5 px-3 text-[13px]">
              Manage →
            </NuxtLink>
          </div>
          <div class="sim-section-body">
            <div v-if="connections.length" class="flex flex-wrap gap-2">
              <div
                v-for="conn in connections"
                :key="conn.id"
                class="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-semibold"
                :class="conn.connected ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-black/[0.08] bg-black/[0.02] text-black/40'"
              >
                <span
                  class="h-2 w-2 shrink-0 rounded-full"
                  :class="conn.connected ? 'bg-emerald-500' : 'bg-black/20'"
                />
                {{ conn.label }}
              </div>
            </div>
            <p v-else class="text-[13px] text-black/40">
              No connections found.
              <NuxtLink to="/app/connections" class="text-[#5B7BE1] underline">Connect a data source →</NuxtLink>
            </p>
          </div>
        </section>
      </div>

      <!-- ════ RIGHT: FOCUS + READINESS + RUN ════ -->
      <aside class="lg:sticky lg:top-4 space-y-4">

        <!-- Analysis Focus -->
        <div class="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 class="mb-3 text-[11px] font-bold uppercase tracking-wide text-black/40">Analysis Focus</h3>
          <p class="mb-3 text-[12px] leading-relaxed text-black/50">What do you want Solvomo to analyse?</p>
          <div class="space-y-1">
            <button
              v-for="opt in FOCUS_OPTIONS"
              :key="opt.tab"
              type="button"
              class="w-full rounded-xl px-3 py-2.5 text-left transition-colors duration-150"
              :class="analysisTab === opt.tab ? 'bg-[#5B7BE1]/[0.07] ring-1 ring-[#5B7BE1]/20' : 'hover:bg-black/[0.03]'"
              @click="analysisTab = opt.tab"
            >
              <p class="text-[13px] font-semibold leading-snug" :class="analysisTab === opt.tab ? 'text-[#5B7BE1]' : 'text-black'">
                {{ opt.label }}
              </p>
              <p class="mt-0.5 text-[11px] leading-relaxed text-black/45">{{ opt.description }}</p>
            </button>
          </div>
        </div>

        <!-- Simulation Readiness -->
        <div class="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-[11px] font-bold uppercase tracking-wide text-black/40">Simulation Readiness</h3>
            <span class="font-mono text-[12px] font-semibold text-black">{{ overallReadiness }}%</span>
          </div>
          <!-- progress bar -->
          <div class="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="overallReadiness >= 80 ? 'bg-emerald-500' : overallReadiness >= 50 ? 'bg-amber-400' : 'bg-rose-400'"
              :style="{ width: `${overallReadiness}%` }"
            />
          </div>
          <div class="space-y-1.5">
            <div
              v-for="(item, key) in readiness"
              :key="key"
              class="flex items-start gap-2.5"
            >
              <component
                :is="item.status === 'ready' ? CheckCircle2 : item.status === 'warning' ? CircleAlert : item.status === 'partial' ? CircleDot : Minus"
                class="mt-0.5 h-3.5 w-3.5 shrink-0"
                :class="{
                  'text-emerald-500': item.status === 'ready',
                  'text-amber-500': item.status === 'warning',
                  'text-[#5B7BE1]': item.status === 'partial',
                  'text-black/25': item.status === 'missing',
                }"
                :stroke-width="2"
              />
              <div class="min-w-0 flex-1">
                <p class="text-[12px] font-semibold capitalize text-black">{{ key }}</p>
                <p v-if="item.note" class="text-[11px] leading-tight text-black/45">{{ item.note }}</p>
              </div>
              <span
                class="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                :class="{
                  'border-emerald-200 bg-emerald-50 text-emerald-700': item.status === 'ready',
                  'border-amber-200 bg-amber-50 text-amber-700': item.status === 'warning',
                  'border-[#5B7BE1]/30 bg-[#5B7BE1]/[0.05] text-[#5B7BE1]': item.status === 'partial',
                  'border-black/10 bg-black/[0.03] text-black/35': item.status === 'missing',
                }"
              >
                {{ item.status }}
              </span>
            </div>
          </div>
        </div>

        <!-- Run button + errors -->
        <div class="space-y-2">
          <div v-if="creditError" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-800">
            {{ creditError }}
          </div>
          <div v-if="runError" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
            {{ runError }}
          </div>
          <button
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-2xl border border-black bg-black py-3.5 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!canRun"
            @click="runSimulation"
          >
            <Loader2 v-if="saving || running" class="h-4 w-4 animate-spin" :stroke-width="2.5" />
            <Play v-else class="h-4 w-4" :stroke-width="2.5" />
            {{ saving ? "Saving…" : running ? "Running simulation…" : "Run Simulation" }}
          </button>
          <p class="text-center text-[11px] text-black/35">
            Analysis focus: <strong class="text-black/55">{{ FOCUS_OPTIONS.find(o => o.tab === analysisTab)?.label }}</strong>
          </p>
          <button
            v-if="editingSimId"
            type="button"
            class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-black/[0.10] bg-transparent px-4 py-2.5 text-[12px] font-semibold text-black/55 hover:bg-black/[0.03]"
            @click="() => { editingSimId = null; }"
          >
            <RefreshCcw class="h-3.5 w-3.5" :stroke-width="1.9" />
            Start new simulation
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.sim-section {
  @apply rounded-2xl border border-black/[0.07] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)];
}
.sim-section-header {
  @apply flex items-start gap-3 border-b border-black/[0.06] px-5 py-4;
}
.sim-section-number {
  @apply flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[11px] font-bold text-white;
}
.sim-section-title {
  @apply text-[14px] font-bold leading-snug text-black;
}
.sim-section-sub {
  @apply mt-0.5 text-[12px] leading-relaxed text-black/45;
}
.sim-section-body {
  @apply px-5 py-4;
}
.sim-label {
  @apply block text-[11px] font-bold uppercase tracking-wide text-black/40;
}
</style>

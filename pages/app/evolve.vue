<script setup lang="ts">
import { ArrowRight, Copy, FlaskConical, Rocket } from "lucide-vue-next";
import type { SimulationEvolveStatus } from "~/types/simulation";
import { brandScopeQuery } from "~/utils/apiScope";

definePageMeta({ layout: "app" });

useHead({ title: "Evolve — Solvomo" });

const api = useApiClient();
const workspace = useWorkspaceContext();
const playground = useAppData();
const { validatePush } = useSimulationPushValidation();
const route = useRoute();

type SimulationRow = {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  variants?: Array<{ platform?: string; label?: string }>;
  audience?: Record<string, unknown>;
  budget?: Record<string, unknown> | number;
  evolve_status?: string;
  run_summary?: { overall_score?: number; recommendation?: string };
};

const simulations = ref<SimulationRow[]>([]);
const loading = ref(false);
const loadError = ref<string | null>(null);
const pushBusyId = ref<string | null>(null);

const statusLabels: Record<SimulationEvolveStatus, string> = {
  draft: "Draft",
  reviewed: "Reviewed",
  ready_to_push: "Ready to Push",
  pushed: "Pushed",
  failed_validation: "Failed Validation",
};

function statusVariant(status: SimulationEvolveStatus): "neutral" | "info" | "success" | "warning" | "danger" {
  if (status === "ready_to_push") return "success";
  if (status === "pushed") return "info";
  if (status === "failed_validation") return "danger";
  if (status === "reviewed") return "warning";
  return "neutral";
}

function platformLabel(row: SimulationRow) {
  return row.variants?.[0]?.platform || row.variants?.[0]?.label || "—";
}

function scoreLabel(row: SimulationRow) {
  const score = row.run_summary?.overall_score;
  return typeof score === "number" ? `${Math.round(score)}` : "—";
}

function recommendation(row: SimulationRow) {
  return row.run_summary?.recommendation || "Run evaluation to generate recommendations.";
}

function budgetLabel(row: SimulationRow) {
  const b = row.budget;
  if (typeof b === "number") return `$${b.toLocaleString()}`;
  if (b && typeof b === "object" && "amount" in b) {
    const amt = Number((b as { amount?: unknown }).amount);
    return Number.isFinite(amt) ? `$${amt.toLocaleString()}` : "—";
  }
  return "—";
}

function rowStatus(row: SimulationRow): SimulationEvolveStatus {
  return validatePush(row).status;
}

function validationFailures(row: SimulationRow) {
  return validatePush(row).failures;
}

function canPush(row: SimulationRow) {
  return validatePush(row).eligible;
}

async function loadSimulations() {
  // Playground bypass: serve pre-bundled simulation records.
  if (playground.isPlayground.value && playground.simulationData.value) {
    simulations.value = playground.simulationData.value.simulations.map((s) => ({
      id: s.id,
      name: s.name,
      created_at: s.created_at,
      updated_at: s.updated_at,
      variants: s.connections.map((c) => ({ platform: c.connection_slug, label: c.category })),
      evolve_status: s.evolve_status,
      run_summary: undefined,
    }));
    loading.value = false;
    loadError.value = null;
    return;
  }

  const ws = workspace.currentWorkspaceId.value;
  const bp = workspace.currentBrandProfileId.value;
  if (!api.hasBase.value || !ws || !bp) return;
  loading.value = true;
  loadError.value = null;
  try {
    simulations.value = await api.getJson<SimulationRow[]>(
      `/simulations${brandScopeQuery(ws, bp)}&limit=50`,
    );
  } catch {
    loadError.value = "Could not load simulations.";
    simulations.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadSimulations();
});

watch(
  () => [workspace.currentWorkspaceId.value, workspace.currentBrandProfileId.value, playground.isPlayground.value] as const,
  () => {
    void loadSimulations();
  },
);

async function markReviewed(row: SimulationRow) {
  try {
    await api.patchJson(`/simulations/${encodeURIComponent(row.id)}`, {
      evolve_status: "reviewed",
    });
    await loadSimulations();
  } catch {
    loadError.value = "Could not update simulation status.";
  }
}

async function pushToProduction(row: SimulationRow) {
  if (!canPush(row)) return;
  pushBusyId.value = row.id;
  loadError.value = null;
  try {
    await api.patchJson(`/simulations/${encodeURIComponent(row.id)}`, {
      evolve_status: "pushed",
    });
    await loadSimulations();
  } catch {
    loadError.value = "Push to production is not available yet for this platform.";
  } finally {
    pushBusyId.value = null;
  }
}

function improveLink(row: SimulationRow) {
  return `/app/simulation?duplicate_from=${encodeURIComponent(row.id)}`;
}

function reviewLink(row: SimulationRow) {
  return `/app/simulation?simulation_id=${encodeURIComponent(row.id)}`;
}

const highlightedId = computed(() =>
  typeof route.query.simulation_id === "string" ? route.query.simulation_id : null,
);
</script>

<template>
  <div class="max-w-full space-y-5 overflow-x-hidden pb-2">
    <PageHeader
      title="Evolve"
      description="Review simulation results, compare variants, and mark winning configs ready for your ad platform."
      dense
      metadata-tight
      hide-context
    />

    <!-- Platform push is not yet automated — be explicit with marketers -->
    <SurfaceCard variant="soft" padding="sm" class="border border-amber-100 bg-amber-50/70">
      <p class="text-[13px] text-amber-900">
        <span class="font-semibold">Heads up:</span>
        "Push to production" marks a simulation as ready and records the decision — it does not yet automatically create or update a live campaign on Meta Ads or any other platform.
        You'll need to apply the winning config manually in your ad account.
        Automated platform push is coming in a future release.
      </p>
    </SurfaceCard>

    <SurfaceCard v-if="loadError" variant="soft" padding="sm" class="border border-red-200 bg-red-50/85">
      <p class="text-[13px] font-semibold text-red-950">{{ loadError }}</p>
    </SurfaceCard>

    <SurfaceCard v-if="loading" variant="soft" padding="md" class="border border-black/[0.06]">
      <p class="text-[13px] text-black/55">Loading simulations…</p>
    </SurfaceCard>

    <EmptyState
      v-else-if="!simulations.length"
      title="No simulations yet"
      description="Run a simulation first, then review and improve it here."
    >
      <NuxtLink to="/app/simulation" class="app-button button-primary text-sm">
        <FlaskConical class="h-4 w-4" :stroke-width="1.9" />
        Start simulation
      </NuxtLink>
    </EmptyState>

    <div v-else class="space-y-4">
      <SurfaceCard
        v-for="row in simulations"
        :key="row.id"
        variant="frame"
        padding="md"
        class="border border-black/[0.06]"
        :class="highlightedId === row.id ? 'ring-2 ring-[rgba(91,123,225,0.35)]' : ''"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <StatusBadge :label="statusLabels[rowStatus(row)]" :variant="statusVariant(rowStatus(row))" />
              <span class="text-[12px] text-black/45">{{ platformLabel(row) }}</span>
            </div>
            <h2 class="mt-2 text-[1.1rem] font-semibold tracking-[-0.03em] text-black">{{ row.name }}</h2>
            <p class="mt-2 text-[13px] text-black/55">{{ recommendation(row) }}</p>
            <div class="mt-3 flex flex-wrap gap-4 text-[12px] text-black/45">
              <span>Score: {{ scoreLabel(row) }}</span>
              <span>Budget: {{ budgetLabel(row) }}</span>
              <span v-if="row.created_at">Created: {{ new Date(row.created_at).toLocaleDateString() }}</span>
            </div>
            <ul v-if="validationFailures(row).length" class="mt-3 space-y-1">
              <li
                v-for="(failure, idx) in validationFailures(row)"
                :key="idx"
                class="text-[12px] text-red-700"
              >
                {{ failure }}
              </li>
            </ul>
          </div>
          <div class="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <NuxtLink :to="reviewLink(row)" class="app-button button-secondary text-sm">
              Review
              <ArrowRight class="h-4 w-4" :stroke-width="1.9" />
            </NuxtLink>
            <NuxtLink :to="improveLink(row)" class="app-button button-secondary text-sm">
              <Copy class="h-4 w-4" :stroke-width="1.9" />
              Duplicate / improve
            </NuxtLink>
            <button
              type="button"
              class="app-button button-secondary text-sm"
              :disabled="rowStatus(row) === 'pushed'"
              @click="markReviewed(row)"
            >
              Mark reviewed
            </button>
            <button
              type="button"
              class="app-button button-primary text-sm"
              :disabled="!canPush(row) || pushBusyId === row.id"
              :title="!canPush(row) ? validationFailures(row).join(' ') : undefined"
              @click="pushToProduction(row)"
            >
              <Rocket class="h-4 w-4" :stroke-width="1.9" />
              {{ pushBusyId === row.id ? "Saving…" : rowStatus(row) === "pushed" ? "Marked ready" : "Mark ready to push" }}
            </button>
          </div>
        </div>
      </SurfaceCard>
    </div>
  </div>
</template>

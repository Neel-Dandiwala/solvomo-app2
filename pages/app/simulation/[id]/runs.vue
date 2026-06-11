<script setup lang="ts">
import { ArrowLeft } from "lucide-vue-next";
import type { SimulationRunSummary } from "~/types/simulation";

definePageMeta({ layout: "app" });
useHead({ title: "Simulation runs" });

const route = useRoute();
const { listRuns } = useSimulationRuns();

const simId = computed(() => String(route.params.id));
const loading = ref(true);
const error = ref<string | null>(null);
const runs = ref<SimulationRunSummary[]>([]);

const columns = [
  { key: "started_at", label: "Started" },
  { key: "analysis_tab", label: "Focus" },
  { key: "status", label: "Status" },
  { key: "confidence", label: "Confidence", class: "text-right", headerClass: "text-right" },
  { key: "action", label: "", class: "text-right", headerClass: "text-right" },
];

const rows = computed(() =>
  runs.value.map((r) => ({
    id: r.run_id,
    started_at: new Date(r.started_at).toLocaleString(),
    analysis_tab: r.analysis_tab,
    status: r.reason ? `${r.status} (${r.reason})` : r.status,
    confidence: r.confidence_score != null ? `${Math.round(r.confidence_score * 100)}%` : "—",
    action: r.run_id,
  })),
);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await listRuns(simId.value);
    runs.value = res.runs;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "connector_error";
    runs.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => { void load(); });
</script>

<template>
  <div class="max-w-full space-y-5 pb-16">
    <PageHeader title="Run history" description="Server-persisted simulation runs for this scenario." dense hide-context>
      <template #actions>
        <NuxtLink :to="`/app/simulation`" class="app-button button-secondary gap-1.5 px-3 text-[12px]">
          <ArrowLeft class="h-3.5 w-3.5" :stroke-width="2" />
          Builder
        </NuxtLink>
      </template>
    </PageHeader>

    <SurfaceCard v-if="loading" padding="md">
      <p class="text-[13px] text-black/50">Loading runs…</p>
    </SurfaceCard>

    <SurfaceCard v-else-if="error" padding="md">
      <p class="text-[13px] text-rose-700">Could not load runs: {{ error }}</p>
    </SurfaceCard>

    <SurfaceCard v-else-if="!runs.length" padding="md">
      <EmptyState title="No runs yet" description="Run this simulation from the builder to create a persisted run." />
    </SurfaceCard>

    <DataTable
      v-else
      :columns="columns"
      :rows="rows"
      row-key="id"
      empty-label="No runs"
    >
      <template #cell-action="{ row }">
        <NuxtLink
          :to="`/app/simulation/${simId}/results?run_id=${encodeURIComponent(String(row.action))}`"
          class="text-[12px] font-semibold text-[#5B7BE1] underline"
        >
          View
        </NuxtLink>
      </template>
    </DataTable>
  </div>
</template>

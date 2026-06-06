<script setup lang="ts">
import { Archive, Copy, Plus } from "lucide-vue-next";
import type { AssetEnvelope, AssetKind } from "~/composables/useAssetsApi";

const props = defineProps<{
  kind: AssetKind;
  title: string;
  description: string;
  emptyLabel: string;
}>();

const assetsApi = useAssetsApi();
const workspace = useWorkspaceContext();

const items = ref<AssetEnvelope[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const busyId = ref<string | null>(null);

async function refresh() {
  loading.value = true;
  error.value = null;
  try {
    items.value = await assetsApi.list(props.kind);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Failed to load assets";
    items.value = [];
  } finally {
    loading.value = false;
  }
}

async function onArchive(row: AssetEnvelope) {
  busyId.value = row.id;
  try {
    await assetsApi.archive(props.kind, row.id);
    await refresh();
  } finally {
    busyId.value = null;
  }
}

async function onDuplicate(row: AssetEnvelope) {
  const name = window.prompt("Name for the duplicate", `${row.name} (copy)`);
  if (!name?.trim()) return;
  busyId.value = row.id;
  try {
    await assetsApi.duplicate(props.kind, row.id, name.trim());
    await refresh();
  } finally {
    busyId.value = null;
  }
}

onMounted(refresh);
watch(
  () => [workspace.currentWorkspaceId.value, workspace.currentBrandProfileId.value],
  refresh,
);
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <motion.div :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }">
        <h1 class="sv-page-title">{{ title }}</h1>
        <p class="sv-page-subtitle mt-1 max-w-2xl">{{ description }}</p>
      </motion.div>
      <div class="flex gap-2">
        <button type="button" class="app-button button-secondary text-sm" @click="refresh">
          Refresh
        </button>
        <NuxtLink to="/app/simulation" class="app-button button-primary text-sm inline-flex items-center gap-2">
          <Plus class="h-4 w-4" />
          Use in simulation
        </NuxtLink>
      </div>
    </header>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-else-if="loading" class="sv-meta">Loading…</p>

    <section v-else class="sv-card overflow-hidden">
      <div v-if="!items.length" class="p-8 text-center sv-meta">{{ emptyLabel }}</div>
      <table v-else class="w-full text-left text-sm">
        <thead class="border-b border-black/8 bg-black/[0.02]">
          <tr>
            <th class="px-4 py-3 font-semibold">Name</th>
            <th class="px-4 py-3 font-semibold">Source</th>
            <th class="px-4 py-3 font-semibold">Status</th>
            <th class="px-4 py-3 font-semibold">Updated</th>
            <th class="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in items"
            :key="row.id"
            class="border-b border-black/6 last:border-0"
          >
            <td class="px-4 py-3 font-medium">{{ row.name }}</td>
            <td class="px-4 py-3 sv-meta">{{ row.source_type }}</td>
            <td class="px-4 py-3 sv-meta">{{ row.status }}</td>
            <td class="px-4 py-3 sv-meta">{{ row.updated_at?.slice(0, 10) || "—" }}</td>
            <td class="px-4 py-3 text-right">
              <motion.div class="flex justify-end gap-2">
                <button
                  type="button"
                  class="app-button button-secondary text-xs inline-flex items-center gap-1"
                  :disabled="busyId === row.id"
                  @click="onDuplicate(row)"
                >
                  <Copy class="h-3.5 w-3.5" />
                  Duplicate
                </button>
                <button
                  type="button"
                  class="app-button button-secondary text-xs inline-flex items-center gap-1"
                  :disabled="busyId === row.id"
                  @click="onArchive(row)"
                >
                  <Archive class="h-3.5 w-3.5" />
                  Archive
                </button>
              </motion.div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <p class="sv-meta text-xs">
      Assets are immutable. To change one, duplicate it, edit at creation, then attach the new copy in Simulation.
    </p>
  </div>
</template>

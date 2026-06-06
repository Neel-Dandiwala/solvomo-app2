<script setup lang="ts">
import type {
  BuilderConnection,
  BuilderOptionsResponse,
  DatasourceDraft,
} from "~/types/saved-view";
import type {
  SavedDatasource,
  SavedViewDetail,
  SourceOptionsResponse,
} from "~/types/saved-view";

const props = defineProps<{
  viewId: string;
  viewDetail: SavedViewDetail;
  builderOptions: BuilderOptionsResponse | null;
}>();

const emit = defineEmits<{
  updated: [];
}>();

const { fetchSourceOptions, addDatasource, deleteDatasource } = useDashboardViewBuilder();

const pickerOpen = ref(false);
const selectedConnectionId = ref("");
const scopeOptions = ref<SourceOptionsResponse | null>(null);
const scopeLoading = ref(false);
const actionError = ref<string | null>(null);
const actionBusy = ref(false);

const connections = computed(() => props.builderOptions?.connections ?? []);

const savedDatasources = computed(() => props.viewDetail.datasources ?? []);
const selectedConnection = computed(() =>
  connections.value.find((c) => c.id === selectedConnectionId.value) ?? null,
);

function errorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object" || !("status" in err)) return undefined;
  const status = (err as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

async function openPicker() {
  actionError.value = null;
  pickerOpen.value = true;
  selectedConnectionId.value = connections.value[0]?.id ?? "";
  scopeOptions.value = null;
  if (selectedConnectionId.value) {
    await loadScopesForConnection(selectedConnectionId.value);
  }
}

async function loadScopesForConnection(connectionId: string) {
  scopeLoading.value = true;
  scopeOptions.value = null;
  try {
    scopeOptions.value = await fetchSourceOptions(connectionId);
  } catch {
    actionError.value = "Could not load scopes for this connection.";
  } finally {
    scopeLoading.value = false;
  }
}

watch(selectedConnectionId, (id) => {
  if (id && pickerOpen.value) void loadScopesForConnection(id);
});

function isScopeAlreadyAdded(scopeId: string, connectionId: string) {
  return savedDatasources.value.some(
    (ds) => ds.connection_id === connectionId && ds.scope_id === scopeId,
  );
}

async function addScope(conn: BuilderConnection, scopeId: string, scopeName: string) {
  if (!scopeOptions.value || isScopeAlreadyAdded(scopeId, conn.id)) return;
  actionError.value = null;
  actionBusy.value = true;
  const draft: DatasourceDraft = {
    connection_slug: conn.connection_slug,
    connection_id: conn.id,
    scope_type: scopeOptions.value.scope_type,
    scope_id: scopeId,
    scope_name: scopeName,
    resource_type: scopeOptions.value.resource_type,
  };
  try {
    await addDatasource(props.viewId, draft);
    pickerOpen.value = false;
    emit("updated");
  } catch {
    actionError.value = "Could not add datasource.";
  } finally {
    actionBusy.value = false;
  }
}

async function removeDatasource(ds: SavedDatasource) {
  actionError.value = null;
  actionBusy.value = true;
  try {
    await deleteDatasource(props.viewId, ds.id);
    emit("updated");
  } catch (err: unknown) {
    if (errorStatus(err) === 409) {
      actionError.value =
        "This datasource is used by one or more widgets. Remove or reassign those widgets first.";
    } else {
      actionError.value = "Could not remove datasource.";
    }
  } finally {
    actionBusy.value = false;
  }
}

</script>

<template>
  <SurfaceCard variant="soft" padding="md" class="border border-black/[0.06]">
    <motion.div
      class="flex flex-wrap items-center justify-between gap-2"
      layout
    >
      <p class="text-[13px] font-semibold text-black">Datasources</p>
      <button
        type="button"
        class="app-button button-secondary px-3 py-1.5 text-[12px]"
        :disabled="!connections.length || actionBusy"
        @click="openPicker"
      >
        Add datasource
      </button>
    </motion.div>

    <p v-if="actionError" class="mt-2 text-[12px] text-red-700">{{ actionError }}</p>

    <motion.ul v-if="savedDatasources.length" class="mt-3 space-y-2" layout>
      <motion.li
        v-for="ds in savedDatasources"
        :key="ds.id"
        layout
        class="flex items-center justify-between rounded-lg border border-black/[0.06] px-3 py-2"
      >
        <div>
          <p class="text-[13px] font-medium text-black">
            {{ ds.integration_slug }} — {{ ds.scope_name || ds.scope_id }}
          </p>
          <p class="text-[11px] text-black/45">{{ ds.scope_type }}</p>
        </div>
        <button
          type="button"
          class="text-[12px] text-red-600"
          :disabled="actionBusy"
          @click="removeDatasource(ds)"
        >
          Remove
        </button>
      </motion.li>
    </motion.ul>
    <p v-else class="mt-3 text-[12px] text-black/45">No datasources yet.</p>

    <div
      v-if="pickerOpen"
      class="mt-4 rounded-xl border border-black/[0.08] bg-black/[0.02] p-3"
    >
      <p class="text-[12px] font-semibold text-black/70">Add datasource</p>
      <label class="sv-section-title mt-3 block">Connection</label>
      <select
        v-model="selectedConnectionId"
        class="app-control mt-1 w-full"
      >
        <option v-for="c in connections" :key="c.id" :value="c.id">
          {{ c.name }}
        </option>
      </select>
      <p v-if="scopeLoading" class="mt-2 text-[12px] text-black/45">Loading scopes…</p>
      <motion.ul v-else-if="scopeOptions?.options?.length" class="mt-2 space-y-1" layout>
        <motion.li
          v-for="opt in scopeOptions.options"
          :key="opt.scope_id"
          layout
        >
          <button
            type="button"
            class="w-full rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-black/[0.04] disabled:opacity-40"
            :disabled="!selectedConnection || isScopeAlreadyAdded(opt.scope_id, selectedConnectionId) || actionBusy"
            @click="selectedConnection && addScope(selectedConnection, opt.scope_id, opt.scope_name)"
          >
            {{ opt.scope_name || opt.scope_id }}
            <span
              v-if="isScopeAlreadyAdded(opt.scope_id, selectedConnectionId)"
              class="text-black/40"
            > (added)</span>
          </button>
        </motion.li>
      </motion.ul>
      <p v-else class="mt-2 text-[12px] text-black/45">No scopes available.</p>
      <button
        type="button"
        class="mt-3 text-[12px] font-medium text-black/55"
        @click="pickerOpen = false"
      >
        Cancel
      </button>
    </div>
  </SurfaceCard>
</template>

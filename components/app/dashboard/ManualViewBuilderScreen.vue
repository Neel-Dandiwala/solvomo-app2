<script setup lang="ts">
import DashboardWidgetBuilderModal from "~/components/app/dashboard/DashboardWidgetBuilderModal.vue";
import type {
  BuilderConnection,
  BuilderOptionsResponse,
  DatasourceDraft,
  WidgetDraft,
} from "~/types/saved-view";
import type { SourceOptionsResponse } from "~/types/saved-view";
import { datasourceKeyForDraft } from "~/utils/dashboardWidgetMetrics";

const router = useRouter();
const { fetchBuilderOptions, fetchSourceOptions, createView } = useDashboardViewBuilder();

const step = ref<1 | 2 | 3 | 4>(1);
const name = ref("");
const description = ref("");
const options = ref<BuilderOptionsResponse | null>(null);
const optionsLoading = ref(true);
const optionsError = ref<string | null>(null);
const selectedConnectionIds = ref<string[]>([]);
const datasourceDrafts = ref<DatasourceDraft[]>([]);
const widgets = ref<WidgetDraft[]>([]);
const widgetModalOpen = ref(false);
const editingWidget = ref<WidgetDraft | null>(null);
const saving = ref(false);
const saveError = ref<string | null>(null);

const scopeOptionsByConnection = ref<Record<string, SourceOptionsResponse | null>>({});
const scopeLoading = ref<Record<string, boolean>>({});

onMounted(async () => {
  optionsLoading.value = true;
  try {
    options.value = await fetchBuilderOptions();
  } catch {
    optionsError.value = "Could not load builder options.";
  } finally {
    optionsLoading.value = false;
  }
});

const connections = computed(() => options.value?.connections ?? []);

const selectedConnectionList = computed(() =>
  connections.value.filter((c) => selectedConnectionIds.value.includes(c.id)),
);

function scopeOptions(connId: string) {
  return scopeOptionsByConnection.value[connId] ?? null;
}

function pruneWidgetsForDatasources() {
  const keys = new Set(datasourceDrafts.value.map(datasourceKeyForDraft));
  widgets.value = widgets.value.filter((w) => keys.has(w.datasource_key));
}

async function loadScopesForConnection(conn: BuilderConnection) {
  if (scopeOptionsByConnection.value[conn.id] !== undefined) return;
  scopeLoading.value = { ...scopeLoading.value, [conn.id]: true };
  try {
    scopeOptionsByConnection.value[conn.id] = await fetchSourceOptions(conn.id);
  } catch {
    scopeOptionsByConnection.value[conn.id] = null;
  } finally {
    scopeLoading.value = { ...scopeLoading.value, [conn.id]: false };
  }
}

function toggleConnection(conn: BuilderConnection) {
  const set = new Set(selectedConnectionIds.value);
  if (set.has(conn.id)) {
    set.delete(conn.id);
    datasourceDrafts.value = datasourceDrafts.value.filter(
      (d) => d.connection_id !== conn.id,
    );
    pruneWidgetsForDatasources();
  } else {
    set.add(conn.id);
    void loadScopesForConnection(conn);
  }
  selectedConnectionIds.value = [...set];
}

function isScopeSelected(connId: string, scopeId: string) {
  return datasourceDrafts.value.some(
    (d) => d.connection_id === connId && d.scope_id === scopeId,
  );
}

function toggleScope(conn: BuilderConnection, scopeId: string, scopeName: string) {
  const opts = scopeOptionsByConnection.value[conn.id];
  if (!opts) return;
  const key = `${conn.id}:${scopeId}`;
  const existing = datasourceDrafts.value.findIndex(
    (d) => d.connection_id === conn.id && d.scope_id === scopeId,
  );
  if (existing >= 0) {
    datasourceDrafts.value = datasourceDrafts.value.filter((_, i) => i !== existing);
    widgets.value = widgets.value.filter((w) => w.datasource_key !== key);
    return;
  }
  datasourceDrafts.value = [
    ...datasourceDrafts.value,
    {
      connection_slug: conn.connection_slug,
      connection_id: conn.id,
      scope_type: opts.scope_type,
      scope_id: scopeId,
      scope_name: scopeName,
      resource_type: opts.resource_type,
    },
  ];
}

function datasourceLabelForKey(key: string) {
  const idx = datasourceDrafts.value.findIndex((d) => datasourceKeyForDraft(d) === key);
  const ds = datasourceDrafts.value[idx];
  if (!ds) return key;
  return `${ds.connection_slug} — ${ds.scope_name || ds.scope_id}`;
}

function openAddWidget() {
  editingWidget.value = null;
  widgetModalOpen.value = true;
}

function openEditWidget(w: WidgetDraft) {
  editingWidget.value = w;
  widgetModalOpen.value = true;
}

function onWidgetSave(w: WidgetDraft) {
  const idx = widgets.value.findIndex((x) => x.client_id === w.client_id);
  if (idx >= 0) {
    widgets.value = widgets.value.map((x, i) => (i === idx ? w : x));
  } else {
    widgets.value = [...widgets.value, w];
  }
}

function removeWidget(client_id: string) {
  widgets.value = widgets.value.filter((w) => w.client_id !== client_id);
}

async function submit() {
  saveError.value = null;
  if (!name.value.trim()) {
    saveError.value = "Name is required.";
    return;
  }
  if (!datasourceDrafts.value.length) {
    saveError.value = "Select at least one datasource scope.";
    return;
  }
  saving.value = true;
  try {
    const created = await createView({
      name: name.value.trim(),
      description: description.value.trim(),
      datasources: datasourceDrafts.value,
      widgets: widgets.value,
    });
    await router.push(`/app/dashboards/${encodeURIComponent(created.id)}`);
  } catch {
    saveError.value = "Could not create this dashboard.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <motion.div
    class="mx-auto max-w-3xl space-y-6 pb-10 pt-2"
    :initial="{ opacity: 0, y: 8 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }"
  >
    <motion.div
      :initial="{ opacity: 0, y: 6 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.3, delay: 0.05 }"
    >
      <button
        type="button"
        class="mb-3 text-[12px] font-medium text-black/50 hover:text-black/75"
        @click="router.push('/app/dashboards')"
      >
        ← Back to dashboards
      </button>
      <p class="text-[22px] font-semibold tracking-[-0.03em] text-black">Create dashboard</p>
      <p class="mt-1 text-[13px] text-black/55">
        Build a view manually from your connected sources.
      </p>
    </motion.div>

    <SurfaceCard variant="frame" padding="md" class="border border-black/[0.06]">
      <p class="text-[12px] font-semibold uppercase tracking-wide text-black/40">
        Step {{ step }} of 4
      </p>

      <div v-if="step === 1" class="mt-4 space-y-3">
        <label class="sv-section-title" for="view-name">Name</label>
        <input id="view-name" v-model="name" class="app-control w-full" autocomplete="off">
        <label class="sv-section-title" for="view-desc">Description</label>
        <textarea id="view-desc" v-model="description" rows="3" class="app-control w-full resize-y" />
        <button type="button" class="app-button button-primary px-4 py-2 text-sm text-white" @click="step = 2">
          Next
        </button>
      </div>

      <div v-else-if="step === 2" class="mt-4 space-y-3">
        <p v-if="optionsLoading" class="text-[13px] text-black/50">Loading connections…</p>
        <p v-else-if="optionsError" class="text-[13px] text-red-700">{{ optionsError }}</p>
        <p v-else-if="!connections.length" class="text-[13px] text-black/50">
          Connect Meta Ads, Instagram, or TikTok first.
        </p>
        <motion.div v-else class="space-y-2" layout>
          <motion.label
            v-for="conn in connections"
            :key="conn.id"
            layout
            class="flex cursor-pointer items-center gap-3 rounded-xl border border-black/[0.08] px-3 py-2.5"
          >
            <input
              type="checkbox"
              :checked="selectedConnectionIds.includes(conn.id)"
              @change="toggleConnection(conn)"
            >
            <span class="text-[14px] font-medium text-black">{{ conn.name }}</span>
          </motion.label>
        </motion.div>
        <motion.div class="flex gap-2" layout>
          <button type="button" class="app-button button-secondary px-4 py-2 text-sm" @click="step = 1">
            Back
          </button>
          <button
            type="button"
            class="app-button button-primary px-4 py-2 text-sm text-white"
            :disabled="!selectedConnectionIds.length"
            @click="step = 3"
          >
            Next
          </button>
        </motion.div>
      </div>

      <motion.div v-else-if="step === 3" class="mt-4 space-y-4" layout>
        <motion.div
          v-for="conn in selectedConnectionList"
          :key="conn.id"
          layout
          class="rounded-xl border border-black/[0.06] p-3"
        >
          <p class="text-[14px] font-semibold text-black">{{ conn.name }}</p>
          <p v-if="scopeLoading[conn.id]" class="mt-2 text-[12px] text-black/45">Loading scopes…</p>
          <motion.div
            v-else-if="scopeOptions(conn.id)?.options?.length"
            class="mt-2 space-y-1"
            layout
          >
            <label
              v-for="opt in scopeOptions(conn.id)?.options ?? []"
              :key="opt.scope_id"
              class="flex cursor-pointer items-center gap-2 text-[13px]"
            >
              <input
                type="checkbox"
                :checked="isScopeSelected(conn.id, opt.scope_id)"
                @change="toggleScope(conn, opt.scope_id, opt.scope_name)"
              >
              {{ opt.scope_name || opt.scope_id }}
            </label>
          </motion.div>
          <p v-else class="mt-2 text-[12px] text-black/45">No scopes available.</p>
        </motion.div>
        <motion.div class="flex gap-2" layout>
          <button type="button" class="app-button button-secondary px-4 py-2 text-sm" @click="step = 2">
            Back
          </button>
          <button
            type="button"
            class="app-button button-primary px-4 py-2 text-sm text-white"
            :disabled="!datasourceDrafts.length"
            @click="step = 4"
          >
            Next
          </button>
        </motion.div>
      </motion.div>

      <motion.div v-else class="mt-4 space-y-4" layout>
        <div class="flex items-center justify-between">
          <p class="text-[14px] font-medium text-black">Widgets ({{ widgets.length }})</p>
          <button
            type="button"
            class="app-button button-secondary px-3 py-1.5 text-[12px]"
            :disabled="!datasourceDrafts.length"
            @click="openAddWidget"
          >
            Add widget
          </button>
        </div>
        <motion.div v-if="widgets.length" class="space-y-2" layout>
          <motion.div
            v-for="w in widgets"
            :key="w.client_id"
            layout
            class="flex items-center justify-between rounded-xl border border-black/[0.06] px-3 py-2"
          >
            <motion.div layout>
              <p class="text-[14px] font-medium text-black">{{ w.title }}</p>
              <p class="text-[11px] text-black/45">
                {{ w.widget_type }} · {{ datasourceLabelForKey(w.datasource_key) }}
              </p>
            </motion.div>
            <div class="flex gap-2">
              <button type="button" class="text-[12px] font-medium text-black/55" @click="openEditWidget(w)">
                Edit
              </button>
              <button type="button" class="text-[12px] text-red-600" @click="removeWidget(w.client_id)">
                Remove
              </button>
            </div>
          </motion.div>
        </motion.div>
        <p v-else class="text-[13px] text-black/50">
          Add at least one widget, or save an empty dashboard and add widgets later in the editor.
        </p>
        <p v-if="saveError" class="text-[13px] text-red-700">{{ saveError }}</p>
        <motion.div class="flex gap-2" layout>
          <button type="button" class="app-button button-secondary px-4 py-2 text-sm" @click="step = 3">
            Back
          </button>
          <button
            type="button"
            class="app-button button-primary px-4 py-2 text-sm text-white"
            :disabled="saving"
            @click="submit"
          >
            {{ saving ? "Saving…" : "Create dashboard" }}
          </button>
        </motion.div>
      </motion.div>
    </SurfaceCard>

    <DashboardWidgetBuilderModal
      :open="widgetModalOpen"
      :options="options"
      :datasources="datasourceDrafts"
      :editing="editingWidget"
      @close="widgetModalOpen = false"
      @save="onWidgetSave"
    />
  </motion.div>
</template>

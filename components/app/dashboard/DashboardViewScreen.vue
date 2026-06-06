<script setup lang="ts">
import DashboardDatasourceManager from "~/components/app/dashboard/DashboardDatasourceManager.vue";
import DashboardWidgetBuilderModal from "~/components/app/dashboard/DashboardWidgetBuilderModal.vue";
import SavedMetricWidgetRenderer from "~/components/app/overview/SavedMetricWidgetRenderer.vue";
import EmptyDashboardState from "~/components/app/overview/EmptyDashboardState.vue";
import type {
  BuilderOptionsResponse,
  DatasourceDraft,
  SavedViewDetail,
  SavedViewLayout,
  SavedWidget,
  SavedWidgetPayload,
  WidgetDraft,
} from "~/types/saved-view";
import { brandScopeQuery } from "~/utils/apiScope";
import { datasourceKeyForDraft } from "~/utils/dashboardWidgetMetrics";

const props = defineProps<{
  viewId: string;
}>();

const router = useRouter();
const api = useApiClient();
const workspace = useWorkspaceContext();
const { currentViewDetail, fetchView, viewsLoading, viewsError } = useOverviewViews();
const {
  fetchBuilderOptions,
  updateView,
  addWidget,
  updateWidget,
  deleteWidget,
  fetchPayloads,
} = useDashboardViewBuilder();

async function patchViewLayout(
  viewId: string,
  body: {
    layout?: unknown;
    widget_ids?: string[];
  },
) {
  const ws = workspace.currentWorkspaceId.value?.trim();
  const bp = workspace.currentBrandProfileId.value?.trim();
  if (!ws || !bp) return null;
  return api.patchJson<SavedViewDetail>(
    `/views/${encodeURIComponent(viewId)}${brandScopeQuery(ws, bp)}`,
    body,
  );
}

const builderOptions = ref<BuilderOptionsResponse | null>(null);
const savedPayloads = ref<Record<string, SavedWidgetPayload>>({});
const savedPayloadsLoading = ref(false);
const savedDataError = ref<string | null>(null);
const draggingSavedWidgetId = ref<string | null>(null);
const widgetModalOpen = ref(false);
const editingWidgetDraft = ref<WidgetDraft | null>(null);
const metaName = ref("");
const metaDescription = ref("");
const metaSaving = ref(false);

watch(
  () => props.viewId,
  async (id) => {
    if (!id) return;
    await fetchView(id);
    builderOptions.value = await fetchBuilderOptions();
  },
  { immediate: true },
);

watch(
  () => currentViewDetail.value,
  (detail) => {
    if (!detail) return;
    metaName.value = detail.name;
    metaDescription.value = detail.description ?? "";
  },
  { immediate: true },
);

const datasourceDrafts = computed((): DatasourceDraft[] => {
  const detail = currentViewDetail.value;
  if (!detail?.datasources?.length) return [];
  return detail.datasources.map((ds) => ({
    connection_slug: ds.integration_slug,
    connection_id: ds.connection_id,
    scope_type: ds.scope_type,
    scope_id: ds.scope_id,
    scope_name: ds.scope_name,
    resource_type: ds.resource_type,
  }));
});

const datasourceIndexById = computed(() => {
  const map = new Map<string, number>();
  currentViewDetail.value?.datasources?.forEach((ds, idx) => {
    map.set(ds.id, idx);
  });
  return map;
});

const savedWidgets = computed(() => {
  const detail = currentViewDetail.value;
  if (!detail?.widgets?.length) return [];
  const byId = Object.fromEntries(detail.widgets.map((widget) => [widget.id, widget]));
  const ordered = detail.widget_ids
    .map((id) => byId[id])
    .filter((widget): widget is SavedWidget => Boolean(widget));
  const extras = detail.widgets.filter((widget) => !detail.widget_ids.includes(widget.id));
  return [...ordered, ...extras];
});

const savedLayout = computed<SavedViewLayout>(() => {
  const layout = currentViewDetail.value?.layout;
  if (layout?.version && layout.breakpoints) return layout;
  return { version: 1, breakpoints: {} };
});

function defaultLayoutSlot(index: number) {
  return {
    x: (index % 3) * 4,
    y: Math.floor(index / 3) * 3,
    w: index === 0 ? 8 : 4,
    h: index === 0 ? 3 : 2,
  };
}

function rebuildLayout(widgetIds: string[]): SavedViewLayout {
  const existing = savedLayout.value.breakpoints?.lg || {};
  return {
    version: 1,
    breakpoints: {
      lg: Object.fromEntries(
        widgetIds.map((id, index) => [id, existing[id] || defaultLayoutSlot(index)]),
      ),
    },
  };
}

function savedGridStyle(widget: SavedWidget) {
  const pos = savedLayout.value.breakpoints?.lg?.[widget.id];
  if (!pos) return {};
  return {
    gridColumn: `${pos.x + 1} / span ${pos.w}`,
    gridRow: `${pos.y + 1} / span ${pos.h}`,
  };
}

function savedWidgetClass(widget: SavedWidget) {
  if (savedLayout.value.breakpoints?.lg?.[widget.id]) return "col-span-12";
  if (widget.size === "full") return "col-span-12";
  if (widget.size === "lg") return "col-span-12 lg:col-span-8";
  return "col-span-12 sm:col-span-6 lg:col-span-4";
}

function payloadForSaved(widgetId: string) {
  return savedPayloads.value[widgetId] || null;
}

async function refreshSavedPayloads() {
  const viewId = props.viewId;
  if (!viewId || !currentViewDetail.value) {
    savedPayloads.value = {};
    return;
  }
  savedPayloadsLoading.value = true;
  savedDataError.value = null;
  try {
    const payloads = await fetchPayloads(viewId);
    savedPayloads.value = Object.fromEntries(
      payloads.map((payload) => [payload.widget_id, payload]),
    );
  } catch {
    savedPayloads.value = {};
    savedDataError.value = "Could not load metrics for this view.";
  } finally {
    savedPayloadsLoading.value = false;
  }
}

watch(
  () => [props.viewId, currentViewDetail.value?.updated_at] as const,
  () => {
    void refreshSavedPayloads();
  },
  { immediate: true },
);

async function saveMetadata() {
  if (!props.viewId) return;
  metaSaving.value = true;
  try {
    const updated = await updateView(props.viewId, {
      name: metaName.value.trim(),
      description: metaDescription.value.trim(),
    });
    if (updated) currentViewDetail.value = updated;
    void refreshSavedPayloads();
  } finally {
    metaSaving.value = false;
  }
}

function widgetToDraft(w: SavedWidget): WidgetDraft {
  const dsIdx = datasourceIndexById.value.get(w.datasource_id) ?? 0;
  const ds = currentViewDetail.value?.datasources?.[dsIdx];
  const datasourceKey = ds ? datasourceKeyForDraft(ds) : "";
  return {
    client_id: w.id,
    datasource_key: datasourceKey,
    datasource_index: dsIdx,
    title: w.title,
    description: w.description,
    source: w.source,
    widget_type: w.widget_type,
    widget_subtype: w.widget_subtype,
    dataset_key: w.dataset_key || "metric_report",
    metrics: (w.metrics as Record<string, unknown>) ?? {},
    dimensions: (w.dimensions as Record<string, unknown>) ?? {},
    filters: (w.filters as Record<string, unknown>) ?? {},
    size: w.size,
  };
}

function openAddWidget() {
  editingWidgetDraft.value = null;
  widgetModalOpen.value = true;
}

function openEditWidget(w: SavedWidget) {
  editingWidgetDraft.value = widgetToDraft(w);
  widgetModalOpen.value = true;
}

async function onWidgetModalSave(draft: WidgetDraft) {
  const detail = currentViewDetail.value;
  if (!detail || !props.viewId) return;
  const ds = detail.datasources?.[draft.datasource_index];
  if (!ds) return;

  const isEdit = detail.widgets?.some((w) => w.id === draft.client_id);
  try {
    if (isEdit) {
      await updateWidget(props.viewId, draft.client_id, {
        datasource_id: ds.id,
        title: draft.title,
        description: draft.description,
        widget_type: draft.widget_type,
        widget_subtype: draft.widget_subtype,
        metrics: draft.metrics,
        dimensions: draft.dimensions,
        filters: draft.filters,
        size: draft.size,
      });
    } else {
      const created = await addWidget(props.viewId, {
        datasource_id: ds.id,
        title: draft.title,
        description: draft.description,
        widget_type: draft.widget_type,
        widget_subtype: draft.widget_subtype,
        metrics: draft.metrics,
        dimensions: draft.dimensions,
        filters: draft.filters,
        size: draft.size,
      });
      const ids = [...(currentViewDetail.value?.widget_ids ?? []), created.id];
      const layout = rebuildLayout(ids);
      await patchViewLayout(props.viewId, { widget_ids: ids, layout });
      await fetchView(props.viewId);
    }
    if (isEdit) await fetchView(props.viewId);
    void refreshSavedPayloads();
  } catch {
    savedDataError.value = "Could not save widget.";
  }
}

async function removeWidget(widgetId: string) {
  if (!props.viewId) return;
  try {
    await deleteWidget(props.viewId, widgetId);
    const ids = savedWidgets.value.map((w) => w.id).filter((id) => id !== widgetId);
    const layout = rebuildLayout(ids);
    await patchViewLayout(props.viewId, { widget_ids: ids, layout });
    await fetchView(props.viewId);
  } catch {
    savedDataError.value = "Could not delete widget.";
  }
}

async function onSavedDrop(targetId: string) {
  const draggedId = draggingSavedWidgetId.value;
  draggingSavedWidgetId.value = null;
  const viewId = props.viewId;
  if (!draggedId || !viewId || draggedId === targetId) return;
  const ids = savedWidgets.value.map((widget) => widget.id);
  const from = ids.indexOf(draggedId);
  const to = ids.indexOf(targetId);
  if (from === -1 || to === -1) return;
  const [moved] = ids.splice(from, 1);
  ids.splice(to, 0, moved!);
  const layout = rebuildLayout(ids);
  try {
    const updated = await patchViewLayout(viewId, { widget_ids: ids, layout });
    if (updated) {
      currentViewDetail.value = updated;
      savedDataError.value = null;
    }
  } catch {
    savedDataError.value = "Could not save widget layout.";
  }
}

function onSavedDragStart(widgetId: string) {
  draggingSavedWidgetId.value = widgetId;
}

function onSavedDragEnd() {
  draggingSavedWidgetId.value = null;
}

const pageTitle = computed(() => currentViewDetail.value?.name || "Dashboard");

useHead(() => ({ title: `${pageTitle.value} — Solvomo` }));
</script>

<template>
  <div class="max-w-full space-y-5 overflow-x-hidden pb-2">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <button
          type="button"
          class="mb-2 text-[12px] font-medium text-black/50 transition hover:text-black/75"
          @click="router.push('/app/dashboards')"
        >
          ← All dashboards
        </button>
        <p class="text-[22px] font-semibold tracking-[-0.03em] text-black">
          {{ pageTitle }}
        </p>
      </div>
      <button
        type="button"
        class="app-button button-primary px-4 py-2 text-sm text-white"
        :disabled="!datasourceDrafts.length"
        @click="openAddWidget"
      >
        Add widget
      </button>
    </div>

    <SurfaceCard v-if="currentViewDetail" variant="soft" padding="md" class="border border-black/[0.06]">
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="sv-section-title">Name</label>
          <input v-model="metaName" class="app-control mt-1 w-full">
        </div>
        <div>
          <label class="sv-section-title">Description</label>
          <input v-model="metaDescription" class="app-control mt-1 w-full">
        </div>
      </div>
      <button
        type="button"
        class="mt-3 app-button button-secondary px-3 py-1.5 text-[12px]"
        :disabled="metaSaving"
        @click="saveMetadata"
      >
        {{ metaSaving ? "Saving…" : "Save details" }}
      </button>
    </SurfaceCard>

    <p v-if="viewsError" class="text-[12px] text-red-700">{{ viewsError }}</p>
    <SurfaceCard v-else-if="viewsLoading" variant="soft" padding="md">
      <p class="text-[13px] text-black/55">Loading dashboard…</p>
    </SurfaceCard>

    <template v-else-if="currentViewDetail">
      <DashboardDatasourceManager
        :view-id="viewId"
        :view-detail="currentViewDetail"
        :builder-options="builderOptions"
        @updated="fetchView(viewId)"
      />

      <SurfaceCard variant="soft" padding="sm" class="border border-black/[0.05]">
        <p class="text-[12px] text-black/45">
          {{ savedWidgets.length }} widgets · {{ datasourceDrafts.length }} datasources · drag to reorder
          <span v-if="savedPayloadsLoading"> · loading data</span>
        </p>
        <p v-if="savedDataError" class="mt-2 text-[12px] text-red-700">{{ savedDataError }}</p>
      </SurfaceCard>

      <div class="grid grid-cols-12 auto-rows-[minmax(8rem,auto)] gap-3 lg:gap-4">
        <SurfaceCard
          v-for="widget in savedWidgets"
          :key="widget.id"
          variant="frame"
          padding="md"
          draggable="true"
          class="col-span-12 h-full min-w-0 cursor-move overflow-hidden sm:col-span-6 lg:col-span-4"
          :class="savedWidgetClass(widget)"
          :style="savedGridStyle(widget)"
          @dragstart="onSavedDragStart(widget.id)"
          @dragend="onSavedDragEnd"
          @dragover.prevent
          @drop.prevent="onSavedDrop(widget.id)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-[14px] font-semibold tracking-[-0.02em] text-black">
                {{ widget.title }}
              </p>
              <p class="text-[11px] text-black/45">
                {{ widget.widget_type }} / {{ widget.widget_subtype }}
              </p>
            </div>
            <div class="flex shrink-0 gap-2">
              <button type="button" class="text-[11px] font-medium text-black/55" @click="openEditWidget(widget)">
                Edit
              </button>
              <button type="button" class="text-[11px] text-red-600" @click="removeWidget(widget.id)">
                Del
              </button>
            </div>
          </div>
          <div class="mt-3 border-t border-black/[0.06] pt-3">
            <SavedMetricWidgetRenderer
              :payload="payloadForSaved(widget.id)"
              :widget-subtype="widget.widget_subtype"
            />
          </div>
        </SurfaceCard>
      </div>

      <EmptyDashboardState
        v-if="!savedWidgets.length"
        title="This dashboard is empty."
        description="Add a widget to start visualizing your connected metrics."
        show-actions
        @add-widget="openAddWidget"
      />
    </template>

    <DashboardWidgetBuilderModal
      :open="widgetModalOpen"
      :options="builderOptions"
      :datasources="datasourceDrafts"
      :editing="editingWidgetDraft"
      @close="widgetModalOpen = false"
      @save="onWidgetModalSave"
    />
  </div>
</template>

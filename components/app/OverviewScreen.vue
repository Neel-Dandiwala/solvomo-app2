<script setup lang="ts">
import OverviewDashboardModal from "~/components/app/overview/OverviewDashboardModal.vue";
import OverviewLayoutEditorModal from "~/components/app/overview/OverviewLayoutEditorModal.vue";
import OverviewWidgetBuilderModal from "~/components/app/overview/OverviewWidgetBuilderModal.vue";
import OverviewWidgetCard from "~/components/app/overview/OverviewWidgetCard.vue";
import OverviewWidgetRenderer from "~/components/app/overview/OverviewWidgetRenderer.vue";
import SavedMetricWidgetRenderer from "~/components/app/overview/SavedMetricWidgetRenderer.vue";
import type { OverviewWidgetPayload } from "~/composables/useOverviewWidgetPayloads";
import type { OverviewInsight, OverviewWidgetConfig } from "~/types/mock";
import type { SavedViewLayout, SavedWidget, SavedWidgetPayload } from "~/types/saved-view";

type KpiCard = {
  widget: OverviewWidgetConfig;
  payload: OverviewWidgetPayload;
};

/** Hero row: main trend + priority signals only */
const PRIMARY_CHART_ORDER = ["w-trend-spend-revenue", "w-signals-priority"] as const;

const curatedKpiIds = ["spend", "revenue", "roi", "cac", "pipeline_revenue"] as const;

const route = useRoute();
const router = useRouter();
const {
  views,
  viewsLoading,
  viewsError,
  selectedViewId,
  currentViewDetail,
  refreshViews,
  fetchView,
} = useOverviewViews();
const workspaceContext = useWorkspaceContext();
const {
  userConnections,
  userConnectionsLoaded,
  integrationBySlug,
  refreshConnectionsData,
} = useConnectionsData();

/** Bind saved view to route query `view_id` for deep links. */
watch(
  () => route.query.view_id,
  (q) => {
    const id = typeof q === "string" && q.trim() ? q.trim() : undefined;
    if (id) selectedViewId.value = id;
    else selectedViewId.value = null;
  },
  { immediate: true },
);

watch(selectedViewId, (id) => {
  const cur = typeof route.query.view_id === "string" ? route.query.view_id : undefined;
  const next = id ?? undefined;
  if (next === cur) return;
  const query = { ...route.query } as Record<string, string | string[] | undefined>;
  if (next) query.view_id = next;
  else delete query.view_id;
  void router.replace({ query });
});

const savedViewSelect = computed({
  get: () => selectedViewId.value ?? "",
  set: (v: string) => {
    selectedViewId.value = v.trim() ? v.trim() : null;
  },
});

const { dataStatus, overview } = useAppData();
const {
  dashboards,
  widgets,
  selectedDashboardId,
  currentDashboard,
  currentWidgets,
  addWidget,
  createDashboard,
  removeWidget,
  setDashboardWidgetOrder,
} = useOverviewDashboards();
const { payloadFor } = useOverviewWidgetPayloads();
const {
  templates,
  templatesLoading,
  templatesError,
  generateView,
  fetchWidgetPayloads,
  patchViewLayout,
} = useDashboardIntelligence();

const widgetBuilderOpen = ref(false);
const dashboardModalOpen = ref(false);
const layoutEditorOpen = ref(false);
const selectedRange = ref<4 | 7 | 0>(7);
const tableDetailId = ref<string | null>(null);
const aiPrompt = ref("");
const aiBusy = ref(false);
const aiError = ref<string | null>(null);
const selectedTemplateId = ref<string | null>(null);
const savedPayloads = ref<Record<string, SavedWidgetPayload>>({});
const savedPayloadsLoading = ref(false);
const savedDataError = ref<string | null>(null);
const draggingSavedWidgetId = ref<string | null>(null);

const rangeOptions = [
  { id: 4, label: "4 days" },
  { id: 7, label: "7 days" },
  { id: 0, label: "All" },
] as const;

onMounted(() => {
  void refreshConnectionsData();
});

const activeConnections = computed(() => {
  const brandprofileId = workspaceContext.currentBrandProfileId.value;
  return userConnections.value.filter((connection) => {
    if (!connection.isActive) return false;
    if (!brandprofileId || !connection.brandProfileId) return true;
    return connection.brandProfileId === brandprofileId;
  });
});

const sourceLabels = computed(() =>
  activeConnections.value.map((connection) => {
    const integration = integrationBySlug(connection.connectorSlug);
    return integration?.name || connection.connectorSlug;
  }),
);

const hasConnections = computed(() => activeConnections.value.length > 0);
const showConnectionEmptyState = computed(
  () => userConnectionsLoaded.value && !hasConnections.value,
);

const selectedDashboardName = computed(() => {
  if (hasSavedView.value) return currentViewDetail.value?.name || "Saved view";
  return currentDashboard.value?.name || "Default dashboard";
});

const allWidgets = computed(() => currentWidgets.value);

const executiveKpis = computed(() =>
  curatedKpiIds
    .map((metric) =>
      allWidgets.value.find(
        (w: OverviewWidgetConfig) => w.visualization === "kpi" && w.metric === metric,
      ),
    )
    .filter((w): w is OverviewWidgetConfig => Boolean(w)),
);

const chartWidgets = computed(() =>
  allWidgets.value.filter(
    (w: OverviewWidgetConfig) => w.visualization !== "kpi" && w.visualization !== "insights",
  ),
);

const executiveBullets = computed(() => overview.value?.executiveBullets || []);
const insightItems = computed(() => overview.value?.insights || []);

const primaryCharts = computed(() => {
  const charts = chartWidgets.value;
  const ordered = PRIMARY_CHART_ORDER.map((id) => charts.find((w) => w.id === id)).filter(
    Boolean,
  ) as OverviewWidgetConfig[];
  if (ordered.length) return ordered;
  const first = charts[0];
  if (!first) return [];
  const hero = first.size === "lg" ? first : charts.find((w) => w.size === "lg") || first;
  const rest = charts.filter((w) => w.id !== hero.id).slice(0, 1);
  return [hero, ...rest];
});

const secondaryCharts = computed(() => {
  const ids = new Set(primaryCharts.value.map((w) => w.id));
  return chartWidgets.value.filter((w) => !ids.has(w.id));
});

const heroSignalLinks = computed(() =>
  insightItems.value
    .filter((i: OverviewInsight) => i.linkTo)
    .slice(0, 4)
    .map((i: OverviewInsight) => ({
      label: (i.headline || i.title).length > 56 ? `${(i.headline || i.title).slice(0, 54)}…` : (i.headline || i.title),
      to: i.linkTo!,
    })),
);

const heroRiskLine = computed(
  () => insightItems.value.find((i: OverviewInsight) => i.kind === "risk")?.because || null,
);

function widgetCallout(widget: OverviewWidgetConfig): string | null {
  if (widget.id === "w-trend-spend-revenue" || widget.size === "lg") return null;
  const list = insightItems.value;
  if (widget.id === "w-roi-h" || widget.id === "w-roi-platform")
    return list.find((i: OverviewInsight) => i.relatedMetric === "roi")?.because || null;
  if (widget.id === "w-funnel-viz" || widget.id === "w-funnel")
    return list.find((i: OverviewInsight) => i.id === "ins-4")?.because || null;
  return null;
}

function primaryGridClass(widget: OverviewWidgetConfig, index: number) {
  const list = primaryCharts.value;
  if (list.length === 1) return "col-span-12";
  const first = list[0];
  const hasHero = Boolean(first && (first.id === "w-trend-spend-revenue" || first.size === "lg"));
  if (index === 0 && hasHero) return "col-span-12 xl:col-span-8";
  if (index === 1 && hasHero) return "col-span-12 xl:col-span-4";
  return "col-span-12 md:col-span-6 xl:col-span-4";
}

function gridClassForWidget(widget: OverviewWidgetConfig) {
  if (widget.size === "full") return "col-span-12";
  return "col-span-12 md:col-span-6 xl:col-span-4";
}

function widgetPayload(widgetId: string) {
  const widget = allWidgets.value.find((item: OverviewWidgetConfig) => item.id === widgetId);
  if (!widget) return null;
  return payloadFor(widget, selectedRange.value);
}

const executiveKpiCards = computed(() =>
  executiveKpis.value
    .map((widget: OverviewWidgetConfig) => ({ widget, payload: widgetPayload(widget.id) }))
    .filter((card): card is KpiCard => Boolean(card.payload)),
);

function isHeroWidget(widget: OverviewWidgetConfig) {
  return widget.id === "w-trend-spend-revenue" || widget.size === "lg";
}

function toggleTableDetail(widgetId: string) {
  tableDetailId.value = tableDetailId.value === widgetId ? null : widgetId;
}

function onWidgetSave(payload: {
  widget: Parameters<typeof addWidget>[0];
  placement: Parameters<typeof addWidget>[1];
  afterWidgetId?: string;
}) {
  addWidget(payload.widget, payload.placement, payload.afterWidgetId);
  widgetBuilderOpen.value = false;
}

function onDashboardSave(payload: Parameters<typeof createDashboard>[0]) {
  createDashboard(payload);
  dashboardModalOpen.value = false;
}

function onLayoutSave(ids: string[]) {
  setDashboardWidgetOrder(ids);
  layoutEditorOpen.value = false;
}

const bulletLine = computed(() => executiveBullets.value.slice(0, 3).join(" · "));

const hasSavedView = computed(() => Boolean(selectedViewId.value && currentViewDetail.value));
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
  const viewId = selectedViewId.value;
  if (!viewId || !currentViewDetail.value) {
    savedPayloads.value = {};
    return;
  }
  savedPayloadsLoading.value = true;
  savedDataError.value = null;
  try {
    const payloads = await fetchWidgetPayloads(viewId);
    savedPayloads.value = Object.fromEntries(payloads.map((payload) => [payload.widget_id, payload]));
  } catch {
    savedPayloads.value = {};
    savedDataError.value = "Could not load metrics for this view.";
  } finally {
    savedPayloadsLoading.value = false;
  }
}

watch(
  () => [selectedViewId.value, currentViewDetail.value?.updated_at] as const,
  () => {
    void refreshSavedPayloads();
  },
  { immediate: true },
);

async function createFromTemplate(templateId: string) {
  const template = templates.value.find((item) => item.id === templateId);
  selectedTemplateId.value = templateId;
  aiPrompt.value = template
    ? `Create ${template.title} dashboard using the available integrations.`
    : aiPrompt.value;
  await runAiGeneration("create");
}

async function runAiGeneration(mode: "create" | "modify") {
  const prompt = aiPrompt.value.trim();
  if (!prompt) {
    aiError.value = "Describe the dashboard you want.";
    return;
  }
  aiBusy.value = true;
  aiError.value = null;
  try {
    const view = await generateView({
      prompt,
      mode,
      view_id: mode === "modify" ? selectedViewId.value || undefined : undefined,
      template_id: selectedTemplateId.value || undefined,
    });
    await refreshViews({ force: true });
    selectedViewId.value = view.id;
    await fetchView(view.id);
    aiPrompt.value = "";
    selectedTemplateId.value = null;
  } catch {
    aiError.value = "Could not generate this dashboard.";
  } finally {
    aiBusy.value = false;
  }
}

function onSavedDragStart(widgetId: string) {
  draggingSavedWidgetId.value = widgetId;
}

async function onSavedDrop(targetId: string) {
  const draggedId = draggingSavedWidgetId.value;
  draggingSavedWidgetId.value = null;
  const viewId = selectedViewId.value;
  const detail = currentViewDetail.value;
  if (!draggedId || !viewId || !detail || draggedId === targetId) return;
  const ids = savedWidgets.value.map((widget) => widget.id);
  const from = ids.indexOf(draggedId);
  const to = ids.indexOf(targetId);
  if (from === -1 || to === -1) return;
  const [moved] = ids.splice(from, 1);
  ids.splice(to, 0, moved!);
  const existing = savedLayout.value.breakpoints?.lg || {};
  const layout: SavedViewLayout = {
    version: 1,
    breakpoints: {
      lg: Object.fromEntries(
        ids.map((id, index) => [
          id,
          existing[id] || {
            x: (index % 3) * 4,
            y: Math.floor(index / 3) * 3,
            w: index === 0 ? 8 : 4,
            h: index === 0 ? 3 : 2,
          },
        ]),
      ),
    },
  };
  try {
    const updated = await patchViewLayout(viewId, { widget_ids: ids, layout });
    if (updated) {
      currentViewDetail.value = updated;
      savedDataError.value = null;
      void refreshSavedPayloads();
    }
  } catch {
    savedDataError.value = "Could not save widget layout.";
  }
}

function onSavedDragEnd() {
  draggingSavedWidgetId.value = null;
}
</script>

<template>
  <div class="max-w-full space-y-5 overflow-x-hidden pb-2">
    <MockDataState :status="dataStatus" />

    <OverviewHeader
      v-if="hasConnections"
      :sources="sourceLabels"
      @add-widget="widgetBuilderOpen = true"
    />

    <ConnectionEmptyState v-if="showConnectionEmptyState" />

    <template v-else>
      <SavedViewToolbar
        :saved-view-id="savedViewSelect"
        :dashboard-id="selectedDashboardId"
        :range="selectedRange"
        :views="views"
        :dashboards="dashboards"
        :range-options="rangeOptions"
        :has-saved-view="hasSavedView"
        :current-name="selectedDashboardName"
        :loading="viewsLoading"
        :error="viewsError"
        @update:saved-view-id="savedViewSelect = $event"
        @update:dashboard-id="selectedDashboardId = $event"
        @update:range="selectedRange = $event"
        @layout="layoutEditorOpen = true"
        @add-widget="widgetBuilderOpen = true"
        @custom-dashboard="dashboardModalOpen = true"
      />

      <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.42fr)]">
        <SuggestedTemplatesGrid
          :templates="templates"
          :loading="templatesLoading"
          :error="templatesError"
          :busy-template-id="selectedTemplateId"
          @use-template="createFromTemplate"
        />
        <AiViewBuilderPanel
          :prompt="aiPrompt"
          :busy="aiBusy"
          :error="aiError"
          :disabled="!hasConnections"
          @update:prompt="aiPrompt = $event"
          @create="runAiGeneration('create')"
        />
      </section>
    </template>

    <section v-if="!showConnectionEmptyState && hasSavedView" class="space-y-4">
      <SurfaceCard variant="soft" padding="sm" class="border border-black/[0.05]">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-[15px] font-semibold tracking-[-0.02em] text-black">
              {{ currentViewDetail?.name }}
            </p>
            <p v-if="currentViewDetail?.description" class="mt-1 text-[12px] text-black/55">
              {{ currentViewDetail.description }}
            </p>
          </div>
          <p class="text-[12px] text-black/45">
            {{ savedWidgets.length }} widgets · drag cards to save order
            <span v-if="savedPayloadsLoading"> · loading data</span>
          </p>
        </div>
        <p v-if="savedDataError" class="mt-2 text-[12px] text-red-700">
          {{ savedDataError }}
        </p>
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
          <div class="min-w-0">
            <p class="truncate text-[14px] font-semibold tracking-[-0.02em] text-black">
              {{ widget.title }}
            </p>
            <p v-if="widget.description" class="mt-1 text-[12px] text-black/45">
              {{ widget.description }}
            </p>
          </div>
          <div class="mt-3 border-t border-black/[0.06] pt-3">
            <SavedMetricWidgetRenderer :payload="payloadForSaved(widget.id)" />
          </div>
        </SurfaceCard>
      </div>

      <EmptyDashboardState
        v-if="!savedWidgets.length"
        class="mt-2"
        title="This view is empty."
        description="Add widgets manually or ask AI to build this view."
        show-actions
        @add-widget="widgetBuilderOpen = true"
        @ask-ai="aiPrompt = 'Build a focused dashboard view from my connected sources.'"
      />
    </section>

    <!-- Single operating strip: context + KPIs (no stacked section titles) -->
    <SurfaceCard
      v-if="!showConnectionEmptyState && !hasSavedView && (executiveKpiCards.length || currentDashboard?.name || bulletLine)"
      variant="soft"
      padding="sm"
      class="border border-black/[0.05]"
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div class="min-w-0 lg:max-w-[42%]">
          <p class="text-[15px] font-semibold tracking-[-0.02em] text-black">
            {{ currentDashboard?.name || "Overview" }}
          </p>
          <p v-if="bulletLine" class="mt-1.5 text-[12px] leading-snug text-black/55">
            {{ bulletLine }}
          </p>
        </div>
        <div
          class="grid min-w-0 flex-1 grid-cols-2 items-start gap-3 border-t border-black/[0.06] pt-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-0 lg:border-t-0 lg:pt-0 xl:divide-x xl:divide-black/[0.06]"
        >
          <div
            v-for="(card, idx) in executiveKpiCards"
            :key="card.widget.id"
            class="min-w-0 overflow-hidden lg:px-3 xl:px-4"
            :class="[idx === 0 && 'lg:pl-0', idx === executiveKpiCards.length - 1 && 'lg:pr-0']"
          >
            <p class="sv-section-title">
              {{ card.widget.title }}
            </p>
            <div class="mt-2">
              <OverviewWidgetRenderer :payload="card.payload" compact />
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>

    <!-- Primary row (hero + signals) + full dashboard grid -->
    <section v-if="!showConnectionEmptyState && !hasSavedView && chartWidgets.length" class="grid grid-cols-12 gap-3 lg:gap-4">
      <OverviewWidgetCard
        v-for="(widget, idx) in primaryCharts"
        :key="widget.id"
        :widget="widget"
        :payload="widgetPayload(widget.id)"
        :grid-class="primaryGridClass(widget, idx)"
        :signal-links="isHeroWidget(widget) ? heroSignalLinks : []"
        :risk-line="isHeroWidget(widget) ? heroRiskLine : null"
        :callout="widgetCallout(widget)"
        :compact="!isHeroWidget(widget)"
        :variant="isHeroWidget(widget) ? 'depth' : 'frame'"
        :padding="isHeroWidget(widget) ? 'sm' : 'sm'"
        :table-expanded="tableDetailId === widget.id"
        :title-quiet="!isHeroWidget(widget)"
        :show-divider="true"
        @toggle-detail="toggleTableDetail(widget.id)"
      />
      <OverviewWidgetCard
        v-for="widget in secondaryCharts"
        :key="widget.id"
        :widget="widget"
        :payload="widgetPayload(widget.id)"
        :grid-class="gridClassForWidget(widget)"
        :callout="widgetCallout(widget)"
        compact
        title-quiet
        :table-expanded="tableDetailId === widget.id"
        :show-divider="true"
        @toggle-detail="toggleTableDetail(widget.id)"
      />
    </section>

    <EmptyDashboardState
      v-if="!showConnectionEmptyState && !hasSavedView && !allWidgets.length"
      class="mt-2"
      title="This view is empty."
      description="Add widgets manually or ask AI to build this view."
      show-actions
      @add-widget="widgetBuilderOpen = true"
      @ask-ai="aiPrompt = 'Build a focused dashboard view from my connected sources.'"
    />

    <OverviewWidgetBuilderModal
      :open="!hasSavedView && widgetBuilderOpen"
      :current-widgets="currentWidgets"
      @close="widgetBuilderOpen = false"
      @save="onWidgetSave"
    />

    <OverviewDashboardModal
      :open="!hasSavedView && dashboardModalOpen"
      :widget-options="widgets"
      @close="dashboardModalOpen = false"
      @save="onDashboardSave"
    />

    <OverviewLayoutEditorModal
      :open="!hasSavedView && layoutEditorOpen"
      :widgets="currentWidgets"
      @close="layoutEditorOpen = false"
      @save="onLayoutSave"
      @remove="removeWidget"
    />
  </div>
</template>

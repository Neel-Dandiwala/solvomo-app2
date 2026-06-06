<script setup lang="ts">
import {
  OVERVIEW_VISUALIZATION_LABELS,
  OVERVIEW_WIDGET_SOURCE_OPTIONS,
} from "~/data/mock-solvomo";
import type {
  OverviewWidgetConfig,
  OverviewWidgetDimension,
  OverviewWidgetMetric,
  OverviewWidgetSource,
  OverviewWidgetVisualization,
} from "~/types/mock";

const props = defineProps<{
  open: boolean;
  currentWidgets: OverviewWidgetConfig[];
}>();

const emit = defineEmits<{
  close: [];
  save: [
    payload: {
      widget: Omit<OverviewWidgetConfig, "id">;
      placement: "top" | "bottom" | "after";
      afterWidgetId?: string;
    },
  ];
}>();

const source = ref<OverviewWidgetSource>("ad_data");
const metric = ref<OverviewWidgetMetric>("revenue");
const dimension = ref<OverviewWidgetDimension>("platform");
const visualization = ref<OverviewWidgetVisualization>("bar");
const size = ref<OverviewWidgetConfig["size"]>("md");
const placement = ref<"top" | "bottom" | "after">("bottom");
const afterWidgetId = ref("");
const title = ref("");
const description = ref("");

const sourceConfig = computed(() =>
  OVERVIEW_WIDGET_SOURCE_OPTIONS.find((option) => option.id === source.value) || OVERVIEW_WIDGET_SOURCE_OPTIONS[0]!,
);

const metricOptions = computed(() => sourceConfig.value.metrics);
const dimensionOptions = computed(() => sourceConfig.value.dimensions);
const visualizationOptions = computed(() => sourceConfig.value.visualizations);
const visualizationLabels = OVERVIEW_VISUALIZATION_LABELS as Record<string, string>;

watch(source, () => {
  metric.value = metricOptions.value[0]!;
  dimension.value = dimensionOptions.value[0]!;
  visualization.value = visualizationOptions.value[0]!;
});

watch(
  [source, metric, dimension, visualization],
  () => {
    if (!title.value) {
      title.value = `${sourceConfig.value.label} — ${metric.value.replaceAll("_", " ")}`;
    }
    if (!description.value) {
      description.value = "";
    }
  },
  { immediate: true },
);

function datasetKeyForSelection() {
  if (visualization.value === "kpi") return "kpis";
  if (visualization.value === "signal_list") return "prioritySignals";
  if (visualization.value === "metric_delta") return "performanceChanges";
  if (visualization.value === "horizontal_bar") return "platformSummaries";
  if (visualization.value === "funnel") return "funnel";
  if (source.value === "ad_data" && dimension.value === "campaign_cluster") return "campaignClusters";
  if (source.value === "crm_data" && dimension.value === "lead_source") return "leadSourceSummaries";
  if (source.value === "spend_data") return "spendRecords";
  if (source.value === "alerts") return "alerts";
  if (source.value === "connections") return "connectionsSummary";
  if (dimension.value === "date") return "trendPoints";
  return "platformSummaries";
}

function saveWidget() {
  emit("save", {
    widget: {
      title: title.value || `${sourceConfig.value.label} widget`,
      description: description.value || sourceConfig.value.description,
      source: source.value,
      visualization: visualization.value,
      datasetKey: datasetKeyForSelection(),
      metric: metric.value,
      dimension: dimension.value,
      size: size.value,
    },
    placement: placement.value,
    afterWidgetId: placement.value === "after" ? afterWidgetId.value : undefined,
  });
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
      @click.self="emit('close')"
    >
      <SurfaceCard variant="frame" class="max-h-[90vh] w-full max-w-xl overflow-y-auto" padding="md">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-lg font-semibold tracking-tight text-black">
            Add widget
          </h2>
          <button type="button" class="nav-link text-sm font-semibold" @click="emit('close')">
            Close
          </button>
        </div>

        <div class="mt-5 space-y-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wide text-black/45">Source</label>
              <select v-model="source" class="auth-input mt-1.5">
                <option v-for="option in OVERVIEW_WIDGET_SOURCE_OPTIONS" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wide text-black/45">Metric</label>
              <select v-model="metric" class="auth-input mt-1.5">
                <option v-for="option in metricOptions" :key="option" :value="option">
                  {{ option.replaceAll("_", " ") }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wide text-black/45">Dimension</label>
              <select v-model="dimension" class="auth-input mt-1.5">
                <option v-for="option in dimensionOptions" :key="option" :value="option">
                  {{ option.replaceAll("_", " ") }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wide text-black/45">Chart type</label>
              <select v-model="visualization" class="auth-input mt-1.5">
                <option v-for="option in visualizationOptions" :key="option" :value="option">
                  {{ visualizationLabels[option] }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wide text-black/45">Size</label>
              <select v-model="size" class="auth-input mt-1.5">
                <option value="xs">KPI</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="full">Full width</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wide text-black/45">Placement</label>
              <select v-model="placement" class="auth-input mt-1.5">
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="after">After…</option>
              </select>
            </div>
          </div>

          <div v-if="placement === 'after'">
            <label class="block text-[11px] font-semibold uppercase tracking-wide text-black/45">After widget</label>
            <select v-model="afterWidgetId" class="auth-input mt-1.5">
              <option disabled value="">
                Select
              </option>
              <option v-for="widget in currentWidgets" :key="widget.id" :value="widget.id">
                {{ widget.title }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wide text-black/45">Title</label>
            <input v-model="title" class="auth-input mt-1.5" type="text">
          </div>
        </div>

        <div class="mt-5 flex flex-wrap justify-end gap-2 border-t border-black/8 pt-4">
          <button type="button" class="button-secondary rounded-lg px-3 py-2 text-sm font-semibold" @click="emit('close')">
            Cancel
          </button>
          <button
            type="button"
            class="button-primary rounded-lg px-3 py-2 text-sm font-semibold text-white"
            :disabled="placement === 'after' && !afterWidgetId"
            @click="saveWidget"
          >
            Add
          </button>
        </div>
      </SurfaceCard>
    </div>
  </Teleport>
</template>

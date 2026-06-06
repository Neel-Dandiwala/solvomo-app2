<script setup lang="ts">
import type {
  BuilderOptionsResponse,
  DatasourceDraft,
  WidgetDraft,
} from "~/types/saved-view";
import {
  datasourceKeyForDraft,
  defaultFilters,
  dimensionsForVisualization,
  extractMetricsFromWidget,
  metricsPayloadForVisualization,
} from "~/utils/dashboardWidgetMetrics";

const props = defineProps<{
  open: boolean;
  options: BuilderOptionsResponse | null;
  datasources: DatasourceDraft[];
  editing?: WidgetDraft | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [widget: WidgetDraft];
}>();

const datasourceIndex = ref(0);
const visualizationId = ref("scorecard");
const selectedMetrics = ref<string[]>([]);
const title = ref("");
const description = ref("");
const size = ref<WidgetDraft["size"]>("md");
const datePreset = ref("last_30_days");
const timeGranularity = ref<"DAY" | "WEEK" | "MONTH">("DAY");
const breakdown = ref("");

const visualizations = computed(() => props.options?.visualizations ?? []);

const currentViz = computed(() =>
  visualizations.value.find((v) => v.id === visualizationId.value) ??
  visualizations.value[0] ??
  null,
);

const metricChoices = computed(() => {
  const ds = props.datasources[datasourceIndex.value];
  if (!ds) return [];
  return props.options?.connector_metrics[ds.connection_slug] ?? [];
});

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    if (props.editing) {
      const w = props.editing;
      datasourceIndex.value = w.datasource_index;
      title.value = w.title;
      description.value = w.description;
      size.value = w.size;
      selectedMetrics.value = extractMetricsFromWidget(w.metrics);
      const preset =
        (w.filters as { dateRange?: { preset?: string } })?.dateRange?.preset ?? "last_30_days";
      datePreset.value = preset;
      const tg = (w.dimensions as { time_granularity?: string })?.time_granularity;
      if (tg === "DAY" || tg === "WEEK" || tg === "MONTH") timeGranularity.value = tg;
      breakdown.value = String((w.dimensions as { breakdown?: string })?.breakdown ?? "");
      const match = visualizations.value.find(
        (v) => v.widget_type === w.widget_type && v.widget_subtype === w.widget_subtype,
      );
      visualizationId.value = match?.id ?? "scorecard";
    } else {
      datasourceIndex.value = 0;
      title.value = "";
      description.value = "";
      size.value = "md";
      selectedMetrics.value = [];
      datePreset.value = "last_30_days";
      timeGranularity.value = "DAY";
      breakdown.value = "";
      visualizationId.value = "scorecard";
    }
  },
);

watch(currentViz, (viz) => {
  if (!viz) return;
  if (selectedMetrics.value.length > viz.max_metrics) {
    selectedMetrics.value = selectedMetrics.value.slice(0, viz.max_metrics);
  }
  if (selectedMetrics.value.length < viz.min_metrics && metricChoices.value.length) {
    selectedMetrics.value = metricChoices.value.slice(0, viz.min_metrics).map((m) => m.key);
  }
});

watch(datasourceIndex, () => {
  const allowed = new Set(metricChoices.value.map((m) => m.key));
  selectedMetrics.value = selectedMetrics.value.filter((k) => allowed.has(k));
  const viz = currentViz.value;
  if (viz && selectedMetrics.value.length < viz.min_metrics && metricChoices.value.length) {
    for (const m of metricChoices.value) {
      if (selectedMetrics.value.length >= viz.min_metrics) break;
      if (!selectedMetrics.value.includes(m.key)) {
        selectedMetrics.value = [...selectedMetrics.value, m.key];
      }
    }
  }
});

function toggleMetric(key: string) {
  const viz = currentViz.value;
  if (!viz) return;
  const set = new Set(selectedMetrics.value);
  if (set.has(key)) set.delete(key);
  else if (set.size < viz.max_metrics) set.add(key);
  selectedMetrics.value = [...set];
}

function save() {
  const viz = currentViz.value;
  if (!viz || !title.value.trim()) return;
  if (selectedMetrics.value.length < viz.min_metrics) return;
  const ds = props.datasources[datasourceIndex.value];
  if (!ds) return;

  emit("save", {
    client_id: props.editing?.client_id ?? crypto.randomUUID(),
    datasource_key: datasourceKeyForDraft(ds),
    datasource_index: datasourceIndex.value,
    title: title.value.trim(),
    description: description.value.trim(),
    source: "manual",
    widget_type: viz.widget_type,
    widget_subtype: viz.widget_subtype,
    dataset_key: "metric_report",
    metrics: metricsPayloadForVisualization(viz, selectedMetrics.value),
    dimensions: dimensionsForVisualization(viz, timeGranularity.value, breakdown.value),
    filters: defaultFilters(datePreset.value),
    size: size.value,
  });
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
      @click.self="emit('close')"
    >
      <SurfaceCard variant="frame" class="max-h-[90vh] w-full max-w-2xl overflow-y-auto" padding="md">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-lg font-semibold tracking-tight text-black">
            {{ editing ? "Edit widget" : "Add widget" }}
          </h2>
          <button type="button" class="text-sm font-semibold text-black/55" @click="emit('close')">
            Close
          </button>
        </div>

        <div class="mt-5 space-y-4">
          <div>
            <label class="sv-section-title">Datasource</label>
            <select v-model.number="datasourceIndex" class="app-control mt-1.5 w-full">
              <option
                v-for="(ds, idx) in datasources"
                :key="`${ds.connection_id}-${ds.scope_id}`"
                :value="idx"
              >
                {{ ds.connection_slug }} — {{ ds.scope_name || ds.scope_id }}
              </option>
            </select>
          </div>

          <div>
            <label class="sv-section-title">Visualization</label>
            <select v-model="visualizationId" class="app-control mt-1.5 w-full">
              <option v-for="v in visualizations" :key="v.id" :value="v.id">
                {{ v.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="sv-section-title">Metrics</label>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="m in metricChoices"
                :key="m.key"
                type="button"
                class="rounded-full border px-3 py-1 text-[12px] font-medium transition"
                :class="
                  selectedMetrics.includes(m.key)
                    ? 'border-black bg-black text-white'
                    : 'border-black/10 bg-white text-black/70'
                "
                @click="toggleMetric(m.key)"
              >
                {{ m.label }}
              </button>
            </div>
            <p v-if="currentViz" class="mt-2 text-[11px] text-black/45">
              Select {{ currentViz.min_metrics }}–{{ currentViz.max_metrics }} metrics
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="sv-section-title">Date range</label>
              <select v-model="datePreset" class="app-control mt-1.5 w-full">
                <option
                  v-for="p in options?.date_range_presets ?? []"
                  :key="p.id"
                  :value="p.id"
                >
                  {{ p.label }}
                </option>
              </select>
            </div>
            <div v-if="currentViz?.requires_time_granularity">
              <label class="sv-section-title">Granularity</label>
              <select v-model="timeGranularity" class="app-control mt-1.5 w-full">
                <option value="DAY">Day</option>
                <option value="WEEK">Week</option>
                <option value="MONTH">Month</option>
              </select>
            </div>
          </div>

          <div v-if="currentViz?.widget_type === 'table'">
            <label class="sv-section-title">Breakdown</label>
            <select v-model="breakdown" class="app-control mt-1.5 w-full">
              <option value="">Account</option>
              <option value="campaign">Campaign</option>
            </select>
          </div>

          <div>
            <label class="sv-section-title">Title</label>
            <input v-model="title" class="app-control mt-1.5 w-full" type="text">
          </div>

          <div>
            <label class="sv-section-title">Size</label>
            <select v-model="size" class="app-control mt-1.5 w-full">
              <option value="xs">KPI</option>
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
              <option value="full">Full width</option>
            </select>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2 border-t border-black/8 pt-4">
          <button type="button" class="app-button button-secondary px-4 py-2 text-sm" @click="emit('close')">
            Cancel
          </button>
          <button
            type="button"
            class="app-button button-primary px-4 py-2 text-sm text-white"
            :disabled="!title.trim() || !currentViz"
            @click="save"
          >
            Save widget
          </button>
        </div>
      </SurfaceCard>
    </div>
  </Teleport>
</template>

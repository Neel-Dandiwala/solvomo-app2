import type {
  BuilderVisualization,
  DatasourceDraft,
} from "~/types/saved-view";

export function metricsPayloadForVisualization(
  viz: BuilderVisualization,
  selectedMetrics: string[],
): Record<string, unknown> {
  if (viz.widget_type === "scorecard") {
    return { primary: selectedMetrics[0] };
  }
  if (viz.widget_type === "time_series") {
    return { series: selectedMetrics };
  }
  if (viz.widget_type === "comparison") {
    return { items: selectedMetrics };
  }
  return { columns: selectedMetrics };
}

export function dimensionsForVisualization(
  viz: BuilderVisualization,
  timeGranularity: "DAY" | "WEEK" | "MONTH" | "TOTAL",
  breakdown?: string,
): Record<string, unknown> {
  const dims: Record<string, unknown> = {};
  if (viz.requires_time_granularity) {
    dims.time_granularity = timeGranularity === "TOTAL" ? "DAY" : timeGranularity;
  }
  if (viz.widget_type === "table" && breakdown) {
    dims.breakdown = breakdown;
  }
  return dims;
}

export function datasourceKeyForDraft(d: DatasourceDraft): string {
  return `${d.connection_id}:${d.scope_id}`;
}

export function defaultFilters(preset = "last_30_days"): Record<string, unknown> {
  return { dateRange: { preset } };
}

export function extractMetricsFromWidget(metrics: unknown): string[] {
  if (!metrics || typeof metrics !== "object") return [];
  const m = metrics as Record<string, unknown>;
  if (typeof m.primary === "string") return [m.primary];
  if (Array.isArray(m.series)) return m.series.map(String);
  if (Array.isArray(m.items)) return m.items.map(String);
  if (Array.isArray(m.columns)) return m.columns.map(String);
  return [];
}

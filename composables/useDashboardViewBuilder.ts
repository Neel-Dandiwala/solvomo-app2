import type {
  BuilderOptionsResponse,
  DatasourceDraft,
  SavedDatasource,
  SavedViewDetail,
  SavedViewLayout,
  SavedWidget,
  SavedWidgetPayload,
  SourceOptionsResponse,
  WidgetDraft,
} from "~/types/saved-view";
import { brandScopeBody, brandScopeQuery } from "~/utils/apiScope";

export function useDashboardViewBuilder() {
  const api = useApiClient();
  const workspace = useWorkspaceContext();

  function scopeQuery() {
    const ws = workspace.currentWorkspaceId.value?.trim();
    const bp = workspace.currentBrandProfileId.value?.trim();
    if (!ws || !bp) return null;
    const qs = brandScopeQuery(ws, bp);
    return { workspace_id: ws, brandprofile_id: bp, qs };
  }

  async function fetchBuilderOptions() {
    const s = scopeQuery();
    if (!s || !api.hasBase.value) return null;
    return api.getJson<BuilderOptionsResponse>(`/dashboard/builder-options${s.qs}`);
  }

  async function fetchSourceOptions(connectionId: string) {
    const s = scopeQuery();
    if (!s || !api.hasBase.value) return null;
    const q = `${s.qs}&connection_id=${encodeURIComponent(connectionId)}`;
    return api.getJson<SourceOptionsResponse>(`/views/source-options${q}`);
  }

  async function createView(input: {
    name: string;
    description?: string;
    is_default?: boolean;
    datasources: DatasourceDraft[];
    widgets: Omit<WidgetDraft, "client_id">[];
    layout?: SavedViewLayout;
  }) {
    const s = scopeQuery();
    if (!s) throw new Error("Workspace scope is missing");
    return api.postJson<SavedViewDetail>("/views", {
      ...brandScopeBody(s.workspace_id, s.brandprofile_id),
      name: input.name,
      description: input.description ?? "",
      is_default: input.is_default ?? false,
      datasources: input.datasources,
      widgets: input.widgets.map((w) => {
        const idx = input.datasources.findIndex(
          (d) => `${d.connection_id}:${d.scope_id}` === w.datasource_key,
        );
        if (idx < 0) {
          throw new Error(`Unknown datasource key: ${w.datasource_key}`);
        }
        return {
          datasource_index: idx,
          title: w.title,
          description: w.description,
          source: w.source,
          widget_type: w.widget_type,
          widget_subtype: w.widget_subtype,
          dataset_key: w.dataset_key || "metric_report",
          metrics: w.metrics,
          dimensions: w.dimensions,
          filters: w.filters,
          size: w.size,
        };
      }),
      layout: input.layout,
    });
  }

  async function updateView(
    viewId: string,
    input: {
      name?: string;
      description?: string;
      is_default?: boolean;
      widget_ids?: string[];
      datasource_ids?: string[];
      layout?: SavedViewLayout;
    },
  ) {
    const s = scopeQuery();
    if (!s) throw new Error("Workspace scope is missing");
    return api.patchJson<SavedViewDetail>(
      `/views/${encodeURIComponent(viewId)}${s.qs}`,
      input,
    );
  }

  async function addDatasource(viewId: string, draft: DatasourceDraft) {
    const s = scopeQuery();
    if (!s) throw new Error("Workspace scope is missing");
    return api.postJson<SavedDatasource>(
      `/views/${encodeURIComponent(viewId)}/datasources${s.qs}`,
      draft,
    );
  }

  async function deleteDatasource(viewId: string, datasourceId: string) {
    const s = scopeQuery();
    if (!s) throw new Error("Workspace scope is missing");
    await api.deleteRequest(
      `/views/${encodeURIComponent(viewId)}/datasources/${encodeURIComponent(datasourceId)}${s.qs}`,
    );
  }

  async function addWidget(
    viewId: string,
    input: {
      datasource_id: string;
      title: string;
      description?: string;
      widget_type: SavedWidget["widget_type"];
      widget_subtype: string;
      metrics: Record<string, unknown>;
      dimensions: Record<string, unknown>;
      filters: Record<string, unknown>;
      size?: SavedWidget["size"];
    },
  ) {
    const s = scopeQuery();
    if (!s) throw new Error("Workspace scope is missing");
    return api.postJson<SavedWidget>(
      `/views/${encodeURIComponent(viewId)}/widgets${s.qs}`,
      {
        datasource_id: input.datasource_id,
        title: input.title,
        description: input.description ?? "",
        source: "manual",
        widget_type: input.widget_type,
        widget_subtype: input.widget_subtype,
        dataset_key: "metric_report",
        metrics: input.metrics,
        dimensions: input.dimensions,
        filters: input.filters,
        size: input.size ?? "md",
      },
    );
  }

  async function updateWidget(
    viewId: string,
    widgetId: string,
    input: Partial<{
      datasource_id: string;
      title: string;
      description: string;
      widget_type: SavedWidget["widget_type"];
      widget_subtype: string;
      metrics: Record<string, unknown>;
      dimensions: Record<string, unknown>;
      filters: Record<string, unknown>;
      size: SavedWidget["size"];
    }>,
  ) {
    const s = scopeQuery();
    if (!s) throw new Error("Workspace scope is missing");
    return api.patchJson<SavedWidget>(
      `/views/${encodeURIComponent(viewId)}/widgets/${encodeURIComponent(widgetId)}${s.qs}`,
      input,
    );
  }

  async function deleteWidget(viewId: string, widgetId: string) {
    const s = scopeQuery();
    if (!s) throw new Error("Workspace scope is missing");
    await api.deleteRequest(
      `/views/${encodeURIComponent(viewId)}/widgets/${encodeURIComponent(widgetId)}${s.qs}`,
    );
  }

  async function fetchPayloads(
    viewId: string,
    query?: { startGte?: string; endLt?: string; timeGranularity?: string },
  ) {
    const s = scopeQuery();
    if (!s) return [];
    const extra = new URLSearchParams();
    if (query?.startGte) extra.set("start_gte", query.startGte);
    if (query?.endLt) extra.set("end_lt", query.endLt);
    if (query?.timeGranularity) extra.set("time_granularity", query.timeGranularity);
    const suffix = extra.toString() ? `&${extra.toString()}` : "";
    const res = await api.getJson<{ payloads: SavedWidgetPayload[] }>(
      `/views/${encodeURIComponent(viewId)}/widgets/payloads${s.qs}${suffix}`,
    );
    return res.payloads || [];
  }

  function buildDefaultLayout(widgetIds: string[]): SavedViewLayout {
    const lg: SavedViewLayout["breakpoints"]["lg"] = {};
    widgetIds.forEach((id, index) => {
      const isWide = index === 0;
      lg[id] = {
        x: isWide ? 0 : ((index - 1) % 3) * 4,
        y: isWide ? 0 : 3 + Math.floor((index - 1) / 3) * 2,
        w: isWide ? 8 : 4,
        h: isWide ? 3 : 2,
      };
    });
    return { version: 1, breakpoints: { lg } };
  }

  return {
    scopeQuery,
    fetchBuilderOptions,
    fetchSourceOptions,
    createView,
    updateView,
    addDatasource,
    deleteDatasource,
    addWidget,
    updateWidget,
    deleteWidget,
    fetchPayloads,
    buildDefaultLayout,
  };
}

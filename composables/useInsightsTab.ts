import type { SavedViewLayout, WidgetDraft } from "~/types/saved-view";
import { brandScopeQuery } from "~/utils/apiScope";

export type InsightSeverity = "critical" | "high" | "medium" | "low";
export type InsightKind = "opportunity" | "risk" | "neutral";

export type InsightDatasourceScopeOption = {
  id: string;
  name: string;
  resource_type?: string;
  scope_type?: "organization" | "account" | "social_account";
};

export type InsightDatasourceDraft = {
  integration_slug: string;
  connection_id: string;
  scope_type: "organization" | "account" | "social_account";
  scope_id: string;
  scope_name: string;
  resource_type: string;
  available_scopes?: InsightDatasourceScopeOption[];
};

export type InsightWidgetDraft = Omit<
  WidgetDraft,
  "client_id" | "datasource_key" | "datasource_index"
> & {
  datasource_index: number;
};

export type InsightDashboardDraft = {
  name: string;
  description: string;
  is_default: boolean;
  datasources: InsightDatasourceDraft[];
  widgets: InsightWidgetDraft[];
  layout?: SavedViewLayout;
};

export type InsightSimulationDraft = {
  workspace_id: string;
  brandprofile_id: string;
  name: string;
  connections?: Array<{
    connection_id: string;
    connection_slug: string;
    category: string;
  }>;
  brand: Record<string, unknown>;
  target_metrics?: Record<string, number>;
  output_metrics: string[];
  run_request: Record<string, unknown>;
};

export type InsightChart =
  | {
      kind: "metric_delta";
      items: {
        metric: string;
        label: string;
        current: number;
        previous: number;
        delta_pct?: number;
      }[];
    }
  | {
      kind: "platform_comparison";
      metric: string;
      items: {
        label: string;
        integration_slug: string;
        value: number;
      }[];
    };

export type InsightDateRange = {
  start_gte: string;
  end_lt: string;
  time_granularity: "DAY";
};

export type LiveInsight = {
  id: string;
  recipe_id: string;
  title: string;
  headline: string;
  summary: string;
  because: string;
  kind: InsightKind;
  severity: InsightSeverity;
  platform: string;
  metrics: string[];
  datasources: InsightDatasourceDraft[];
  chart: InsightChart;
  recommendation: string;
  confidence: "High" | "Medium" | "Low";
  actions: {
    view_source_dashboard: {
      date_range: InsightDateRange;
      dashboard_draft: InsightDashboardDraft;
    };
    create_dashboard_view: InsightDashboardDraft;
    start_simulation: {
      analysis_tab: "budget" | "forecast";
      draft: InsightSimulationDraft;
    };
  };
};

export type InsightRecipeStatus = {
  id: string;
  title: string;
  description: string;
  eligible: boolean;
  reason?: string;
  matched_datasource_count: number;
  metrics: string[];
};

export type InsightsTabResponse = {
  generated_at: string;
  date_range: InsightDateRange;
  connected_slugs: string[];
  has_connections: boolean;
  recipes: InsightRecipeStatus[];
  insights: LiveInsight[];
};

export function useInsightsTab() {
  const api = useApiClient();
  const auth = useAuth();
  const workspace = useWorkspaceContext();

  const data = useState<InsightsTabResponse | null>("sv-insights-tab-data", () => null);
  const loading = useState("sv-insights-tab-loading", () => false);
  const error = useState<string | null>("sv-insights-tab-error", () => null);
  const loaded = useState("sv-insights-tab-loaded", () => false);

  function scopeQuery() {
    const ws = workspace.currentWorkspaceId.value?.trim();
    const bp = workspace.currentBrandProfileId.value?.trim();
    if (!ws || !bp) return null;
    return brandScopeQuery(ws, bp);
  }

  async function refreshWithScope(input: {
    recipe_id: string;
    connection_id: string;
    scope_id: string;
  }) {
    const qs = scopeQuery();
    if (!qs || !api.hasBase.value) return null;
    const params = new URLSearchParams(qs.replace(/^\?/, ""));
    params.set("recipe_id", input.recipe_id);
    params.set("connection_id", input.connection_id);
    params.set("scope_id", input.scope_id);
    loading.value = true;
    error.value = null;
    try {
      const res = await api.getJson<InsightsTabResponse>(`/insights?${params.toString()}`);
      const updated = res.insights.find((i) => i.recipe_id === input.recipe_id);
      if (updated && data.value) {
        const idx = data.value.insights.findIndex((i) => i.recipe_id === input.recipe_id);
        if (idx >= 0) {
          const next = [...data.value.insights];
          next[idx] = updated;
          data.value = { ...data.value, insights: next };
        }
      }
      return updated ?? null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Could not refresh insight scope.";
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function refresh(options?: { force?: boolean }) {
    if (!auth.isAuthenticated.value || !api.hasBase.value) {
      data.value = null;
      loaded.value = false;
      error.value = null;
      return;
    }
    const qs = scopeQuery();
    if (!qs) {
      data.value = null;
      loaded.value = false;
      return;
    }
    if (loaded.value && !options?.force) return;

    loading.value = true;
    error.value = null;
    try {
      data.value = await api.getJson<InsightsTabResponse>(`/insights${qs}`);
      loaded.value = true;
    } catch (err) {
      data.value = null;
      loaded.value = false;
      error.value = err instanceof Error ? err.message : "Could not load insights.";
    } finally {
      loading.value = false;
    }
  }

  watch(
    () =>
      [
        auth.isAuthenticated.value,
        workspace.currentWorkspaceId.value,
        workspace.currentBrandProfileId.value,
      ] as const,
    () => {
      loaded.value = false;
      void refresh({ force: true });
    },
    { immediate: true },
  );

  return {
    data,
    insights: computed(() => data.value?.insights ?? []),
    recipes: computed(() => data.value?.recipes ?? []),
    loading,
    error,
    loaded,
    scopeQuery,
    refresh,
    refreshWithScope,
  };
}

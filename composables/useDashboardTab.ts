import type {
  DashboardHomeResponse,
  DashboardTemplatesResponse,
  DashboardViewListItem,
  DashboardTemplateSuggestion,
  SavedViewDetail,
} from "~/types/saved-view";
import { brandScopeBody, brandScopeQuery } from "~/utils/apiScope";

/**
 * Dashboard tab hub data from `/dashboard?workspace_id=&brandprofile_id=`.
 */
export function useDashboardTab() {
  const api = useApiClient();
  const auth = useAuth();
  const workspace = useWorkspaceContext();
  const { userConnections } = useConnectionsData();

  const views = useState<DashboardViewListItem[]>("sv-dashboard-tab-views", () => []);
  const templates = useState<DashboardTemplateSuggestion[]>(
    "sv-dashboard-tab-templates",
    () => [],
  );
  const connectedSlugs = useState<string[]>("sv-dashboard-connected-slugs", () => []);
  const hasConnections = useState("sv-dashboard-has-connections", () => false);
  const aiEnabled = useState("sv-dashboard-ai-enabled", () => false);
  const loading = useState("sv-dashboard-tab-loading", () => false);
  const error = useState<string | null>("sv-dashboard-tab-error", () => null);
  const loaded = useState("sv-dashboard-tab-loaded", () => false);
  const loadedScopeKey = useState<string>("sv-dashboard-tab-loaded-scope", () => "");

  function scopeQuery() {
    const ws = workspace.currentWorkspaceId.value?.trim();
    const bp = workspace.currentBrandProfileId.value?.trim();
    if (!ws || !bp) return null;
    return brandScopeQuery(ws, bp);
  }

  function scopeKey() {
    const ws = workspace.currentWorkspaceId.value?.trim();
    const bp = workspace.currentBrandProfileId.value?.trim();
    return ws && bp ? `${ws}:${bp}` : "";
  }

  function applyHome(data: DashboardHomeResponse) {
    views.value = data.views || [];
    templates.value = data.templates || [];
    connectedSlugs.value = data.connected_slugs || [];
    hasConnections.value = Boolean(data.has_connections);
    aiEnabled.value = Boolean(data.ai_enabled);
    loadedScopeKey.value = scopeKey();
    loaded.value = true;
  }

  async function refresh(options?: { force?: boolean }) {
    if (!auth.isAuthenticated.value || !api.hasBase.value) {
      views.value = [];
      templates.value = [];
      connectedSlugs.value = [];
      hasConnections.value = false;
      loaded.value = false;
      error.value = null;
      return;
    }
    const qs = scopeQuery();
    if (!qs) {
      views.value = [];
      templates.value = [];
      loaded.value = false;
      loadedScopeKey.value = "";
      return;
    }
    if (loaded.value && loadedScopeKey.value === scopeKey() && !options?.force) {
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const data = await api.getJson<DashboardHomeResponse>(`/dashboard${qs}`);
      applyHome(data);
    } catch (e) {
      views.value = [];
      templates.value = [];
      connectedSlugs.value = [];
      hasConnections.value = false;
      error.value = e instanceof Error ? e.message : "Could not load dashboards.";
    } finally {
      loading.value = false;
    }
  }

  async function refreshViews() {
    const qs = scopeQuery();
    if (!qs || !api.hasBase.value) return [];
    try {
      const data = await api.getJson<{ views: DashboardViewListItem[] }>(`/dashboard/views${qs}`);
      views.value = data.views || [];
      return views.value;
    } catch {
      return [];
    }
  }

  async function refreshTemplates() {
    const qs = scopeQuery();
    if (!qs || !api.hasBase.value) return [];
    try {
      const data = await api.getJson<DashboardTemplatesResponse>(`/dashboard/templates${qs}`);
      templates.value = data.templates || [];
      connectedSlugs.value = data.connected_slugs || [];
      hasConnections.value = Boolean(data.has_connections);
      aiEnabled.value = Boolean(data.ai_enabled);
      return templates.value;
    } catch {
      templates.value = [];
      return [];
    }
  }

  async function generateDashboard(input: {
    prompt: string;
    mode?: "dry_run" | "create" | "modify";
    view_id?: string;
    template_id?: string;
    is_default?: boolean;
  }) {
    const ws = workspace.currentWorkspaceId.value?.trim();
    const bp = workspace.currentBrandProfileId.value?.trim();
    if (!ws || !bp) throw new Error("Workspace scope is missing");
    return api.postJson<SavedViewDetail & { plan?: unknown }>("/dashboard/generate", {
      ...brandScopeBody(ws, bp),
      prompt: input.prompt,
      mode: input.mode || "create",
      view_id: input.view_id,
      template_id: input.template_id,
      is_default: input.is_default ?? false,
    });
  }

  watch(
    () =>
      [
        auth.isAuthenticated.value,
        workspace.currentWorkspaceId.value,
        workspace.currentBrandProfileId.value,
        userConnections.value
          .filter((connection) => connection.is_active)
          .map((connection) => `${connection.connection_slug}:${connection.id}`)
          .sort()
          .join("|"),
      ] as const,
    () => {
      loaded.value = false;
      void refresh({ force: true });
    },
    { immediate: true },
  );

  return {
    views,
    templates,
    connectedSlugs,
    hasConnections,
    aiEnabled,
    loading,
    error,
    loaded,
    scopeQuery,
    refresh,
    refreshViews,
    refreshTemplates,
    generateDashboard,
  };
}

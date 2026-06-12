import { brandScopeQuery } from "~/utils/apiScope";
import type { InsightsResponse } from "~/types/insights";

export function useInsightsTab() {
  const api = useApiClient();
  const auth = useAuth();
  const workspace = useWorkspaceContext();
  const connections = useConnectionsData();

  const data = useState<InsightsResponse | null>("sv-insights-tab-data", () => null);
  const loading = useState("sv-insights-tab-loading", () => false);
  const error = useState<string | null>("sv-insights-tab-error", () => null);
  const loaded = useState("sv-insights-tab-loaded", () => false);

  function scopeQuery() {
    const ws = workspace.currentWorkspaceId.value?.trim();
    const bp = workspace.currentBrandProfileId.value?.trim();
    if (!ws || !bp) return null;
    return brandScopeQuery(ws, bp);
  }

  const activeConnectionSignature = computed(() => {
    const bp = workspace.currentBrandProfileId.value?.trim();
    if (!bp) return "";
    return connections.userConnections.value
      .filter((connection) => connection.is_active && connection.brandprofile_id === bp)
      .map((connection) => connection.id)
      .sort()
      .join(",");
  });

  async function refresh(options?: { force?: boolean; force_regen?: boolean }) {
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

    // force_regen clears the server-side config+cache and re-runs the full pipeline.
    // Only set on explicit user-initiated refreshes, not on auto-loads.
    const url = options?.force_regen ? `/insights${qs}&force_regen=1` : `/insights${qs}`;

    loading.value = true;
    error.value = null;
    try {
      data.value = await api.getJson<InsightsResponse>(url);
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
        activeConnectionSignature.value,
      ] as const,
    () => {
      loaded.value = false;
      void refresh({ force: true });
    },
    { immediate: true },
  );

  return {
    data,
    widgets: computed(() => data.value?.widgets ?? []),
    is_generating_config: computed(() => data.value?.is_fresh_config ?? false),
    loading,
    error,
    loaded,
    refresh,
  };
}

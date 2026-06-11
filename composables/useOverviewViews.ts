import type { DashboardViewListItem, SavedViewDetail } from "~/types/saved-view";
import { brandScopeQuery } from "~/utils/apiScope";

/**
 * Shared saved dashboard view state.
 *
 * The list uses the dashboard endpoint because it includes lightweight counts
 * needed by dashboard cards, while detail/CRUD remains on `/views`.
 */
export function useOverviewViews() {
  const api = useApiClient();
  const auth = useAuth();
  const workspace = useWorkspaceContext();

  const views = useState<DashboardViewListItem[]>("sv-saved-views", () => []);
  const viewsLoaded = useState<boolean>("sv-saved-views-loaded", () => false);
  const viewsLoading = useState<boolean>("sv-saved-views-loading", () => false);
  const viewsError = useState<string | null>("sv-saved-views-error", () => null);
  const viewsLoadedScopeKey = useState<string>("sv-saved-views-loaded-scope", () => "");

  const selectedViewId = useState<string | null>("sv-selected-view-id", () => null);
  const currentViewDetail = useState<SavedViewDetail | null>("sv-current-view-detail", () => null);

  function viewsQueryString() {
    const ws = workspace.currentWorkspaceId.value?.trim();
    const bp = workspace.currentBrandProfileId.value?.trim();
    if (!ws || !bp) return "";
    return brandScopeQuery(ws, bp);
  }

  function scopeKey() {
    const ws = workspace.currentWorkspaceId.value?.trim();
    const bp = workspace.currentBrandProfileId.value?.trim();
    return ws && bp ? `${ws}:${bp}` : "";
  }

  function resetViews() {
    views.value = [];
    viewsLoaded.value = false;
    viewsLoadedScopeKey.value = "";
  }

  async function refreshViews(options?: { force?: boolean }) {
    if (!auth.isAuthenticated.value || !api.hasBase.value) {
      resetViews();
      viewsError.value = null;
      return [];
    }
    const qs = viewsQueryString();
    if (!qs) {
      resetViews();
      return [];
    }
    if (viewsLoaded.value && viewsLoadedScopeKey.value === scopeKey() && !options?.force) {
      return views.value;
    }
    viewsLoading.value = true;
    viewsError.value = null;
    try {
      const res = await api.getJson<{ views: DashboardViewListItem[] }>(
        `/dashboard/views${qs}`,
      );
      views.value = res.views || [];
      viewsLoaded.value = true;
      viewsLoadedScopeKey.value = scopeKey();

      if (!selectedViewId.value && views.value.length) {
        const def = views.value.find((v) => v.is_default);
        selectedViewId.value = def?.id || views.value[0]?.id || null;
      }

      return views.value;
    } catch (e) {
      resetViews();
      viewsError.value = "Could not load saved views.";
      if (e instanceof Error && e.message) {
        viewsError.value = e.message;
      }
      return [];
    } finally {
      viewsLoading.value = false;
    }
  }

  async function fetchView(viewId: string) {
    if (!viewsQueryString() || !viewId) return null;
    try {
      const detail = await api.getJson<SavedViewDetail>(
        `/views/${encodeURIComponent(viewId)}${viewsQueryString()}`,
      );
      currentViewDetail.value = detail;
      return detail;
    } catch (e) {
      currentViewDetail.value = null;
      viewsError.value = e instanceof Error && e.message ? e.message : "Could not load this view.";
      return null;
    }
  }

  watch(
    () =>
      [
        auth.activeUserId.value,
        api.hasBase.value,
        workspace.currentWorkspaceId.value,
        workspace.currentBrandProfileId.value,
      ] as const,
    async ([userId, hasBase], prev) => {
      const [prevUserId, prevHasBase] = prev ?? ["", false];
      if (!userId || !hasBase) {
        resetViews();
        selectedViewId.value = null;
        currentViewDetail.value = null;
        return;
      }
      await refreshViews({
        force: userId !== prevUserId || hasBase !== prevHasBase,
      });
    },
    { immediate: true },
  );

  watch(selectedViewId, async (id) => {
    if (!id) {
      currentViewDetail.value = null;
      return;
    }
    await fetchView(id);
  });

  return {
    views,
    viewsLoaded,
    viewsLoading,
    viewsError,
    selectedViewId,
    currentViewDetail,
    refreshViews,
    fetchView,
    viewsQueryString,
  };
}

import type { SavedViewDetail, SavedViewListItem } from "~/types/saved-view";
import { brandScopeQuery } from "~/utils/apiScope";

/**
 * Mongo-backed overview views via `GET /views`, `GET /views/:id`, `POST /views`, `PATCH /views/:id`.
 */
export function useOverviewViews() {
  const api = useApiClient();
  const auth = useAuth();
  const workspace = useWorkspaceContext();

  const views = useState<SavedViewListItem[]>("sv-saved-views", () => []);
  const viewsLoaded = useState<boolean>("sv-saved-views-loaded", () => false);
  const viewsLoading = useState<boolean>("sv-saved-views-loading", () => false);
  const viewsError = useState<string | null>("sv-saved-views-error", () => null);

  const selectedViewId = useState<string | null>("sv-selected-view-id", () => null);
  const currentViewDetail = useState<SavedViewDetail | null>("sv-current-view-detail", () => null);

  function viewsQueryString() {
    const ws = workspace.currentWorkspaceId.value?.trim();
    const bp = workspace.currentBrandProfileId.value?.trim();
    if (!ws || !bp) return "";
    return brandScopeQuery(ws, bp);
  }

  async function refreshViews(options?: { force?: boolean }) {
    if (!auth.isAuthenticated.value || !api.hasBase.value) {
      views.value = [];
      viewsLoaded.value = false;
      viewsError.value = null;
      return [];
    }
    if (!viewsQueryString()) {
      views.value = [];
      return [];
    }
    viewsLoading.value = true;
    viewsError.value = null;
    try {
      const res = await api.getJson<{ views: SavedViewListItem[] }>(
        `/views${viewsQueryString()}`,
      );
      views.value = res.views || [];
      viewsLoaded.value = true;

      if (!selectedViewId.value && views.value.length) {
        const def = views.value.find((v) => v.is_default);
        selectedViewId.value = def?.id || views.value[0]?.id || null;
      }

      return views.value;
    } catch {
      views.value = [];
      viewsError.value = "Could not load saved views.";
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
    } catch {
      currentViewDetail.value = null;
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
        views.value = [];
        viewsLoaded.value = false;
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

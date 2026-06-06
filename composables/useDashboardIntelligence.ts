import type {
  DashboardIntelligenceResponse,
  DashboardTemplateSuggestion,
  SavedViewDetail,
  SavedWidgetPayload,
} from "~/types/saved-view";
import { brandScopeBody, brandScopeQuery } from "~/utils/apiScope";

/**
 * Dashboard AI templates/generate and saved-view editor helpers (payloads, layout).
 */
export function useDashboardIntelligence() {
  const api = useApiClient();
  const workspace = useWorkspaceContext();

  const templates = useState<DashboardTemplateSuggestion[]>(
    "sv-dashboard-templates",
    () => [],
  );
  const templatesLoading = useState("sv-dashboard-templates-loading", () => false);
  const templatesError = useState<string | null>("sv-dashboard-templates-error", () => null);

  function scopeQuery() {
    const ws = workspace.currentWorkspaceId.value?.trim();
    const bp = workspace.currentBrandProfileId.value?.trim();
    if (!ws || !bp) return "";
    return brandScopeQuery(ws, bp);
  }

  async function refreshTemplates() {
    const qs = scopeQuery();
    if (!api.hasBase.value || !qs) {
      templates.value = [];
      return [];
    }
    templatesLoading.value = true;
    templatesError.value = null;
    try {
      const res = await api.getJson<DashboardIntelligenceResponse>(
        `/dashboard/templates${qs}`,
      );
      templates.value = res.templates || [];
      return templates.value;
    } catch {
      templates.value = [];
      templatesError.value = "Could not load dashboard templates.";
      return [];
    } finally {
      templatesLoading.value = false;
    }
  }

  async function generateView(input: {
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

  async function fetchWidgetPayloads(viewId: string) {
    const qs = scopeQuery();
    if (!qs) return [];
    const res = await api.getJson<{ payloads: SavedWidgetPayload[] }>(
      `/views/${encodeURIComponent(viewId)}/widgets/payloads${qs}&time_granularity=DAY`,
    );
    return res.payloads || [];
  }

  async function patchViewLayout(
    viewId: string,
    body: {
      layout?: unknown;
      widget_ids?: string[];
    },
  ) {
    const qs = scopeQuery();
    if (!qs) return null;
    return api.patchJson<SavedViewDetail>(
      `/views/${encodeURIComponent(viewId)}${qs}`,
      body,
    );
  }

  watch(
    () =>
      [
        api.hasBase.value,
        workspace.currentWorkspaceId.value,
        workspace.currentBrandProfileId.value,
      ] as const,
    ([hasBase, ws, bp]) => {
      if (!hasBase || !ws || !bp) {
        templates.value = [];
        return;
      }
      void refreshTemplates();
    },
    { immediate: true },
  );

  return {
    templates,
    templatesLoading,
    templatesError,
    refreshTemplates,
    generateView,
    fetchWidgetPayloads,
    patchViewLayout,
  };
}

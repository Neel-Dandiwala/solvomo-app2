export interface OverviewRankedItem {
  key: string;
  count: number;
}

export interface CreditOverview {
  used: number;
  plan_maximum: number;
  remaining: number;
  top_usage_categories: OverviewRankedItem[];
}

export interface ConnectionsOverview {
  created: number;
  plan_maximum: number;
  top_integration_types: OverviewRankedItem[];
}

export interface StorageLargestItem {
  name: string;
  bytes: number;
}

export interface StorageOverview {
  used_bytes: number;
  plan_maximum_bytes: number;
  largest_items: StorageLargestItem[];
}

export interface CreditUsagePoint {
  date: string;
  credits: number;
}

export interface CreditUsageSeries {
  days: number;
  points: CreditUsagePoint[];
}

import { workspaceScopeQuery } from "~/utils/apiScope";

/**
 * Workspace overview metrics from `/overview/*?workspace_id=`.
 */
export function useOverviewWorkspaceStats() {
  const api = useApiClient();
  const workspace = useWorkspaceContext();

  const credit = ref<CreditOverview | null>(null);
  const connections = ref<ConnectionsOverview | null>(null);
  const storage = ref<StorageOverview | null>(null);
  const creditUsage = ref<CreditUsageSeries | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function workspaceQuery() {
    const ws = workspace.currentWorkspaceId.value?.trim();
    if (!ws) return null;
    return workspaceScopeQuery(ws);
  }

  async function refresh(options?: { days?: number }) {
    const qs = workspaceQuery();
    const days = options?.days ?? 30;

    if (!api.hasBase.value || !qs) {
      credit.value = null;
      connections.value = null;
      storage.value = null;
      creditUsage.value = null;
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const [creditRes, connectionsRes, storageRes, usageRes] = await Promise.all([
        api.getJson<CreditOverview>(`/overview/credit${qs}`),
        api.getJson<ConnectionsOverview>(`/overview/connections${qs}`),
        api.getJson<StorageOverview>(`/overview/storage${qs}`),
        api.getJson<CreditUsageSeries>(`/overview/credit/usage${qs}&days=${days}`),
      ]);
      credit.value = {
        ...creditRes,
        top_usage_categories: creditRes.top_usage_categories ?? [],
      };
      connections.value = {
        ...connectionsRes,
        top_integration_types: connectionsRes.top_integration_types ?? [],
      };
      storage.value = {
        ...storageRes,
        largest_items: storageRes.largest_items ?? [],
      };
      creditUsage.value = usageRes;
    } catch (e) {
      credit.value = null;
      connections.value = null;
      storage.value = null;
      creditUsage.value = null;
      error.value = e instanceof Error ? e.message : "Failed to load overview";
    } finally {
      loading.value = false;
    }
  }

  watch(
    () => workspace.currentWorkspaceId.value,
    () => {
      void refresh();
    },
  );

  return {
    credit,
    connections,
    storage,
    creditUsage,
    loading,
    error,
    refresh,
  };
}

export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 10 || unit === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

export function formatPlanMaximum(value: number, options?: { bytes?: boolean }): string {
  if (!Number.isFinite(value) || value <= 0) return "∞";
  return options?.bytes ? formatStorageBytes(value) : value.toLocaleString();
}

const CREDIT_SOURCE_LABELS: Record<string, string> = {
  simulation_run: "Simulations",
  dashboard_template_suggest: "Dashboard templates",
  dashboard_generate: "Dashboard generation",
};

export function formatCreditUsageCategory(key: string): string {
  return CREDIT_SOURCE_LABELS[key] || key.replaceAll("_", " ");
}

export interface SpendMetrics {
  spend: number;
  revenue: number;
  conversions: number;
  roas: number;
  cac: number;
}

export interface SpendSummary {
  days: number;
  has_spend_connections: boolean;
  totals: SpendMetrics | null;
  previous_totals?: SpendMetrics | null;
  spend_change_pct?: number;
  revenue_change_pct?: number;
  roas_change_pct?: number;
}

export interface SpendConnectionSlice {
  connection_id: string;
  connection_slug: string;
  name: string;
  status: "ok" | "error";
  error?: string;
  metrics: SpendMetrics | null;
  previous_metrics?: SpendMetrics | null;
}

export interface SpendByConnection {
  days: number;
  has_spend_connections: boolean;
  connections: SpendConnectionSlice[];
}

export interface SpendSeriesPoint {
  date: string;
  spend: number;
}

export interface SpendConnectionSeries {
  connection_id: string;
  connection_slug: string;
  name: string;
  points: SpendSeriesPoint[];
}

export interface SpendSeries {
  days: number;
  has_spend_connections: boolean;
  points: SpendSeriesPoint[];
  by_connection: SpendConnectionSeries[];
}

export interface SpendCampaignRow {
  id: string;
  connection_id: string;
  connection_slug: string;
  channel: string;
  name: string;
  objective: string;
  spend: number;
  revenue: number;
  conversions: number;
  roas: number;
  budget: number;
  pace_pct: number;
  alert: "Overpacing" | "On plan" | "Underpacing";
}

export interface SpendCampaigns {
  days: number;
  has_spend_connections: boolean;
  campaigns: SpendCampaignRow[];
}

import { brandScopeQuery } from "~/utils/apiScope";

/**
 * Spend tab data from `/spend/*?workspace_id=&brandprofile_id=`.
 * In playground mode data is served from the pre-bundled `spend_data` without any API calls.
 */
export function useSpendTab() {
  const api = useApiClient();
  const workspace = useWorkspaceContext();
  const playground = usePlayground();

  const summary = ref<SpendSummary | null>(null);
  const byConnection = ref<SpendByConnection | null>(null);
  const series = ref<SpendSeries | null>(null);
  const campaigns = ref<SpendCampaigns | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const hasSpendConnections = computed(
    () => Boolean(summary.value?.has_spend_connections),
  );

  function scopeQuery() {
    const ws = workspace.currentWorkspaceId.value?.trim();
    const bp = workspace.currentBrandProfileId.value?.trim();
    if (!ws || !bp) return null;
    return brandScopeQuery(ws, bp);
  }

  async function refresh(options?: { days?: number; compare?: boolean }) {
    // Playground bypass: serve pre-bundled data, no API call.
    if (playground.isPlayground.value && playground.spendData.value) {
      const pg = playground.spendData.value;
      summary.value = pg.summary;
      byConnection.value = pg.by_connection;
      series.value = pg.series;
      campaigns.value = pg.campaigns;
      loading.value = false;
      error.value = null;
      return;
    }

    const qs = scopeQuery();
    const days = options?.days ?? 30;
    const compare = options?.compare ?? true;
    const compareQ = compare ? "&compare=true" : "&compare=false";

    if (!api.hasBase.value || !qs) {
      summary.value = null;
      byConnection.value = null;
      series.value = null;
      campaigns.value = null;
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const [summaryRes, connectionsRes, seriesRes, campaignsRes] = await Promise.all([
        api.getJson<SpendSummary>(`/spend/summary${qs}&days=${days}${compareQ}`),
        api.getJson<SpendByConnection>(`/spend/connections${qs}&days=${days}${compareQ}`),
        api.getJson<SpendSeries>(`/spend/series${qs}&days=${days}`),
        api.getJson<SpendCampaigns>(`/spend/campaigns${qs}&days=${days}`),
      ]);
      summary.value = summaryRes;
      byConnection.value = connectionsRes;
      series.value = seriesRes;
      campaigns.value = campaignsRes;
    } catch (e) {
      summary.value = null;
      byConnection.value = null;
      series.value = null;
      campaigns.value = null;
      error.value = e instanceof Error ? e.message : "Failed to load spend data";
    } finally {
      loading.value = false;
    }
  }

  watch(
    () =>
      [workspace.currentWorkspaceId.value, workspace.currentBrandProfileId.value] as const,
    () => {
      void refresh();
    },
  );

  return {
    summary,
    byConnection,
    series,
    campaigns,
    loading,
    error,
    hasSpendConnections,
    refresh,
  };
}

export function formatSpendDelta(pct: number | undefined): string {
  if (pct === undefined || !Number.isFinite(pct)) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

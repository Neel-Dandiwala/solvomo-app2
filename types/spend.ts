/** Canonical spend tab API shapes (mirrors `/spend/*` responses). */

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

export type PlaygroundSpendMetrics = SpendMetrics;
export type PlaygroundSpendConnectionSlice = SpendConnectionSlice;
export type PlaygroundSpendSeriesPoint = SpendSeriesPoint;
export type PlaygroundSpendConnectionSeries = SpendConnectionSeries;

export interface PlaygroundSpendData {
  summary: SpendSummary;
  by_connection: SpendByConnection;
  series: SpendSeries;
  campaigns: SpendCampaigns;
}

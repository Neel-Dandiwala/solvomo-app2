export type InsightWidgetType =
  | "cross_platform_comparison"
  | "trend_indicator"
  | "campaign_breakdown"
  | "anomaly_highlight";

export type InsightKind = "opportunity" | "risk" | "neutral";
export type InsightSeverity = "high" | "medium" | "low";

export type InsightIndicator = {
  label: string;
  direction: "up" | "down" | "flat";
  is_positive: boolean;
};

export type CrossPlatformItem = {
  connection_slug: string;
  label: string;
  metric: string;
  value: number;
  is_winner: boolean;
};

export type CrossPlatformData = {
  kind: "cross_platform_comparison";
  metric: string;
  items: CrossPlatformItem[];
};

export type TrendDay = { date: string; current: number; previous: number };

export type TrendData = {
  kind: "trend_indicator";
  metric: string;
  label: string;
  current_total: number;
  previous_total: number;
  delta_pct: number;
  days: TrendDay[];
};

export type CampaignRow = {
  id: string;
  name: string;
  metrics: Record<string, number>;
  vs_average: Record<string, number>;
};

export type CampaignBreakdownData = {
  kind: "campaign_breakdown";
  connection_slug: string;
  metrics: string[];
  rows: CampaignRow[];
};

export type AnomalyData = {
  kind: "anomaly_highlight";
  connection_slug: string;
  metric: string;
  label: string;
  anomaly_date: string;
  anomaly_value: number;
  baseline_value: number;
  magnitude_pct: number;
};

export type InsightWidgetData =
  | CrossPlatformData
  | TrendData
  | CampaignBreakdownData
  | AnomalyData;

export type InsightWidgetResult = {
  id: string;
  widget_type: InsightWidgetType;
  display_title: string;
  headline: string;
  narrative: string;
  insight_kind: InsightKind;
  severity: InsightSeverity;
  indicators: InsightIndicator[];
  data: InsightWidgetData;
};

export type InsightsResponse = {
  config_generated_at: string;
  is_fresh_config: boolean;
  widgets: InsightWidgetResult[];
};

export type InsightChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type InsightChatResponse = {
  reply: string;
};

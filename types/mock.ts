import type { AlertItem, BrandProfile, ConnectionStatus, LabVersionRow, Workspace } from "~/types/app-shell";
import type { AdUnifiedSnapshot } from "~/types/ad-unified";

/** Demo persona keys for offline preview; API sessions use Mongo ObjectId strings. */
export type DemoUserKey = "neel" | "riya";

export type OnboardingStepKey = "survey" | "brand";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  title: string;
}

export interface MockConnection {
  id: string;
  name: string;
  description: string;
  status: ConnectionStatus;
}

export interface OverviewHero {
  periodSpend: string;
  attributedRevenue: string;
  roi: string;
  cac: string;
  workingBullets: [string, string, string];
  fixBullets: [string, string, string];
}

export type OverviewWidgetSource = "summary" | "ad_data" | "crm_data" | "spend_data" | "alerts" | "connections";
export type OverviewWidgetVisualization =
  | "kpi"
  | "bar"
  | "line"
  | "area"
  | "donut"
  | "table"
  | "stacked_bar"
  | "insights"
  | "connections"
  | "alerts"
  | "horizontal_bar"
  | "funnel"
  | "signal_list"
  | "metric_delta";
export type OverviewWidgetMetric =
  | "spend"
  | "revenue"
  | "roi"
  | "cac"
  | "qualified_leads"
  | "deals"
  | "pipeline_revenue"
  | "closed_revenue"
  | "impressions"
  | "clicks"
  | "ctr"
  | "conversions"
  | "amount";

export type OverviewWidgetDimension =
  | "date"
  | "platform"
  | "lead_source"
  | "channel"
  | "campaign_cluster"
  | "vendor";

export interface OverviewKpi {
  id: string;
  label: string;
  value: string;
  change: string;
  tone: "positive" | "negative" | "neutral";
  source: OverviewWidgetSource;
  helper: string;
}

export type OverviewInsightKind = "opportunity" | "risk" | "neutral";

export interface OverviewInsight {
  id: string;
  title: string;
  summary: string;
  tone: "brand" | "product" | "depth";
  linkLabel?: string;
  linkTo?: string;
  /** Short label for signal strip; defaults to `title` when absent */
  headline?: string;
  kind?: OverviewInsightKind;
  /** One-line cause/effect; shown in callouts or expanded detail */
  because?: string;
  relatedMetric?: OverviewWidgetMetric;
}

export interface OverviewTrendPoint {
  date: string;
  spend: number;
  revenue: number;
  qualifiedLeads: number;
  deals: number;
  pipelineRevenue: number;
  closedRevenue: number;
  /** Site-wide conversions (e.g. lead forms); used for conversion trend */
  conversions?: number;
  /** $k-style proxy for CAC sparkline when present */
  cac?: number;
}

export interface OverviewPlatformSummary {
  platform: string;
  spend: number;
  revenue: number;
  roi: number;
  ctr: number;
  conversions: number;
  qualifiedLeads: number;
  deals: number;
  efficiencyLabel: string;
}

export interface OverviewLeadSourceSummary {
  source: string;
  leads: number;
  qualifiedLeads: number;
  deals: number;
  revenue: number;
}

export interface OverviewSpendRecord {
  id: string;
  date: string;
  channel: string;
  vendor: string;
  category: string;
  amount: number;
}

export interface OverviewCampaignCluster {
  cluster: string;
  spend: number;
  revenue: number;
  roi: number;
}

export interface OverviewFunnelStage {
  stage: string;
  value: number;
  /** Conversion rate from previous stage, 0–100 */
  rateFromPrev?: number;
}

export type OverviewPrioritySignalSeverity = "critical" | "warning" | "info";

export interface OverviewPrioritySignal {
  id: string;
  headline: string;
  severity: OverviewPrioritySignalSeverity;
  kind?: OverviewInsightKind;
  /** e.g. "+18% spend" or "ROAS 3.2x" */
  delta?: string;
}

export interface OverviewAttributionMixRow {
  label: string;
  value: number;
}

export interface OverviewCampaignEfficiencyRow {
  id: string;
  name: string;
  spend: number;
  revenue: number;
  roi: number;
}

export interface OverviewCreatorRow {
  id: string;
  name: string;
  spend: number;
  revenue: number;
  roi: number;
}

export interface OverviewRevenueAttributionSplit {
  direct: number;
  assisted: number;
}

export interface OverviewNewVsReturning {
  newRevenue: number;
  returningRevenue: number;
}

export interface OverviewLeadSourceQualityRow {
  source: string;
  volume: number;
  pipelineQuality: number;
  revenue: number;
}

export interface OverviewBudgetRecommendation {
  id: string;
  action: string;
  impact: string;
}

export interface OverviewConnectionsSummary {
  connected: number;
  syncing: number;
  attention: number;
  lastSyncLabel?: string;
  delayedSources?: string[];
}

export interface OverviewCreativeLeaderboardRow {
  id: string;
  name: string;
  spend: number;
  revenue: number;
  roas: number;
}

export interface OverviewPerformanceChange {
  id: string;
  label: string;
  delta: string;
  period: string;
  tone?: "positive" | "negative" | "neutral";
}

export interface OverviewWidgetConfig {
  id: string;
  title: string;
  description: string;
  source: OverviewWidgetSource;
  visualization: OverviewWidgetVisualization;
  datasetKey: string;
  metric?: OverviewWidgetMetric;
  dimension?: OverviewWidgetDimension;
  size: "xs" | "sm" | "md" | "lg" | "full";
}

export interface OverviewDashboardConfig {
  id: string;
  name: string;
  description: string;
  widgetIds: string[];
  isDefault?: boolean;
}

export interface OverviewData {
  kpis: OverviewKpi[];
  insights: OverviewInsight[];
  /** 2–3 short lines for the executive row; no placeholder copy */
  executiveBullets: string[];
  trendPoints: OverviewTrendPoint[];
  platformSummaries: OverviewPlatformSummary[];
  leadSourceSummaries: OverviewLeadSourceSummary[];
  spendRecords: OverviewSpendRecord[];
  campaignClusters: OverviewCampaignCluster[];
  funnel: OverviewFunnelStage[];
  connectionsSummary: OverviewConnectionsSummary;
  creativeLeaderboard: OverviewCreativeLeaderboardRow[];
  performanceChanges: OverviewPerformanceChange[];
  /** Top priority risks/opportunities beside hero */
  prioritySignals: OverviewPrioritySignal[];
  /** Matched vs modeled vs unattributed (volume index) */
  attributionMix: OverviewAttributionMixRow[];
  /** Named campaigns */
  campaignEfficiency: OverviewCampaignEfficiencyRow[];
  creatorSummaries: OverviewCreatorRow[];
  revenueAttributionSplit: OverviewRevenueAttributionSplit;
  newVsReturning: OverviewNewVsReturning;
  leadSourceQuality: OverviewLeadSourceQualityRow[];
  budgetRecommendations: OverviewBudgetRecommendation[];
  widgets: OverviewWidgetConfig[];
  dashboards: OverviewDashboardConfig[];
}

export interface PerformanceCampaignRow {
  id: string;
  name: string;
  platform: string;
  spend: string;
  revenue: string;
  roi: string;
  status: string;
}

export interface PerformanceAdGroupRow {
  id: string;
  name: string;
  platform: string;
  spend: string;
  revenue: string;
  roi: string;
  status: string;
}

export interface PerformanceAdRow {
  id: string;
  name: string;
  platform: string;
  spend: string;
  revenue: string;
  roi: string;
  status: string;
}

export interface PerformanceTables {
  campaigns: PerformanceCampaignRow[];
  ad_groups: PerformanceAdGroupRow[];
  ads: PerformanceAdRow[];
}

export interface CreativeRow {
  id: string;
  name: string;
  platform: string;
  hook: string;
  ctr: string;
  conversion: string;
  roi: string;
}

export interface AudienceRow {
  id: string;
  audience: string;
  platform: string;
  spend: string;
  roi: string;
  performance: string;
}

export interface SpendRow {
  id: string;
  channel: string;
  spend: string;
  revenue: string;
  cac: string;
  roi: string;
}

export interface CrmRow {
  id: string;
  lead_source: string;
  deals: string;
  revenue: string;
  attribution: string;
}

// ---------------------------------------------------------------------------
// Playground tab bypass shapes (mirrors api/src/types/playground.ts)
// ---------------------------------------------------------------------------

export type {
  PlaygroundSpendConnectionSeries,
  PlaygroundSpendConnectionSlice,
  PlaygroundSpendData,
  PlaygroundSpendMetrics,
  PlaygroundSpendSeriesPoint,
  SpendCampaignRow,
  SpendCampaigns,
  SpendMetrics,
} from "~/types/spend";

export interface PlaygroundAssetEnvelope {
  id: string;
  name: string;
  status: "active";
  source_type: string;
  workspace_id: string;
  brandprofile_id: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface PlaygroundAssetsData {
  creative: PlaygroundAssetEnvelope[];
  variants: PlaygroundAssetEnvelope[];
  audience: PlaygroundAssetEnvelope[];
  budgets: PlaygroundAssetEnvelope[];
  datasources: PlaygroundAssetEnvelope[];
}

export interface PlaygroundSimulationRecord {
  id: string;
  workspace_id: string;
  brandprofile_id: string;
  name: string;
  output_metrics: string[];
  run_request: { forecast_days: number; granularity: string; start_date: string; timezone: string };
  brand: { brand_name: string; industry?: string };
  connections: Array<{ connection_id: string; connection_slug: string; category: string }>;
  evolve_status: "reviewed" | "ready_to_push" | "pushed" | "draft";
  created_at: string;
  updated_at: string;
}

export interface PlaygroundSimulationRunResult {
  run_id: string;
  analysis_tab: string;
  status: "complete";
  eval_status: "accepted";
  forecast_days: number;
  daily_forecast: Array<{
    date: string;
    metrics: Record<string, number>;
    notes?: string[];
  }>;
  summary: string;
  winner_variant_id?: string;
  confidence_score: number;
  reasoning: Array<{ claim: string; evidence_ids: string[] }>;
  assumptions: string[];
  warnings: string[];
  evidence: Array<{ id: string; source: string; label: string; confidence: number; data: unknown }>;
  step_results: Array<{ step_name: string; status: string; duration_ms: number; evidence_ids: string[]; warnings: string[] }>;
  agent_version: string;
  prompt_version: string;
  eval_version: string;
  source_coverage: {
    used_config: boolean;
    used_integration: boolean;
    used_ai: boolean;
    used_web: boolean;
    used_market_data: boolean;
    used_calibrated_model: boolean;
    used_provider_fallback: boolean;
    used_assumptions: boolean;
  };
}

export interface PlaygroundSimulationData {
  simulations: PlaygroundSimulationRecord[];
  run_result: PlaygroundSimulationRunResult;
}

export interface SolvomoMockBundle {
  profile: UserProfile;
  workspaces: Workspace[];
  brandProfiles: BrandProfile[];
  /** Baseline completed steps when session is created (Neel: all; Riya: none). */
  onboardingDefaults: OnboardingStepKey[];
  /** Command center hero metrics (static demo strings). */
  overviewHero: OverviewHero;
  overview: OverviewData;
  connectionsShell: MockConnection[];
  connectionsOnboarding: MockConnection[];
  alerts: AlertItem[];
  labVersions: LabVersionRow[];
  performance: PerformanceTables;
  creatives: CreativeRow[];
  audience: AudienceRow[];
  spend: SpendRow[];
  crm: CrmRow[];
  /** Normalized ad graph from API (production: Mongo; playground: bundled samples). */
  adUnified?: AdUnifiedSnapshot;
  /** Rich spend API response shapes — used by the Spend tab playground bypass. */
  spend_data?: PlaygroundSpendData;
  /** Pre-seeded asset library — used by Asset tab playground bypass. */
  assets_data?: PlaygroundAssetsData;
  /** Pre-run simulation records + canned run result. */
  simulation_data?: PlaygroundSimulationData;
}

/** Analytics payload from GET /auth/playground/bundle (no workspace tree). */
export type PlaygroundPayload = Omit<SolvomoMockBundle, "workspaces" | "brandProfiles">;

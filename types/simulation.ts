/**
 * Canonical simulation types for app2 — mirrors the api SimulationRunResult
 * and SimulationConfig contracts. Update here when the API contract changes.
 *
 * Tabs supported: creative | copy | audience | placement | platform | budget | offer | timing | forecast
 */

export type SimulationAnalysisTab =
  | "creative"
  | "copy"
  | "audience"
  | "placement"
  | "platform"
  | "budget"
  | "offer"
  | "timing"
  | "forecast";

export type SimulationMetricKey =
  | "IMPRESSIONS"
  | "REACH"
  | "FREQUENCY"
  | "SPEND"
  | "CLICKS_ALL"
  | "CLICKS_LINK"
  | "CTR_ALL"
  | "CTR_LINK"
  | "CPM"
  | "CPC_ALL"
  | "CPC_LINK"
  | "COST_PER_MILLE_REACHED"
  | "ENGAGEMENTS"
  | "VIDEO_VIEWS_QUALIFIED"
  | "VIDEO_AVG_WATCH_TIME_SECONDS"
  | "VIDEO_COMPLETION_RATE"
  | "CONVERSIONS"
  | "CONVERSION_VALUE"
  | "ROAS"
  | "COST_PER_CONVERSION";

export type SimulationCreativeFormat =
  | "IMAGE"
  | "VIDEO"
  | "CAROUSEL"
  | "REELS"
  | "STORY"
  | "TEXT"
  | "LIVE"
  | "AUDIO";

export type SimulationVariantObjectType =
  | "ads_campaign"
  | "ads_group"
  | "ads_ad"
  | "ads_creative"
  | "social_post"
  | "social_media";

export type SimulationBidStrategy =
  | "LOWEST_COST"
  | "LOWEST_COST_WITH_BID_CAP"
  | "COST_CAP"
  | "BID_CAP"
  | "TARGET_COST";

export type SimulationEvolveStatus =
  | "draft"
  | "reviewed"
  | "ready_to_push"
  | "pushed"
  | "failed_validation";

export type SimulationGranularity = "day" | "week" | "month";

export interface SimulationSourceRef {
  connection_id: string;
  organization_id?: string | null;
  object_type: string;
  object_id: string;
}

export interface SimulationVariantConfig {
  variant_id: string;
  label?: string;
  platform?: string;
  object_type: SimulationVariantObjectType;
  format?: SimulationCreativeFormat;
  asset_url?: string;
  thumbnail_url?: string;
  headline?: string | null;
  primary_text?: string | null;
  description?: string | null;
  caption?: string | null;
  hook?: string | null;
  call_to_action?: string | null;
  final_url?: string | null;
  published_at?: string | null;
  video_duration_seconds?: number | null;
  source?: SimulationSourceRef | null;
}

export interface SimulationAudienceConfig {
  location?: {
    type: "country" | "region" | "city" | "radius";
    name?: string;
    country_code?: string;
    radius_km?: number;
  };
  age_range?: { min?: number; max?: number };
  genders?: string[];
  languages?: string[];
  interests?: string[];
  custom_audience?: boolean;
  lookalike_audience?: boolean;
  retargeting?: boolean;
  estimated_audience_size?: number;
}

export interface SimulationOfferConfig {
  product_type?: string;
  price_usd?: number;
  discount_percentage?: number;
  limited_time_offer?: boolean;
  free_shipping?: boolean;
  value_proposition?: string;
}

export interface SimulationBudgetConfig {
  /** Daily spend amount in the configured currency. */
  daily_budget_amount?: number;
  currency?: string;
  duration_days?: number;
  total_budget_usd?: number;
}

export interface SimulationBrandSocialHandle {
  platform: string;
  handle?: string;
  profile_url?: string;
  connection_id?: string;
  follower_count?: number;
  following_count?: number;
  page_likes?: number;
  media_count?: number;
  is_verified?: boolean;
  bio?: string;
  last_fetched_at?: string;
}

export interface SimulationBrandConfig {
  brand_name: string;
  industry?: string;
  brand_recognition?: string;
  website_url?: string;
  reviews_count?: number;
  average_rating?: number;
  trust_signals?: string[];
  social_handles?: SimulationBrandSocialHandle[];
  currency?: string;
}

export interface SimulationConnectionConfig {
  connection_id: string;
  connection_slug: string;
  category: string;
}

export interface SimulationRunRequest {
  forecast_days: number;
  granularity: SimulationGranularity;
  start_date: string;
  timezone: string;
}

/** Full simulation config (hydrated from asset refs). */
export interface SimulationConfig {
  workspace_id: string;
  brandprofile_id: string;
  name: string;
  connections: SimulationConnectionConfig[];
  brand: SimulationBrandConfig;
  variants: SimulationVariantConfig[];
  audience?: SimulationAudienceConfig;
  offer?: SimulationOfferConfig;
  target_metrics?: Partial<Record<SimulationMetricKey, number>>;
  output_metrics: SimulationMetricKey[];
  budget?: SimulationBudgetConfig;
  bid_strategy?: SimulationBidStrategy;
  run_request: SimulationRunRequest;
  ads_campaign?: SimulationSourceRef;
  ads_group?: SimulationSourceRef;
  evolve_status?: SimulationEvolveStatus;
}

export type SimulationInsufficientDataReason =
  | "no_integration_rows"
  | "no_budget_configured"
  | "coverage_below_threshold"
  | "provider_unavailable"
  | "connector_error";

export type SimulationRunStatus = "complete" | "insufficient_data" | "failed";

/** Persisted shape (asset IDs only — no hydrated data). */
export interface SimulationPersistBody {
  workspace_id: string;
  brandprofile_id: string;
  name: string;
  creative_id?: string;
  variant_id?: string;
  creative_ids?: string[];
  variant_ids?: string[];
  audience_id?: string;
  budget_id?: string;
  connections?: SimulationConnectionConfig[];
  brand: SimulationBrandConfig;
  offer?: SimulationOfferConfig;
  target_metrics?: Partial<Record<SimulationMetricKey, number>>;
  output_metrics: SimulationMetricKey[];
  bid_strategy?: SimulationBidStrategy;
  run_request: SimulationRunRequest;
  evolve_status?: SimulationEvolveStatus;
}

export type SimulationRunSummary = {
  run_id: string;
  simulation_id: string;
  analysis_tab: SimulationAnalysisTab;
  status: SimulationRunStatus;
  eval_status?: "accepted" | "repaired" | "failed";
  reason?: SimulationInsufficientDataReason;
  forecast_days?: number;
  summary: string;
  confidence_score?: number;
  winner_variant_id?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  source_coverage?: SimulationRunResult["source_coverage"];
};

export type SimulationRunListResponse = {
  simulation_id: string;
  runs: SimulationRunSummary[];
};

/** Server response for a single simulation run. */
export interface SimulationRunResult {
  run_id: string;
  analysis_tab: SimulationAnalysisTab;
  status: SimulationRunStatus;
  reason?: SimulationInsufficientDataReason;
  eval_status: "accepted" | "repaired" | "failed";
  forecast_days: number;
  daily_forecast: Array<{
    date: string;
    metrics: Partial<Record<SimulationMetricKey, number>>;
    notes?: string[];
  }>;
  summary: string;
  winner_variant_id?: string;
  confidence_score: number;
  reasoning: Array<{ claim: string; evidence_ids: string[] }>;
  assumptions: string[];
  warnings: string[];
  evidence: Array<{
    id: string;
    source: string;
    tool_name?: string;
    label: string;
    confidence: number;
    data: unknown;
  }>;
  step_results: Array<{
    step_name: string;
    status: string;
    duration_ms: number;
    evidence_ids: string[];
    warnings: string[];
  }>;
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
  completed_at?: string;
  fetched_at?: string;
}

export interface SimulationLastRunPointer {
  run_id: string;
  run_at: string;
  status: SimulationRunStatus;
  analysis_tab: SimulationAnalysisTab;
  confidence_score?: number;
  reason?: SimulationInsufficientDataReason;
}

/** Persisted simulation record (from GET /simulations or GET /simulations/:id). */
export interface SimulationRecord extends SimulationPersistBody {
  id: string;
  last_run?: SimulationLastRunPointer;
  schema_version?: number;
  created_at?: string;
  updated_at?: string;
  hydrated?: SimulationConfig;
  /** True only for client-side draft records not yet saved to the API. */
  _local?: boolean;
}

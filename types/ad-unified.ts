/**
 * Canonical ad entities — keep in sync with `api/src/types/Ads.ts` (snake_case fields and snapshot keys).
 * Normalized from integrations (Meta, Google, Microsoft, etc.) or custom ingest.
 */

export type AdSourcePlatform =
  | "meta"
  | "google_ads"
  | "tiktok"
  | "linkedin"
  | "pinterest"
  | "snapchat"
  | "microsoft_ads"
  | "custom";

/** Legacy lowercase statuses (older rows); prefer {@link AdLifecycleStatus}. */
export type AdEntityStatus =
  | "active"
  | "paused"
  | "archived"
  | "draft"
  | "unknown";

/** Cross-platform lifecycle (pass-through allowed). */
export type AdLifecycleStatus =
  | "INACTIVE"
  | "ACTIVE"
  | "PAUSED"
  | "ARCHIVED"
  | "DRAFT"
  | AdEntityStatus;

export type AdBudgetPeriod = "DAILY" | "MONTHLY" | "TOTAL" | "LIFETIME";

export type AdCampaignGoal =
  | "UNSPECIFIED"
  | "BRAND_AWARENESS"
  | "REACH"
  | "WEBSITE_TRAFFIC"
  | "LEADS";

export type AdAdvertisingChannelType =
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "RESPONSIVE"
  | "SHOPPING";

export type AdCreativeType =
  | "UNSPECIFIED"
  | "STANDARD"
  | "EXPANDABLE"
  | "VIDEO"
  | "NATIVE";

export type AdHostingSource =
  | "UNSPECIFIED"
  | "CM"
  | "THIRD_PARTY"
  | "HOSTED"
  | "RICH_MEDIA";

export type AdInsertionOrderBudgetUnit =
  | "UNSPECIFIED"
  | "CURRENCY"
  | "IMPRESSIONS";

export type AdGroupBudgetAllocationType =
  | "UNSPECIFIED"
  | "AUTOMATIC"
  | "FIXED"
  | "UNLIMITED";

export type AdGroupOptimizationGoal =
  | "REACH"
  | "IMPRESSIONS"
  | "LINK_CLICKS"
  | "LANDING_PAGE_VIEWS"
  | "CONVERSIONS";

export type AdGroupBillingEvent =
  | "IMPRESSIONS"
  | "LINK_CLICKS"
  | "VIDEO_VIEWS"
  | "APP_INSTALLS"
  | "ENGAGEMENT";

export type AdAdType = "TEXT" | "IMAGE" | "VIDEO" | "RESPONSIVE" | "SHOPPING";

export type AdReportMetricType =
  | "CLICKS"
  | "IMPRESSIONS"
  | "CONVERSIONS"
  | "COST"
  | "CTR";

/** Embedded promoted entity (creative / group / ad arrays). */
export type AdPromotedEntityType =
  | "PAGE_ID"
  | "APP_ID"
  | "STORE_URL"
  | "PIXEL_ID"
  | "CUSTOM_CONVERSION_ID";

export interface AdPromotedRef {
  id: string;
  name?: string;
  type: AdPromotedEntityType;
  path_1?: string;
  path_2?: string;
}

export type AdTargetSearchType =
  | "interests"
  | "behaviors"
  | "locales"
  | "countries"
  | "regions";

// —— Organization (business / advertiser scope) ————————————————————

export interface AdOrganization {
  id: string;
  environment_id: string;
  source_platform: AdSourcePlatform;
  external_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  currency: string;
  time_zone: string;
  parent_id?: string;
  raw?: Record<string, unknown>;
}

// —— Account (ad platform account, distinct from org in some vendors) ——

export interface AdAccount {
  id: string;
  environment_id: string;
  organization_id?: string;
  source_platform: AdSourcePlatform;
  external_id: string;
  name: string;
  status: AdLifecycleStatus;
  currency: string;
  time_zone?: string;
  raw?: Record<string, unknown>;
}

// —— Insertion order ——————————————————————————————————————————————

export interface AdInsertionOrder {
  id: string;
  environment_id: string;
  organization_id?: string;
  account_id: string;
  campaign_id?: string;
  source_platform: AdSourcePlatform;
  external_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  status: AdLifecycleStatus;
  pacing?: Record<string, unknown>;
  frequency_cap?: Record<string, unknown>;
  kpi?: Record<string, unknown>;
  budget_unit?: AdInsertionOrderBudgetUnit;
  budget_segments?: unknown[];
  bid_strategy?: Record<string, unknown>;
  /** Client reference id for the IO. */
  reference?: string;
  start_at?: string;
  end_at?: string;
  budget_amount_minor?: number;
  budget_currency?: string;
  raw?: Record<string, unknown>;
}

// —— Campaign —————————————————————————————————————————————————————

export interface AdCampaign {
  id: string;
  environment_id: string;
  organization_id?: string;
  account_id: string;
  source_platform: AdSourcePlatform;
  external_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  status: AdLifecycleStatus;
  insertion_order_id?: string;
  parent_campaign_id?: string;
  start_at?: string;
  end_at?: string;
  budget_amount?: number;
  budget_period?: AdBudgetPeriod;
  total_spend_amount?: number;
  targeting?: Record<string, unknown>;
  goal?: AdCampaignGoal;
  planned_spend_amount?: number;
  frequency_cap?: Record<string, unknown>;
  advertising_channel_type?: AdAdvertisingChannelType;
  /** Google shared budget resource name. */
  campaign_budget_identifier?: string;
  currency?: string;
  /** Housing, employment, credit, NONE (Meta). */
  category?: string;
  has_eu_political_ads?: boolean;
  /** @deprecated prefer goal */
  objective?: string;
  daily_budget_minor?: number;
  lifetime_budget_minor?: number;
  raw?: Record<string, unknown>;
}

// —— Ad group (AdsGroup) ————————————————————————————————————————————

export interface AdGroup {
  id: string;
  environment_id: string;
  organization_id?: string;
  campaign_id: string;
  insertion_order_id?: string;
  source_platform: AdSourcePlatform;
  external_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  parent_id?: string;
  status: AdLifecycleStatus;
  targeting?: Record<string, unknown>;
  bid_amount?: number;
  bid_strategy?: Record<string, unknown>;
  budget_amount?: number;
  budget_period?: AdBudgetPeriod;
  budget_allocation_type?: AdGroupBudgetAllocationType;
  start_at?: string;
  end_at?: string;
  budget_unit?: AdInsertionOrderBudgetUnit;
  budget_max_amount?: number;
  type?: AdAdvertisingChannelType;
  has_eu_political_ads?: boolean;
  pacing?: Record<string, unknown>;
  frequency_cap?: Record<string, unknown>;
  creative_ids?: string[];
  optimization_goal?: AdGroupOptimizationGoal;
  billing_event?: AdGroupBillingEvent;
  currency?: string;
  promoted?: AdPromotedRef[];
  /** @deprecated prefer bidStrategy string mapping */
  bid_strategy_label?: string;
  raw?: Record<string, unknown>;
}

// —— Creative ———————————————————————————————————————————————————————

export interface AdCreative {
  id: string;
  environment_id: string;
  organization_id?: string;
  account_id?: string;
  campaign_id?: string;
  group_id?: string;
  item_id?: string;
  source_platform: AdSourcePlatform;
  external_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  status: AdLifecycleStatus;
  creative_type?: AdCreativeType;
  hosting_source?: AdHostingSource;
  width?: number;
  height?: number;
  asset_urls?: string[];
  link_url?: string;
  body?: string;
  title?: string;
  cta?: string;
  third_party_tag?: string;
  vast_tag_url?: string;
  external_creative_reference?: string;
  external_placement_reference?: string;
  external_ad_reference?: string;
  promoted?: AdPromotedRef[];
  format?: string;
  thumbnail_url?: string;
  headline?: string;
  call_to_action?: string;
  raw?: Record<string, unknown>;
}

// —— Ad —————————————————————————————————————————————————————————————

export interface AdAd {
  id: string;
  environment_id: string;
  organization_id?: string;
  campaign_id?: string;
  ad_group_id: string;
  source_platform: AdSourcePlatform;
  external_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  status: AdLifecycleStatus;
  ad_type?: AdAdType;
  creative_ids?: string[];
  creative_asset_url?: string;
  ad_copy?: string;
  headline?: string;
  description?: string;
  cta?: string;
  final_url?: string;
  display_url?: string;
  path_1?: string;
  path_2?: string;
  promoted?: AdPromotedRef[];
  creative_id?: string;
  raw?: Record<string, unknown>;
}

// —— Persisted promoted row (list / graph) ———————————————————————————

export interface AdPromoted {
  id: string;
  environment_id: string;
  organization_id?: string;
  source_platform: AdSourcePlatform;
  external_id: string;
  created_at?: string;
  updated_at?: string;
  name?: string;
  /** Same enum as {@link AdPromotedEntityType}. */
  promoted_type: AdPromotedEntityType | string;
  parent_ad_id?: string;
  parent_campaign_id?: string;
  raw?: Record<string, unknown>;
}

// —— Targeting search / normalized target row ————————————————————————

export interface AdTarget {
  id: string;
  environment_id: string;
  organization_id?: string;
  ad_group_id?: string;
  campaign_id?: string;
  source_platform: AdSourcePlatform;
  external_id: string;
  created_at?: string;
  updated_at?: string;
  name?: string;
  /** List/search row value (e.g. interest id). */
  value?: string;
  /** interests | behaviors | locales | … */
  target_type?: AdTargetSearchType | string;
  /** Full normalized targeting blob (ad group / campaign). */
  spec?: Record<string, unknown>;
  label?: string;
  raw?: Record<string, unknown>;
}

export interface AdKeyword {
  id: string;
  environment_id: string;
  ad_group_id: string;
  source_platform: AdSourcePlatform;
  external_id: string;
  text: string;
  match_type?: string;
  status: AdLifecycleStatus;
  raw?: Record<string, unknown>;
}

// —— Report (time-bounded metrics slice) ——————————————————————————————

export interface AdReportMetric {
  value: number;
  type: AdReportMetricType | string;
}

export interface AdReport {
  id: string;
  environment_id: string;
  organization_id?: string;
  source_platform: AdSourcePlatform;
  external_id: string;
  created_at: string;
  updated_at: string;
  currency?: string;
  metrics: AdReportMetric[];
  campaign?: { id: string; name?: string; [k: string]: unknown };
  group?: { id: string; name?: string; [k: string]: unknown };
  ad?: { id: string; name?: string; [k: string]: unknown };
  start_at?: string;
  end_at?: string;
  raw?: Record<string, unknown>;
}

// —— Daily metric rollup —————————————————————————————————————————————

export interface AdMetricDaily {
  id: string;
  environment_id: string;
  entity_type:
    | "account"
    | "insertion_order"
    | "campaign"
    | "ad_group"
    | "ad"
    | "creative"
    | "organization";
  entity_id: string;
  date: string;
  impressions?: number;
  clicks?: number;
  spend_minor?: number;
  conversions?: number;
  revenue_minor?: number;
  raw?: Record<string, unknown>;
}

/** Full snapshot for an environment (insights + playground samples). */
export interface AdUnifiedSnapshot {
  organizations: AdOrganization[];
  accounts: AdAccount[];
  insertion_orders: AdInsertionOrder[];
  campaigns: AdCampaign[];
  ad_groups: AdGroup[];
  creatives: AdCreative[];
  ads: AdAd[];
  promoted: AdPromoted[];
  targets: AdTarget[];
  keywords: AdKeyword[];
  reports: AdReport[];
  metric_days: AdMetricDaily[];
}

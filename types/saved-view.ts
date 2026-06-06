/** API shapes for `GET|POST|PATCH /views` (Mongo-backed saved views). */

export type SavedViewLayoutItem = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type SavedViewLayout = {
  version: number;
  breakpoints: Record<string, Record<string, SavedViewLayoutItem>>;
};

export type SavedViewListItem = {
  id: string;
  workspace_id: string;
  brandprofile_id: string;
  user_id: string;
  name: string;
  description: string;
  datasource_ids: string[];
  widget_ids: string[];
  layout: SavedViewLayout;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SavedDatasource = {
  id: string;
  view_id: string;
  workspace_id: string;
  brandprofile_id: string;
  user_id: string;
  integration_slug: string;
  connection_id: string;
  scope_type: "organization" | "account" | "social_account";
  scope_id: string;
  scope_name: string;
  resource_type: string;
  created_at?: string;
  updated_at?: string;
};

export type SavedWidget = {
  id: string;
  view_id: string;
  workspace_id: string;
  brandprofile_id: string;
  user_id: string;
  datasource_id: string;
  title: string;
  description: string;
  source: string;
  widget_type: "time_series" | "comparison" | "scorecard" | "table";
  widget_subtype: string;
  dataset_key: string;
  metrics: unknown;
  dimensions: unknown;
  filters: unknown;
  size: "xs" | "sm" | "md" | "lg" | "full";
  created_at?: string;
  updated_at?: string;
};

export type SavedViewDetail = SavedViewListItem & {
  datasources?: SavedDatasource[];
  widgets?: SavedWidget[];
};

export type SourceOptionsResponse = {
  integration_slug: string;
  category: string;
  resource_type: string;
  scope_type: "organization" | "account" | "social_account";
  options: { scope_id: string; scope_name: string }[];
  connection_id: string;
};

export type DashboardTemplateSuggestion = {
  id: string;
  title: string;
  description: string;
  connection_slugs: string[];
  source_chips?: string[];
  metric_count?: number;
  metric_keys?: string[];
  recipe_ids?: string[];
  categories: ("ads" | "analytics" | "crm" | "accounting" | "social")[];
  confidence: number;
};

export type SavedWidgetPayload =
  | {
      widget_id: string;
      kind: "scorecard";
      value: number;
      metric: string;
      unit?: string;
      label: string;
    }
  | {
      widget_id: string;
      kind: "time_series";
      labels: string[];
      series: { label: string; metric: string; values: number[] }[];
    }
  | {
      widget_id: string;
      kind: "comparison";
      items: { metric: string; value: number; label: string }[];
    }
  | {
      widget_id: string;
      kind: "table";
      columns: { key: string; label: string }[];
      rows: Record<string, string | number>[];
    }
  | {
      widget_id: string;
      kind: "empty";
      message: string;
    };

export type DashboardIntelligenceResponse = {
  profile: unknown;
  templates: DashboardTemplateSuggestion[];
  matched_recipes: { id: string; title: string; description: string }[];
};

export type DashboardViewListItem = SavedViewListItem & {
  widget_count: number;
  datasource_count: number;
};

export type DashboardHomeResponse = {
  views: DashboardViewListItem[];
  profile?: unknown;
  templates: DashboardTemplateSuggestion[];
  matched_recipes: string[];
  connected_slugs: string[];
  has_connections: boolean;
  ai_enabled: boolean;
};

export type DashboardTemplatesResponse = Omit<DashboardHomeResponse, "views">;

export type BuilderMetricMeta = {
  key: string;
  label: string;
  type: string;
  unit: string;
};

export type BuilderVisualization = {
  id: string;
  label: string;
  widget_type: SavedWidget["widget_type"];
  widget_subtype: SavedWidget["widget_subtype"];
  min_metrics: number;
  max_metrics: number;
  requires_time_granularity?: boolean;
};

export type BuilderConnection = {
  id: string;
  connection_slug: string;
  name: string;
  category: string;
  supports_metric_report: boolean;
  metric_keys: string[];
  supported_scopes: SourceOptionsResponse["scope_type"][];
};

export type BuilderOptionsResponse = {
  connections: BuilderConnection[];
  metrics: Record<string, BuilderMetricMeta>;
  visualizations: BuilderVisualization[];
  connector_metrics: Record<string, BuilderMetricMeta[]>;
  date_range_presets: { id: string; label: string; days: number }[];
};

export type DatasourceDraft = {
  connection_slug: string;
  connection_id: string;
  scope_type: SourceOptionsResponse["scope_type"];
  scope_id: string;
  scope_name: string;
  resource_type: string;
};

export type WidgetDraft = {
  client_id: string;
  datasource_key: string;
  datasource_index: number;
  title: string;
  description: string;
  source: string;
  widget_type: SavedWidget["widget_type"];
  widget_subtype: SavedWidget["widget_subtype"];
  dataset_key: SavedWidget["dataset_key"];
  metrics: Record<string, unknown>;
  dimensions: Record<string, unknown>;
  filters: Record<string, unknown>;
  size: SavedWidget["size"];
};

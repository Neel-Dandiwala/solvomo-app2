import type {
  DemoUserKey,
  OverviewWidgetDimension,
  OverviewWidgetMetric,
  OverviewWidgetSource,
  OverviewWidgetVisualization,
} from "~/types/mock";

/**
 * Shown on auth pages — does not reveal credentials.
 */
export const DEMO_PASSWORD_HINT = "This preview is limited to approved demo sign-ins.";

export function resolveUserIdFromEmail(email: string): DemoUserKey | null {
  const e = email.trim().toLowerCase();
  if (e === "neel@solvomo.co") return "neel";
  if (e === "riya@solvomo.co") return "riya";
  return null;
}

/**
 * Demo-only access: email + password (trimmed, compared lowercase) must match.
 * Neel: neel@solvomo.co / neel · Riya: riya@solvomo.co / riya
 */
export const DEMO_CREDENTIALS: Record<DemoUserKey, { email: string; password: string }> = {
  neel: { email: "neel@solvomo.co", password: "neel" },
  riya: { email: "riya@solvomo.co", password: "riya" },
};

/** Returns demo persona key when email/password match offline demo accounts; otherwise null. */
export function validateDemoCredentials(email: string, password: string): DemoUserKey | null {
  const e = email.trim().toLowerCase();
  const p = password.trim().toLowerCase();
  const id = resolveUserIdFromEmail(e);
  if (!id) return null;
  const expected = DEMO_CREDENTIALS[id].password.toLowerCase();
  return p === expected ? id : null;
}

export const OVERVIEW_WIDGET_SOURCE_OPTIONS: Array<{
  id: OverviewWidgetSource;
  label: string;
  description: string;
  metrics: OverviewWidgetMetric[];
  dimensions: OverviewWidgetDimension[];
  visualizations: OverviewWidgetVisualization[];
}> = [
  {
    id: "ad_data",
    label: "Ad data",
    description: "Connected ad-platform performance, revenue, and efficiency metrics.",
    metrics: ["spend", "revenue", "roi", "impressions", "clicks", "ctr", "conversions"],
    dimensions: ["date", "platform", "campaign_cluster"],
    visualizations: ["bar", "line", "area", "stacked_bar", "table", "kpi", "horizontal_bar", "funnel"],
  },
  {
    id: "crm_data",
    label: "CRM / outcomes",
    description: "Lead, deal, pipeline, and closed revenue data from CRM integrations.",
    metrics: ["qualified_leads", "deals", "pipeline_revenue", "closed_revenue", "revenue"],
    dimensions: ["date", "lead_source", "platform"],
    visualizations: ["bar", "line", "area", "donut", "table", "kpi"],
  },
  {
    id: "spend_data",
    label: "Spend data",
    description: "Custom spend uploads and tracked external spend beyond ad platforms.",
    metrics: ["amount", "spend"],
    dimensions: ["date", "channel", "vendor"],
    visualizations: ["bar", "line", "stacked_bar", "table", "kpi", "donut"],
  },
  {
    id: "summary",
    label: "Summary",
    description: "Cross-source trends, signals, and efficiency rollups.",
    metrics: ["revenue", "spend", "roi", "cac", "conversions", "closed_revenue"],
    dimensions: ["date"],
    visualizations: ["area", "line", "signal_list", "metric_delta", "table", "kpi"],
  },
  {
    id: "alerts",
    label: "Alerts",
    description: "Operational and performance alerts from connected sources.",
    metrics: ["revenue"],
    dimensions: ["date"],
    visualizations: ["alerts"],
  },
  {
    id: "connections",
    label: "Connections",
    description: "Integration health and sync posture.",
    metrics: ["revenue"],
    dimensions: ["date"],
    visualizations: ["connections"],
  },
];

export const OVERVIEW_VISUALIZATION_LABELS: Record<OverviewWidgetVisualization, string> = {
  kpi: "KPI stat card",
  bar: "Bar chart",
  line: "Line chart",
  area: "Area chart",
  donut: "Donut chart",
  table: "Table",
  stacked_bar: "Stacked bar",
  insights: "Insight strip",
  connections: "Integration health",
  alerts: "Alerts preview",
  horizontal_bar: "Horizontal bar",
  funnel: "Funnel",
  signal_list: "Priority signals",
  metric_delta: "Performance deltas",
};

import type { AlertItem } from "~/types/app-shell";

/** Demo alerts when bundle / workspace has not yet emitted operational signals. */
export const demoAlertsFallback: AlertItem[] = [
  {
    id: "demo-al-1",
    title: "Connector Drift on Shopify Revenue",
    summary: "Sync lag crossed the soft threshold. Weekend order volume may skew attribution until the next full reconcile.",
    severity: "medium",
    status: "open",
    source: "Shopify · Revenue",
    created_at: "2026-04-09 · 08:12",
  },
  {
    id: "demo-al-2",
    title: "Spend Pacing vs Weekly Guardrail",
    summary: "Meta prospecting is above the soft cap for this brand. Consider shifting budget to retargeting or tightening dayparting.",
    severity: "high",
    status: "investigating",
    source: "Meta Ads · Prospecting",
    created_at: "2026-04-08 · 16:40",
  },
  {
    id: "demo-al-3",
    title: "CRM Match Rate Stable",
    summary: "Lead → opportunity stitching held at target with no schema conflicts in the last sync window.",
    severity: "low",
    status: "resolved",
    source: "Salesforce · CRM",
    created_at: "2026-04-07 · 09:05",
  },
  {
    id: "demo-al-4",
    title: "Offline Conversion Import Delay",
    summary: "Google offline conversions are ~6h behind. CRM stages may look stale until the batch clears.",
    severity: "critical",
    status: "open",
    source: "Google Ads · Conversions",
    created_at: "2026-04-06 · 22:18",
  },
  {
    id: "demo-al-5",
    title: "Audience Overlap Notice",
    summary: "Remarketing lists show elevated overlap with prospecting. Fatigue risk is elevated on two ad sets.",
    severity: "medium",
    status: "muted",
    source: "Meta Ads · Audiences",
    created_at: "2026-04-05 · 11:02",
  },
];

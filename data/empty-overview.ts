import type { OverviewData, OverviewHero } from "~/types/mock";

/** Overview charts/widgets only appear when sample or connector-backed metrics are loaded. */
export function createEmptyOverviewData(): OverviewData {
  return {
    kpis: [],
    insights: [],
    executiveBullets: [],
    trendPoints: [],
    platformSummaries: [],
    leadSourceSummaries: [],
    spendRecords: [],
    campaignClusters: [],
    funnel: [],
    connectionsSummary: { connected: 0, syncing: 0, attention: 0 },
    creativeLeaderboard: [],
    performanceChanges: [],
    prioritySignals: [],
    attributionMix: [],
    campaignEfficiency: [],
    creatorSummaries: [],
    revenueAttributionSplit: { direct: 0, assisted: 0 },
    newVsReturning: { newRevenue: 0, returningRevenue: 0 },
    leadSourceQuality: [],
    budgetRecommendations: [],
    widgets: [],
    dashboards: [],
  };
}

export function createProductionOverviewHero(): OverviewHero {
  return {
    periodSpend: "—",
    attributedRevenue: "—",
    roi: "—",
    cac: "—",
    workingBullets: [
      "Connect an integration to pull live metrics for this brand.",
      "Overview charts stay empty until data syncs from your connectors.",
      "Use the Playground brand to explore sample analytics.",
    ],
    fixBullets: [
      "Add a connection in Connections.",
      "Ensure the integration is active for this workspace.",
      "Pick the Playground brand to explore sample charts.",
    ],
  };
}

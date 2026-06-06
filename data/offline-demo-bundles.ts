import type { SolvomoMockBundle } from "~/types/mock";
import { createEmptyOverviewData, createProductionOverviewHero } from "~/data/empty-overview";

/**
 * Offline-only preview payloads when live services are unavailable.
 * Rich playground data is served from the API (`api/src/data/playground.ts`).
 */
export const OFFLINE_DEMO_BUNDLES: Record<string, SolvomoMockBundle> = {
  neel: offlineSparseBundle("neel", "Neel Dandiwala", "neel@solvomo.co", "Head of Growth"),
  riya: offlineSparseBundle("riya", "Riya Aggarwal", "riya@solvomo.co", "Growth Lead"),
};

type OfflineSparseKind = "offline" | "api";

function offlineSparseBundle(
  id: string,
  name: string,
  email: string,
  title: string,
  kind: OfflineSparseKind = "offline",
): SolvomoMockBundle {
  const apiShell = kind === "api";
  return {
    profile: { id, name, email, title },
    workspaces: [{ id: `ws-${id}`, name: "Offline workspace" }],
    brandProfiles: [
      {
        id: `bp-${id}-1`,
        name: "Default brand",
        workspaceId: `ws-${id}`,
        currency: "USD",
        attributionPreference: "Multi-touch",
      },
      {
        id: `bp-${id}-pg`,
        name: "Playground",
        workspaceId: `ws-${id}`,
        currency: "USD",
        attributionPreference: "Multi-touch",
        isPlaygroundSystem: true,
      },
    ],
    onboardingDefaults: [],
    overviewHero: apiShell
      ? createProductionOverviewHero()
      : {
          periodSpend: "—",
          attributedRevenue: "—",
          roi: "—",
          cac: "—",
          workingBullets: [
            "Live playground analytics are unavailable right now.",
            "Use Production for an empty state until sources connect.",
            "Sign in and select the Playground brand profile to explore sample analytics.",
          ],
          fixBullets: ["Try signing in again.", "Confirm your workspace is active.", "Select the Playground brand profile."],
        },
    overview: apiShell
      ? createEmptyOverviewData()
      : {
          executiveBullets: ["Sample analytics are temporarily unavailable."],
          kpis: [],
          insights: [],
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
        },
    connectionsShell: [],
    connectionsOnboarding: [],
    alerts: [],
    labVersions: [],
    performance: { campaigns: [], ad_groups: [], ads: [] },
    creatives: [],
    audience: [],
    spend: [],
    crm: [],
  };
}

export function getOfflineMockBundle(userId: string): SolvomoMockBundle | null {
  return OFFLINE_DEMO_BUNDLES[userId] || null;
}

/**
 * Empty-shell analytics for API “Production” brands — no copied demo metrics.
 * Performance and `adUnified` stay empty until tab/integration APIs are wired up.
 */
export function createSparseProductionBundle(session: {
  userId: string;
  email: string;
  name?: string;
}): SolvomoMockBundle {
  const displayName = session.name?.trim() || session.email.split("@")[0] || "User";
  return offlineSparseBundle(session.userId, displayName, session.email, "", "api");
}

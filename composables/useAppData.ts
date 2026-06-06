import { createProductionPlaceholder } from "~/data/production-placeholder";
import type { PlaygroundPayload, SolvomoMockBundle } from "~/types/mock";

function mergePlaygroundPayload(payload: PlaygroundPayload, session: AuthSession): SolvomoMockBundle {
  return {
    ...payload,
    workspaces: [],
    brandProfiles: [],
    profile: {
      ...payload.profile,
      id: session.userId,
      email: session.email,
      name: session.name?.trim() || payload.profile.name,
    },
  };
}

/**
 * App tables and panels — offline: `offline-demo-bundles`; API Playground: `/auth/playground/bundle`;
 * API Production: sparse shell from `createProductionPlaceholder` until tab APIs serve live data.
 */
export function useAppData() {
  const auth = useAuth();
  const workspace = useWorkspaceContext();
  const api = useApiClient();

  const playgroundPayload = ref<PlaygroundPayload | null>(null);
  const {
    userConnections,
    refreshUserConnections,
    hasActiveConnections,
  } = useConnectionsData();

  watchEffect(async () => {
    const s = auth.session.value;
    if (
      !s ||
      !api.hasBase.value ||
      !workspace.isPlayground.value ||
      !workspace.currentBrandProfile.value?.isPlaygroundSystem
    ) {
      playgroundPayload.value = null;
      return;
    }
    try {
      playgroundPayload.value = await api.getJson<PlaygroundPayload>("/auth/playground/bundle");
    } catch {
      playgroundPayload.value = null;
    }
  });

  const bundle = computed<SolvomoMockBundle | null>(() => {
    const s = auth.session.value;
    if (!s) return null;

    if (api.hasBase.value) {
      if (
        workspace.isPlayground.value &&
        workspace.currentBrandProfile.value?.isPlaygroundSystem &&
        playgroundPayload.value
      ) {
        return mergePlaygroundPayload(playgroundPayload.value, s);
      }
      return createProductionPlaceholder(s);
    }
    return null;
  });

  const currentProfile = computed(() => bundle.value?.profile || null);
  const hasBundle = computed(() => bundle.value !== null);
  const hasWorkspaceScope = computed(
    () => !!workspace.currentWorkspace.value && !!workspace.currentBrandProfile.value,
  );

  // Sync playground connectionsShell → userConnections global state so that
  // hasActiveConnections and any other consumer of userConnections is accurate.
  watchEffect(() => {
    if (workspace.isPlayground.value && bundle.value?.connectionsShell) {
      userConnections.value = bundle.value.connectionsShell.map((conn) => ({
        id: conn.id,
        connection_slug: conn.id,
        is_active: conn.status === "connected",
      }));
    }
  });

  /** Full playground overview / widgets only in this mode (API Playground bundle). */
  const isPlaygroundOverviewDemo = computed(
    () =>
      Boolean(
        workspace.isPlayground.value &&
          workspace.currentBrandProfile.value?.isPlaygroundSystem &&
          playgroundPayload.value,
      ),
  );
  const dataStatus = computed<"ready" | "missing_session" | "missing_scope">(() => {
    if (!hasBundle.value) return "missing_session";
    if (!hasWorkspaceScope.value) return "missing_scope";
    return "ready";
  });

  const overviewHero = computed(() => bundle.value?.overviewHero || null);
  const overview = computed(() => bundle.value?.overview || null);

  const alerts = computed(() => bundle.value?.alerts || []);
  const labVersions = computed(() => bundle.value?.labVersions || []);
  const connectionsShell = computed(() => bundle.value?.connectionsShell || []);
  const connectionsOnboarding = computed(() => bundle.value?.connectionsOnboarding || []);
  const creatives = computed(() => bundle.value?.creatives || []);
  const audience = computed(() => bundle.value?.audience || []);
  const spend = computed(() => bundle.value?.spend || []);
  const crm = computed(() => bundle.value?.crm || []);

  const performanceCampaigns = computed(() => bundle.value?.performance.campaigns || []);
  const performanceAdGroups = computed(() => bundle.value?.performance.ad_groups || []);
  const performanceAds = computed(() => bundle.value?.performance.ads || []);
  const adUnified = computed(() => bundle.value?.adUnified || null);

  function performanceRows(view: "campaigns" | "ad_groups" | "ads") {
    switch (view) {
      case "ad_groups":
        return performanceAdGroups.value;
      case "ads":
        return performanceAds.value;
      default:
        return performanceCampaigns.value;
    }
  }

  return {
    bundle,
    currentProfile,
    hasBundle,
    hasWorkspaceScope,
    dataStatus,
    userConnections,
    refreshUserConnections,
    hasActiveConnections,
    isPlaygroundOverviewDemo,
    overviewHero,
    overview,
    alerts,
    labVersions,
    connectionsShell,
    connectionsOnboarding,
    creatives,
    audience,
    spend,
    crm,
    performanceCampaigns,
    performanceAdGroups,
    performanceAds,
    performanceRows,
    adUnified,
  };
}

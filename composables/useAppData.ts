import { createProductionPlaceholder } from "~/data/production-placeholder";
import type {
  MockConnection,
  PlaygroundAssetsData,
  PlaygroundOverviewStats,
  PlaygroundPayload,
  PlaygroundSimulationData,
  PlaygroundSpendData,
  SolvomoMockBundle,
} from "~/types/mock";

type PlaygroundPayloadWire = Partial<PlaygroundPayload> & {
  onboarding_defaults?: PlaygroundPayload["onboardingDefaults"];
  overview_hero?: PlaygroundPayload["overviewHero"];
  connections_shell?: PlaygroundPayload["connectionsShell"];
  connections_onboarding?: PlaygroundPayload["connectionsOnboarding"];
  lab_versions?: PlaygroundPayload["labVersions"];
  ad_unified?: PlaygroundPayload["adUnified"];
};

function normalizePlaygroundPayload(raw: unknown): PlaygroundPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const payload = raw as PlaygroundPayloadWire;
  if (!payload.profile || !payload.overview || !payload.performance) return null;
  return {
    ...(payload as PlaygroundPayload),
    onboardingDefaults:
      payload.onboarding_defaults ?? payload.onboardingDefaults ?? [],
    overviewHero: payload.overview_hero ?? payload.overviewHero!,
    connectionsShell: payload.connections_shell ?? payload.connectionsShell ?? [],
    connectionsOnboarding:
      payload.connections_onboarding ?? payload.connectionsOnboarding ?? [],
    labVersions: payload.lab_versions ?? payload.labVersions ?? [],
    adUnified: payload.ad_unified ?? payload.adUnified,
  };
}

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

  // useState shares the same ref across every component/composable that calls
  // useAppData() — no duplicate fetches, instant reactivity for all callers.
  const playgroundPayload = useState<PlaygroundPayload | null>("sv-pg-payload", () => null);
  const pgFetching = useState<boolean>("sv-pg-fetching", () => false);

  const {
    userConnections,
    refreshUserConnections,
    hasActiveConnections,
  } = useConnectionsData();

  watchEffect(async () => {
    const s = auth.session.value;
    const shouldLoad =
      !!s &&
      api.hasBase.value &&
      workspace.isPlayground.value &&
      !!workspace.currentBrandProfile.value?.isPlaygroundSystem;

    if (!shouldLoad) {
      pgFetching.value = false;
      playgroundPayload.value = null;
      return;
    }
    if (playgroundPayload.value !== null || pgFetching.value) return;
    pgFetching.value = true;
    try {
      const res = await api.getJson<{ payload: PlaygroundPayloadWire }>("/auth/playground/bundle");
      playgroundPayload.value = normalizePlaygroundPayload(res.payload);
    } catch {
      playgroundPayload.value = null;
    } finally {
      pgFetching.value = false;
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

  const hasBundle = computed(() => bundle.value !== null);
  const hasWorkspaceScope = computed(
    () => !!workspace.currentWorkspace.value && !!workspace.currentBrandProfile.value,
  );

  const dataStatus = computed<"ready" | "missing_session" | "missing_scope">(() => {
    if (!hasBundle.value) return "missing_session";
    if (!hasWorkspaceScope.value) return "missing_scope";
    return "ready";
  });

  const overviewHero = computed(() => bundle.value?.overviewHero || null);
  const overview = computed(() => bundle.value?.overview || null);
  const spend = computed(() => bundle.value?.spend || []);

  const isPlayground = computed(() => workspace.isPlayground.value);
  const spendData = computed((): PlaygroundSpendData | null =>
    bundle.value?.spend_data ?? null,
  );
  const assetsData = computed((): PlaygroundAssetsData | null =>
    bundle.value?.assets_data ?? null,
  );
  const simulationData = computed((): PlaygroundSimulationData | null =>
    bundle.value?.simulation_data ?? null,
  );
  const connectionsShell = computed((): MockConnection[] =>
    bundle.value?.connectionsShell ?? [],
  );

  const overviewStats = computed((): PlaygroundOverviewStats | null =>
    bundle.value?.overview_stats ?? null,
  );

  return {
    bundle,
    dataStatus,
    userConnections,
    refreshUserConnections,
    hasActiveConnections,
    overviewHero,
    overview,
    spend,
    isPlayground,
    spendData,
    assetsData,
    simulationData,
    connectionsShell,
    overviewStats,
  };
}

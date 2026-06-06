import { createProductionPlaceholder } from "~/data/production-placeholder";
import type {
  MockConnection,
  PlaygroundAssetsData,
  PlaygroundPayload,
  PlaygroundSimulationData,
  PlaygroundSpendData,
  SolvomoMockBundle,
} from "~/types/mock";

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
      const res = await api.getJson<{ payload: PlaygroundPayload }>("/auth/playground/bundle");
      playgroundPayload.value = res.payload ?? null;
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
  };
}

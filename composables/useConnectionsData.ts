import { publicConnectionsManifestPath } from "~/composables/useConnectionsManifest";
import type { ConnectionRow } from "~/types/connections-data";
import type { ConnectionsManifest } from "~/types/connections-manifest";
import { integrationForSlug } from "~/types/connections-manifest";

let manifestRequest: Promise<ConnectionsManifest | null> | null = null;
let userConnectionsRequest: Promise<ConnectionRow[]> | null = null;
let autoRefreshInitialized = false;

export function useConnectionsData() {
  const auth = useAuth();
  const api = useApiClient();
  const config = useRuntimeConfig();
  const workspace = useWorkspaceContext();

  const manifest = useState<ConnectionsManifest | null>("sv-connections-manifest", () => null);
  const manifestLoaded = useState<boolean>("sv-connections-manifest-loaded", () => false);
  const manifestLoading = useState<boolean>("sv-connections-manifest-loading", () => false);
  const manifestError = useState<string | null>("sv-connections-manifest-error", () => null);

  const userConnections = useState<ConnectionRow[]>("sv-user-connections", () => []);
  const userConnectionsLoaded = useState<boolean>("sv-user-connections-loaded", () => false);
  const userConnectionsLoading = useState<boolean>("sv-user-connections-loading", () => false);
  const userConnectionsError = useState<string | null>("sv-user-connections-error", () => null);

  function resetConnectionsState() {
    manifest.value = null;
    manifestLoaded.value = false;
    manifestLoading.value = false;
    manifestError.value = null;

    userConnections.value = [];
    userConnectionsLoaded.value = false;
    userConnectionsLoading.value = false;
    userConnectionsError.value = null;
  }

  async function refreshManifest(options?: { force?: boolean }) {
    const force = options?.force === true;
    if (!auth.isAuthenticated.value || !api.hasBase.value) {
      manifest.value = null;
      manifestLoaded.value = false;
      manifestError.value = null;
      return null;
    }
    if (!force && manifestRequest) return manifestRequest;

    manifestLoading.value = true;
    manifestRequest = (async () => {
      try {
        const data = await api.getJson<ConnectionsManifest>("/auth/connections/manifest");
        manifest.value = data;
        manifestError.value = null;
        return data;
      } catch {
        try {
          const data = await $fetch<ConnectionsManifest>(
            publicConnectionsManifestPath(config.app.baseURL),
          );
          manifest.value = data;
          manifestError.value = null;
          return data;
        } catch {
          manifest.value = null;
          manifestError.value =
            "Could not load available integrations right now.";
          return null;
        }
      } finally {
        manifestLoaded.value = true;
        manifestLoading.value = false;
        manifestRequest = null;
      }
    })();

    return manifestRequest;
  }

  async function refreshUserConnections(options?: { force?: boolean }) {
    // Playground bypass: user connections will be populated by the useAppData bundle watcher.
    // Skip API call to avoid returning empty connections for the demo account.
    if (workspace.isPlayground.value) {
      userConnectionsLoaded.value = true;
      userConnectionsLoading.value = false;
      return userConnections.value;
    }

    const force = options?.force === true;
    if (!auth.isAuthenticated.value || !api.hasBase.value) {
      userConnections.value = [];
      userConnectionsLoaded.value = false;
      userConnectionsError.value = null;
      return [];
    }
    if (!force && userConnectionsRequest) return userConnectionsRequest;

    userConnectionsLoading.value = true;
    userConnectionsRequest = (async () => {
      try {
        const res = await api.getJson<{ connections: ConnectionRow[] }>("/auth/connections");
        userConnections.value = res.connections || [];
        userConnectionsError.value = null;
        return userConnections.value;
      } catch {
        userConnections.value = [];
        userConnectionsError.value = "Could not load user connections.";
        return [];
      } finally {
        userConnectionsLoaded.value = true;
        userConnectionsLoading.value = false;
        userConnectionsRequest = null;
      }
    })();

    return userConnectionsRequest;
  }

  async function refreshConnectionsData(options?: { force?: boolean }) {
    await Promise.all([
      refreshManifest(options),
      refreshUserConnections(options),
    ]);
  }

  if (!autoRefreshInitialized) {
    autoRefreshInitialized = true;
    watch(
      () => [auth.activeUserId.value || "", api.hasBase.value] as const,
      async ([userId, hasBase], previous) => {
        const [prevUserId, prevHasBase] = previous ?? ["", false];
        if (!userId || !hasBase) {
          resetConnectionsState();
          return;
        }
        await refreshConnectionsData({
          force: userId !== prevUserId || hasBase !== prevHasBase,
        });
      },
      { immediate: true },
    );
  }

  const hasActiveConnections = computed(() => {
    if (workspace.isPlayground.value) return true;
    return userConnections.value.some((c) => c.is_active);
  });

  function integrationBySlug(slug: string) {
    return integrationForSlug(manifest.value?.integrations, slug);
  }

  return {
    manifest,
    manifestLoaded,
    manifestLoading,
    manifestError,
    refreshManifest,
    userConnections,
    userConnectionsLoaded,
    userConnectionsLoading,
    userConnectionsError,
    refreshUserConnections,
    refreshConnectionsData,
    hasActiveConnections,
    integrationBySlug,
  };
}

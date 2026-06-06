import type { IntegrationManifestEntry } from "~/types/connections-manifest";
import { publicConnectionsManifestPath } from "~/composables/useConnectionsManifest";
import { directoryCategoryTags } from "~/utils/connectionCategories";
import { brandScopeQuery } from "~/utils/apiScope";

export interface ConnectionsDirectoryItem {
  slug: string;
  name: string;
  description: string;
  categories: string[];
  logo_file?: string;
  is_active: boolean;
  connection_id?: string;
  integration: IntegrationManifestEntry;
}

export interface ConnectionsDirectoryResponse {
  integrations: ConnectionsDirectoryItem[];
}

/**
 * Connections tab: registry integrations + per-brand active status.
 * In playground mode the directory is served from the bundle's `connectionsShell` without API calls.
 */
export function useConnectionsTab() {
  const api = useApiClient();
  const auth = useAuth();
  const config = useRuntimeConfig();
  const workspace = useWorkspaceContext();
  const playground = usePlayground();

  const directory = ref<ConnectionsDirectoryResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function scopeQuery() {
    const ws = workspace.currentWorkspaceId.value?.trim();
    const bp = workspace.currentBrandProfileId.value?.trim();
    if (!ws || !bp) return null;
    return brandScopeQuery(ws, bp);
  }

  async function loadPublicManifest(): Promise<ConnectionsDirectoryResponse | null> {
    try {
      const manifest = await $fetch<{ integrations: IntegrationManifestEntry[] }>(
        publicConnectionsManifestPath(config.app.baseURL),
      );
      return {
        integrations: (manifest.integrations ?? [])
          .filter((e) => !e.in_progress)
          .map((entry) => {
            const slug = (entry.type ?? entry.slug).trim();
            return {
              slug,
              name: entry.name,
              description: entry.description,
              categories: directoryCategoryTags(entry.categories ?? []),
              ...(entry.logo_file ? { logo_file: entry.logo_file } : {}),
              is_active: false,
              integration: entry,
            };
          }),
      };
    } catch {
      return null;
    }
  }

  async function refresh(options?: { force?: boolean }) {
    // Playground bypass: serve connectionsShell as a read-only directory.
    if (playground.isPlayground.value) {
      const shell = playground.connectionsShell.value;
      directory.value = {
        integrations: shell.map((conn) => ({
          slug: conn.id,
          name: conn.name,
          description: conn.description,
          categories: [],
          is_active: conn.status === "connected",
          connection_id: conn.status === "connected" ? conn.id : undefined,
          integration: {} as IntegrationManifestEntry,
        })),
      };
      loading.value = false;
      error.value = null;
      return;
    }

    if (!auth.isAuthenticated.value || !api.hasBase.value) {
      directory.value = await loadPublicManifest();
      error.value = directory.value ? null : "Could not load integrations.";
      loading.value = false;
      return;
    }

    const qs = scopeQuery();
    if (!qs) {
      directory.value = null;
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      directory.value = await api.getJson<ConnectionsDirectoryResponse>(
        `/connections/directory${qs}`,
      );
    } catch (e) {
      directory.value = null;
      error.value = e instanceof Error ? e.message : "Failed to load connections";
    } finally {
      loading.value = false;
    }
  }

  watch(
    () =>
      [
        auth.isAuthenticated.value,
        api.hasBase.value,
        workspace.currentWorkspaceId.value,
        workspace.currentBrandProfileId.value,
        playground.isPlayground.value,
      ] as const,
    () => {
      void refresh();
    },
    { immediate: true },
  );

  const integrations = computed(() => directory.value?.integrations ?? []);

  return {
    directory,
    integrations,
    loading,
    error,
    refresh,
  };
}

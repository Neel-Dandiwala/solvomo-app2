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
 * Playground brand profiles use one-click activation stored as real Connection rows.
 */
export function useConnectionsTab() {
  const api = useApiClient();
  const auth = useAuth();
  const config = useRuntimeConfig();
  const workspace = useWorkspaceContext();
  const { integrationBySlug, refreshManifest } = useConnectionsData();

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
      await refreshManifest();
      const data = await api.getJson<ConnectionsDirectoryResponse>(
        `/connections/directory${qs}`,
      );
      directory.value = {
        integrations: (data.integrations ?? []).map((item) => ({
          ...item,
          integration:
            integrationBySlug(item.slug) ?? ({} as IntegrationManifestEntry),
        })),
      };
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
        workspace.isPlayground.value,
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

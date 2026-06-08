import { getPlaygroundExampleAssets } from "~/data/playground-example-assets";
import { brandScopeQuery } from "~/utils/apiScope";

export type AssetKind =
  | "creative"
  | "audience"
  | "variants"
  | "datasources"
  | "budgets";

export type AssetEnvelope = {
  id: string;
  name: string;
  source_type: string;
  status: string;
  workspace_id?: string;
  brandprofile_id?: string;
  created_at?: string;
  updated_at?: string;
  asset_url?: string | null;
  format?: string;
  platform?: string;
  headline?: string | null;
  label?: string;
  parent_creative_id?: string;
  slot_key?: string;
  object_type?: string;
};

function assetPath(kind: AssetKind) {
  return `/assets/${kind}`;
}

export function useAssetsApi() {
  const api = useApiClient();
  const workspace = useWorkspaceContext();
  const playground = useAppData();

  function scopeQuery() {
    const ws = workspace.currentWorkspaceId.value?.trim();
    const bp = workspace.currentBrandProfileId.value?.trim();
    if (!ws || !bp) return "";
    return brandScopeQuery(ws, bp);
  }

  async function list<T extends AssetEnvelope>(kind: AssetKind): Promise<T[]> {
    if (playground.isPlayground.value) {
      const fromBundle = playground.assetsData.value?.[kind];
      if (fromBundle?.length) return fromBundle as unknown as T[];
      return getPlaygroundExampleAssets(kind) as unknown as T[];
    }
    return api.getJson<T[]>(`${assetPath(kind)}${scopeQuery()}`);
  }

  async function getOne<T>(kind: AssetKind, id: string): Promise<T> {
    return api.getJson<T>(`${assetPath(kind)}/${encodeURIComponent(id)}`);
  }

  async function create<T>(kind: AssetKind, body: Record<string, unknown>): Promise<T> {
    if (playground.isPlayground.value) {
      throw new Error("Assets cannot be created in the Playground brand profile.");
    }
    return api.postJson<T>(assetPath(kind), body);
  }

  async function duplicate<T>(
    kind: AssetKind,
    id: string,
    name: string,
  ): Promise<T> {
    if (playground.isPlayground.value) {
      throw new Error("Assets cannot be duplicated in the Playground brand profile.");
    }
    return api.postJson<T>(
      `${assetPath(kind)}/${encodeURIComponent(id)}/duplicate`,
      { name },
    );
  }

  async function archive(kind: AssetKind, id: string): Promise<void> {
    if (playground.isPlayground.value) {
      throw new Error("Assets cannot be archived in the Playground brand profile.");
    }
    await api.patchJson(`${assetPath(kind)}/${encodeURIComponent(id)}/archive`, {});
  }

  return { list, getOne, create, duplicate, archive, scopeQuery };
}

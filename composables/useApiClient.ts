import { logApiRequest } from "~/utils/logApiRequest";
import { readRouteResponse } from "~/utils/routeResponse";

/**
 * Authenticated fetch against `runtimeConfig.public.apiBase`.
 */
export function useApiClient() {
  const config = useRuntimeConfig();

  function base(): string {
    const b = (config.public.apiBase as string)?.trim() || "";
    return b.replace(/\/$/, "");
  }

  function normalizeApiPath(path: string): string {
    return path.startsWith("/") ? path : `/${path}`;
  }

  async function getJson<T>(path: string): Promise<T> {
    logApiRequest("GET", path);
    const url = `${base()}${normalizeApiPath(path)}`;
    const res = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    return readRouteResponse<T>(res);
  }

  async function postJson<T>(path: string, body: unknown): Promise<T> {
    logApiRequest("POST", path);
    const url = `${base()}${normalizeApiPath(path)}`;
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return readRouteResponse<T>(res);
  }

  async function patchJson<T>(path: string, body: unknown): Promise<T> {
    logApiRequest("PATCH", path);
    const url = `${base()}${normalizeApiPath(path)}`;
    const res = await fetch(url, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return readRouteResponse<T>(res);
  }

  async function deleteRequest(path: string): Promise<void> {
    logApiRequest("DELETE", path);
    const url = `${base()}${normalizeApiPath(path)}`;
    const res = await fetch(url, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    await readRouteResponse<unknown>(res);
  }

  return {
    base,
    getJson,
    postJson,
    patchJson,
    deleteRequest,
    hasBase: computed(() => base().length > 0),
  };
}

import type { ConnectionsManifest, IntegrationManifestEntry } from "~/types/connections-manifest";
import { integrationForSlug as resolveIntegration } from "~/types/connections-manifest";

/**
 * Root-relative URL for `public/connections.json` (works from nested routes under `/app/`).
 * `joinURL("", "connections.json")` is `"connections.json"` (relative) — that resolves to the wrong path; this always starts with `/`.
 */
export function publicConnectionsManifestPath(
  appBaseURL: string | undefined | null,
): string {
  const b = (appBaseURL || "/").trim() || "/";
  const normalized = b.startsWith("/") ? b : `/${b}`;
  const prefix = normalized.endsWith("/") ? normalized : `${normalized}/`;
  return `${prefix}connections.json`.replace(/\/+/g, "/");
}

/**
 * Interpolates `{origin}` and `{slug}` in templates from the manifest (`GET /auth/connections/manifest` or `/connections.json`).
 */
export function expandApp2RedirectTemplate(
  template: string,
  vars: { origin: string; slug: string },
): string {
  const origin = vars.origin.replace(/\/$/, "");
  return template
    .replace(/\{origin\}/g, origin)
    .replace(/\{slug\}/g, () => encodeURIComponent(vars.slug));
}

export function useConnectionsManifest() {
  const config = useRuntimeConfig();

  function manifestUrl(): string {
    return publicConnectionsManifestPath(config.app.baseURL);
  }

  async function fetchManifest(): Promise<ConnectionsManifest | null> {
    try {
      const res = await fetch(manifestUrl());
      if (!res.ok) return null;
      return (await res.json()) as ConnectionsManifest;
    } catch {
      return null;
    }
  }

  function integrationForSlug(
    manifest: ConnectionsManifest | null,
    slug: string,
  ): IntegrationManifestEntry | undefined {
    return resolveIntegration(manifest?.integrations, slug);
  }

  return {
    manifestUrl,
    fetchManifest,
    integrationForSlug,
    expandApp2RedirectTemplate,
  };
}

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


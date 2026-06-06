/**
 * Shape of `public/connections.json` (generated from `api` registry via `npm run gen:connections`).
 * v2 adds Union-style catalog fields (`type`, `created_at`, `categories`, `support`, `in_progress`).
 */
export type ConnectionsManifest = {
  manifestVersion: 1 | 2;
  generated_at: string;
  source: string;
  integrations: IntegrationManifestEntry[];
};

/** Union-style support surface (ticketing_ticket / passthrough pattern). */
export type IntegrationSupportSurface = {
  raw_objects?: string[];
  slow_fields?: string[];
  inbound_fields?: Record<string, string>;
  outbound_fields?: Record<string, string>;
  methods?: Record<string, boolean>;
  webhook_events?: Record<string, string[]>;
  [key: string]: unknown;
};

export type IntegrationManifestEntry = {
  /** Registry key — same as `slug` (Union `type`). Omitted in legacy manifest v1. */
  type?: string;
  slug: string;
  name: string;
  /** ISO 8601 — catalog listing / connector introduction time. */
  created_at?: string;
  categories?: string[];
  /** Capability → surface metadata (oauth_connection, passthrough, ads_*, …). */
  support?: Record<string, IntegrationSupportSurface>;
  in_progress?: boolean;
  description: string;
  logo_file?: string;
  /** Human-readable wiring summary for docs / UI. */
  overview: string;
  configure: {
    credentials: Array<{
      key: string;
      label: string;
      sensitive?: boolean;
      required: boolean;
      source: "credentials_needed" | "other_auth_credentials";
    }>;
    oauth: {
      providerDocsUrl?: string;
      defaultScopes: string[];
      authorizationParameters?: string[];
      tokenParameters?: string[];
      tokenMethod?: string;
      refreshMethod?: string;
      environments: Record<
        string,
        {
          authorizationUrl: string;
          tokenUrl: string;
          apiBaseUrl?: string;
          refreshUrl?: string;
        }
      >;
    };
    api: {
      definitionGet: { method: string; path: string; note?: string };
      oauthStart: {
        method: string;
        path: string;
        body: Record<string, string>;
      };
    };
    app2: {
      connectPathTemplate: string;
      redirects: {
        successUrlTemplate: string;
        failureUrlTemplate: string;
      };
    };
  };
};

/** Resolve an integration row from the manifest for a route slug. */
export function integrationForSlug(
  integrations: IntegrationManifestEntry[] | undefined,
  slug: string,
): IntegrationManifestEntry | undefined {
  return integrations?.find((i) => (i.type ?? i.slug) === slug);
}

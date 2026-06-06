/**
 * Build URL to start Google OAuth on the API (`GET /auth/google`).
 */
export function useGoogleAuth() {
  const config = useRuntimeConfig();

  /**
   * @param nextPath - Path after successful OAuth (e.g. `/app` or `/onboarding/survey`).
   */
  function buildGoogleOAuthHref(nextPath: string): string | null {
    if (!import.meta.client) return null;
    const base = String(config.public.apiBase || "").trim().replace(/\/$/, "");
    if (!base) return null;
    const origin = window.location.origin;
    const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
    const return_to = encodeURIComponent(
      `${origin}/auth/google/return?next=${encodeURIComponent(next)}`,
    );
    return `${base}/auth/google?return_to=${return_to}`;
  }

  return { buildGoogleOAuthHref };
}

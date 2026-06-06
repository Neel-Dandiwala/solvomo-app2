import type { H3Event } from "h3";

type RouteResponse<TData> = {
  success: boolean;
  data: TData | null;
  error: string[];
};

export function apiTarget(path: string): string {
  const config = useRuntimeConfig();
  const base = String(config.apiProxyTarget || "http://localhost:8000").replace(
    /\/$/,
    "",
  );
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function apiTargetWithCurrentSearch(event: H3Event, path: string): string {
  return `${apiTarget(path)}${getRequestURL(event).search}`;
}

export function apiCookieHeaders(event: H3Event) {
  const cookie = getHeader(event, "cookie");
  return cookie ? { cookie } : undefined;
}

export function routeResponse<TData>(data: TData): RouteResponse<TData> {
  return { success: true, data, error: [] };
}

export async function readApiResponse<TData>(response: Response): Promise<TData> {
  const json = (await response.json().catch(() => null)) as
    | RouteResponse<TData>
    | null;
  if (!response.ok || !json?.success || json.data == null) {
    throw createError({
      statusCode: response.status || 502,
      statusMessage: json?.error?.[0] || "API request failed",
    });
  }
  return json.data;
}

export function forwardSetCookie(event: H3Event, response: Response) {
  const setCookie =
    (response.headers as unknown as { getSetCookie?: () => string[] })
      .getSetCookie?.() || [];
  if (setCookie.length) {
    setHeader(event, "set-cookie", setCookie);
    return;
  }
  const fallback = response.headers.get("set-cookie");
  if (fallback) setHeader(event, "set-cookie", fallback);
}

export async function forwardApiRedirect(event: H3Event, response: Response) {
  forwardSetCookie(event, response);
  const location = response.headers.get("location");
  if (!location) {
    throw createError({
      statusCode: response.status || 502,
      statusMessage: "OAuth redirect missing Location header",
    });
  }
  return sendRedirect(event, location, response.status || 302);
}

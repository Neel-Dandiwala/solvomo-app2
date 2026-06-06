/** Client-side console logging for outbound API requests (path only). */
export function logApiRequest(method: string, path: string): void {
  if (!import.meta.client) return;
  const p = path.startsWith("/") ? path : `/${path}`;
  console.log(`[api] ${method} ${p}`);
}

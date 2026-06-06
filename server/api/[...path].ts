export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname;
  const apiPath = pathname.replace(/^\/api/, "") || "/";
  const target = apiTargetWithCurrentSearch(event, apiPath);
  const method = event.method || "GET";
  const headers: Record<string, string> = {};
  const cookie = getHeader(event, "cookie");
  const contentType = getHeader(event, "content-type");
  if (cookie) headers.cookie = cookie;
  if (contentType) headers["content-type"] = contentType;

  const body =
    method === "GET" || method === "HEAD" ? undefined : await readRawBody(event);

  const response = await fetch(target, {
    method,
    headers,
    body,
    redirect: "manual",
  });

  forwardSetCookie(event, response);
  setResponseStatus(event, response.status, response.statusText);

  for (const [key, value] of response.headers.entries()) {
    const lower = key.toLowerCase();
    if (
      lower === "set-cookie" ||
      lower === "content-encoding" ||
      lower === "transfer-encoding" ||
      lower === "connection"
    ) {
      continue;
    }
    setHeader(event, key, value);
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (location) setHeader(event, "location", location);
    return null;
  }

  return response.body ? sendStream(event, response.body) : null;
});

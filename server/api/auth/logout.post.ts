export default defineEventHandler(async (event) => {
  const response = await fetch(apiTarget("/auth/logout"), {
    method: "POST",
    headers: apiCookieHeaders(event),
  });
  forwardSetCookie(event, response);
  const data = await readApiResponse(response);
  await clearUserSession(event);
  return routeResponse(data);
});

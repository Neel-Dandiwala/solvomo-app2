export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const response = await fetch(apiTarget("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  forwardSetCookie(event, response);
  const data = await readApiResponse(response);
  return routeResponse(data);
});

export default defineEventHandler(async (event) => {
  const response = await fetch(apiTargetWithCurrentSearch(event, "/auth/google"), {
    redirect: "manual",
  });

  if (response.status >= 300 && response.status < 400) {
    return forwardApiRedirect(event, response);
  }

  const data = await readApiResponse(response);
  return routeResponse(data);
});

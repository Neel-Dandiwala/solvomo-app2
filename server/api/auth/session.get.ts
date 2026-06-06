export default defineEventHandler(async (event) => {
  const headers = apiCookieHeaders(event);

  try {
    const meResponse = await fetch(apiTarget("/auth/me"), { headers });
    const me = await readApiResponse<{
      user: {
        _id?: string;
        email?: string;
        name?: string;
        onboarding_steps?: string[];
      } | null;
    }>(meResponse);

    const contextResponse = await fetch(apiTarget("/auth/context"), { headers });
    const context = await readApiResponse<{
      workspaces: unknown[];
      brand_profiles: unknown[];
    }>(contextResponse);

    await setUserSession(event, {
      user: me.user || undefined,
      workspaces: context.workspaces,
      brand_profiles: context.brand_profiles,
    });

    return routeResponse({
      user: me.user,
      workspaces: context.workspaces,
      brand_profiles: context.brand_profiles,
    });
  } catch {
    await clearUserSession(event);
    return routeResponse({
      user: null,
      workspaces: [],
      brand_profiles: [],
    });
  }
});

import {
  ONBOARDING_ROUTE_BY_STEP,
  ONBOARDING_STEPS,
  firstIncompleteOnboardingIndex,
  isOnboardingCompleteForSteps,
  nextOnboardingPathForSteps,
  onboardingStepIndexForPath,
} from "~/utils/onboardingFlow";

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth();
  if (!auth.isHydrated.value) {
    await auth.ensureHydrated();
  }
  const path = to.path;
  const steps = auth.session.value?.onboardingSteps || [];
  const onboardingComplete = isOnboardingCompleteForSteps(steps);

  const isApp = path.startsWith("/app");
  const isOnboarding = path.startsWith("/onboarding");
  const isLogin = path === "/";
  const isSignup = path === "/signup";
  const isHome = path === "/";

  if (isHome && auth.isAuthenticated.value) {
    return navigateTo(
      onboardingComplete ? "/app" : nextOnboardingPathForSteps(steps),
    );
  }

  if (isApp) {
    if (!auth.isAuthenticated.value) {
      return navigateTo({ path: "/", query: { redirect: to.fullPath } });
    }
    if (!onboardingComplete) {
      return navigateTo(nextOnboardingPathForSteps(steps));
    }
  }

  if (isOnboarding) {
    if (!auth.isAuthenticated.value) {
      return navigateTo({ path: "/", query: { redirect: to.fullPath } });
    }
    if (onboardingComplete) {
      return navigateTo("/app");
    }

    if (path === "/onboarding" || path === "/onboarding/") {
      return navigateTo(nextOnboardingPathForSteps(steps));
    }

    if (path === "/onboarding/connections") {
      return navigateTo(nextOnboardingPathForSteps(steps), { replace: true });
    }

    const knownOnboardingPath = ONBOARDING_STEPS.some(
      (step) => ONBOARDING_ROUTE_BY_STEP[step] === path,
    );
    const idx = onboardingStepIndexForPath(path);
    const requiredIdx = firstIncompleteOnboardingIndex(steps);
    if (knownOnboardingPath && idx > requiredIdx && requiredIdx < ONBOARDING_STEPS.length) {
      return navigateTo(nextOnboardingPathForSteps(steps));
    }
  }

  if (isLogin || isSignup) {
    if (auth.isAuthenticated.value) {
      if (!onboardingComplete) {
        return navigateTo(nextOnboardingPathForSteps(steps));
      }
      return navigateTo("/app");
    }
  }
});

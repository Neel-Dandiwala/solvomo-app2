import type { OnboardingStepKey } from "~/types/mock";

export const ONBOARDING_STEPS = ["survey", "brand"] as const satisfies readonly OnboardingStepKey[];

export const ONBOARDING_ROUTE_BY_STEP: Record<OnboardingStepKey, string> = {
  survey: "/onboarding/survey",
  brand: "/onboarding/brand-setup",
};

export function sanitizeOnboardingSteps(raw: unknown): OnboardingStepKey[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((step): step is OnboardingStepKey =>
    ONBOARDING_STEPS.includes(step as OnboardingStepKey),
  );
}

export function isOnboardingCompleteForSteps(steps: readonly OnboardingStepKey[]): boolean {
  return ONBOARDING_STEPS.every((step) => steps.includes(step));
}

export function firstIncompleteOnboardingStep(
  steps: readonly OnboardingStepKey[],
): OnboardingStepKey | null {
  return ONBOARDING_STEPS.find((step) => !steps.includes(step)) ?? null;
}

export function firstIncompleteOnboardingIndex(
  steps: readonly OnboardingStepKey[],
): number {
  const next = firstIncompleteOnboardingStep(steps);
  return next ? ONBOARDING_STEPS.indexOf(next) : ONBOARDING_STEPS.length;
}

export function nextOnboardingPathForSteps(
  steps: readonly OnboardingStepKey[],
): string {
  const next = firstIncompleteOnboardingStep(steps);
  return next ? ONBOARDING_ROUTE_BY_STEP[next] : "/app";
}

export function onboardingStepIndexForPath(path: string): number {
  const idx = ONBOARDING_STEPS.findIndex(
    (step) => ONBOARDING_ROUTE_BY_STEP[step] === path,
  );
  return idx === -1 ? 0 : idx;
}

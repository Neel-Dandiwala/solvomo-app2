<script setup lang="ts">
import { ONBOARDING_ROUTE_BY_STEP, nextOnboardingPathForSteps } from "~/utils/onboardingFlow";

definePageMeta({ layout: "onboarding" });

useHead({ title: "Onboarding — About you | Solvomo" });

const auth = useAuth();
const { draft, restoreDraft } = useOnboardingDraft();

restoreDraft();

const experienceOptions = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
] as const;

const whoOptions = [
  { id: "student", label: "Student" },
  { id: "solo", label: "On my own" },
  { id: "team", label: "Part of a team" },
] as const;

const businessOptions = [
  { id: "dtc", label: "DTC brand" },
  { id: "b2b", label: "B2B" },
  { id: "agency", label: "Marketing agency" },
] as const;

const choiceBtn =
  "rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold transition sm:py-4";

async function finishSurvey() {
  auth.completeOnboardingStep("survey");
  await navigateTo(nextOnboardingPathForSteps([
    ...auth.onboardingStepsDone.value,
    "survey",
  ]) || ONBOARDING_ROUTE_BY_STEP.brand);
}
</script>

<template>
  <div>
    <OnboardingHero
      title="Tell us about you"
      description="A few choices — nothing here affects metrics or reporting."
    />

    <div class="space-y-10">
      <SurfaceCard variant="product">
        <h2 class="text-base font-semibold tracking-tight sm:text-lg">
          What’s your experience with paid media?
        </h2>
        <div class="mt-6 grid gap-3 sm:grid-cols-3">
          <button
            v-for="opt in experienceOptions"
            :key="opt.id"
            type="button"
            :class="[
              choiceBtn,
              draft.experienceLevel === opt.id
                ? 'border-[var(--sv-product-end)] bg-[rgba(91,123,225,0.06)] shadow-[inset_0_0_0_1px_rgba(91,123,225,0.2)]'
                : 'border-black/10 hover:border-black/16 hover:bg-black/[0.02]',
            ]"
            @click="draft.experienceLevel = opt.id"
          >
            {{ opt.label }}
          </button>
        </div>
      </SurfaceCard>

      <SurfaceCard variant="depth">
        <h2 class="text-base font-semibold tracking-tight sm:text-lg">
          Which best describes you?
        </h2>
        <div class="mt-6 grid gap-3 sm:grid-cols-3">
          <button
            v-for="opt in whoOptions"
            :key="opt.id"
            type="button"
            :class="[
              choiceBtn,
              draft.whoAreYou === opt.id
                ? 'border-[var(--sv-depth-end)] bg-[rgba(90,79,207,0.06)]'
                : 'border-black/10 hover:bg-black/[0.02]',
            ]"
            @click="draft.whoAreYou = opt.id"
          >
            {{ opt.label }}
          </button>
        </div>
      </SurfaceCard>

      <SurfaceCard variant="frame">
        <h2 class="text-base font-semibold tracking-tight sm:text-lg">
          How do you work?
        </h2>
        <div class="mt-6 grid gap-3 sm:grid-cols-3">
          <button
            v-for="opt in businessOptions"
            :key="opt.id"
            type="button"
            :class="[
              choiceBtn,
              draft.businessType === opt.id
                ? 'border-black bg-black text-white'
                : 'border-black/12 text-black/80 hover:border-black/20',
            ]"
            @click="draft.businessType = opt.id"
          >
            {{ opt.label }}
          </button>
        </div>

        <div class="mt-10 flex flex-wrap items-center justify-end gap-3 border-t border-black/8 pt-8">
          <button
            type="button"
            class="button-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            @click="finishSurvey"
          >
            Continue
          </button>
        </div>
      </SurfaceCard>
    </div>
  </div>
</template>

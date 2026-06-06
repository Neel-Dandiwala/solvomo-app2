<script setup lang="ts">
import { onboardingStepIndexForPath } from "~/utils/onboardingFlow";

const route = useRoute();
const auth = useAuth();

const activeStepIndex = computed(() => {
  return onboardingStepIndexForPath(route.path);
});

async function signOut() {
  auth.logout();
  await navigateTo("/");
}
</script>

<template>
  <div class="app-onboarding-root page-haze min-h-svh w-full bg-white text-black antialiased">
    <header class="sticky top-0 z-40 border-b border-black/8 bg-white/95 backdrop-blur-md">
      <div class="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <NuxtLink to="/" class="flex items-center gap-2">
          <div class="logo-mark-color h-8 w-8 shrink-0">
            <img
              src="~/assets/images/logo/colour_logo.jpeg"
              alt="Solvomo logo"
              class="h-full w-full"
            />
          </div>
          <span class="brand-wordmark text-sm font-bold tracking-tight sm:text-base">Solvomo</span>
        </NuxtLink>
        <div class="flex items-center gap-3">
          <p class="hidden max-w-[10rem] truncate text-xs text-black/45 sm:block">
            {{ auth.displayName }}
          </p>
          <NuxtLink
            v-if="auth.isOnboardingComplete"
            to="/app"
            class="nav-link text-sm font-semibold"
          >
            Overview
          </NuxtLink>
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-semibold text-black/55 transition hover:bg-black/[0.04] hover:text-black"
            @click="signOut"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>

    <div class="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <OnboardingStepper class="mb-8" :active-index="activeStepIndex" />
      <main class="sv-page">
        <slot />
      </main>
    </div>
  </div>
</template>

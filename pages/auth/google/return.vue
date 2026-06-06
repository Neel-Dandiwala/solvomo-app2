<script setup lang="ts">
import { nextOnboardingPathForSteps } from "~/utils/onboardingFlow";

useHead({ title: "Solvomo — Signing in" });

const route = useRoute();
const auth = useAuth();
const error = ref("");

onMounted(async () => {
  const nextRaw = route.query.next;
  const next =
    typeof nextRaw === "string" && nextRaw.startsWith("/") ? nextRaw : "/app";

  await auth.initializeSession();
  if (!auth.isAuthenticated.value) {
    error.value = "Sign-in did not finish. Try signing in again.";
    return;
  }

  const target = auth.isOnboardingComplete.value
    ? next
    : nextOnboardingPathForSteps(auth.onboardingStepsDone.value);
  await navigateTo(target, { replace: true });
});
</script>

<template>
  <div class="flex min-h-[50vh] flex-col items-center justify-center px-6 py-16">
    <p v-if="error" class="max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-900">
      {{ error }}
    </p>
    <p v-else class="text-[15px] text-black/55">
      Completing sign-in…
    </p>
    <NuxtLink v-if="error" to="/" class="mt-6 nav-link font-semibold text-black/70">
      Back to sign in
    </NuxtLink>
  </div>
</template>

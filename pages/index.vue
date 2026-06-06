<script setup lang="ts">
useHead({ title: "Solvomo — Sign in" });

const route = useRoute();
const api = useApiClient();
const { buildGoogleOAuthHref } = useGoogleAuth();

const googleHref = computed(() => {
  if (!api.hasBase.value) return null;
  const next = (route.query.redirect as string) || "/app";
  return buildGoogleOAuthHref(next);
});
</script>

<template>
  <AuthShell>
    <template #aside>
      <div class="eyebrow rounded-full">
        <span class="eyebrow-dot" />
        Decision workspace
      </div>
      <h1
        class="mt-8 max-w-[min(100%,42rem)] text-[clamp(2.75rem,5.2vw,5.25rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-black sm:text-[clamp(3.25rem,5.5vw,5.75rem)]"
      >
        Welcome back
        <span class="headline-brand block">to your growth workspace.</span>
      </h1>
      <p class="mt-8 max-w-2xl text-[1.125rem] leading-relaxed text-black/60 sm:text-[1.35rem]">
        Continue with Google to review channel, creative, and outcome context in one focused workspace.
      </p>
      <p class="mt-4 max-w-2xl text-sm leading-relaxed text-black/45">
        New workspaces are created automatically the first time an approved Google account signs in.
      </p>
      <div class="section-divider mt-12" />
      <div class="mt-10 grid gap-5 sm:grid-cols-2">
        <div class="surface-soft rounded-[18px] p-6 sm:p-7">
          <p class="text-[12px] font-semibold uppercase tracking-[0.16em] text-black/42">
            Executive view
          </p>
          <p class="mt-3 text-[16px] leading-relaxed text-black/56 sm:text-[17px]">
            Board-ready summaries and clear next moves.
          </p>
        </div>
        <div class="surface-depth rounded-[18px] p-6 sm:p-7">
          <p class="text-[12px] font-semibold uppercase tracking-[0.16em] text-black/42">
            Operator workflow
          </p>
          <p class="mt-3 text-[16px] leading-relaxed text-black/56 sm:text-[17px]">
            Plan, review, and reallocate with confidence.
          </p>
        </div>
      </div>
    </template>

    <AuthFormCard
      title="Continue with Google"
      description="One secure Google flow signs you in or creates your workspace."
    >
      <div v-if="googleHref" class="space-y-5">
        <a
          :href="googleHref"
          class="button-primary inline-flex w-full items-center justify-center gap-2 rounded-[14px] px-5 py-4 text-base font-semibold transition-all duration-200"
        >
          <span class="relative z-10 text-white">Continue with Google</span>
        </a>
        <p class="text-center text-[13px] leading-relaxed text-black/45">
          Use your company Google account. If this is your first time, we’ll guide you through workspace setup.
        </p>
      </div>

      <div v-else class="space-y-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-5 text-[15px] leading-relaxed text-amber-950">
        <p class="font-semibold">
          Sign-in is temporarily unavailable
        </p>
        <p class="text-amber-950/90">
          We could not reach Solvomo sign-in services. Please try again shortly or contact your workspace administrator.
        </p>
      </div>
    </AuthFormCard>
  </AuthShell>
</template>

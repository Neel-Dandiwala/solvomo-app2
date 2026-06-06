<script setup lang="ts">
import {
  ONBOARDING_ROUTE_BY_STEP,
  nextOnboardingPathForSteps,
} from "~/utils/onboardingFlow";

definePageMeta({ layout: "onboarding" });

useHead({ title: "Onboarding — Brand profile | Solvomo" });

const auth = useAuth();
const api = useApiClient();
const {
  currentWorkspace,
  currentBrandProfile,
  brandProfilesForWorkspace,
  brandProfiles,
  workspaces,
  currentWorkspaceId,
} = useWorkspaceContext();
const { draft, restoreDraft, resetDraft } = useOnboardingDraft();

const saving = ref(false);
const saveError = ref<string | null>(null);

restoreDraft();

const socialPlatformOptions = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook page" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X / Twitter" },
  { value: "pinterest", label: "Pinterest" },
  { value: "other", label: "Other" },
] as const;

watchEffect(() => {
  if (!draft.value.workspaceName?.trim() && currentWorkspace.value?.name) {
    draft.value.workspaceName = currentWorkspace.value.name;
  }
  if (!draft.value.brandName && currentBrandProfile.value?.name) {
    draft.value.brandName = currentBrandProfile.value.name;
  }
  if (!draft.value.currency && currentBrandProfile.value?.currency) {
    draft.value.currency = currentBrandProfile.value.currency;
  }
});

function addSocialHandle() {
  draft.value.socialHandles.push({
    platform: "instagram",
    handle: "",
    profileUrl: "",
  });
}

function removeSocialHandle(index: number) {
  draft.value.socialHandles.splice(index, 1);
}

async function finishOnboarding() {
  saving.value = true;
  saveError.value = null;
  try {
    const wsId = currentWorkspaceId.value;
    const wname = draft.value.workspaceName?.trim();
    if (wsId && wname) {
      const updated = await api.patchJson<{ id: string; name: string }>(
        `/auth/workspaces/${encodeURIComponent(wsId)}`,
        { name: wname },
      );
      const widx = workspaces.value.findIndex((w) => w.id === wsId);
      if (widx !== -1) {
        workspaces.value[widx] = { ...workspaces.value[widx]!, name: updated.name };
      }
    }

    const bpId = currentBrandProfile.value?.id;
    if (bpId) {
      const patchPayload: Record<string, unknown> = {};
      if (draft.value.brandName?.trim()) patchPayload.brand_name = draft.value.brandName.trim();
      if (draft.value.currency) patchPayload.currency = draft.value.currency;
      const social_handles = draft.value.socialHandles
        .map((row) => ({
          platform: row.platform.trim(),
          handle: row.handle.trim(),
          profile_url: row.profileUrl.trim() || undefined,
        }))
        .filter((row) => row.platform && (row.handle || row.profile_url));
      if (social_handles.length) patchPayload.social_handles = social_handles;

      if (Object.keys(patchPayload).length) {
        await api.patchJson(`/auth/brand-profiles/${encodeURIComponent(bpId)}`, patchPayload);
      }

      const idx = brandProfiles.value.findIndex((bp: (typeof brandProfiles.value)[number]) => bp.id === bpId);
      if (idx !== -1) {
        brandProfiles.value[idx] = {
          ...brandProfiles.value[idx]!,
          name: draft.value.brandName || brandProfiles.value[idx]!.name,
          currency: draft.value.currency || brandProfiles.value[idx]!.currency,
        };
      }
    }

    auth.completeOnboardingStep("brand");
    resetDraft();
    await navigateTo(nextOnboardingPathForSteps([
      ...auth.onboardingStepsDone.value,
      "brand",
    ]));
  } catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : "Failed to save. Please try again.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <OnboardingHero
      title="Name your workspace and brand"
      description="Add the public social or ad profiles we should use to enrich simulations."
    />

    <SurfaceCard variant="product" class="mt-8" padding="lg">
      <div class="grid gap-10 lg:grid-cols-2">
        <div class="space-y-6">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wide text-black/45">Workspace name</label>
            <input
              v-model="draft.workspaceName"
              class="auth-input mt-2"
              type="text"
              autocomplete="organization"
              placeholder="e.g. Acme Marketing"
            />
          </div>
          <p class="text-sm text-black/50">
            {{ brandProfilesForWorkspace.length }} brand profile{{
              brandProfilesForWorkspace.length === 1 ? "" : "s"
            }}
            in this workspace.
          </p>
        </div>

        <div class="surface-soft rounded-2xl p-6">
          <h2 class="text-base font-semibold">Brand profile</h2>
          <p class="mt-1 text-sm text-black/45">
            Currency and social handles apply to this brand only.
          </p>
          <label class="mt-6 block text-xs font-bold uppercase tracking-wide text-black/45">Brand name</label>
          <input v-model="draft.brandName" class="auth-input mt-2" type="text" autocomplete="organization" />
          <label class="mt-5 block text-xs font-bold uppercase tracking-wide text-black/45">Currency</label>
          <select v-model="draft.currency" class="auth-input mt-2">
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
          <div class="mt-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-wide text-black/45">
                  Social/ad handles
                </p>
                <p class="mt-1 text-xs text-black/45">
                  Add profiles where this brand runs organic content or ads.
                </p>
              </div>
              <button
                type="button"
                class="button-secondary rounded-xl px-3 py-2 text-xs font-semibold"
                @click="addSocialHandle"
              >
                Add handle
              </button>
            </div>

            <div v-if="draft.socialHandles.length" class="mt-4 space-y-4">
              <div
                v-for="(row, index) in draft.socialHandles"
                :key="index"
                class="rounded-2xl border border-black/8 bg-white/70 p-4"
              >
                <div class="grid gap-3 sm:grid-cols-[0.8fr_1fr]">
                  <label class="block">
                    <span class="text-xs font-bold uppercase tracking-wide text-black/45">Platform</span>
                    <select v-model="row.platform" class="auth-input mt-2">
                      <option
                        v-for="opt in socialPlatformOptions"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>
                  </label>
                  <label class="block">
                    <span class="text-xs font-bold uppercase tracking-wide text-black/45">Handle</span>
                    <input
                      v-model="row.handle"
                      class="auth-input mt-2"
                      type="text"
                      placeholder="@brand"
                    >
                  </label>
                </div>
                <label class="mt-3 block">
                  <span class="text-xs font-bold uppercase tracking-wide text-black/45">Preferred profile link</span>
                  <input
                    v-model="row.profileUrl"
                    class="auth-input mt-2"
                    type="url"
                    placeholder="https://www.instagram.com/brand"
                  >
                </label>
                <button
                  type="button"
                  class="mt-3 text-xs font-semibold text-black/45 hover:text-black"
                  @click="removeSocialHandle(index)"
                >
                  Remove
                </button>
              </div>
            </div>
            <button
              v-else
              type="button"
              class="mt-4 w-full rounded-2xl border border-dashed border-black/12 px-4 py-5 text-sm font-semibold text-black/55 hover:border-black/20 hover:text-black"
              @click="addSocialHandle"
            >
              Add Instagram, Facebook, TikTok, LinkedIn, or another profile
            </button>
          </div>
        </div>
      </div>
      <div class="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-black/8 pt-8">
        <NuxtLink :to="ONBOARDING_ROUTE_BY_STEP.survey" class="nav-link inline-flex text-sm font-semibold">
          Back
        </NuxtLink>
        <div class="flex flex-col items-end gap-2">
          <p v-if="saveError" class="text-xs text-red-600">{{ saveError }}</p>
          <button
            type="button"
            class="button-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            :disabled="saving"
            @click="finishOnboarding"
          >
            {{ saving ? "Saving…" : "Continue" }}
          </button>
        </div>
      </div>
    </SurfaceCard>
  </div>
</template>

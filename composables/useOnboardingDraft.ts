import type { BrandProfile } from "~/types/app-shell";

const STORAGE_KEY = "sv-onboarding-draft";

export interface OnboardingSocialHandleDraft {
  platform: string;
  handle: string;
  profileUrl: string;
}

export interface OnboardingDraftState {
  experienceLevel: string | null;
  whoAreYou: string | null;
  businessType: string | null;
  workspaceName: string;
  brandName: string;
  currency: string;
  socialHandles: OnboardingSocialHandleDraft[];
}

function defaultDraft(brand?: BrandProfile, workspaceName?: string): OnboardingDraftState {
  return {
    experienceLevel: null,
    whoAreYou: null,
    businessType: null,
    workspaceName: workspaceName || "",
    brandName: brand?.name || "",
    currency: brand?.currency || "USD",
    socialHandles: (brand?.socialHandles || []).map((handle) => ({
      platform: handle.platform,
      handle: handle.handle || "",
      profileUrl: handle.profileUrl || "",
    })),
  };
}

function sanitizeSocialHandles(raw: unknown): OnboardingSocialHandleDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const platform = typeof row.platform === "string" ? row.platform.trim() : "";
      const handle = typeof row.handle === "string" ? row.handle.trim() : "";
      const profileUrl =
        typeof row.profileUrl === "string" ? row.profileUrl.trim() : "";
      if (!platform || (!handle && !profileUrl)) return null;
      return { platform, handle, profileUrl };
    })
    .filter((row): row is OnboardingSocialHandleDraft => Boolean(row));
}

export function useOnboardingDraft() {
  const { currentBrandProfile, currentWorkspace } = useWorkspaceContext();
  const draft = useState<OnboardingDraftState>("sv-onboarding-draft", () =>
    defaultDraft(currentBrandProfile.value, currentWorkspace.value?.name),
  );
  const restored = useState<boolean>("sv-onboarding-draft-restored", () => false);
  const watchBound = useState<boolean>("sv-onboarding-draft-watch", () => false);

  function restoreDraft() {
    if (!import.meta.client || restored.value) return;
    restored.value = true;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const base = defaultDraft(currentBrandProfile.value, currentWorkspace.value?.name);
        const socialHandles = sanitizeSocialHandles(parsed.socialHandles);
        draft.value = {
          ...base,
          experienceLevel:
            typeof parsed.experienceLevel === "string" ? parsed.experienceLevel : base.experienceLevel,
          whoAreYou: typeof parsed.whoAreYou === "string" ? parsed.whoAreYou : base.whoAreYou,
          businessType: typeof parsed.businessType === "string" ? parsed.businessType : base.businessType,
          workspaceName: typeof parsed.workspaceName === "string" ? parsed.workspaceName : base.workspaceName,
          brandName: typeof parsed.brandName === "string" ? parsed.brandName : base.brandName,
          currency: typeof parsed.currency === "string" ? parsed.currency : base.currency,
          socialHandles: socialHandles.length ? socialHandles : base.socialHandles,
        };
        return;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    draft.value = defaultDraft(currentBrandProfile.value, currentWorkspace.value?.name);
  }

  function persistDraft() {
    if (!import.meta.client) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft.value));
  }

  function resetDraft() {
    draft.value = defaultDraft(currentBrandProfile.value, currentWorkspace.value?.name);
    if (import.meta.client) localStorage.removeItem(STORAGE_KEY);
  }

  if (!watchBound.value) {
    watchBound.value = true;
    watch(
      draft,
      () => {
        persistDraft();
      },
      { deep: true },
    );
  }

  return {
    draft,
    restoreDraft,
    persistDraft,
    resetDraft,
  };
}

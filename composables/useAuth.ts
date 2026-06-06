import type { BrandProfile, BrandProfileSocialHandle, Workspace } from "~/types/app-shell";
import type { OnboardingStepKey } from "~/types/mock";
import {
  isOnboardingCompleteForSteps,
  nextOnboardingPathForSteps,
} from "~/utils/onboardingFlow";
import { readRouteResponse } from "~/utils/routeResponse";

export interface AuthSession {
  userId: string;
  email: string;
  name?: string;
  onboardingSteps: OnboardingStepKey[];
}

type AuthHydrationStatus = "idle" | "restoring" | "ready" | "error";

type ApiUser = {
  _id?: string;
  email?: string;
  name?: string;
  onboarding_steps?: string[];
};

type ApiBrandProfileSocialHandle = {
  platform: string;
  handle?: string;
  profile_url?: string;
  connection_id?: string;
  account_id?: string;
  page_id?: string;
  display_name?: string;
  is_primary?: boolean;
  follower_count?: number;
  following_count?: number;
  page_likes?: number;
  media_count?: number;
  is_verified?: boolean;
  bio?: string;
  last_fetched_at?: string;
};

type ApiBrandProfile = {
  id: string;
  brand_name?: string;
  workspace_id?: string;
  currency?: string;
  attribution_preference?: string;
  is_playground_system?: boolean;
  industry?: string;
  brand_recognition?: string;
  website_url?: string;
  reviews_count?: number;
  average_rating?: number;
  trust_signals?: string[];
  social_handles?: ApiBrandProfileSocialHandle[];
};

type ApiAuthContext = {
  user?: ApiUser | null;
  workspaces: Workspace[];
  brand_profiles: ApiBrandProfile[];
};

let authInitPromise: Promise<void> | null = null;

function mapSocialHandle(handle: ApiBrandProfileSocialHandle): BrandProfileSocialHandle {
  return {
    platform: handle.platform,
    handle: handle.handle,
    profileUrl: handle.profile_url,
    connectionId: handle.connection_id,
    accountId: handle.account_id,
    pageId: handle.page_id,
    displayName: handle.display_name,
    isPrimary: handle.is_primary,
    followerCount: handle.follower_count,
    followingCount: handle.following_count,
    pageLikes: handle.page_likes,
    mediaCount: handle.media_count,
    isVerified: handle.is_verified,
    bio: handle.bio,
    lastFetchedAt: handle.last_fetched_at,
  };
}

function normalizeApiBrandProfile(profile: ApiBrandProfile): BrandProfile {
  const name = profile.brand_name?.trim() || "Untitled brand";
  return {
    id: profile.id,
    name,
    brandName: name,
    workspaceId: profile.workspace_id || "",
    currency: profile.currency || "USD",
    attributionPreference: profile.attribution_preference || "Multi-touch",
    isPlaygroundSystem: profile.is_playground_system ?? false,
    industry: profile.industry,
    brandRecognition: profile.brand_recognition,
    websiteUrl: profile.website_url,
    reviewsCount: profile.reviews_count,
    averageRating: profile.average_rating,
    trustSignals: profile.trust_signals,
    socialHandles: (profile.social_handles || []).map(mapSocialHandle),
  };
}

function clearWorkspaceContext() {
  const workspace = useWorkspaceContext();
  workspace.workspaces.value = [];
  workspace.brandProfiles.value = [];
  workspace.currentWorkspaceId.value = "";
  workspace.currentBrandProfileId.value = "";
}

function apiBase(): string {
  const config = useRuntimeConfig();
  return String(config.public.apiBase || "").trim().replace(/\/$/, "");
}

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("api-base-missing");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(`${base}${normalized}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  return readRouteResponse<T>(res);
}

export async function hydrateWorkspaceFromApi(ctx?: ApiAuthContext): Promise<void> {
  const context = ctx ?? await fetchApi<ApiAuthContext>("/auth/context");
  const workspace = useWorkspaceContext();

  workspace.workspaces.value = [...context.workspaces];
  workspace.brandProfiles.value = (context.brand_profiles || []).map(normalizeApiBrandProfile);

  // First, set defaults (first workspace, first non-playground brand)
  const ws0 = context.workspaces[0]?.id || "";
  workspace.currentWorkspaceId.value = ws0;
  const profilesInWs = workspace.brandProfiles.value.filter(
    (brand) => brand.workspaceId === ws0,
  );
  const brand0 =
    profilesInWs.find((brand) => !brand.isPlaygroundSystem) ||
    profilesInWs[0] ||
    workspace.brandProfiles.value[0];
  workspace.currentBrandProfileId.value = brand0?.id || "";

  // Then restore previously selected IDs from localStorage (overrides defaults if still valid)
  workspace.restorePersistedSelection();
}

export function useAuth() {
  const session = useState<AuthSession | null>("sv-auth-session", () => null);
  const hydrationStatus = useState<AuthHydrationStatus>(
    "sv-auth-hydration-status",
    () => "idle",
  );
  const onboardingDraft = useOnboardingDraft();
  const workspace = useWorkspaceContext();

  const isAuthenticated = computed(() => session.value !== null);
  const activeUserId = computed(() => session.value?.userId || null);
  const displayName = computed(
    () => session.value?.name || session.value?.email.split("@")[0] || "",
  );
  const displayEmail = computed(() => session.value?.email || "");
  const onboardingStepsDone = computed(() => session.value?.onboardingSteps || []);
  const isHydrated = computed(() => hydrationStatus.value === "ready");

  const isOnboardingComplete = computed(() => {
    if (!session.value) return false;
    return isOnboardingCompleteForSteps(session.value.onboardingSteps);
  });

  function ensureWorkspaceSelection() {
    const hasWorkspaceState =
      workspace.workspaces.value.length > 0 &&
      workspace.brandProfiles.value.length > 0;

    if (!hasWorkspaceState) return;

    if (!workspace.currentWorkspaceId.value) {
      workspace.currentWorkspaceId.value = workspace.workspaces.value[0]?.id || "";
    }

    if (!workspace.currentBrandProfileId.value) {
      const first =
        workspace.brandProfiles.value.find(
          (brand) => brand.workspaceId === workspace.currentWorkspaceId.value,
        ) || workspace.brandProfiles.value[0];
      workspace.currentBrandProfileId.value = first?.id || "";
    }
  }

  async function initializeSession() {
    if (authInitPromise) {
      await authInitPromise;
      return;
    }

    authInitPromise = (async () => {
      try {
        hydrationStatus.value = "restoring";
        const body = await fetchApi<ApiAuthContext>("/auth/session");
        const user = body.user;
        if (!user?._id || !user.email) {
          throw new Error("invalid-user");
        }
        const steps = (Array.isArray(user.onboarding_steps)
          ? user.onboarding_steps
          : []
        ).filter((step): step is OnboardingStepKey =>
          step === "survey" || step === "brand",
        );

        session.value = {
          userId: String(user._id),
          email: user.email,
          name:
            typeof user.name === "string" && user.name.trim()
              ? user.name.trim()
              : undefined,
          onboardingSteps: steps,
        };
        await hydrateWorkspaceFromApi(body);
        ensureWorkspaceSelection();
        hydrationStatus.value = "ready";
      } catch {
        session.value = null;
        clearWorkspaceContext();
        hydrationStatus.value = "ready";
      } finally {
        authInitPromise = null;
      }
    })();

    await authInitPromise;
  }

  async function logout() {
    try {
      await fetchApi<{ ok: true }>("/auth/logout", { method: "POST" });
    } catch {
      /* Local cleanup still happens if the network is unavailable. */
    }
    session.value = null;
    clearWorkspaceContext();
    onboardingDraft.resetDraft();
    hydrationStatus.value = "ready";
    await navigateTo("/");
  }

  function completeOnboardingStep(step: OnboardingStepKey) {
    if (!session.value) return;
    if (!session.value.onboardingSteps.includes(step)) {
      session.value.onboardingSteps.push(step);
    }
    void fetchApi<{ ok: true; onboarding_steps: string[] }>(
      "/auth/onboarding/complete-step",
      {
        method: "POST",
        body: JSON.stringify({ step }),
      },
    ).catch(() => {});
  }

  function nextOnboardingPath(): string {
    if (!session.value) return "/";
    return nextOnboardingPathForSteps(session.value.onboardingSteps);
  }

  return {
    session,
    hydrationStatus,
    isHydrated,
    isAuthenticated,
    activeUserId,
    displayName,
    displayEmail,
    onboardingStepsDone,
    isOnboardingComplete,
    ensureHydrated: initializeSession,
    restoreSession: initializeSession,
    initializeSession,
    logout,
    completeOnboardingStep,
    nextOnboardingPath,
  };
}

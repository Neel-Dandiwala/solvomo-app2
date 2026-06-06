import type { BrandProfile, Workspace } from "~/types/app-shell";
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

type ApiAuthContext = {
  user?: ApiUser | null;
  workspaces: Workspace[];
  brandProfiles: Array<
    Omit<
      Partial<BrandProfile>,
      "id" | "workspaceId" | "currency" | "attributionPreference"
    > & {
      id: string;
      name?: string;
      workspace_id?: string;
      workspaceId?: string;
      currency?: string;
      attribution_preference?: string;
      attributionPreference?: string;
      is_playground_system?: boolean;
      isPlaygroundSystem?: boolean;
    }
  >;
};

let authInitPromise: Promise<void> | null = null;

function normalizeApiBrandProfile(
  profile: ApiAuthContext["brandProfiles"][number],
): BrandProfile {
  const {
    workspace_id,
    attribution_preference,
    is_playground_system,
    ...rest
  } = profile;

  return {
    ...rest,
    id: profile.id,
    name: profile.name || "Untitled brand",
    workspaceId: profile.workspaceId || workspace_id || "",
    currency: profile.currency || "USD",
    attributionPreference:
      profile.attributionPreference || attribution_preference || "Multi-touch",
    isPlaygroundSystem:
      profile.isPlaygroundSystem ?? is_playground_system ?? false,
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
  workspace.brandProfiles.value = context.brandProfiles.map(normalizeApiBrandProfile);

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

  async function login(
    email: string,
    password: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
      const data = await fetchApi<{ mfaRequired?: boolean }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (data.mfaRequired) {
        return {
          ok: false,
          message: "MFA is enabled for this account; use API-only flow.",
        };
      }
      await initializeSession();
      return { ok: true };
    } catch {
      return { ok: false, message: "Try again." };
    }
  }

  async function signup(payload: {
    email: string;
    password: string;
    name: string;
  }): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
      await fetchApi<{ ok: true }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
          name: payload.name.trim() || undefined,
        }),
      });
      return login(payload.email, payload.password);
    } catch {
      return { ok: false, message: "Try again." };
    }
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
    login,
    signup,
    logout,
    completeOnboardingStep,
    nextOnboardingPath,
  };
}

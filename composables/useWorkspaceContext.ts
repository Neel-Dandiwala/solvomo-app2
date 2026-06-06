import type {
  BrandProfile,
  ProfileBadgeKind,
  SidebarNavItem,
  Workspace,
} from "~/types/app-shell";

const SIDEBAR_NAV: SidebarNavItem[] = [
  { label: "Overview", to: "/app", icon: "overview" },
  { label: "Dashboards", to: "/app/dashboards", icon: "dashboards" },
  { label: "Insights", to: "/app/insights", icon: "insights" },
  { label: "Simulation", to: "/app/simulation", icon: "simulation" },
  { label: "Evolve", to: "/app/evolve", icon: "evolve" },
  {
    label: "Assets",
    to: "/app/assets/creative",
    icon: "assets",
    children: [
      { label: "Creative", to: "/app/assets/creative", icon: "image" },
      { label: "Audience", to: "/app/assets/audience", icon: "users" },
      { label: "Variants", to: "/app/assets/variants", icon: "image" },
      { label: "Datasources", to: "/app/assets/datasources", icon: "plug" },
      { label: "Budgets", to: "/app/assets/budgets", icon: "wallet" },
    ],
  },
  { label: "Spend", to: "/app/spend", icon: "wallet" },
  { label: "Connections", to: "/app/connections", icon: "plug" },
  { label: "Settings", to: "/app/settings", icon: "settings" },
];

export function useWorkspaceContext() {
  const workspaces = useState<Workspace[]>("sv-workspaces", () => []);
  const brandProfiles = useState<BrandProfile[]>("sv-brand-profiles", () => []);

  const currentWorkspaceId = useState<string>("sv-current-workspace", () => "");
  const currentBrandProfileId = useState<string>("sv-current-brand-profile", () => "");

  const sidebarCollapsed = useState<boolean>("sv-sidebar-collapsed", () => false);
  const mobileNavOpen = useState<boolean>("sv-mobile-nav-open", () => false);

  const currentWorkspace = computed(() =>
    workspaces.value.find((w) => w.id === currentWorkspaceId.value) || workspaces.value[0],
  );

  const currentBrandProfile = computed(
    () =>
      brandProfiles.value.find((b) => b.id === currentBrandProfileId.value) ||
      brandProfiles.value[0],
  );

  /** Playground demo mode when the active brand profile is the system Playground row. */
  const isPlayground = computed(
    () => currentBrandProfile.value?.isPlaygroundSystem === true,
  );

  const profileBadgeKind = computed<ProfileBadgeKind>(() =>
    currentBrandProfile.value?.isPlaygroundSystem ? "playground" : "production",
  );

  const brandProfilesForWorkspace = computed(() =>
    brandProfiles.value.filter((b) => b.workspaceId === currentWorkspaceId.value),
  );

  const WS_STORAGE_KEY = "sv-last-workspace-id";
  const BP_STORAGE_KEY = "sv-last-brand-profile-id";

  function persistSelection() {
    if (typeof localStorage === "undefined") return;
    if (currentWorkspaceId.value) localStorage.setItem(WS_STORAGE_KEY, currentWorkspaceId.value);
    if (currentBrandProfileId.value) localStorage.setItem(BP_STORAGE_KEY, currentBrandProfileId.value);
  }

  function setWorkspace(id: string) {
    currentWorkspaceId.value = id;
    const first = brandProfiles.value.find((b) => b.workspaceId === id);
    if (first) currentBrandProfileId.value = first.id;
    persistSelection();
  }

  function setBrandProfile(id: string) {
    currentBrandProfileId.value = id;
    persistSelection();
  }

  /** Read the last selected IDs from localStorage and apply them if still valid. */
  function restorePersistedSelection() {
    if (typeof localStorage === "undefined") return;
    const savedWs = localStorage.getItem(WS_STORAGE_KEY);
    const savedBp = localStorage.getItem(BP_STORAGE_KEY);
    if (savedWs && workspaces.value.some((w) => w.id === savedWs)) {
      currentWorkspaceId.value = savedWs;
    }
    if (savedBp && brandProfiles.value.some((b) => b.id === savedBp)) {
      currentBrandProfileId.value = savedBp;
    }
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  function toggleMobileNav() {
    mobileNavOpen.value = !mobileNavOpen.value;
  }

  function closeMobileNav() {
    mobileNavOpen.value = false;
  }

  return {
    sidebarNav: SIDEBAR_NAV,
    workspaces,
    brandProfiles,
    currentWorkspaceId,
    currentBrandProfileId,
    currentWorkspace,
    currentBrandProfile,
    isPlayground,
    profileBadgeKind,
    brandProfilesForWorkspace,
    sidebarCollapsed,
    mobileNavOpen,
    setWorkspace,
    setBrandProfile,
    restorePersistedSelection,
    toggleSidebar,
    toggleMobileNav,
    closeMobileNav,
  };
}

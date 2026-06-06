import { watch } from "vue";
import type { OverviewDashboardConfig, OverviewData, OverviewWidgetConfig } from "~/types/mock";

type PlacementTarget = "top" | "bottom" | "after";
type DashboardTemplate = "executive" | "operator" | "blank";

interface OverviewDashboardState {
  selectedDashboardId: string;
  dashboards: OverviewDashboardConfig[];
  widgets: OverviewWidgetConfig[];
  nextCustomIndex: number;
}

const STORAGE_KEY_PREFIX = "sv-overview-dashboards";

function cloneDashboardState(source: OverviewDashboardState): OverviewDashboardState {
  return {
    selectedDashboardId: source.selectedDashboardId,
    dashboards: source.dashboards.map((dashboard) => ({ ...dashboard, widgetIds: [...dashboard.widgetIds] })),
    widgets: source.widgets.map((widget) => ({ ...widget })),
    nextCustomIndex: source.nextCustomIndex,
  };
}

export function useOverviewDashboards() {
  const auth = useAuth();
  const workspace = useWorkspaceContext();
  const { overview } = useAppData();

  const stateByScope = useState<Record<string, OverviewDashboardState>>("sv-overview-dashboard-state-v2", () => ({}));
  const restoredKeys = useState<Record<string, boolean>>("sv-overview-dashboard-restored-v2", () => ({}));

  const activeUserId = computed(() => auth.activeUserId.value || null);

  /** Per user + brand profile so Playground layout does not leak into production profiles. */
  const overviewScopeKey = computed(() => {
    const u = activeUserId.value;
    const b = workspace.currentBrandProfileId.value;
    if (!u || !b) return null;
    return `${u}:${b}`;
  });

  function snapshotHasDashboardLayout(snapshot: OverviewData) {
    return snapshot.widgets.length > 0 || snapshot.dashboards.length > 0;
  }

  function stateHasNoDashboardLayout(state: OverviewDashboardState | undefined) {
    if (!state) return true;
    return state.widgets.length === 0 && state.dashboards.length === 0;
  }

  function seedFromMock(scopeKey: string) {
    const snapshot = overview.value;
    if (!snapshot) return;

    stateByScope.value[scopeKey] = {
      selectedDashboardId:
        snapshot.dashboards.find((dashboard) => dashboard.isDefault)?.id ||
        snapshot.dashboards[0]?.id ||
        "",
      dashboards: snapshot.dashboards.map((dashboard) => ({ ...dashboard, widgetIds: [...dashboard.widgetIds] })),
      widgets: snapshot.widgets.map((widget) => ({ ...widget })),
      nextCustomIndex: 1,
    };
  }

  function restoreForScope(scopeKey: string) {
    if (!import.meta.client || restoredKeys.value[scopeKey]) return;
    restoredKeys.value[scopeKey] = true;

    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}:${scopeKey}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as OverviewDashboardState;
        stateByScope.value[scopeKey] = cloneDashboardState(parsed);
        return;
      } catch {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}:${scopeKey}`);
      }
    }

    seedFromMock(scopeKey);
  }

  watchEffect(() => {
    const scopeKey = overviewScopeKey.value;
    if (!scopeKey || !overview.value) return;
    restoreForScope(scopeKey);
    if (!stateByScope.value[scopeKey]) seedFromMock(scopeKey);
  });

  /**
   * Playground (and other async) bundles load after brand switch; first pass seeds empty layout.
   * Re-seed when the API snapshot gains dashboards/widgets while local state is still empty.
   */
  watch(
    () => [overviewScopeKey.value, overview.value] as const,
    ([scopeKey, snapshot]) => {
      if (!scopeKey || !snapshot) return;
      const existing = stateByScope.value[scopeKey];
      if (!snapshotHasDashboardLayout(snapshot) || !stateHasNoDashboardLayout(existing)) return;
      seedFromMock(scopeKey);
    },
  );

  const currentState = computed(() => {
    const scopeKey = overviewScopeKey.value;
    return scopeKey ? stateByScope.value[scopeKey] || null : null;
  });

  watch(
    currentState,
    (value) => {
      const scopeKey = overviewScopeKey.value;
      if (!import.meta.client || !scopeKey || !value) return;
      localStorage.setItem(`${STORAGE_KEY_PREFIX}:${scopeKey}`, JSON.stringify(value));
    },
    { deep: true },
  );

  const dashboards = computed(() => currentState.value?.dashboards || []);
  const widgets = computed(() => currentState.value?.widgets || []);

  const selectedDashboardId = computed({
    get: () => currentState.value?.selectedDashboardId || "",
    set: (value: string) => {
      if (!currentState.value) return;
      currentState.value.selectedDashboardId = value;
    },
  });

  const currentDashboard = computed(
    () => dashboards.value.find((dashboard) => dashboard.id === selectedDashboardId.value) || dashboards.value[0] || null,
  );

  const widgetsById = computed(() =>
    Object.fromEntries(widgets.value.map((widget) => [widget.id, widget])) as Record<string, OverviewWidgetConfig>,
  );

  const currentWidgets = computed(() =>
    currentDashboard.value?.widgetIds
      .map((widgetId) => widgetsById.value[widgetId])
      .filter((widget): widget is OverviewWidgetConfig => Boolean(widget)) || [],
  );

  function insertWidgetId(widgetIds: string[], widgetId: string, placement: PlacementTarget, afterWidgetId?: string) {
    if (placement === "top") {
      widgetIds.unshift(widgetId);
      return;
    }
    if (placement === "after" && afterWidgetId) {
      const index = widgetIds.indexOf(afterWidgetId);
      if (index !== -1) {
        widgetIds.splice(index + 1, 0, widgetId);
        return;
      }
    }
    widgetIds.push(widgetId);
  }

  function addWidget(
    widget: Omit<OverviewWidgetConfig, "id">,
    placement: PlacementTarget,
    afterWidgetId?: string,
  ) {
    if (!currentState.value || !currentDashboard.value) return;

    const id = `custom-widget-${currentState.value.nextCustomIndex}`;
    currentState.value.nextCustomIndex += 1;

    const nextWidget: OverviewWidgetConfig = {
      ...widget,
      id,
    };

    currentState.value.widgets.push(nextWidget);
    insertWidgetId(currentDashboard.value.widgetIds, id, placement, afterWidgetId);
  }

  function createDashboard(options: {
    name: string;
    description: string;
    template: DashboardTemplate;
    widgetIds: string[];
  }) {
    if (!currentState.value) return;

    const templateDefaults =
      options.template === "executive"
        ? overview.value?.dashboards.find((dashboard) => dashboard.isDefault)?.widgetIds || []
        : options.template === "operator"
          ? overview.value?.dashboards.find((dashboard) => !dashboard.isDefault)?.widgetIds || []
          : [];

    const widgetIds = options.widgetIds.length ? options.widgetIds : templateDefaults;
    const dashboardId = `custom-dashboard-${currentState.value.nextCustomIndex}`;

    currentState.value.dashboards.push({
      id: dashboardId,
      name: options.name,
      description: options.description,
      widgetIds: [...widgetIds],
    });
    currentState.value.selectedDashboardId = dashboardId;
  }

  function reorderWidgets(draggedId: string, targetId: string) {
    if (!currentDashboard.value || draggedId === targetId) return;
    const widgetIds = currentDashboard.value.widgetIds;
    const fromIndex = widgetIds.indexOf(draggedId);
    const toIndex = widgetIds.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = widgetIds.splice(fromIndex, 1);
    widgetIds.splice(toIndex, 0, moved!);
  }

  function moveWidget(widgetId: string, direction: "up" | "down") {
    if (!currentDashboard.value) return;
    const widgetIds = currentDashboard.value.widgetIds;
    const index = widgetIds.indexOf(widgetId);
    if (index === -1) return;
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= widgetIds.length) return;
    const [moved] = widgetIds.splice(index, 1);
    widgetIds.splice(nextIndex, 0, moved!);
  }

  function removeWidget(widgetId: string) {
    if (!currentState.value) return;
    currentState.value.dashboards.forEach((dashboard) => {
      dashboard.widgetIds = dashboard.widgetIds.filter((id) => id !== widgetId);
    });
    currentState.value.widgets = currentState.value.widgets.filter((widget) => widget.id !== widgetId);
  }

  function setDashboardWidgetOrder(widgetIds: string[]) {
    if (!currentDashboard.value) return;
    currentDashboard.value.widgetIds = [...widgetIds];
  }

  return {
    dashboards,
    widgets,
    widgetsById,
    selectedDashboardId,
    currentDashboard,
    currentWidgets,
    addWidget,
    createDashboard,
    reorderWidgets,
    moveWidget,
    removeWidget,
    setDashboardWidgetOrder,
  };
}

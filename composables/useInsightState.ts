import type { OverviewInsight } from "~/types/mock";

export type InsightUserStatus = "new" | "saved" | "reviewed" | "dismissed";

export type InsightRecord = OverviewInsight & {
  severity?: "critical" | "high" | "medium" | "low";
  platform?: string;
  related_object?: string;
  metric_change?: string;
  recommendation?: string;
  confidence?: string;
  source_view?: string;
};

const STORAGE_KEY = "sv-insight-state";

type InsightStateMap = Record<
  string,
  {
    status: InsightUserStatus;
    note?: string;
  }
>;

function loadState(): InsightStateMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InsightStateMap) : {};
  } catch {
    return {};
  }
}

function saveState(map: InsightStateMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function useInsightState() {
  const state = useState<InsightStateMap>("sv-insight-state", () => ({}));

  onMounted(() => {
    state.value = loadState();
  });

  function persist() {
    saveState(state.value);
  }

  function statusFor(id: string): InsightUserStatus {
    return state.value[id]?.status || "new";
  }

  function noteFor(id: string): string {
    return state.value[id]?.note || "";
  }

  function setStatus(id: string, status: InsightUserStatus) {
    state.value = {
      ...state.value,
      [id]: { ...state.value[id], status },
    };
    persist();
  }

  function setNote(id: string, note: string) {
    state.value = {
      ...state.value,
      [id]: { status: state.value[id]?.status || "reviewed", note },
    };
    persist();
  }

  return {
    statusFor,
    noteFor,
    setStatus,
    setNote,
  };
}

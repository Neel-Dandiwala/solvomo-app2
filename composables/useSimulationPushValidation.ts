import type { ConnectionRow } from "~/types/connections-data";

export type EvolveStatus =
  | "draft"
  | "reviewed"
  | "ready_to_push"
  | "pushed"
  | "failed_validation";

export type PushValidationResult = {
  eligible: boolean;
  failures: string[];
  status: EvolveStatus;
};

type SimulationRow = {
  id: string;
  name: string;
  variant_id?: string;
  audience_id?: string;
  budget_id?: string;
  hydrated?: {
    variants?: Array<{
      platform?: string;
      object_type?: string;
      headline?: string | null;
      primary_text?: string | null;
    }>;
    audience?: Record<string, unknown>;
    budget?: Record<string, unknown>;
  };
  variants?: Array<{
    platform?: string;
    object_type?: string;
    headline?: string | null;
    primary_text?: string | null;
  }>;
  audience?: Record<string, unknown>;
  budget?: Record<string, unknown> | number;
  evolve_status?: string;
};

export function useSimulationPushValidation() {
  const { userConnections } = useConnectionsData();
  const workspace = useWorkspaceContext();

  function activeConnectionsForBrand(): ConnectionRow[] {
    const brandId = workspace.currentBrandProfileId.value;
    return userConnections.value.filter((c) => {
      if (!c.is_active) return false;
      if (!brandId || !c.brandprofile_id) return true;
      return c.brandprofile_id === brandId;
    });
  }

  function validatePush(simulation: SimulationRow): PushValidationResult {
    const failures: string[] = [];
    const connections = activeConnectionsForBrand();

    if (!connections.length) {
      failures.push("No active connection for this brand profile.");
    }

    const hydrated = simulation.hydrated;
    const variant = hydrated?.variants?.[0] || simulation.variants?.[0];
    if (!variant?.platform && !simulation.variant_id) {
      failures.push("Platform is required.");
    }

    if (!variant?.headline && !variant?.primary_text && !simulation.variant_id) {
      failures.push("Creative copy or asset is required.");
    }

    const audience = hydrated?.audience || simulation.audience;
    const hasAudience =
      Boolean(simulation.audience_id) ||
      (audience && typeof audience === "object" && Object.keys(audience).length > 0);
    if (!hasAudience) {
      failures.push("Audience is required.");
    }

    const budget = hydrated?.budget || simulation.budget;
    const budgetAmount =
      typeof budget === "number"
        ? budget
        : typeof budget === "object" && budget && "amount" in budget
          ? Number((budget as { amount?: unknown }).amount)
          : 0;
    if (!budgetAmount || budgetAmount <= 0) {
      failures.push("Valid budget is required.");
    }

    if (simulation.evolve_status === "pushed") {
      failures.push("Simulation was already pushed.");
    }

    const eligible = failures.length === 0;
    let status: EvolveStatus = "draft";
    if (simulation.evolve_status === "pushed") status = "pushed";
    else if (!eligible) status = "failed_validation";
    else if (simulation.evolve_status === "reviewed") status = "ready_to_push";
    else if (simulation.evolve_status === "ready_to_push") status = "ready_to_push";
    else status = eligible ? "reviewed" : "draft";

    return { eligible, failures, status };
  }

  return { validatePush, activeConnectionsForBrand };
}

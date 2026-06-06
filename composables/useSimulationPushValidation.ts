import type { ConnectionRow } from "~/types/connections-data";
import type { SimulationEvolveStatus, SimulationRecord } from "~/types/simulation";

export type PushValidationResult = {
  eligible: boolean;
  failures: string[];
  status: SimulationEvolveStatus;
};

type SimulationPushRow = Pick<
  SimulationRecord,
  "id" | "name" | "variant_id" | "audience_id" | "budget_id" | "evolve_status" | "hydrated"
> & {
  variants?: Array<{
    platform?: string;
    object_type?: string;
    headline?: string | null;
    primary_text?: string | null;
    label?: string;
  }>;
  audience?: Record<string, unknown>;
  budget?: Record<string, unknown> | number;
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

  function validatePush(simulation: SimulationPushRow): PushValidationResult {
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
    const hasBudget =
      Boolean(simulation.budget_id) ||
      (budget && typeof budget === "object" && Object.keys(budget).length > 0) ||
      typeof budget === "number";
    if (!hasBudget) {
      failures.push("Budget is required.");
    }

    let status: SimulationEvolveStatus = "draft";
    if (simulation.evolve_status === "pushed") {
      status = "pushed";
    } else if (failures.length) {
      status = "failed_validation";
    } else if (simulation.evolve_status === "reviewed") {
      status = "reviewed";
    } else if (simulation.evolve_status === "ready_to_push") {
      status = "ready_to_push";
    }

    return {
      eligible: failures.length === 0 && status !== "pushed",
      failures,
      status,
    };
  }

  return { validatePush };
}

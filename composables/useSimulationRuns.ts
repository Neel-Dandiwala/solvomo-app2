import type {
  SimulationRunListResponse,
  SimulationRunResult,
} from "~/types/simulation";

export function useSimulationRuns() {
  const api = useApiClient();

  async function listRuns(simulation_id: string): Promise<SimulationRunListResponse> {
    const data = await api.getJson<SimulationRunListResponse>(
      `/simulations/${encodeURIComponent(simulation_id)}/runs`,
    );
    return data ?? { simulation_id, runs: [] };
  }

  async function fetchRun(
    simulation_id: string,
    run_id: string,
  ): Promise<SimulationRunResult | null> {
    try {
      return await api.getJson<SimulationRunResult>(
        `/simulations/${encodeURIComponent(simulation_id)}/runs/${encodeURIComponent(run_id)}`,
      );
    } catch {
      return null;
    }
  }

  return { listRuns, fetchRun };
}

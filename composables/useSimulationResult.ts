import type { SimulationAnalysisTab, SimulationRunResult } from "~/types/simulation";

export interface StoredSimulationResult {
  sim_id: string;
  sim_name: string;
  analysis_tab: SimulationAnalysisTab;
  result: SimulationRunResult;
  ran_at: string;
}

const _stored = ref<StoredSimulationResult | null>(null);
let _hydrated = false;

export function useSimulationResult() {
  const { fetchRun } = useSimulationRuns();

  if (process.client && !_hydrated) {
    _hydrated = true;
    try {
      const raw = sessionStorage.getItem("solvomo_sim_result");
      if (raw) _stored.value = JSON.parse(raw) as StoredSimulationResult;
    } catch (err) {
      console.warn("simulation_result_cache_read_failed", err);
    }
  }

  function storeResult(payload: StoredSimulationResult) {
    _stored.value = payload;
    if (process.client) {
      try {
        sessionStorage.setItem("solvomo_sim_result", JSON.stringify(payload));
      } catch (err) {
        console.warn("simulation_result_cache_write_failed", err);
      }
    }
  }

  function clearResult() {
    _stored.value = null;
    if (process.client) {
      try {
        sessionStorage.removeItem("solvomo_sim_result");
      } catch {
        // ignore
      }
    }
  }

  /** Prefer server-authoritative run; fall back to session cache. */
  async function resolveResult(
    sim_id: string,
    run_id?: string | null,
  ): Promise<SimulationRunResult | null> {
    if (run_id) {
      const fromApi = await fetchRun(sim_id, run_id);
      if (fromApi) return fromApi;
    }
    if (_stored.value?.sim_id === sim_id) return _stored.value.result;
    return null;
  }

  return { stored: _stored, storeResult, clearResult, resolveResult };
}

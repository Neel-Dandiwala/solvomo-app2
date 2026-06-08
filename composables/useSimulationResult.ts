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
  if (process.client && !_hydrated) {
    _hydrated = true;
    try {
      const raw = sessionStorage.getItem("solvomo_sim_result");
      if (raw) _stored.value = JSON.parse(raw) as StoredSimulationResult;
    } catch { /* ignore */ }
  }

  function storeResult(payload: StoredSimulationResult) {
    _stored.value = payload;
    if (process.client) {
      try { sessionStorage.setItem("solvomo_sim_result", JSON.stringify(payload)); } catch { /* ignore */ }
    }
  }

  function clearResult() {
    _stored.value = null;
    if (process.client) { try { sessionStorage.removeItem("solvomo_sim_result"); } catch { /* ignore */ } }
  }

  return { stored: _stored, storeResult, clearResult };
}

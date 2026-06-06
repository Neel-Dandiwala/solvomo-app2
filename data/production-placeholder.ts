import type { SolvomoMockBundle } from "~/types/mock";
import { createSparseProductionBundle } from "~/data/offline-demo-bundles";

/**
 * Production / non-Playground analytics shell — empty KPIs and tables until integrations sync.
 * Live rows will come from tab/integration APIs when wired up.
 */
export function createProductionPlaceholder(session: {
  userId: string;
  email: string;
  name?: string;
}): SolvomoMockBundle {
  return createSparseProductionBundle(session);
}

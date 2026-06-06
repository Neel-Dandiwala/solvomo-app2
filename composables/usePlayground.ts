import type {
  PlaygroundAssetsData,
  PlaygroundSimulationData,
  PlaygroundSpendData,
} from "~/types/mock";
import type { MockConnection } from "~/types/mock";

/**
 * Single gate composable for playground mode. All other composables/pages that need
 * to check playground status or read bundled demo data should call this instead of
 * duplicating isPlayground checks or bundle accesses.
 */
export function usePlayground() {
  const workspace = useWorkspaceContext();
  const appData = useAppData();

  const isPlayground = computed(
    () => workspace.isPlayground.value,
  );

  const bundle = computed(() => appData.bundle.value);

  const spendData = computed((): PlaygroundSpendData | null =>
    bundle.value?.spend_data ?? null,
  );

  const assetsData = computed((): PlaygroundAssetsData | null =>
    bundle.value?.assets_data ?? null,
  );

  const simulationData = computed((): PlaygroundSimulationData | null =>
    bundle.value?.simulation_data ?? null,
  );

  const connectionsShell = computed((): MockConnection[] =>
    bundle.value?.connectionsShell ?? [],
  );

  return {
    isPlayground,
    bundle,
    spendData,
    assetsData,
    simulationData,
    connectionsShell,
  };
}

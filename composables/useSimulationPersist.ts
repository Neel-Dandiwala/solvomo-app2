import type {
  SimulationConfig,
  SimulationPersistBody,
} from "~/types/simulation";

/**
 * Creates immutable asset rows from a hydrated-style config, then returns simulation persist refs.
 */
export function useSimulationPersist() {
  const assets = useAssetsApi();
  const workspace = useWorkspaceContext();

  /**
   * Persists simulation config as asset records, then returns ID refs for the simulation document.
   *
   * All four asset creates run in parallel. If any fail, successfully created assets are
   * archived (soft-deleted) before re-throwing, preventing orphaned records.
   */
  async function persistFromConfig(
    config: SimulationConfig,
    simulationName: string,
  ): Promise<SimulationPersistBody> {
    const ws = config.workspace_id || workspace.currentWorkspaceId.value;
    const bp = config.brandprofile_id || workspace.currentBrandProfileId.value;
    if (!ws || !bp) {
      throw new Error("Workspace and brand profile are required");
    }

    const base = { workspace_id: ws, brandprofile_id: bp };
    const connections = config.connections ?? [];
    const variant = config.variants?.[0];

    // Run all asset creates in parallel — at most 4 concurrent requests.
    const [creativeResult, audienceResult, budgetResult] = await Promise.allSettled([
      // Creative + variant must be sequential (variant references creative ID)
      (async () => {
        if (!variant) return { creative_id: undefined, variant_id: undefined };
        const creative = await assets.create<{ id: string }>("creative", {
          ...base,
          name: `${simulationName} — ${variant.label || variant.variant_id || "creative"}`,
          source_type: "simulation_snapshot",
          platform: variant.platform,
          object_type: variant.object_type,
          format: variant.format,
          headline: variant.headline,
          primary_text: variant.primary_text,
          asset_url: variant.asset_url,
          thumbnail_url: variant.thumbnail_url,
          call_to_action: variant.call_to_action,
        });
        const va = await assets.create<{ id: string }>("variants", {
          ...base,
          name: `${simulationName} — variant ${variant.variant_id || creative.id}`,
          source_type: "simulation_snapshot",
          slot_key: String(variant.variant_id || creative.id),
          creative_asset_id: creative.id,
          label: variant.label,
          platform: variant.platform,
          object_type: variant.object_type || "ads_ad",
          source: variant.source ?? null,
        });
        return { creative_id: creative.id, variant_id: va.id };
      })(),

      (config.audience && Object.keys(config.audience).length)
        ? assets.create<{ id: string }>("audience", {
            ...base,
            name: `${simulationName} — audience`,
            source_type: "simulation_snapshot",
            definition: config.audience,
          })
        : Promise.resolve(null),

      config.budget
        ? assets.create<{ id: string }>("budgets", {
            ...base,
            name: `${simulationName} — budget`,
            source_type: "simulation_snapshot",
            budget: config.budget,
            bid_strategy: config.bid_strategy,
          })
        : Promise.resolve(null),
    ]);

    const failures = [creativeResult, audienceResult, budgetResult].filter(
      (r) => r.status === "rejected",
    );

    if (failures.length > 0) {
      // Rollback: archive any assets that were successfully created.
      const rollbackIds: Array<{ kind: "creative" | "audience" | "budgets"; id: string }> = [];
      if (creativeResult.status === "fulfilled" && creativeResult.value) {
        const { creative_id, variant_id } = creativeResult.value as { creative_id?: string; variant_id?: string };
        if (creative_id) rollbackIds.push({ kind: "creative", id: creative_id });
        if (variant_id) rollbackIds.push({ kind: "creative", id: variant_id }); // variants share archive endpoint
      }
      if (audienceResult.status === "fulfilled" && audienceResult.value) {
        rollbackIds.push({ kind: "audience", id: (audienceResult.value as { id: string }).id });
      }
      if (budgetResult.status === "fulfilled" && budgetResult.value) {
        rollbackIds.push({ kind: "budgets", id: (budgetResult.value as { id: string }).id });
      }
      await Promise.allSettled(rollbackIds.map((r) => assets.archive(r.kind, r.id)));
      const reason = (failures[0] as PromiseRejectedResult).reason;
      throw reason instanceof Error ? reason : new Error(String(reason));
    }

    const creativeIds = (creativeResult as PromiseFulfilledResult<{ creative_id?: string; variant_id?: string }>).value;
    const audienceAsset = (audienceResult as PromiseFulfilledResult<{ id: string } | null>).value;
    const budgetAsset = (budgetResult as PromiseFulfilledResult<{ id: string } | null>).value;

    return {
      workspace_id: ws,
      brandprofile_id: bp,
      name: simulationName,
      creative_id: creativeIds?.creative_id,
      variant_id: creativeIds?.variant_id,
      audience_id: audienceAsset?.id,
      budget_id: budgetAsset?.id,
      connections,
      brand: config.brand,
      offer: config.offer,
      target_metrics: config.target_metrics,
      output_metrics: config.output_metrics,
      run_request: config.run_request,
      bid_strategy: config.bid_strategy,
    };
  }

  return { persistFromConfig };
}

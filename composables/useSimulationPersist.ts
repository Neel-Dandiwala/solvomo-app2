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
   * Asset creates run sequentially. If any fail, the assets created so far are
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

    // Create each asset sequentially. Track created ids so we can roll back
    // (soft-delete) everything made so far if a later create fails.
    const rollbackIds: Array<{
      kind: "creative" | "audience" | "budgets";
      id: string;
    }> = [];
    let creativeIds: { creative_id?: string; variant_id?: string } = {
      creative_id: undefined,
      variant_id: undefined,
    };
    let audienceAsset: { id: string } | null = null;
    let budgetAsset: { id: string } | null = null;

    try {
      // Creative + variant must be sequential (variant references creative ID).
      if (variant) {
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
        rollbackIds.push({ kind: "creative", id: creative.id });
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
        // variants share the creative archive endpoint
        rollbackIds.push({ kind: "creative", id: va.id });
        creativeIds = { creative_id: creative.id, variant_id: va.id };
      }

      if (config.audience && Object.keys(config.audience).length) {
        audienceAsset = await assets.create<{ id: string }>("audience", {
          ...base,
          name: `${simulationName} — audience`,
          source_type: "simulation_snapshot",
          definition: config.audience,
        });
        rollbackIds.push({ kind: "audience", id: audienceAsset.id });
      }

      if (config.budget) {
        budgetAsset = await assets.create<{ id: string }>("budgets", {
          ...base,
          name: `${simulationName} — budget`,
          source_type: "simulation_snapshot",
          budget: config.budget,
          bid_strategy: config.bid_strategy,
        });
        rollbackIds.push({ kind: "budgets", id: budgetAsset.id });
      }
    } catch (err) {
      // Rollback: archive any assets that were successfully created, one by one.
      for (const r of rollbackIds) {
        try {
          await assets.archive(r.kind, r.id);
        } catch {
          // best-effort rollback; surface the original error below
        }
      }
      throw err instanceof Error ? err : new Error(String(err));
    }

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

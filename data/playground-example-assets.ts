import type { AssetEnvelope, AssetKind } from "~/composables/useAssetsApi";

/**
 * Built-in playground example creatives — served from /public/playground/.
 * Used when the playground bundle has not loaded yet (or fetch failed).
 * IDs match api/src/data/playground.ts CR_1_ID / CR_2_ID.
 */
const PLAYGROUND_EXAMPLE_CREATIVES: AssetEnvelope[] = [
  {
    id: "pg-cr-000000000001",
    name: "Summer Sale — Tropical Glow",
    status: "active",
    source_type: "playground_example",
    format: "IMAGE",
    platform: "instagram",
    headline: "Summer Sale — Up to 30% Off Sitewide",
    asset_url: "/playground/creative_1.png",
    created_at: "2026-02-10T09:00:00.000Z",
    updated_at: "2026-03-15T14:22:00.000Z",
  },
  {
    id: "pg-cr-000000000002",
    name: "Hello Summer — Special Sale",
    status: "active",
    source_type: "playground_example",
    format: "IMAGE",
    platform: "instagram",
    headline: "Hello Summer — 30% Off, Free Shipping",
    asset_url: "/playground/creative_2.png",
    created_at: "2026-02-18T10:30:00.000Z",
    updated_at: "2026-03-10T11:00:00.000Z",
  },
];

/**
 * Two variant slots — each linked to one of the example creatives above.
 * IDs match api/src/data/playground.ts VAR_1_ID / VAR_2_ID.
 */
const PLAYGROUND_EXAMPLE_VARIANTS: AssetEnvelope[] = [
  {
    id: "pg-var-000000000001",
    name: "Summer Sale — Tropical Glow",
    status: "active",
    source_type: "playground_example",
    format: "IMAGE",
    platform: "instagram",
    label: "Variant A",
    parent_creative_id: "pg-cr-000000000001",
    headline: "Summer Sale — Up to 30% Off Sitewide",
    asset_url: "/playground/creative_1.png",
    created_at: "2026-02-12T09:00:00.000Z",
    updated_at: "2026-03-14T10:00:00.000Z",
  },
  {
    id: "pg-var-000000000002",
    name: "Hello Summer — Special Sale",
    status: "active",
    source_type: "playground_example",
    format: "IMAGE",
    platform: "instagram",
    label: "Variant B",
    parent_creative_id: "pg-cr-000000000002",
    headline: "Hello Summer — 30% Off, Free Shipping",
    asset_url: "/playground/creative_2.png",
    created_at: "2026-02-20T11:00:00.000Z",
    updated_at: "2026-03-11T12:00:00.000Z",
  },
];

export function getPlaygroundExampleAssets(kind: AssetKind): AssetEnvelope[] {
  if (kind === "creative") return PLAYGROUND_EXAMPLE_CREATIVES;
  if (kind === "variants") return PLAYGROUND_EXAMPLE_VARIANTS;
  return [];
}

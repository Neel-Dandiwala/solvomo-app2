import type { MockConnection } from "~/types/mock";

/** Shown when the bundle has no connector rows so the page stays product-ready. */
/** Demo shell connection ids for unauthenticated overview states. */
export const demoConnectionsFallback: MockConnection[] = [
  {
    id: "meta",
    name: "Meta Ads",
    description: "Campaigns, ad sets, creatives, delivery.",
    status: "connected",
  },
  {
    id: "google",
    name: "Google Ads",
    description: "Search, Performance Max, and conversion imports.",
    status: "connecting",
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Orders, customers, and lifecycle for CRM alignment.",
    status: "connected",
  },
  {
    id: "csv",
    name: "CSV Upload",
    description: "Structured offline feeds for historical spend and creative metadata.",
    status: "needs_attention",
  },
];

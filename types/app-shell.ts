export interface Workspace {
  id: string;
  name: string;
}

export interface BrandProfileSocial {
  accountId?: string;
  pageId?: string;
  username?: string;
  displayName?: string;
  pageName?: string;
  profileUrl?: string;
  followerCount?: number;
  followingCount?: number;
  pageLikes?: number;
  mediaCount?: number;
  isVerified?: boolean;
  bio?: string;
}

export interface BrandProfileSocialHandle {
  platform: string;
  handle?: string;
  profileUrl?: string;
  connectionId?: string;
  accountId?: string;
  pageId?: string;
  displayName?: string;
  isPrimary?: boolean;
  followerCount?: number;
  followingCount?: number;
  pageLikes?: number;
  mediaCount?: number;
  isVerified?: boolean;
  bio?: string;
  lastFetchedAt?: string;
}

export interface BrandProfile {
  id: string;
  name: string;
  brandName?: string;
  workspaceId: string;
  currency: string;
  attributionPreference: string;
  /** Solvomo Playground brand profile — demo analytics only; cannot be deleted. */
  isPlaygroundSystem?: boolean;
  industry?: string;
  brandRecognition?: string;
  websiteUrl?: string;
  reviewsCount?: number;
  averageRating?: number;
  trustSignals?: string[];
  socialHandles?: BrandProfileSocialHandle[];
  instagram?: BrandProfileSocial;
  facebook?: BrandProfileSocial;
  tiktok?: BrandProfileSocial;
}

/** UI only: production vs Playground mode for the selected brand profile (not a separate persisted entity). */
export type ProfileBadgeKind = "production" | "playground";

export type ConnectionStatus =
  | "not_connected"
  | "connecting"
  | "connected"
  | "connection_issue"
  | "disabled"
  | "coming_soon"
  | "needs_attention";

export interface SidebarNavItem {
  label: string;
  to: string;
  icon?:
    | "overview"
    | "dashboards"
    | "insights"
    | "simulation"
    | "assets"
    | "image"
    | "evolve"
    | "users"
    | "wallet"
    | "plug"
    | "settings";
  children?: SidebarNavItem[];
}

/** Operational alert severity (distinct visual treatment per level). */
export type AlertSeverity = "critical" | "high" | "medium" | "low";

/** Lifecycle state for triage and resolution. */
export type AlertStatus = "open" | "investigating" | "resolved" | "muted";

export interface AlertItem {
  id: string;
  title: string;
  summary: string;
  severity: AlertSeverity;
  status: AlertStatus;
  /** Affected system, connector, or surface (e.g. “Meta Ads · Prospecting”). */
  source?: string;
  created_at: string;
}

export interface LabVersionRow {
  id: string;
  name: string;
  budget: string;
  platform: string;
  expectedRoi: string;
  confidence: string;
  status: "draft" | "ready" | "deployed";
}

export interface DataTableColumn {
  key: string;
  label: string;
  class?: string;
  headerClass?: string;
}

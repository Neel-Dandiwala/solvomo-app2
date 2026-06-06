export interface ConnectionRow {
  id: string;
  connection_slug: string;
  is_active: boolean;
  /** Vendor OAuth/API tier (e.g. production Graph URLs). */
  vendor_environment?: string;
  brandprofile_id?: string;
  created_at?: string;
}

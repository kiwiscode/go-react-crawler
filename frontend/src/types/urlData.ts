// UrlStatus type defines the possible states of a URL during analysis
export type UrlStatus = "all" | "queued" | "running" | "done" | "error";

// UrlData interface defines the structure of the URL data used in the app
// This data is to be used throughout the app to avoid repeating ourselves
export interface UrlData {
  id: number;
  user_id: number;
  url: string;
  status: UrlStatus;
  should_pause: boolean;
  title: string;
  html_version: string;
  heading_counts: any | null;
  internal_links_count: number;
  external_links_count: number;
  has_login_form: boolean;
  inaccessible_links_count: number;
  inaccessible_links: any | null;
  internal_links: any | null;
  external_links: any | null;
  created_at: string;
  updated_at: string;
}

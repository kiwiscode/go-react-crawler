package models

import "time"

type LinkDetail struct {
    URL        string `json:"url"`
    Text       string `json:"text,omitempty"`
}

type URL struct {
    ID                   int                 `db:"id" json:"id"`
    UserID               int                 `db:"user_id" json:"user_id"`
    URL                  string              `db:"url" json:"url"`
    Status               string              `db:"status" json:"status"` // queued, running, done/error
    Title                string              `db:"title" json:"title"`
    HTMLVersion          string              `db:"html_version" json:"html_version"`
    HeadingCounts        map[string]int      `db:"heading_counts" json:"heading_counts"` 
    InternalLinksCount   int                 `db:"internal_links_count" json:"internal_links_count"`
    ExternalLinksCount   int                 `db:"external_links_count" json:"external_links_count"`
    HasLoginForm     bool                    `db:"has_login_form" json:"has_login_form"`
    InaccessibleLinksCount int               `db:"inaccessible_links_count" json:"inaccessible_links_count"`
    InaccessibleLinks    []LinkDetail        `db:"inaccessible_links" json:"inaccessible_links"`
    InternalLinks        []LinkDetail        `db:"internal_links" json:"internal_links"`
    ExternalLinks        []LinkDetail        `db:"external_links" json:"external_links"`
    CreatedAt            time.Time           `db:"created_at" json:"created_at"`
    UpdatedAt            time.Time           `db:"updated_at" json:"updated_at"`
}

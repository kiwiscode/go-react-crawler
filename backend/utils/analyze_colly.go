package utils

// ### ISSUE / IMPORTANT with Colly and React SPA pages
// When using Colly to scrape pages served by React (or other client-side rendered frameworks), the scraper receives only the initial static HTML served by the server, which typically does not include the dynamically rendered content such as `<h1>`, `<h2>`, or page titles that React generates on the client side.
import (
	"net/url"
	"strconv"
	"strings"

	"github.com/gocolly/colly"
)

// Return type: a struct containing all analysis results
type AnalysisResult struct {
	HTMLVersion       string         `json:"html_version"`
	Title             string         `json:"title"`
	HeadingCounts     map[string]int `json:"heading_counts"`
	InternalLinks     int            `json:"internal_links"`
	ExternalLinks     int            `json:"external_links"`
	InaccessibleLinks int            `json:"inaccessible_links"`
	HasLoginForm      bool           `json:"has_login_form"`
}

func AnalyzeURL(targetURL string) (*AnalysisResult, error) {
	c := colly.NewCollector()

	result := &AnalysisResult{
		HeadingCounts: make(map[string]int),
	}

	parsedURL, _ := url.Parse(targetURL)
	domain := parsedURL.Host

	// HTML version
	// It's difficult to extract the HTML version from the response body (because Colly provides a plain body, not a DOM)
	// Therefore, an alternative approach can be used to extract the HTML version
	c.OnResponse(func(r *colly.Response) {
		body := string(r.Body)
		if strings.Contains(body, "<!DOCTYPE html>") {
			result.HTMLVersion = "HTML5"
		} else if strings.Contains(body, "-//W3C//DTD XHTML 1.0") {
			result.HTMLVersion = "XHTML 1.0"
		} else {
			result.HTMLVersion = "Unknown"
		}
	})

	// Page title
	c.OnHTML("title", func(e *colly.HTMLElement) {
		result.Title = e.Text
	})

	// Heading counts
	for i := 1; i <= 6; i++ {
    tag := "h" + strconv.Itoa(i)
    c.OnHTML(tag, func(e *colly.HTMLElement) {
        result.HeadingCounts[tag]++
    })
	}

	// Link analysis
	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		href := e.Attr("href")
		link, err := url.Parse(href)
		if err != nil {
			result.InaccessibleLinks++
			return
		}

		if link.Host == "" || strings.Contains(link.Host, domain) {
			result.InternalLinks++
		} else {
			result.ExternalLinks++
		}
	})

	// Login form check
	c.OnHTML("form", func(e *colly.HTMLElement) {
		if strings.Contains(strings.ToLower(e.Text), "login") || e.ChildAttr("input[type='password']", "type") == "password" {
			result.HasLoginForm = true
		}
	})

	err := c.Visit(targetURL)
	if err != nil {
		return nil, err
	}

	return result, nil
}

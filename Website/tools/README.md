# Search indexing

Production is built from `Website/v1` and published at `https://qrsntu.org`.

Run `python Website/tools/generate_seo.py` after adding or editing public pages.
It creates static canonical tags, descriptions, social metadata, JSON-LD,
`robots.txt`, `sitemap.xml`, and the accessible `/site-map/` directory.
`--check` reports stale generated files. The Pages workflow regenerates these
files before Jekyll and validates the built output before deployment.

Run `python Website/tools/check_seo.py` to validate the source or add
`--site Website/v1/_site` for the build and `--live` for production.

Only canonical public index pages belong in the sitemap. Redirect aliases,
font documentation, template fragments, and campus previews are excluded.
Keep preview pages crawlable so Google can read their existing `noindex` tags.
Do not add robots.txt disallows for CSS, JavaScript, JSON, or those previews.
The branch generator strips NTU SEO metadata before making noindex previews.
PDF notes currently link to GitHub rather than being deployed under this domain;
they are not URLs in this site's sitemap. Dates are omitted instead of assigning
inaccurate last-modified dates on every deployment.

Search Console audit (2026-09-09; report last updated 2026-09-04):

- No submitted sitemaps.
- 8 indexed pages; 5 not indexed.
- Duplicate without user-selected canonical: `/about` and `/index.html`.
- Page with redirect: HTTPS www, HTTP www, and HTTP apex homepages.
- Crawled, currently not indexed: 0. No discovered, currently not indexed
  category was shown.

The preferred URLs are HTTPS, non-www, and trailing-slash directories.
Submit `https://qrsntu.org/sitemap.xml` after verifying deployment. Redirect
sources are expected to remain excluded; the destination is the indexable URL.
Sitemaps and schema help discovery and interpretation but cannot guarantee indexing.

# Search indexing

Production is built from `Website/v1` and published at `https://qrsntu.org`.

Research and Academy pages are generated from V1 JSON and a shared template:
run `python Website/tools/generate_research.py` before SEO generation.
`--check` detects stale project/cohort pages. Run
`python Website/tools/check_research.py` for schema, relationships, accepted-only
visibility, cohort, route and internal-link audits, then regenerate campus
previews with `python Website/v1/branches/build_drafts.py`.

Optional browser regression checks: serve V1 on port 8765, then run
`node Website/tools/check_research_browser.cjs` with Playwright available.
An optional first argument supplies the Playwright package path. This checks
390px/1280px layouts, data rendering, all member links, profiles, migration
redirects and campus routing without adding a production dependency.

Run `python Website/tools/generate_seo.py` after adding or editing public pages.
It creates static canonical tags, descriptions, social metadata, JSON-LD,
`robots.txt`, `sitemap.xml`, and the accessible `/site-map/` directory.
`--check` reports stale generated files. The Pages workflow regenerates these
files before Jekyll and validates the built output before deployment.

Run `python Website/tools/check_seo.py` to validate the source or add
`--site Website/v1/_site` for the build and `--live` for production.

Only canonical public index pages belong in the sitemap. Redirect aliases,
font documentation, template fragments, and campus previews are excluded.

Production pages use `assets/tailwind.css`, compiled locally rather than the
blocking Tailwind browser CDN. After changing HTML or renderer utility classes,
rebuild it (the deployment workflow runs this after page generation):

```sh
npx --yes --package tailwindcss@3.4.17 tailwindcss --config Website/tools/tailwind.config.cjs --input Website/tools/tailwind-input.css --output Website/v1/assets/tailwind.css --minify
node Website/tools/test_profile_loading.mjs
```

Lucide loads asynchronously. Profile About text is present in generated HTML,
and failed JSON enhancement keeps that content instead of replacing it.

Run `node Website/tools/generate_project_index.mjs` after data changes and before
`generate_seo.py` and `branches/build_drafts.py`. It uses the browser's shared
`project-card.js` renderer to include the complete catalog in initial HTML.
`--check` detects stale cards. Search and filters enhance the same catalog.
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

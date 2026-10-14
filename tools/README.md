# Search indexing

Production is the static folder `site/`, published at `https://qrsntu.org`.

`python tools/build.py` runs every generator below in order and `python tools/check.py` runs
every check; CI runs exactly these two commands and publishes `site/` (see `docs/hosting.md`).
The individual steps are described here for when you need one on its own.

Research and Academy pages are generated from `site/data/` JSON and a shared template:
run `python tools/generate_research.py` before SEO generation.
`--check` detects stale project/cohort pages. Run
`python tools/check_research.py` for schema, relationships, accepted-only
visibility, cohort, route and internal-link audits, then regenerate campus
previews with `python tools/branches/build_drafts.py`.

Optional browser regression checks: serve `site/` on port 8765, then run
`node tools/check_research_browser.cjs` with Playwright available.
An optional first argument supplies the Playwright package path. This checks
390px/1280px layouts, data rendering, all member links, profiles, migration
redirects and campus routing without adding a production dependency.

Run `python tools/generate_seo.py` after adding or editing public pages.
It creates static canonical tags, descriptions, social metadata, JSON-LD,
`robots.txt`, `sitemap.xml`, and the accessible `/site-map/` directory.
`--check` reports stale generated files. The Pages workflow regenerates these
files and validates them before deployment.

Run `python tools/check_seo.py` to validate the source or add
`--live` to check production.

Only canonical public index pages belong in the sitemap. Redirect aliases,
font documentation, template fragments, and campus previews are excluded.

Production pages use `assets/tailwind.css`, compiled locally rather than the
blocking Tailwind browser CDN. After changing HTML or renderer utility classes,
rebuild it (the deployment workflow runs this after page generation):

```sh
npx --yes --package tailwindcss@3.4.17 tailwindcss --config tools/tailwind.config.cjs --input tools/tailwind-input.css --output site/assets/tailwind.css --minify
node tools/test_profile_loading.mjs
```

Lucide loads asynchronously. Profile About text is present in generated HTML,
and failed JSON enhancement keeps that content instead of replacing it.

Run `node tools/generate_project_index.mjs` after data changes and before
`generate_seo.py` and `tools/branches/build_drafts.py`. It uses the browser's shared
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

## News

`/news/` lists curated items from `site/data/news.json` together with every event in
`site/data/events.json` (an event appears automatically unless a curated item names it in
`event_id`). Each item has `id`, `date` (YYYY-MM-DD), `type` (announcement, research, event,
release, guide or award), `title`, `summary` and `url`, and may list `project_ids`.
`node tools/generate_news.mjs` writes the static list on `/news/`, the three-item strip on the
homepage and the RSS feed at `/news/feed.xml`, using the browser's renderer
(`site/assets/news-card.js`); the page then adds search and filters. `--check` reports stale output.
Long-form items are ordinary HTML pages under `site/news/<slug>/`.

## Project microsites (projects/)

Projects with their own pages keep everything in `projects/<id>/` at the repository root:
`page.json` (routes, stylesheets, scripts), `build/` (page templates), `public/` (CSS, JS,
figures, video) and their authoring sources. `generate_research.py` renders the routes into
`site/projects/<id>/` and copies `public/` to `site/projects/<id>/assets/`; templates refer to
those files with `{{assets}}` and inline SVGs with `{{svg:name.svg}}`. Projects without a
`page.json` keep the standard generated page. See `projects/geoaft/README.md`.

A `page.json` may set `"base"` to publish somewhere other than `/projects/<id>/`, and `"kind"` for
the page's `data-page` value (default `projects`). A folder under `projects/` whose id is not in
`projects.json` is rendered only if its `page.json` sets `base`; such pages (explainers, guides)
have no project data, so only `{{root}}`, `{{assets}}` and `{{svg:...}}` are available, and
`public/` is served at `/<base>/assets/`. They do not appear in the Projects list. Example:
`projects/post-training/` publishes `/learn/post-training/` with `"base": "learn/post-training"`.
Each page entry may also set `"lang"` (the `<html lang>`, default `en`; `generate_seo.py` copies it to
the JSON-LD `inLanguage`) and `"alternates"`, a map from hreflang code to a route under `base`,
which becomes `<link rel="alternate" hreflang=...>` tags (used by the post-training English and
Chinese guides).

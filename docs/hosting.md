# Hosting

The site is the static folder `site/`. Nothing needs a server-side runtime and there is no
Jekyll step: what is in `site/` after a build is exactly what is published.

```sh
python tools/build.py      # regenerate pages, news, metadata, campus previews and CSS
python tools/check.py      # validate data, routes, links, metadata and generated output
```

Both need Python 3.10+ and Node 20+ and nothing else (the Tailwind step fetches
`tailwindcss@3.4.17` through `npx`; add `--skip-css` to the build when offline).

## GitHub Pages (current)

`.github/workflows/static.yml` runs the two commands on pushes to `main` that touch `site/`,
`tools/` or `projects/`, and after the "Generate Notes JSON" workflow, then uploads `site/`.
In the repository settings, Pages must use "GitHub Actions" as its source.
`.github/workflows/check.yml` runs the same two commands on pull requests, without deploying,
and fails if the build would change committed files. The deploy also publishes a copy of
`projects/geoaft/assets/` at the old `/assets/geoaft/` URLs; on Cloudflare, `_redirects` covers them.

## Cloudflare Pages (possible move)

Cloudflare can build the same folder:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `python tools/build.py --target cloudflare` |
| Build output directory | `site` |
| Environment variables | `PYTHON_VERSION=3.12`, `NODE_VERSION=20` |

`--target cloudflare` also writes `site/_redirects` (every moved URL as a real 301 instead of
the meta-refresh pages GitHub Pages needs) and `site/_headers` (basic security headers and asset
caching). They are build output only; do not commit them.

Steps when moving:
1. Connect the repository in Cloudflare Pages with the settings above and check the preview URL.
2. Move the `qrsntu.org` DNS to Cloudflare, add the custom domain to the Pages project, and keep
   the apex as the canonical host (www redirects to it, as now).
3. Disable the GitHub Pages workflow (or delete `static.yml`) once Cloudflare serves the domain,
   and keep `tools/check.py` in CI as a pull-request check.
4. Resubmit `https://qrsntu.org/sitemap.xml` in Search Console.

Things that behave the same on both hosts: trailing-slash directory URLs, `404.html` if one is
added, and the `?v=` cache-busting versions on shared CSS and JS.

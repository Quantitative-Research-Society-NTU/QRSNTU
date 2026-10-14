# Post-training explainer

Everything for `/learn/post-training/` (overview) and `/learn/post-training/guide/` (the long read).
This is an explainer, not a QRS research project: it has no entry in `site/data/projects.json` and
does not appear in the Projects list. `page.json` sets `"base": "learn/post-training"`, which tells
`tools/generate_research.py` where to publish it.

| Path | What it is |
|---|---|
| `page.json` | Base route, routes, titles, stylesheet and script; read by `tools/generate_research.py` |
| `content/*.src.html` | Page text, with LaTeX and `{{cite:key}}` / `{{citet:key}}` citations |
| `build/*.html` | Templates written by `build_content.py` (static MathML, rendered references); do not edit |
| `references.json` | Every cited work: authors, title, year, venue, arXiv id or URL |
| `build_figures.mjs` | Writes the no-JavaScript SVG figures into `public/` using the same code as the live figures |
| `public/pt.js` | Page behaviour and all interactive figures (pure JS/SVG, deterministic, seeded) |
| `public/pt.css` | Styles, scoped to `.pt`; same tokens and components as the GeoAFT microsite |

After editing text, references or figures:

```sh
node projects/post-training/build_figures.mjs       # needs Node 20+
python projects/post-training/build_content.py      # needs: pip install latex2mathml
python tools/build.py && python tools/check.py
```

`build_content.py` fails if a citation key is missing from `references.json` or if a reference is
never cited. Bump `version` in `page.json` whenever `pt.css` or `pt.js` changes.

All probabilities, rewards and simulations in the figures are illustrative toys and are labelled as
such on the page. Every other factual claim cites a primary source in the guide's References section.

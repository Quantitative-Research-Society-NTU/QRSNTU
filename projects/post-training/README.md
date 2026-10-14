# Post-training explainer

Everything for `/learn/post-training/` (overview), `/learn/post-training/guide/` (the long read) and
`/learn/post-training/zh/` (its Chinese edition).
This is an explainer, not a QRS research project: it has no entry in `site/data/projects.json` and
does not appear in the Projects list. `page.json` sets `"base": "learn/post-training"`, which tells
`tools/generate_research.py` where to publish it.

| Path | What it is |
|---|---|
| `page.json` | Base route, routes, titles, stylesheet and script; read by `tools/generate_research.py` |
| `content/*.src.html` | Page text (`index`, `guide`, `zh`), with LaTeX, `{{cite:key}}` / `{{citet:key}}` citations, `{{toy:...}}` running-example numbers and `{{minutes:N}}` reading times |
| `build/*.html` | Templates written by `build_content.py` (static MathML, rendered references); do not edit |
| `references.json` | Every cited work: authors, title, year, venue, arXiv id or URL |
| `build_figures.mjs` | Writes the no-JavaScript SVG figures into `public/`, and `toy.json`, using the same code as the live figures |
| `toy.json` | Derived numbers of the running example (defined once as `TOY` in `public/pt.js`); generated, do not edit |
| `public/pt.js` | Page behaviour, the reading-mode toggle and all interactive figures (pure JS/SVG, deterministic, seeded); interface strings in English and Chinese |
| `public/pt.css` | Styles, scoped to `.pt`; same tokens and components as the GeoAFT microsite |

After editing text, references or figures:

```sh
node projects/post-training/build_figures.mjs       # needs Node 20+
python projects/post-training/build_content.py      # needs: pip install latex2mathml
python tools/build.py && python tools/check.py
```

`build_content.py` fails if a citation key is missing from `references.json` or if a reference is
never cited. Bump `version` in `page.json` whenever `pt.css` or `pt.js` changes.

The running example (one prompt, six replies) is defined once in `public/pt.js`; change it there and
rebuild, and the hero, figures 2, 3, 9 and 10 and the example panels in both languages follow.
The Chinese edition (`content/zh.src.html`) mirrors the English guide section by section; keep the
two in step. In-figure SVG labels stay in English; controls and readouts follow the page language.

All probabilities, rewards and simulations in the figures are illustrative toys and are labelled as
such on the page. Every other factual claim cites a primary source in the guide's References section.

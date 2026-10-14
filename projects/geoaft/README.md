# GeoAFT project microsite

Everything for `/projects/geoaft/` and `/projects/geoaft/details/` lives here.

| Path | What it is |
|---|---|
| `page.json` | Routes, titles, stylesheets and scripts; read by `tools/generate_research.py` |
| `content/*.src.html` | Page text, with LaTeX and `{{ev:key}}` evidence placeholders |
| `build/*.html` | Templates written by `build_content.py` (static MathML); do not edit |
| `evidence.json` | The only place displayed numbers are stored |
| `source/*.csv` | The author's per-method plot data for the results scatter |
| `build_figures.py` | Writes the SVG figures and `toy.json` into `public/` (standard library only) |
| `public/` | CSS, JS, figures and the 480p video; served at `/projects/geoaft/assets/` |
| `video/` | Narration (`script.py` → `NARRATION.md`), storyboard, animatic and renderer |

After editing evidence, content or figures:

```sh
python projects/geoaft/build_figures.py
python projects/geoaft/build_content.py      # needs: pip install latex2mathml
python tools/build.py && python tools/check.py
```

Templates use `{{assets}}` for files in `public/` and `{{svg:name.svg}}` to inline a figure;
`{{team}}`, `{{accepted}}`, `{{related}}` and `{{status}}` come from the site data.

The explainer video (silent; no subtitles) is rendered from `video/animatic.html`:

```sh
python projects/geoaft/video/script.py
python projects/geoaft/video/build_animatic.py
python projects/geoaft/video/render.py --height 480                                         # site copy
python projects/geoaft/video/render.py --scale 2 --crf 18 --out .tmp/geoaft-explainer-1440p.mp4   # upload master, not committed
```

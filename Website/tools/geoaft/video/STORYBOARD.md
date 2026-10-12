# GeoAFT explainer: storyboard (draft)

**Length:** about 2:22 at 155 words per minute (327 words) · **Format:** 1280×720, 24 fps, 2-D motion graphics · **Status:** silent animatic; narration not yet recorded · **Subtitles:** none, by design.

The narration is kept in its own file, [`NARRATION.md`](NARRATION.md), generated from `script.py`. The video carries no subtitles and no caption track; on-screen text is limited to titles, labels and figures. Edit a line in `script.py` and re-run `script.py → build_animatic.py → render.py`, and every timestamp below moves with it.

Visual language matches the website: **navy** is the query and the pretrained model, **ochre** is representation (Q/K) adaptation, and **teal** is relation (geometry) adaptation. Gray marks generic or baseline methods.

## 1. Time-coded storyboard

Times are from `timing.json`; run `script.py` to print the current scene boundaries.

| Time | Scene / beat | Visual and animation | On-screen text |
|---|---|---|---|
| 0:00–0:02 | **The puzzle**: title | Centred title on off-white. | **GeoAFT** · *Geometric Attention Fine-Tuning* · *Adapting how representations relate, not only the representations* |
| 0:02–0:07 | two | Two cards fade in: representations (points) and relation (dot-product rule). | “Representations: queries *q* and keys *k*” · “Relation: the rule for comparing them” · s(q,k) = qᵀk/√d |
| 0:07–0:15 | reps / rule | The points drift with short ochre trails, then settle. A pill appears on each card. | **Fine-tuning changes these** · **Usually inherited from pretraining** |
| 0:15–0:19 | **The intuition**: setup | The project-page figure: query, seven keys, distance grid, colour field, and a ranking of the keys by attention. | *Same points, different relations* · “Current rule” label |
| 0:19–0:23 | euclid | Square grid, circular rings. Nearest key leads the ranking. | *Euclidean distance* |
| 0:23–0:29 | lp | Rings morph to a diamond (p = 1) and then a rounded square (p = 4); ranking rows glide to new places. | *Lp distance, p = …* (live) |
| 0:29–0:34 | maha | Grid stretches along one direction and turns through half a circle. | *Mahalanobis metric: one direction is cheap* |
| 0:34–0:36 | cos | Grid fades; rays from the origin. | *Cosine: only direction matters* |
| 0:36–0:41 | dot | Parallel bands across the query direction. | *Dot product: further along q scores higher* |
| 0:41–0:44 | still | Hold. | **Nothing moved. Only the geometry changed.** · footer: *Illustrative 2-D toy* |
| 0:44–0:52 | **The method**: trainable / term | Fig 3 mechanism wipes in from left to right; then the score equation. | *GeoAFT: a structured term on the attention score* · S_ij = s_base(q_i,k_j) + α_h ḡ_φ(P_q q_i, P_k k_j) |
| 0:52–0:58 | gate | Teal pill appears. | **gate α_h = 0 at initialization ⇒ exactly the pretrained model** |
| 0:58–1:11 | **Tested so far**: setup / three | Three parallel cards; bars fill and the reported recovery fades in on each. | *Tested so far* · tag *synthetic · controlled* · Learned L_p 99.983% · Mahalanobis 99.991% · Structured nonlinear 99.934% · *Not classification accuracy* |
| 1:11–1:15 | field | Fig 4 (per-method scatter, three panels) appears point by point, then the Pareto frontiers. | *Every method we ran* · per-panel headline for GeoAFT and the best other method |
| 1:15–1:35 | qk / scorers / caveat | One method family at a time stays lit beside GeoAFT; the rest dim. | *Low-rank Q/K adaptation: about 40 points behind* → *Generic learned scorers: 6–12 points behind, or thousands of parameters* → *A fixed geometry bank comes almost as close on the L_p target. Not every comparison is a clear win.* |
| 1:35–1:53 | **What the results mean** | Three regime glyphs appear in turn, then their status pills. | 1 Exact reparameterization **(Established analytically)** · 2 Economical parameterization **(Supported in controlled experiments)** · 3 Distinct capacity **(Under investigation)** |
| 1:53–2:12 | **In progress and next** | Status heading, then three research-question cards appear on their beats. | **Real benchmarks: In progress** · *Where this is going (proposed)* · Q1 *When is geometry adaptation actually different?* with chips spherical, hyperbolic, mixed curvature, local metric, learned kernel, dynamic · Q2 *Can geometry become conditional?* · Q3 *Does it survive beyond attention and under compression?* |
| 2:12–2:22 | **Close** | Closing question in ochre (representations) and teal (relate); the URL appears. | *When should adaptation change representations, and when should it change how they relate?* · **GeoAFT** qrsntu.org/projects/geoaft |

A thin teal progress bar runs along the bottom edge throughout. The top-left lockup reads “GeoAFT · draft explainer”, and the top-right reads “QRS · Quantitative Research Society”.

## 2. Assets (shared with the website)

All assets live in `Website/v1/assets/geoaft/` unless noted. Every empirical number comes from `Website/tools/geoaft/evidence.json` or, for the per-method scatter, the plot data in `Website/tools/geoaft/source/`.

| Asset | Used in | Source |
|---|---|---|
| Live geometry figure (`buildLive`) | Video scene 2; project-page hero | `geoaft.js` |
| `fig3-mechanism-wide.svg` | Video scene 3; details page §3 | `build_figures.py` |
| `fig4-methods-wide.svg` | Video scene 4; details page §4 | `build_figures.py` (from `source/*.csv`) |
| `fig5-regime-{1,2,3}.svg` | Video scene 5; details page §5 | `build_figures.py` |
| Equations (MathML) | Video scenes 1 and 3 | `build_animatic.py` (LaTeX → MathML) |
| `video/geoaft-explainer-draft.mp4`, `-poster.jpg` | Details page video embed | `render.py` |
| `NARRATION.md` (this folder) | Voice-over script, kept apart from the video | `script.py` |

Fonts: QRS Frutiger (body), Playfair Display (title lockup), STIX Two Math or Cambria Math (equations).

## 3. Rendering

```
python Website/tools/geoaft/video/script.py          # timing.json + NARRATION.md
python Website/tools/geoaft/video/build_animatic.py  # animatic.html
python Website/tools/geoaft/video/render.py          # MP4 + poster (needs playwright and ffmpeg or imageio-ffmpeg)
```

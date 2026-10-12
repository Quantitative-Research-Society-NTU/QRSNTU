# GeoAFT explainer: script and storyboard (draft)

**Length:** 1:59 at about 155 words per minute (275 words) · **Format:** 1280×720, 24 fps, 2-D motion graphics · **Status:** captioned animatic; narration not yet recorded.

The narration, captions and animatic timing all come from `script.py`. Edit a line there and re-run `script.py → build_animatic.py → render.py`, and every timestamp below moves with it. Visual language matches the website: **navy** is the query and the pretrained model, **ochre** is representation (Q/K) adaptation, and **teal** is relation (geometry) adaptation. Gray marks generic or baseline methods.

## 1. Narration (word for word)

> A pretrained Transformer learns two things: representations, and a rule for comparing them. When we fine-tune, we usually change the representations. The rule that decides which tokens attend to which is simply inherited.
>
> Take one query and seven keys, and hold them fixed. Under the dot product, attention goes to B, furthest along the query’s direction. With Euclidean distance, the nearest key, A, wins. Taxicab distance picks D. An anisotropic metric picks F. Nothing moved. Only the geometry changed.
>
> GeoAFT makes that geometry trainable. It keeps the pretrained score and adds a small structured term, like a learned L-p distance or a Mahalanobis metric. Its gate starts at zero, so training begins exactly at the pretrained model.
>
> We first tested it on synthetic targets with a known relation. GeoAFT recovered over ninety-nine point nine percent of the oracle gap on both targets. That is about forty points ahead of Q/K LoRA, and six to twelve points ahead of tested generic scorers. Not every registered comparison passed: a fixed L-p bank came almost as close. On a nonlinear target, 46 trainable parameters fit about as well as the tested 8,705-parameter MLP: an economy, not a clear win. But theory adds a twist. A Mahalanobis geometry is exactly a bilinear score plus a key-dependent bias: a known score family, not new capacity.
>
> So geometry adaptation is not uniformly better. Some updates are exact reparameterizations, some are more economical, and some may add new capacity. Telling these apart is the real question. So far, the evidence is controlled and synthetic.
>
> When should adaptation change representations, and when should it change how they relate? More on the QRS website.

**Accuracy notes for the voice-over.** “Over ninety-nine point nine percent” covers 99.983% (L_p) and 99.991% (Mahalanobis). “About forty points” covers 39.9–41.7 percentage points of R. “Six to twelve” covers 6.4–12.2 against the tested pair-MLPs. “Fit about as well” reflects R = 0.99934 versus 0.99539, a difference below the preregistered materiality threshold. Do not upgrade any of these to “beats”, “best” or “state of the art”.

## 2. Time-coded storyboard

| Time | Scene / beat | Visual and animation | On-screen text and notation | Transition |
|---|---|---|---|---|
| 0:00–0:06 | **The puzzle**: title | Centred title on off-white; subtitle fades in. | **GeoAFT** · *Adapting how representations relate, not only the representations* | Fade from white |
| 0:06–0:09 | reps | Two cards slide in. Left card: query (navy) and keys (gray rings). The points drift with short ochre trails, so fine-tuning moves them. | “Representations: queries *q* and keys *k*” · ochre pill **Fine-tuning changes these** | Cross-fade 0.6 s |
| 0:09–0:15 | rule | Right card shows the dot-product rule. The drift settles. | s(q,k) = qᵀk/√d · gray pill **Usually inherited from pretraining** | Hold |
| 0:15–0:19 | **The intuition**: setup | Large geometry panel (Fig 2 renderer): query, seven keys A–G, dashed iso-lines. | “Same points, different relations” | Scene fade |
| 0:19–0:24 | dot | Attention lines thicken toward B. Weight bars appear under the panel. | Row: *Dot product → key B · 69%* | — |
| 0:24–0:28 | l2 | Panel cross-fades to circular contours. Attention snaps to A. | *Euclidean distance → key A · 51%* | Cross-fade 0.5 s |
| 0:28–0:30 | lp | Diamond (L1) contours. Attention moves to D. | *Taxicab (L1) distance → key D · 57%* | Cross-fade 0.5 s |
| 0:30–0:35 | maha / still | Elongated ellipses along the cheap direction. Attention moves to F. | *Anisotropic metric → key F · 49%* · **Nothing moved. Only the geometry changed.** · footer: *Illustrative 2-D example* | Cross-fade 0.5 s |
| 0:35–0:45 | **The method**: trainable / term | Fig 3 mechanism wipes in from left to right: query/key → pretrained score (kept) and projections → structured geometry → centring → × α_h → + → softmax. | Title: *GeoAFT: a structured residual on the attention score* · then S_ij = s_base(q_i,k_j) + α_h ḡ_φ(P_q q_i, P_k k_j) | Wipe |
| 0:45–0:51 | gate | The gate chip pulses once, and a teal pill appears. | **gate α_h = 0 at initialization ⇒ exactly the pretrained model** | Hold |
| 0:51–0:56 | **What we found**: setup | The tag appears and the R formula is typeset. | *Controlled · synthetic targets* · R = (L_base − L_method)/(L_base − L_oracle) · *Not classification accuracy* | Scene fade |
| 0:56–1:02 | recovery | Fig 4a. Only the GeoAFT row is visible, with its dot at 100%. | 99.983% (L_p) · 99.991% (Mahalanobis) | Fade |
| 1:02–1:15 | margins / caveat | Comparator rows unmask: pair-MLP band (gray), then Q/K-LoRA band (ochre). The scope footer fades in. | ≈88–94% · 6.4–12.2 pts behind; ≈58–60% · 39.9–41.7 pts behind · footer: *Not all registered superiority comparisons passed: a fixed L_p bank nearly closed the gap. Comparator ranges are derived from reported margins.* | Unmask 0.6 s |
| 1:15–1:24 | params | Fig 4b: log-scale bars, 46 versus 8,705. | **≈189× fewer trainable parameters than the tested PairMLP** · *0.40-point difference, below the preregistered materiality threshold: economy, not superiority* | Fade |
| 1:24–1:34 | twist / equivalence | Expansion typeset. The query-only term is struck through in ochre, then the conclusion appears. | −(q−k)ᵀM(q−k) = 2qᵀMk − kᵀMk ~~− qᵀMq~~ · *same for every key → cancels in softmax* · **bilinear score + key-dependent bias** · *A known score family: recovering it is not new capacity* | Strike 0.8 s |
| 1:34–1:43 | **What this means**: notuniform / regimes | The three regime glyphs appear in turn, about 2 s apart. | 1 Exact reparameterization **(Established analytically)** · 2 Economical parameterization **(Supported in controlled experiments)** · 3 Distinct capacity **(Under investigation)** | Staggered fade |
| 1:43–1:50 | question | Footer scope line fades in. | *So far, the evidence is controlled and synthetic. Broader evaluation is ongoing.* | — |
| 1:50–1:59 | **Close** | The closing question, set in ochre (representations) and teal (relate). The URL appears. | *When should adaptation change representations, and when should it change how they relate?* · **GeoAFT** qrsntu.org/projects/geoaft | Fade to end card |

A thin teal progress bar runs along the bottom edge throughout. The top-left lockup reads “GeoAFT · draft explainer”, and the top-right reads “QRS · Quantitative Research Society”.

## 3. Assets (shared with the website)

All assets live in `Website/v1/assets/geoaft/` unless noted. Every empirical number comes from `Website/tools/geoaft/evidence.json`.

| Asset | Used in | Source |
|---|---|---|
| Geometry panel renderer (`panelSVG`, `TOY`) | Video scene 2; website Fig 2 explorer | `geoaft.js`, mirrored in `build_figures.py` |
| `hero-same-points.svg` | Website hero; optional video thumbnail | `build_figures.py` |
| `fig1-paths-{wide,narrow}.svg` | Website §01; optional B-roll for 0:06–0:15 | `build_figures.py` |
| `fig2-geometry-{wide,grid}.svg` | Website static fallback for the explorer | `build_figures.py` |
| `fig3-mechanism-{wide,narrow}.svg` | Video scene 3; website §03 | `build_figures.py` |
| `fig4a-recovery-*.svg`, `fig4b-params-*.svg` | Video scene 4; website §04 | `build_figures.py` (from `evidence.json`) |
| `fig5-regime-{1,2,3}.svg` | Video scene 5; website §05 | `build_figures.py` |
| Equations (MathML) | Video scenes 1, 3, 4 | `build_animatic.py` (LaTeX → MathML) |
| `video/geoaft-explainer-draft.mp4`, `-poster.jpg`, `.en.vtt` | Website video embed | `render.py`, `script.py` |
| `geoaft-explainer-draft-captioned.mp4` (this folder) | Review copy with burned-in captions | `render.py` |
| `geoaft-social.jpg` | og:image for both pages | Poster frame |

Fonts: QRS Frutiger (body), Playfair Display (title lockup), STIX Two Math or Cambria Math (equations).

## 4. Cutdown (45–60 s, about 60 s at the same pace)

> Fine-tuning usually changes a model’s representations. But attention also depends on a rule for comparing them, and that rule is usually inherited.
>
> Hold a query and its keys fixed, change the geometry, and attention moves to a different key.
>
> GeoAFT makes that geometry trainable: a small, structured term on the attention score, gated from zero so it starts exactly at the pretrained model.
>
> On synthetic targets with a known relation, it recovered more than ninety-nine point nine percent of the oracle gap, about forty points ahead of Q/K LoRA, though a fixed geometry bank came close too. And 46 parameters fit a nonlinear target about as well as the tested 8,705-parameter MLP: an economy, not a clear win.
>
> But a Mahalanobis geometry turns out to be a bilinear score plus a key-dependent bias, a known score family. So far the results are controlled and synthetic; the real question is when geometry adaptation adds something new.

Scene mapping: puzzle cards (0:00–0:09) → geometry panel, fast cuts dot → L2 → L1 → Mahalanobis (0:09–0:15) → mechanism wipe and gate pill (0:15–0:24) → Fig 4a with its scope footer, then Fig 4b (0:24–0:45) → Mahalanobis strike-through (0:45–0:53) → closing question and URL (0:53–1:00). Keep the “controlled · synthetic” tag on screen throughout the results.

## 5. Production notes and next steps

1. **Voice-over.** Record from section 1 at a relaxed 150–160 wpm. Keep a short beat after “Nothing moved.” and after “But theory adds a twist.” If the recording runs long, raise `PAUSE`/`WORDS_PER_SECOND` in `script.py` to match, or retime from the recording, then re-render.
2. **Polish pass.** Ease the attention lines between geometries (currently cross-fades). Animate the query dragging once in scene 2. Add a 1 s logo sting.
3. **Keep the scope line** (“controlled and synthetic”) on screen during the results scenes. Do not add natural-task numbers until they are released on the website.
4. Re-render: `python -m http.server -d Website 8766`, then `python Website/tools/geoaft/video/render.py --fps 24 --poster 34` (add `--font-dir` if Google Fonts is blocked).

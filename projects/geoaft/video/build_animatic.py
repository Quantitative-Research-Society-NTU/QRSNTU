"""Assemble animatic.html: a deterministic, time-addressable rendering of the explainer.

Inputs: timing.json (script.py), evidence.json, the figure SVGs in ../public, and ../public/geoaft.js for
the live geometry figure (the same one as the project page hero). The page exposes
window.renderAt(seconds); render.py screenshots it frame by frame and encodes an MP4. There are no
subtitles: the narration lives only in NARRATION.md. Open the page with ?play to preview in real time.
Serve the repository root as the web root (render.py does this itself): python -m http.server 8766
"""
import json
from pathlib import Path

from latex2mathml.converter import convert

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / 'public'
EV = json.loads((HERE.parent / 'evidence.json').read_text(encoding='utf-8'))


def svg(name):
    return (ASSETS / name).read_text(encoding='utf-8').strip()


def mm(tex, display=False):
    return convert(tex, display='block' if display else 'inline').replace('\n', '')


TIMING = json.loads((HERE / 'timing.json').read_text(encoding='utf-8'))

PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>GeoAFT explainer animatic</title>
<link rel="stylesheet" href="/site/fonts.css">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/projects/geoaft/public/geoaft.css">
<style>
html,body{margin:0;background:#0d1424}
.stage{position:relative;width:1280px;height:720px;overflow:hidden;background:#fbfbfa;color:#374151;
  font-family:'QRS Frutiger','Segoe UI',sans-serif;font-weight:300}
.scene,.layer{position:absolute;inset:0;opacity:0}
.brand{position:absolute;left:48px;top:30px;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#006f76}
.brand b{font-weight:400;color:#11182c;letter-spacing:.04em;text-transform:none;font-family:'Playfair Display',serif;font-size:19px;margin-right:12px}
.prog{position:absolute;left:0;bottom:0;height:4px;background:#00929a}
.mark{position:absolute;right:48px;top:30px;font-size:14px;color:#6b7280}
h1,h2,h3,p{margin:0}
.big-title{font-family:'Playfair Display',serif;font-weight:700;font-size:120px;color:#11182c;letter-spacing:-.01em;line-height:1}
.full-name{font-size:34px;color:#006f76;letter-spacing:.01em}
.full-name b{font-weight:600;color:#11182c}
.serif{font-family:'Playfair Display',serif}
.h2{font-size:44px;color:#11182c;line-height:1.15}
.h3{font-size:28px;color:#11182c}
.body{font-size:24px;line-height:1.45}
.muted{color:#6b7280}
.tag{display:inline-block;font-size:15px;letter-spacing:.1em;text-transform:uppercase;border:1px solid #c4cad3;border-radius:999px;padding:4px 14px;color:#6b7280;vertical-align:middle}
.card{position:absolute;background:#fff;border:1px solid #dfe3e8;border-radius:14px;padding:28px 32px}
.pill{display:inline-block;border-radius:999px;padding:6px 16px;font-size:19px}
.pill-ochre{background:#fbeee2;color:#93480a;border:1px solid #e9b98f}
.pill-gray{border:1px dashed #9aa3af;color:#6b7280}
.pill-teal{background:#e2f3f3;color:#006f76;border:1px solid #9fd3d5}
.pill-navy{background:#183b63;color:#fff}
math{font-family:'STIX Two Math','Cambria Math','Latin Modern Math',math,serif}
.eq{font-size:34px;color:#11182c}
.teal{color:#006f76}
.figwrap svg{width:100%;height:auto;display:block}
.foot{position:absolute;left:48px;right:48px;bottom:40px;font-size:19px;color:#6b7280}
/* intuition: the project-page figure, rendered frame by frame */
#i-live{position:absolute;left:70px;top:84px;width:540px}
#i-live .geo-live-rank li{transition:none;font-size:17px;grid-template-columns:1.4rem minmax(0,1fr) 3.4rem}
#i-rule{font-size:30px;color:#006f76;min-height:84px;line-height:1.3}
/* tested */
.tcard{position:absolute;top:250px;width:330px;height:250px;background:#fff;border:1px solid #dfe3e8;border-top:4px solid #00929a;border-radius:0 0 14px 14px;padding:24px 28px;box-sizing:border-box}
.tcard .num{font-size:64px;color:#11182c;font-variant-numeric:tabular-nums;margin:14px 0 12px;line-height:1}
.tcard .track{height:14px;border-radius:5px;background:#eef0f3;overflow:hidden}
.tcard .track span{display:block;height:100%;background:#00929a;border-radius:5px}
/* regimes */
.regime{position:absolute;top:190px;width:340px}
.regime .glyph svg{width:100%;height:auto}
.regime h3{font-size:24px;color:#11182c;margin:18px 0 12px;font-weight:300}
.regime p{font-size:19px;line-height:1.45}
/* next */
.rq{position:absolute;top:300px;width:340px;border-left:4px solid #183b63;padding:2px 0 2px 20px;box-sizing:border-box}
.rq .n{font-size:17px;letter-spacing:.12em;color:#006f76}
.rq h3{font-size:25px;line-height:1.25;color:#11182c;font-weight:300;margin:6px 0 12px}
.rq p{font-size:19px;line-height:1.45}
.chips{display:flex;flex-wrap:wrap;gap:6px 6px;margin-top:12px;font-size:15px}
.chip{border:1px dashed #9aa3af;border-radius:999px;padding:1px 11px;color:#6b7280}
</style></head>
<body><div class="stage" id="stage">
  <div class="brand"><b>GeoAFT</b>draft explainer</div>
  <div class="mark">QRS · Quantitative Research Society</div>

  <!-- 1. Puzzle -->
  <div class="scene" id="s-puzzle">
    <div class="layer" id="p-title" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px">
      <div class="big-title">GeoAFT</div>
      <div class="full-name"><b>Geo</b>metric <b>A</b>ttention <b>F</b>ine-<b>T</b>uning</div>
      <div class="body muted" style="font-size:26px;margin-top:10px">Adapting how representations relate, not only the representations</div>
    </div>
    <div class="layer" id="p-cards">
      <div class="card" style="left:90px;top:150px;width:470px;height:400px">
        <div class="h3">Representations</div>
        <div class="body muted" style="margin-top:6px">queries <i>q</i> and keys <i>k</i></div>
        <svg id="p-points" viewBox="0 0 470 240" style="width:100%;margin-top:14px"></svg>
        <div id="p-reps-pill" style="opacity:0"><span class="pill pill-ochre">Fine-tuning changes these</span></div>
      </div>
      <div class="card" style="left:720px;top:150px;width:470px;height:400px">
        <div class="h3">Relation</div>
        <div class="body muted" style="margin-top:6px">the rule for comparing them</div>
        <div class="eq" style="margin:78px 0 92px;text-align:center">__EQ_DOT__</div>
        <div id="p-rule-pill" style="opacity:0"><span class="pill pill-gray">Usually inherited from pretraining</span></div>
      </div>
    </div>
  </div>

  <!-- 2. Intuition: one figure, the rule keeps changing -->
  <div class="scene" id="s-intuition">
    <div class="geo" id="i-live"></div>
    <div style="position:absolute;left:690px;top:130px;width:530px">
      <div class="h2">Same points,<br>different relations</div>
      <div class="body muted" style="margin:26px 0 10px;font-size:20px;letter-spacing:.1em;text-transform:uppercase">Current rule</div>
      <div id="i-rule"></div>
      <div class="body" style="margin-top:22px;font-size:21px">Rings and grid are the ruler. Colour is compatibility with <i>q</i>. The bars rank the keys by attention.</div>
      <div id="i-still" class="body" style="margin-top:26px;opacity:0;color:#11182c;font-size:28px">Nothing moved. Only the geometry changed.</div>
    </div>
    <div class="foot" style="left:690px">Illustrative 2-D toy: softmax attention over seven fixed keys.</div>
  </div>

  <!-- 3. Method -->
  <div class="scene" id="s-method">
    <div style="position:absolute;left:60px;top:84px" class="h2">GeoAFT: a structured term on the attention score</div>
    <div class="figwrap" id="m-fig" style="position:absolute;left:90px;top:150px;width:1100px">__FIG3__</div>
    <div id="m-eq" class="eq" style="position:absolute;left:0;right:0;top:572px;text-align:center;opacity:0">__EQ_SCORE__</div>
    <div id="m-gate" style="position:absolute;left:0;right:0;top:646px;text-align:center;opacity:0"><span class="pill pill-teal" style="font-size:21px">gate α<sub>h</sub> = 0 at initialization ⇒ exactly the pretrained model</span></div>
  </div>

  <!-- 4. Tested so far -->
  <div class="scene" id="s-tested">
    <div class="layer" id="t-cards">
      <div style="position:absolute;left:90px;top:100px;width:1100px">
        <div class="h2">Tested so far <span class="tag" style="margin-left:14px">synthetic · controlled</span></div>
        <div class="body" style="margin-top:16px;font-size:22px">Three targets with a known relation. Score: oracle-gap recovery <i>R</i>, where 100% matches the oracle. <b style="font-weight:400;color:#11182c">Not classification accuracy.</b></div>
      </div>
      <div class="tcard" style="left:90px"><div class="h3">Learned L<sub>p</sub></div><div class="num" data-to="__LP__"></div><div class="track"><span></span></div><p class="muted" style="font-size:18px;margin-top:14px">target: an L<sub>p</sub> distance</p></div>
      <div class="tcard" style="left:475px"><div class="h3">Mahalanobis</div><div class="num" data-to="__MAHA__"></div><div class="track"><span></span></div><p class="muted" style="font-size:18px;margin-top:14px">target: a Mahalanobis metric</p></div>
      <div class="tcard" style="left:860px"><div class="h3">Structured nonlinear</div><div class="num" data-to="__NONLIN__"></div><div class="track"><span></span></div><p class="muted" style="font-size:18px;margin-top:14px">__GPARAMS__ trainable parameters</p></div>
    </div>
    <div class="layer" id="t-field">
      <div style="position:absolute;left:60px;top:84px" class="h2">Every method we ran <span class="tag" style="margin-left:14px">synthetic</span></div>
      <div class="figwrap" id="t-fig" style="position:absolute;left:44px;top:158px;width:1192px">__FIG4__</div>
      <div id="t-note" style="position:absolute;left:60px;right:60px;top:600px;font-size:23px;color:#11182c;text-align:center"></div>
    </div>
  </div>

  <!-- 5. Regimes -->
  <div class="scene" id="s-regimes">
    <div style="position:absolute;left:90px;top:96px" class="h2">A geometry update can be one of three things</div>
    <div class="regime" id="r1" style="left:90px"><div class="glyph">__R1__</div><h3>1 · Exact reparameterization</h3><span class="pill pill-navy" id="r1s">Established analytically</span><p style="margin-top:14px">A rewrite of something weights already do</p></div>
    <div class="regime" id="r2" style="left:465px"><div class="glyph">__R2__</div><h3>2 · Economical parameterization</h3><span class="pill pill-teal" id="r2s">Supported in controlled experiments</span><p style="margin-top:14px">The same thing, said with far fewer parameters</p></div>
    <div class="regime" id="r3" style="left:840px"><div class="glyph">__R3__</div><h3>3 · Distinct capacity</h3><span class="pill pill-gray" id="r3s">Under investigation</span><p style="margin-top:14px">Changes a restricted Q/K family cannot reach</p></div>
  </div>

  <!-- 6. In progress and next -->
  <div class="scene" id="s-next">
    <div style="position:absolute;left:90px;top:96px;right:90px">
      <div class="h2">Real benchmarks <span class="pill pill-gray" style="margin-left:14px;vertical-align:middle">In progress</span></div>
      <div id="n-head" class="h3" style="margin-top:56px;opacity:0">Where this is going <span class="tag" style="margin-left:12px">proposed</span></div>
    </div>
    <div class="rq" id="rq1" style="left:90px"><div class="n">QUESTION 1</div><h3>When is geometry adaptation actually different?</h3><p>Every family is paired with a containment control.</p><div class="chips"><span class="chip">spherical</span><span class="chip">hyperbolic</span><span class="chip">mixed curvature</span><span class="chip">local metric</span><span class="chip">learned kernel</span><span class="chip">dynamic</span></div></div>
    <div class="rq" id="rq2" style="left:470px"><div class="n">QUESTION 2</div><h3>Can geometry become conditional?</h3><p>Let it depend on the input, layer, head or local statistics, not one global metric.</p></div>
    <div class="rq" id="rq3" style="left:850px"><div class="n">QUESTION 3</div><h3>Does it survive beyond attention and under compression?</h3><p>JEPA-style latent prediction; encoder, vision and decoder-only models; BF16 → INT8 → INT4.</p></div>
  </div>

  <!-- 7. Close -->
  <div class="scene" id="s-close" style="display:flex;flex-direction:column;justify-content:center;padding:0 140px">
    <div style="font-size:50px;line-height:1.25;color:#11182c">When should adaptation change <span style="color:#93480a">representations</span>, and when should it change <span class="teal">how they relate</span>?</div>
    <div id="c-url" style="margin-top:48px;opacity:0;font-size:28px"><span class="serif" style="font-weight:700;color:#11182c">GeoAFT</span><span class="muted" style="margin-left:18px">qrsntu.org/projects/geoaft</span></div>
  </div>

  <div class="prog" id="prog"></div>
</div>
<script type="module">
import { buildLive } from '/projects/geoaft/public/geoaft.js';
const T = __TIMING__;
const beat = (scene, name) => T.lines.find(l => l.scene === scene && l.beat === name);
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const fadeWin = (t, a, b, d = .5) => clamp((t - a) / d) * clamp((b - t) / d);
const $ = id => document.getElementById(id);
const set = (id, o) => { const e = typeof id === 'string' ? $(id) : id; e.style.opacity = o.toFixed(3); };

// Puzzle: representation points drift (fine-tuning moves them).
const base = [[60, 170], [120, 60], [200, 140], [260, 70], [330, 180], [400, 100], [170, 210]];
function drawPoints(t, amp) {
  const pts = base.map(([x, y], i) => [x + amp * 18 * Math.sin(t * 1.3 + i), y + amp * 12 * Math.cos(t * 1.1 + 2 * i)]);
  let s = pts.slice(1).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#fff" stroke="#64748b" stroke-width="2.5"/>`).join('');
  s += `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="11" fill="#183b63"/>`;
  if (amp > 0) s += base.slice(1).map(([x, y], i) => `<line x1="${x}" y1="${y}" x2="${pts[i + 1][0]}" y2="${pts[i + 1][1]}" stroke="#c05f0c" stroke-width="2" stroke-opacity="${.6 * amp}"/>`).join('');
  $('p-points').innerHTML = s;
}

// Intuition: the project-page figure. Its own script runs Euclidean → L_p → Mahalanobis → cosine → dot
// on a 28.5 s clock; here each narration beat is pinned to the matching stretch of that clock.
const live = buildLive($('i-live'));
const liveRows = [...$('i-live').querySelectorAll('.geo-live-rank li')];
const MARKS = [['setup', 'start', 0], ['euclid', 'end', 1500], ['lp', 'end', 9500], ['maha', 'end', 18500], ['cos', 'end', 21800], ['dot', 'end', 25300]]
  .map(([b, edge, x]) => [beat('intuition', b)[edge], x]);
function figureClock(t) {
  if (t <= MARKS[0][0]) return 0;
  for (let i = 1; i < MARKS.length; i++) if (t <= MARKS[i][0]) { const [t0, x0] = MARKS[i - 1], [t1, x1] = MARKS[i]; return x0 + (x1 - x0) * (t - t0) / (t1 - t0); }
  return MARKS[MARKS.length - 1][1];
}

// Tested: every point of the per-method scatter, grouped by method family.
const points = [...$('t-fig').querySelectorAll('.gf-pt')];
const frontiers = [...$('t-fig').querySelectorAll('.gf-frontier')];
const NOTES = { qk: 'Low-rank Q/K adaptation: about 40 points behind', scorers: 'Generic learned scorers: 6–12 points behind, or thousands of parameters', caveat: 'A fixed geometry bank comes almost as close on the L<sub>p</sub> target. Not every comparison is a clear win.' };
const FOCUS = { qk: 'Q/K / attention PEFT', scorers: 'Generic learned scorer', caveat: 'Fixed geometry / bank' };

const S = T.scenes;
window.renderAt = function (t) {
  for (const [name, s] of Object.entries(S)) set('s-' + name, fadeWin(t, s.start - .25, s.end + .25, .45));
  $('prog').style.width = (100 * t / T.total).toFixed(2) + '%';
  // 1
  const two = beat('puzzle', 'two'), reps = beat('puzzle', 'reps'), rule = beat('puzzle', 'rule');
  set('p-title', fadeWin(t, 0, two.start - .2, .6));
  set('p-cards', clamp((t - two.start + .2) / .6));
  set('p-reps-pill', clamp((t - reps.start - .3) / .5));
  set('p-rule-pill', clamp((t - rule.start - .5) / .5));
  drawPoints(t, clamp((t - reps.start) / 1.0) * (1 - clamp((t - rule.start) / 1.5)));
  // 2
  if (t > S.intuition.start - 1 && t < S.intuition.end + 1) {
    // Ranking rows glide: each row sits at its rank averaged over a short window around t.
    const place = {};
    for (let k = -3; k <= 3; k++) { live(figureClock(t + k * .07) / live.pace); live.order.forEach((n, i) => { place[n] = (place[n] || 0) + i / 7; }); }
    $('i-rule').textContent = live(figureClock(t) / live.pace);
    liveRows.forEach(li => { li.style.transform = `translateY(${(place[li.dataset.k] * live.row).toFixed(1)}px)`; });
  }
  set('i-still', clamp((t - beat('intuition', 'still').start) / .5));
  // 3
  const m0 = S.method.start, term = beat('method', 'term'), gate = beat('method', 'gate');
  const reveal = ease(clamp((t - m0 - .3) / (term.end - m0 - .5)));
  $('m-fig').style.clipPath = `inset(0 ${(100 - 100 * reveal).toFixed(2)}% 0 0)`;
  set('m-eq', clamp((t - term.start - 1.0) / .6));
  set('m-gate', clamp((t - gate.start - .3) / .5));
  // 4
  const three = beat('tested', 'three'), field = beat('tested', 'field');
  set('t-cards', fadeWin(t, S.tested.start - .2, field.start - .1, .4));
  set('t-field', clamp((t - field.start + .1) / .4));
  const grow = ease(clamp((t - three.start - .2) / 2.2));
  document.querySelectorAll('.tcard').forEach(card => {
    const to = Number(card.querySelector('.num').dataset.to);
    card.querySelector('.num').textContent = to.toFixed(3) + '%';   // always the reported value; it fades in as the bar fills
    card.querySelector('.num').style.opacity = grow.toFixed(3);
    card.querySelector('.track span').style.width = (to * grow).toFixed(2) + '%';
  });
  let focus = null, note = '';
  for (const key of ['qk', 'scorers', 'caveat']) if (t >= beat('tested', key).start - .1) { focus = FOCUS[key]; note = NOTES[key]; }
  const since = focus ? Math.min(...['qk', 'scorers', 'caveat'].map(k => t - beat('tested', k).start + .1).filter(v => v >= 0)) : 9;
  points.forEach((pt, i) => {
    const appear = clamp((t - field.start - .3 - 1.6 * i / points.length) / .4);
    const keep = !focus || pt.dataset.family === focus || pt.dataset.family === 'GeoAFT';
    pt.style.opacity = (appear * (keep ? 1 : 1 - .86 * clamp(since / .4))).toFixed(3);
  });
  frontiers.forEach(f => { f.style.opacity = clamp((t - field.start - 2.2) / .6).toFixed(3); });
  $('t-note').innerHTML = note;
  set('t-note', focus ? clamp(since / .4) : 0);
  // 5
  const list = beat('regimes', 'list'), status = beat('regimes', 'status');
  ['r1', 'r2', 'r3'].forEach((id, i) => {
    set(id, clamp((t - list.start - i * (list.end - list.start) / 3.4) / .5));
    set(id + 's', clamp((t - status.start - i * (status.end - status.start) / 3.4) / .4));
  });
  // 6
  set('n-head', clamp((t - beat('next', 'rq1').start + .2) / .5));
  ['rq1', 'rq2', 'rq3'].forEach(id => set(id, clamp((t - beat('next', id).start) / .5)));
  // 7
  set('c-url', clamp((t - beat('close', 'url').start) / .5));
};
window.__ready = document.fonts.ready.then(() => { window.renderAt(0); return true; });
if (location.search.includes('play')) { const t0 = performance.now(); const loop = () => { const t = (performance.now() - t0) / 1000; window.renderAt(t % T.total); requestAnimationFrame(loop); }; loop(); }
</script></body></html>
"""


def main():
    nonlinear = EV['nonlinear_target']['geoaft']
    subs = {
        '__EQ_DOT__': mm(r's(q,k) = \frac{q^{\top}k}{\sqrt{d}}', True),
        '__EQ_SCORE__': mm(r'S_{ij} = s_{\mathrm{base}}(q_i,k_j) + \alpha_h\,\bar g_\phi(P_q q_i, P_k k_j)', True),
        '__FIG3__': svg('fig3-mechanism-wide.svg'),
        '__FIG4__': svg('fig4-methods-wide.svg'),
        '__R1__': svg('fig5-regime-1.svg'),
        '__R2__': svg('fig5-regime-2.svg'),
        '__R3__': svg('fig5-regime-3.svg'),
        '__LP__': f"{EV['controlled_targets']['lp']['geoaft_R_percent']:g}",
        '__MAHA__': f"{EV['controlled_targets']['mahalanobis']['geoaft_R_percent']:g}",
        '__NONLIN__': f"{100 * nonlinear['R']:.3f}",
        '__GPARAMS__': f"{nonlinear['trainable_parameters']:,}",
        '__TIMING__': json.dumps(TIMING),
    }
    page = PAGE
    for k, v in subs.items():
        page = page.replace(k, v)
    (HERE / 'animatic.html').write_text(page, encoding='utf-8', newline='\n')
    print('wrote animatic.html', f'({TIMING["total"]} s)')


if __name__ == '__main__':
    main()

"""Assemble animatic.html: a deterministic, time-addressable rendering of the explainer.

Inputs: timing.json (script.py), the site figure SVGs, and assets/geoaft/geoaft.js for the live
geometry panels. The page exposes window.renderAt(seconds); render.py screenshots it frame by
frame and encodes an MP4. Open the page in a browser with ?play to preview in real time.
Serve Website/ as the web root: python -m http.server -d Website 8766
"""
import json
from pathlib import Path

from latex2mathml.converter import convert

HERE = Path(__file__).resolve().parent
SITE = HERE.parents[2] / 'v1'
ASSETS = SITE / 'assets' / 'geoaft'


def svg(name):
    return (ASSETS / name).read_text(encoding='utf-8').strip()


def mm(tex, display=False):
    return convert(tex, display='block' if display else 'inline').replace('\n', '')


TIMING = json.loads((HERE / 'timing.json').read_text(encoding='utf-8'))

PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>GeoAFT explainer animatic</title>
<link rel="stylesheet" href="/v1/fonts.css">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/v1/assets/geoaft/geoaft.css">
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
.big-title{font-family:'Playfair Display',serif;font-weight:700;font-size:120px;color:#11182c;letter-spacing:-.01em}
.serif{font-family:'Playfair Display',serif}
.h2{font-size:44px;color:#11182c;line-height:1.15}
.h3{font-size:28px;color:#11182c}
.body{font-size:24px;line-height:1.45}
.muted{color:#6b7280}
.tag{display:inline-block;font-size:15px;letter-spacing:.1em;text-transform:uppercase;border:1px solid #c4cad3;border-radius:999px;padding:4px 14px;color:#6b7280}
.card{position:absolute;background:#fff;border:1px solid #dfe3e8;border-radius:14px;padding:28px 32px}
.pill{display:inline-block;border-radius:999px;padding:6px 16px;font-size:19px}
.pill-ochre{background:#fbeee2;color:#93480a;border:1px solid #e9b98f}
.pill-gray{border:1px dashed #9aa3af;color:#6b7280}
.pill-teal{background:#e2f3f3;color:#006f76;border:1px solid #9fd3d5}
.pill-navy{background:#183b63;color:#fff}
.row{display:flex;align-items:baseline;gap:18px;font-size:26px;padding:10px 0;border-bottom:1px solid #e5e7eb}
.row b{font-weight:400;color:#11182c;min-width:270px}
.row span{color:#006f76}
math{font-family:'STIX Two Math','Cambria Math','Latin Modern Math',math,serif}
.eq{font-size:34px;color:#11182c}
.eq-big{font-size:40px;color:#11182c;display:flex;align-items:center;gap:14px;justify-content:center}
.strike{position:relative;display:inline-block}
.strike::after{content:'';position:absolute;left:-6px;right:-6px;top:52%;height:3px;background:#c05f0c;transform:scaleX(var(--s,0));transform-origin:left}
.callout{font-size:22px;color:#93480a}
.teal{color:#006f76}
.figwrap svg{width:100%;height:auto;display:block}
.regime{position:absolute;top:190px;width:340px}
.regime .glyph svg{width:100%;height:auto}
.regime h3{font-size:24px;color:#11182c;margin:18px 0 12px;font-weight:300}
.regime p{font-size:19px;line-height:1.45}
.foot{position:absolute;left:48px;right:48px;bottom:96px;font-size:18px;color:#6b7280}
</style></head>
<body><div class="stage" id="stage">
  <div class="brand"><b>GeoAFT</b>draft explainer</div>
  <div class="mark">QRS · Quantitative Research Society</div>

  <!-- 1. Puzzle -->
  <div class="scene" id="s-puzzle">
    <div class="layer" id="p-title" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px">
      <div class="big-title">GeoAFT</div>
      <div class="body muted" style="font-size:30px">Adapting how representations relate, not only the representations</div>
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

  <!-- 2. Intuition -->
  <div class="scene" id="s-intuition">
    <div id="i-panels" style="position:absolute;left:60px;top:78px;width:560px;height:580px"></div>
    <div style="position:absolute;left:680px;top:120px;width:540px">
      <div class="h2">Same points,<br>different relations</div>
      <div id="i-rows" style="margin-top:34px"></div>
      <div id="i-still" class="body" style="margin-top:34px;opacity:0;color:#11182c">Nothing moved. Only the geometry changed.</div>
    </div>
    <div class="foot" style="left:680px">Illustrative 2-D example: softmax attention over seven fixed keys.</div>
  </div>

  <!-- 3. Method -->
  <div class="scene" id="s-method">
    <div style="position:absolute;left:60px;top:84px" class="h2">GeoAFT: a structured residual on the attention score</div>
    <div class="figwrap" id="m-fig" style="position:absolute;left:90px;top:140px;width:1100px">__FIG3__</div>
    <div id="m-eq" class="eq" style="position:absolute;left:0;right:0;top:568px;text-align:center;opacity:0">__EQ_SCORE__</div>
    <div id="m-gate" style="position:absolute;left:0;right:0;top:650px;text-align:center;opacity:0"><span class="pill pill-teal" style="font-size:21px">gate α<sub>h</sub> = 0 at initialization ⇒ exactly the pretrained model</span></div>
  </div>

  <!-- 4. Evidence -->
  <div class="scene" id="s-evidence">
    <div class="layer" id="e-setup">
      <div style="position:absolute;left:90px;top:150px;width:1100px">
        <span class="tag">Controlled · synthetic targets</span>
        <div class="h2" style="margin:22px 0 40px">What we found so far</div>
        <div style="display:flex;gap:60px;align-items:center">
          <div class="eq">__EQ_R__</div>
          <div class="body" style="max-width:560px">Oracle-gap recovery <i>R</i>: the share of the gap between the unadapted model and the target-generating oracle that a method closes. <b style="font-weight:400;color:#11182c">Not classification accuracy.</b></div>
        </div>
      </div>
    </div>
    <div class="layer" id="e-recovery">
      <div style="position:absolute;left:90px;top:96px" class="h3">Controlled L<sub>p</sub> and Mahalanobis targets <span class="tag" style="margin-left:12px">synthetic</span></div>
      <div class="figwrap" id="e-fig4a" style="position:absolute;left:60px;top:150px;width:1160px">__FIG4A__</div>
      <div class="foot" id="e-caveat" style="opacity:0;font-size:19px;left:90px">Not all registered superiority comparisons passed: a fixed L<sub>p</sub> bank nearly closed the gap. Comparator ranges are derived from reported margins.</div>
    </div>
    <div class="layer" id="e-params">
      <div style="position:absolute;left:90px;top:96px" class="h3">Controlled nonlinear target <span class="tag" style="margin-left:12px">synthetic</span></div>
      <div class="figwrap" style="position:absolute;left:60px;top:150px;width:1160px">__FIG4B__</div>
      <div style="position:absolute;left:150px;top:540px;width:980px" class="body"><span class="teal" style="font-size:30px">≈ 189× fewer trainable parameters than the tested PairMLP</span><br><span class="muted" style="font-size:20px">Recovery differs by 0.40 points, below the preregistered materiality threshold: economy, not superiority. Trainable parameters, not inference cost.</span></div>
    </div>
    <div class="layer" id="e-twist">
      <div style="position:absolute;left:90px;top:120px" class="h2">But theory adds a twist</div>
      <div style="position:absolute;left:0;right:0;top:300px" class="eq-big">
        <span>__EQ_MAHA_L__</span><span>__EQ_MAHA_M__</span><span class="strike" id="e-strike">__EQ_MAHA_R__</span>
      </div>
      <div id="e-cancel" class="callout" style="position:absolute;left:820px;top:380px;width:380px;opacity:0">same for every key → cancels in softmax</div>
      <div id="e-equiv" class="body" style="position:absolute;left:0;right:0;top:500px;text-align:center;opacity:0;font-size:28px;color:#11182c">A Mahalanobis overlay is exactly a <span class="teal">bilinear score + key-dependent bias</span>.<br><span class="muted" style="font-size:22px">A known score family: recovering it is not new capacity.</span></div>
    </div>
  </div>

  <!-- 5. Meaning -->
  <div class="scene" id="s-meaning">
    <div style="position:absolute;left:90px;top:96px" class="h2">Geometry adaptation is not uniformly better</div>
    <div class="regime" id="r1" style="left:90px"><div class="glyph">__R1__</div><h3>1 · Exact reparameterization</h3><span class="pill pill-navy">Established analytically</span><p style="margin-top:14px">Mahalanobis = bilinear score + key bias</p></div>
    <div class="regime" id="r2" style="left:465px"><div class="glyph">__R2__</div><h3>2 · Economical parameterization</h3><span class="pill pill-teal">Supported in controlled experiments</span><p style="margin-top:14px">46 vs 8,705 trainable parameters, similar fit</p></div>
    <div class="regime" id="r3" style="left:840px"><div class="glyph">__R3__</div><h3>3 · Distinct capacity</h3><span class="pill pill-gray">Under investigation</span><p style="margin-top:14px">Changes a restricted Q/K family cannot reach, and that matter downstream</p></div>
    <div class="foot" id="m-foot" style="opacity:0;font-size:21px">So far, the evidence is controlled and synthetic. Broader evaluation is ongoing.</div>
  </div>

  <!-- 6. Close -->
  <div class="scene" id="s-close" style="display:flex;flex-direction:column;justify-content:center;padding:0 140px">
    <div style="font-size:50px;line-height:1.25;color:#11182c">When should adaptation change <span style="color:#93480a">representations</span>, and when should it change <span class="teal">how they relate</span>?</div>
    <div id="c-url" style="margin-top:48px;opacity:0;font-size:28px"><span class="serif" style="font-weight:700;color:#11182c">GeoAFT</span><span class="muted" style="margin-left:18px">qrsntu.org/projects/geoaft</span></div>
  </div>

  <div class="prog" id="prog"></div>
</div>
<script type="module">
import { panelSVG, geometries, TOY, attention } from '/v1/assets/geoaft/geoaft.js';
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

// Intuition: geometry panels by beat with cross-fades.
const order = { setup: 'dot', dot: 'dot', l2: 'l2', lp: 'lp', maha: 'maha', still: 'maha' };
const geos = Object.fromEntries(geometries({ p: 1, angle: 105, q: TOY.query }).map(g => [g[0], g]));
const state = { q: [...TOY.query], p: 1, angle: 105 };
const panelCache = {};
function panel(kind) {
  if (!panelCache[kind]) {
    const [k, title, formula, color] = geos[kind];
    panelCache[kind] = `<svg viewBox="0 0 560 580" style="width:560px;height:580px" class="geo">${panelSVG(k, title, formula, color, 0, 0, 560, 580, 'v' + k, state).svg}</svg>`;
  }
  return panelCache[kind];
}
const panelsEl = $('i-panels');
['dot', 'l2', 'lp', 'maha'].forEach(k => { const d = document.createElement('div'); d.className = 'layer'; d.dataset.kind = k; d.innerHTML = panel(k); d.querySelectorAll('text').forEach(t => { const fs = parseFloat(t.getAttribute('font-size') || 13); t.setAttribute('font-size', fs * 1.35); }); panelsEl.appendChild(d); });
const names = { dot: 'Dot product', l2: 'Euclidean distance', lp: 'Taxicab (L1) distance', maha: 'Anisotropic metric' };
const rowsEl = $('i-rows');
['dot', 'l2', 'lp', 'maha'].forEach(k => {
  const a = attention(k, state); const top = Object.entries(a).sort((x, y) => y[1] - x[1])[0];
  const r = document.createElement('div'); r.className = 'row'; r.dataset.kind = k; r.style.opacity = 0;
  r.innerHTML = `<b>${names[k]}</b><span>→ key ${top[0]} · ${Math.round(100 * top[1])}%</span>`; rowsEl.appendChild(r);
});

// Evidence: hide comparator rows of Fig 4a until the margins beat.
const fig4a = $('e-fig4a').querySelector('svg');
const vb = fig4a.viewBox.baseVal;
const cover = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
cover.setAttribute('x', 0); cover.setAttribute('y', 34 + 74 - 4); cover.setAttribute('width', vb.width); cover.setAttribute('height', 2 * 74 + 2); cover.setAttribute('fill', '#fbfbfa');
fig4a.appendChild(cover);

const S = T.scenes;
window.renderAt = function (t) {
  for (const [name, s] of Object.entries(S)) set('s-' + name, fadeWin(t, s.start - .25, s.end + .25, .45));
  $('prog').style.width = (100 * t / T.total).toFixed(2) + '%';
  // 1
  const reps = beat('puzzle', 'reps'), rule = beat('puzzle', 'rule');
  set('p-title', fadeWin(t, 0, reps.start - .2, .6));
  set('p-cards', clamp((t - reps.start + .2) / .6));
  set('p-reps-pill', clamp((t - reps.start - .8) / .5));
  set('p-rule-pill', clamp((t - rule.start - .5) / .5));
  drawPoints(t, clamp((t - reps.start - .6) / 1.2) * (1 - clamp((t - rule.start) / 1.5)) );
  // 2
  let current = 'dot', since = 99;
  for (const l of T.lines.filter(l => l.scene === 'intuition')) if (t >= l.start - .3) { const k = order[l.beat]; if (k !== current) since = t - (l.start - .3); current = k; }
  const kinds = ['dot', 'l2', 'lp', 'maha'];
  panelsEl.querySelectorAll('.layer').forEach(d => set(d, d.dataset.kind === current ? clamp(since / .5) : 0));
  const prevIdx = kinds.indexOf(current) - 1;
  if (prevIdx >= 0 && since < .5) set(panelsEl.querySelector(`[data-kind="${kinds[prevIdx]}"]`), 1 - since / .5);
  rowsEl.querySelectorAll('.row').forEach(r => { const b = beat('intuition', r.dataset.kind); set(r, clamp((t - b.start - .2) / .4)); });
  set('i-still', clamp((t - beat('intuition', 'still').start) / .5));
  // 3
  const m0 = S.method.start, term = beat('method', 'term'), gate = beat('method', 'gate');
  const reveal = ease(clamp((t - m0 - .3) / (term.end - m0 - .5)));
  $('m-fig').style.clipPath = `inset(0 ${(100 - 100 * reveal).toFixed(2)}% 0 0)`;
  set('m-eq', clamp((t - term.start - 1.5) / .6));
  set('m-gate', clamp((t - gate.start - .3) / .5));
  // 4
  const es = beat('evidence', 'setup'), er = beat('evidence', 'recovery'), em = beat('evidence', 'margins'), ep = beat('evidence', 'params'), et = beat('evidence', 'twist'), eq = beat('evidence', 'equivalence');
  set('e-setup', fadeWin(t, es.start - .2, er.start - .1, .4));
  set('e-recovery', fadeWin(t, er.start - .1, ep.start - .1, .4));
  cover.setAttribute('opacity', (1 - clamp((t - em.start) / .6)).toFixed(3));
  set('e-caveat', clamp((t - beat('evidence', 'caveat').start) / .5));
  set('e-params', fadeWin(t, ep.start - .1, et.start - .1, .4));
  set('e-twist', fadeWin(t, et.start - .1, S.evidence.end + 1, .4));
  $('e-strike').style.setProperty('--s', ease(clamp((t - eq.start - 1.2) / .8)).toFixed(3));
  set('e-cancel', clamp((t - eq.start - 1.8) / .5));
  set('e-equiv', clamp((t - eq.start - 3.0) / .6));
  // 5
  const rr = beat('meaning', 'regimes');
  ['r1', 'r2', 'r3'].forEach((id, i) => set(id, clamp((t - rr.start - i * 2.2) / .5)));
  set('m-foot', clamp((t - beat('meaning', 'question').start - 2.5) / .5));
  // 6
  set('c-url', clamp((t - beat('close', 'url').start) / .5));
};
window.__ready = document.fonts.ready.then(() => { window.renderAt(0); return true; });
if (location.search.includes('play')) { const t0 = performance.now(); const loop = () => { const t = (performance.now() - t0) / 1000; window.renderAt(t % T.total); requestAnimationFrame(loop); }; loop(); }
</script></body></html>
"""


def main():
    page = PAGE
    subs = {
        '__EQ_DOT__': mm(r's(q,k) = \frac{q^{\top}k}{\sqrt{d}}', True),
        '__EQ_SCORE__': mm(r'S_{ij} = s_{\mathrm{base}}(q_i,k_j) + \alpha_h\,\bar g_\phi(P_q q_i, P_k k_j)', True),
        '__EQ_R__': mm(r'R = \frac{L_{\text{base}} - L_{\text{method}}}{L_{\text{base}} - L_{\text{oracle}}}', True),
        '__EQ_MAHA_L__': mm(r'-(q-k)^{\top}M(q-k) \;=', False),
        '__EQ_MAHA_M__': mm(r'2\,q^{\top}Mk - k^{\top}Mk', False),
        '__EQ_MAHA_R__': mm(r'-\,q^{\top}Mq', False),
        '__FIG3__': svg('fig3-mechanism-wide.svg'),
        '__FIG4A__': svg('fig4a-recovery-wide.svg'),
        '__FIG4B__': svg('fig4b-params-wide.svg'),
        '__R1__': svg('fig5-regime-1.svg'),
        '__R2__': svg('fig5-regime-2.svg'),
        '__R3__': svg('fig5-regime-3.svg'),
        '__TIMING__': json.dumps(TIMING),
    }
    for k, v in subs.items():
        page = page.replace(k, v)
    (HERE / 'animatic.html').write_text(page, encoding='utf-8', newline='\n')
    print('wrote animatic.html', f'({TIMING["total"]} s)')


if __name__ == '__main__':
    main()

"""Build the GeoAFT figure set (SVG) from evidence.json and the illustrative 2-D toy.

Outputs go to Website/v1/assets/geoaft/. Every empirical number is read from
evidence.json; geometry panels are computed from TOY, which geoaft.js mirrors.
Standard library only. Run: python Website/tools/geoaft/build_figures.py
"""
import json
import math
from html import escape
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1] / 'v1' / 'assets' / 'geoaft'
EVIDENCE = json.loads((HERE / 'evidence.json').read_text(encoding='utf-8'))

# Shared visual language (validated categorical pair: TEAL vs OCHRE).
INK, BODY, MUTED, RULE, GRID = '#11182c', '#374151', '#6b7280', '#cfd4dc', '#eef0f3'
NAVY, KEY = '#183b63', '#64748b'
TEAL, TEAL_INK, TEAL_TINT = '#00929a', '#006f76', '#e2f3f3'
OCHRE, OCHRE_INK, OCHRE_TINT = '#c05f0c', '#93480a', '#fbeee2'
NEUTRAL = '#8b95a3'

STYLE = """<style>
.gf-t{font-family:'QRS Frutiger','Frutiger','Segoe UI',Inter,system-ui,sans-serif;fill:#374151;font-weight:300}
.gf-h{fill:#11182c;font-weight:400}.gf-m{fill:#6b7280}.gf-strong{font-weight:600}
.gf-x{font-family:'STIX Two Math','Cambria Math','Latin Modern Math','Times New Roman',serif;font-style:italic;fill:#11182c}
.gf-xr{font-family:'STIX Two Math','Cambria Math','Latin Modern Math','Times New Roman',serif;fill:#11182c}
</style>"""

# --------------------------------------------------------------------------------------
# Illustrative toy: one query, seven keys, four compatibility rules. Mirrored in geoaft.js.
TOY = {
    'query': (0.9, 0.6),
    'keys': {'A': (1.32, 0.18), 'B': (2.6, 1.55), 'C': (0.25, 1.75), 'D': (1.62, 0.6),
             'E': (-0.55, 0.75), 'F': (0.5, 1.35), 'G': (0.1, -0.45)},
    'tau': {'dot': 0.8, 'l2': 0.22, 'lp': 0.22, 'maha': 0.22},
    'p': 1.0,
    'maha_angle_deg': 105.0,
    'maha_eig': (0.16, 2.6),   # eigenvalues of M along (angle, angle+90deg)
    'domain': (-1.25, 3.25, -1.05, 2.45),
}


def metric_matrix(angle_deg, eig):
    t = math.radians(angle_deg)
    c, s = math.cos(t), math.sin(t)
    l1, l2 = eig
    # M = R diag(l1, l2) R^T with R's columns (c, s) and (-s, c)
    return ((l1 * c * c + l2 * s * s, (l1 - l2) * c * s), ((l1 - l2) * c * s, l1 * s * s + l2 * c * c))


def score(kind, q, k, p=1.0, M=None):
    dx, dy = k[0] - q[0], k[1] - q[1]
    if kind == 'dot':
        return q[0] * k[0] + q[1] * k[1]
    if kind == 'l2':
        return -math.hypot(dx, dy)
    if kind == 'lp':
        return -((abs(dx) ** p + abs(dy) ** p) ** (1 / p))
    if kind == 'maha':
        return -math.sqrt(dx * (M[0][0] * dx + M[0][1] * dy) + dy * (M[1][0] * dx + M[1][1] * dy))
    raise ValueError(kind)


def attention(kind, q, p=1.0, angle=None):
    M = metric_matrix(TOY['maha_angle_deg'] if angle is None else angle, TOY['maha_eig'])
    logits = {n: score(kind, q, k, p, M) / TOY['tau'][kind] for n, k in TOY['keys'].items()}
    top = max(logits.values())
    w = {n: math.exp(v - top) for n, v in logits.items()}
    z = sum(w.values())
    return {n: v / z for n, v in w.items()}


def f(x):
    return f'{x:.1f}'.rstrip('0').rstrip('.') if abs(x - round(x)) > 1e-9 else str(int(round(x)))


class Frame:
    """Maps toy coordinates into a panel rectangle."""

    def __init__(self, x, y, w, h):
        x0, x1, y0, y1 = TOY['domain']
        self.x, self.y, self.w, self.h = x, y, w, h
        self.s = min(w / (x1 - x0), h / (y1 - y0))
        self.ox = x + (w - self.s * (x1 - x0)) / 2 - self.s * x0
        self.oy = y + (h - self.s * (y1 - y0)) / 2 + self.s * y1

    def __call__(self, px, py):
        return self.ox + self.s * px, self.oy - self.s * py


def contour_paths(kind, fr, q, p=1.0, angle=None):
    """Iso-compatibility curves around q (distance geometries) or level lines (dot)."""
    paths = []
    if kind == 'dot':
        n = math.hypot(*q)
        u = (q[0] / n, q[1] / n)
        v = (-u[1], u[0])
        for i, c in enumerate([-1.5, -0.75, 0.0, 0.75, 1.5, 2.25, 3.0]):
            a = (u[0] * c - v[0] * 6, u[1] * c - v[1] * 6)
            b = (u[0] * c + v[0] * 6, u[1] * c + v[1] * 6)
            (ax, ay), (bx, by) = fr(*a), fr(*b)
            paths.append((f'M{ax:.1f},{ay:.1f}L{bx:.1f},{by:.1f}', i))
        return paths
    M = metric_matrix(TOY['maha_angle_deg'] if angle is None else angle, TOY['maha_eig'])
    for i, r in enumerate([0.3, 0.6, 0.9, 1.2, 1.5, 1.8]):
        pts = []
        for j in range(97):
            t = 2 * math.pi * j / 96
            c, s = math.cos(t), math.sin(t)
            if kind == 'l2':
                dx, dy = r * c, r * s
            elif kind == 'lp':
                e = 2 / p
                dx = r * math.copysign(abs(c) ** e, c) if p > 0 else 0
                dy = r * math.copysign(abs(s) ** e, s)
                # renormalise so the curve is the exact Lp sphere of radius r
                norm = (abs(dx) ** p + abs(dy) ** p) ** (1 / p) or 1
                dx, dy = dx * r / norm, dy * r / norm
            else:
                th = math.radians(TOY['maha_angle_deg'] if angle is None else angle)
                l1, l2 = TOY['maha_eig']
                a1, a2 = r / math.sqrt(l1), r / math.sqrt(l2)
                ex, ey = a1 * c, a2 * s
                dx = ex * math.cos(th) - ey * math.sin(th)
                dy = ex * math.sin(th) + ey * math.cos(th)
            pts.append(fr(q[0] + dx, q[1] + dy))
        d = 'M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + 'Z'
        paths.append((d, i))
    return paths


GEOMETRIES = [
    ('dot', 'Dot product', 'q · k', NAVY),
    ('l2', 'Euclidean distance', '−‖q − k‖<tspan baseline-shift="sub" font-size="10">2</tspan>', TEAL),
    ('lp', 'L1 (taxicab) distance', '−‖q − k‖<tspan baseline-shift="sub" font-size="10">1</tspan>', TEAL),
    ('maha', 'Anisotropic (Mahalanobis)', '−‖q − k‖<tspan baseline-shift="sub" font-size="10">M</tspan>', TEAL),
]


def panel(kind, title, formula, color, x, y, w, h, uid, show_bars=True, label_keys=True,
          ghost=None, title_size=17):
    """One geometry panel: contours, attention lines, fixed keys, optional weight bars."""
    q = TOY['query']
    bars_h = 46 if show_bars else 0
    head = 44 if title else 0
    fr = Frame(x + 6, y + head, w - 12, h - head - bars_h - (14 if show_bars else 0))
    att = attention(kind, q, TOY['p'])
    out = [f'<g data-geometry="{kind}">']
    if title:
        out.append(f'<text class="gf-t gf-h" x="{x + 8}" y="{y + 20}" font-size="{title_size}">{escape(title)}</text>')
        out.append(f'<text class="gf-x" x="{x + 8}" y="{y + 39}" font-size="14.5">s(q, k) = {formula}</text>')
    cx0, cy0 = fr(TOY['domain'][0], TOY['domain'][3])
    cx1, cy1 = fr(TOY['domain'][1], TOY['domain'][2])
    out.append(f'<clipPath id="clip-{uid}"><rect x="{cx0:.1f}" y="{cy0:.1f}" width="{cx1 - cx0:.1f}" height="{cy1 - cy0:.1f}" rx="6"/></clipPath>')
    out.append(f'<rect x="{cx0:.1f}" y="{cy0:.1f}" width="{cx1 - cx0:.1f}" height="{cy1 - cy0:.1f}" rx="6" fill="#fbfbfa" stroke="{RULE}" stroke-width="1"/>')
    out.append(f'<g clip-path="url(#clip-{uid})">')
    for d, i in contour_paths(kind, fr, q, TOY['p']):
        if kind == 'dot':
            opacity = 0.18 + 0.1 * i
            out.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1" stroke-opacity="{min(opacity, .8):.2f}" stroke-dasharray="3 4"/>')
        else:
            fill = color if i == 0 else 'none'
            out.append(f'<path d="{d}" fill="{fill}" fill-opacity="0.10" stroke="{color}" stroke-width="1.1" stroke-opacity="{0.75 - 0.1 * i:.2f}"/>')
    if kind == 'dot':
        a, b = fr(q[0] * 0.15, q[1] * 0.15), fr(q[0] * 2.3, q[1] * 2.3)
        out.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{color}" stroke-width="1.4" stroke-opacity=".55" marker-end="url(#arrow-{uid})"/>')
        out.append(f'<marker id="arrow-{uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="{color}" fill-opacity=".7"/></marker>')
    qx, qy = fr(*q)
    if ghost:
        for n, k in TOY['keys'].items():
            kx, ky = fr(*k)
            out.append(f'<line x1="{qx:.1f}" y1="{qy:.1f}" x2="{kx:.1f}" y2="{ky:.1f}" stroke="{KEY}" stroke-width="{0.6 + 7 * ghost[n]:.2f}" stroke-opacity="{0.15 + 0.35 * ghost[n]:.2f}" stroke-dasharray="4 3" stroke-linecap="round"/>')
    for n, k in TOY['keys'].items():
        kx, ky = fr(*k)
        a = att[n]
        out.append(f'<line x1="{qx:.1f}" y1="{qy:.1f}" x2="{kx:.1f}" y2="{ky:.1f}" stroke="{color}" stroke-width="{0.5 + 8 * a:.2f}" stroke-opacity="{0.18 + 0.8 * a:.2f}" stroke-linecap="round"/>')
    out.append('</g>')
    for n, k in TOY['keys'].items():
        kx, ky = fr(*k)
        a = att[n]
        out.append(f'<circle cx="{kx:.1f}" cy="{ky:.1f}" r="5.5" fill="#fff" stroke="{KEY}" stroke-width="1.6"/>')
        if label_keys:
            pct = f' <tspan class="gf-strong" style="fill:{TEAL_INK if color == TEAL else NAVY}">{round(100 * a)}%</tspan>' if a >= 0.15 else ''
            out.append(f'<text class="gf-t" x="{kx + 8:.1f}" y="{ky - 7:.1f}" font-size="13">{n}{pct}</text>')
    out.append(f'<circle cx="{qx:.1f}" cy="{qy:.1f}" r="8" fill="{NAVY}" stroke="#fff" stroke-width="2.5"/>')
    out.append(f'<text class="gf-x" x="{qx - 6:.1f}" y="{qy - 13:.1f}" font-size="16">q</text>')
    if show_bars:
        by = y + h - bars_h
        names = list(TOY['keys'])
        bw = (w - 16) / len(names)
        out.append(f'<line x1="{x + 8}" y1="{by + 30}" x2="{x + w - 8}" y2="{by + 30}" stroke="{RULE}"/>')
        for i, n in enumerate(names):
            a = att[n]
            bx = x + 8 + i * bw + bw * 0.2
            hgt = 28 * a / max(att.values())
            out.append(f'<rect x="{bx:.1f}" y="{by + 30 - hgt:.1f}" width="{bw * 0.6:.1f}" height="{max(hgt, .8):.1f}" rx="2" fill="{color}" fill-opacity="{0.35 + 0.65 * (a == max(att.values()))}"/>')
            out.append(f'<text class="gf-t gf-m" x="{bx + bw * 0.3:.1f}" y="{by + 44}" font-size="11.5" text-anchor="middle">{n}</text>')
    out.append('</g>')
    return '\n'.join(out)


def svg(width, height, body, label, uid):
    import re
    body = re.sub(r'<(text|tspan)([^>]*?) fill="([^"]+)"', lambda m: f'<{m[1]}{m[2]} style="fill:{m[3]}"', body)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" '
            f'aria-labelledby="{uid}-title" class="geo-svg" width="{width}" height="{height}">'
            f'<title id="{uid}-title">{escape(label)}</title>{STYLE}{body}</svg>\n')


def write(name, content):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(content, encoding='utf-8', newline='\n')
    print('wrote', name)


# --------------------------------------------------------------------------------------
def fig_hero():
    base = attention('dot', TOY['query'])
    body = panel('maha', '', '', TEAL, 0, 0, 520, 400, 'hero', show_bars=False, ghost=base)
    label = ('Illustration: the same query and keys under two compatibility rules. Dashed gray lines show '
             'pretrained dot-product attention, solid teal lines show attention after adapting the geometry; '
             'the points never move.')
    write('hero-same-points.svg', svg(520, 400, body, label, 'hero'))


def fig_geometry():
    for variant, cols, pw, ph in [('wide', 4, 250, 330), ('grid', 2, 270, 330)]:
        rows = math.ceil(len(GEOMETRIES) / cols)
        W, H = cols * pw + (cols - 1) * 16, rows * ph + (rows - 1) * 18
        parts = []
        for i, (kind, title, formula, color) in enumerate(GEOMETRIES):
            c, r = i % cols, i // cols
            parts.append(panel(kind, title, formula, color, c * (pw + 16), r * (ph + 18), pw, ph, f'g{variant}{i}'))
        label = ('Illustration: one query q and seven fixed keys A–G under four compatibility rules. Dot product favours B, '
                 'the key furthest along q; Euclidean distance favours the nearest key A; the L1 rule favours the axis-aligned '
                 'neighbour D; an anisotropic Mahalanobis metric favours F along its cheap direction. Bars show the softmax '
                 'attention weights. Only the rule changes.')
        write(f'fig2-geometry-{variant}.svg', svg(W, H, '\n'.join(parts), label, f'fig2{variant}'))


def box(x, y, w, h, title, sub='', stroke=RULE, fill='#fff', tcolor=INK, size=15.5, math_sub=True, rx=10, dash=''):
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="1.4"{dash}/>']
    ty = y + h / 2 + (-4 if sub else 5)
    out.append(f'<text class="gf-t gf-h" x="{x + w / 2}" y="{ty}" font-size="{size}" text-anchor="middle" fill="{tcolor}">{title}</text>')
    if sub:
        cls = 'gf-x' if math_sub else 'gf-t gf-m'
        out.append(f'<text class="{cls}" x="{x + w / 2}" y="{y + h / 2 + 17}" font-size="14" text-anchor="middle">{sub}</text>')
    return '\n'.join(out)


def arrow(x1, y1, x2, y2, color=MUTED, uid='a', width=1.5, dash=''):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"{dash} marker-end="url(#{uid})"/>')


def markers(prefix):
    out = []
    for name, color in [('m', MUTED), ('t', TEAL), ('o', OCHRE)]:
        out.append(f'<marker id="{prefix}-{name}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="{color}"/></marker>')
    return '<defs>' + ''.join(out) + '</defs>'


def fig_paths():
    # Desktop: left-to-right pipeline with the two adaptation sites marked.
    W, H = 980, 340
    p = 'f1d'
    y, h = 128, 74
    nodes = [(10, 140, 'Token states', '<tspan>x</tspan>'),
             (190, 170, 'Projections', 'W<tspan baseline-shift="sub" font-size="10">Q</tspan>, W<tspan baseline-shift="sub" font-size="10">K</tspan>'),
             (400, 150, 'Representations', 'q, k'),
             (590, 180, 'Compatibility', 's(q, k)'),
             (810, 160, 'Attention', 'softmax over keys')]
    out = [markers(p)]
    for i, (x, w, t, s) in enumerate(nodes):
        stroke = OCHRE if i == 1 else TEAL if i == 3 else RULE
        fill = OCHRE_TINT if i == 1 else TEAL_TINT if i == 3 else '#fff'
        out.append(box(x, y, w, h, t, s, stroke=stroke, fill=fill, math_sub=(i != 4)))
        if i < len(nodes) - 1:
            nx = nodes[i + 1][0]
            out.append(arrow(x + w + 4, y + h / 2, nx - 6, y + h / 2, uid=f'{p}-m'))
    # Conventional PEFT annotation (above projections)
    out.append(f'<text class="gf-t gf-strong" x="275" y="28" font-size="15" text-anchor="middle" fill="{OCHRE_INK}">Conventional PEFT</text>')
    out.append(f'<text class="gf-xr" x="275" y="52" font-size="15" text-anchor="middle"><tspan font-style="italic">W</tspan> + Δ<tspan font-style="italic">W</tspan>  (e.g. LoRA: Δ<tspan font-style="italic">W = BA</tspan>)</text>')
    out.append(f'<text class="gf-t gf-m" x="275" y="76" font-size="13.5" text-anchor="middle">changes how q and k are produced</text>')
    out.append(arrow(275, 86, 275, y - 6, OCHRE, f'{p}-o', 1.8))
    # GeoAFT annotation (below compatibility)
    out.append(arrow(680, 262, 680, y + h + 6, TEAL, f'{p}-t', 1.8))
    out.append(f'<text class="gf-t gf-strong" x="680" y="282" font-size="15" text-anchor="middle" fill="{TEAL_INK}">GeoAFT</text>')
    out.append(f'<text class="gf-x" x="680" y="304" font-size="15" text-anchor="middle">s(q, k) + α g<tspan baseline-shift="sub" font-size="10">φ</tspan>(q, k)</text>')
    out.append(f'<text class="gf-t gf-m" x="680" y="326" font-size="13.5" text-anchor="middle">changes how q and k are compared</text>')
    # indirect effect hint
    out.append(f'<path d="M 360 110 C 470 70, 600 70, 660 120" fill="none" stroke="{OCHRE}" stroke-width="1.2" stroke-dasharray="4 4" stroke-opacity=".7" marker-end="url(#{p}-o)"/>')
    out.append(f'<text class="gf-t gf-m" x="520" y="70" font-size="12.5" text-anchor="middle">scores change indirectly</text>')
    label = ('Diagram: attention computes token states, projections, representations q and k, a compatibility score s(q,k), '
             'and a softmax. Conventional PEFT edits the projections, which changes scores indirectly. GeoAFT adds a '
             'trainable term to the compatibility score itself and leaves q and k unchanged.')
    write('fig1-paths-wide.svg', svg(W, H, '\n'.join(out), label, 'fig1w'))

    # Mobile: vertical pipeline, annotations to the right.
    W, H = 380, 560
    p = 'f1m'
    out = [markers(p)]
    ys = [10, 112, 214, 316, 418]
    titles = [('Token states', 'x'), ('Projections', 'W<tspan baseline-shift="sub" font-size="9">Q</tspan>, W<tspan baseline-shift="sub" font-size="9">K</tspan>'),
              ('Representations', 'q, k'), ('Compatibility', 's(q, k)'), ('Attention', 'softmax over keys')]
    for i, (yy, (t, s)) in enumerate(zip(ys, titles)):
        stroke = OCHRE if i == 1 else TEAL if i == 3 else RULE
        fill = OCHRE_TINT if i == 1 else TEAL_TINT if i == 3 else '#fff'
        out.append(box(10, yy, 170, 70, t, s, stroke=stroke, fill=fill, math_sub=(i != 4), size=15))
        if i < 4:
            out.append(arrow(95, yy + 74, 95, ys[i + 1] - 6, uid=f'{p}-m'))
    out.append(arrow(240, 147, 186, 147, OCHRE, f'{p}-o', 1.8))
    out.append(f'<text class="gf-t gf-strong" x="246" y="128" font-size="14.5" fill="{OCHRE_INK}">Conventional PEFT</text>')
    out.append(f'<text class="gf-xr" x="246" y="150" font-size="14"><tspan font-style="italic">W</tspan> + Δ<tspan font-style="italic">W</tspan></text>')
    out.append(f'<text class="gf-t gf-m" x="246" y="170" font-size="12.5">changes how q, k</text>')
    out.append(f'<text class="gf-t gf-m" x="246" y="186" font-size="12.5">are produced</text>')
    out.append(arrow(240, 351, 186, 351, TEAL, f'{p}-t', 1.8))
    out.append(f'<text class="gf-t gf-strong" x="246" y="332" font-size="14.5" fill="{TEAL_INK}">GeoAFT</text>')
    out.append(f'<text class="gf-x" x="246" y="354" font-size="14">s + α g<tspan baseline-shift="sub" font-size="9">φ</tspan>(q, k)</text>')
    out.append(f'<text class="gf-t gf-m" x="246" y="374" font-size="12.5">changes how q, k</text>')
    out.append(f'<text class="gf-t gf-m" x="246" y="390" font-size="12.5">are compared</text>')
    out.append(f'<text class="gf-t gf-m" x="10" y="520" font-size="12.5">Q/K edits still move the scores —</text>')
    out.append(f'<text class="gf-t gf-m" x="10" y="538" font-size="12.5">indirectly, through q and k.</text>')
    write('fig1-paths-narrow.svg', svg(W, H, '\n'.join(out), label, 'fig1n'))


def fig_mechanism():
    label = ('Diagram of the GeoAFT score: the pretrained score of query q_i and key k_j is kept. In parallel, low-dimensional '
             'projections feed a structured geometry g_phi, whose output is centred over each row’s valid keys and scaled '
             'by a per-head gate alpha_h that starts at zero. The two are added, masked, and passed through one softmax, '
             'so at initialization the attention equals the pretrained attention.')
    sub = '<tspan baseline-shift="sub" font-size="10">'
    W, H = 980, 360
    p = 'f3d'
    out = [markers(p)]
    out.append(box(10, 140, 150, 80, 'Query, key', f'q{sub}i</tspan>, k{sub}j</tspan>'))
    out.append(box(230, 40, 260, 76, 'Pretrained score', f's{sub}base</tspan>(q{sub}i</tspan>, k{sub}j</tspan>)'))
    out.append(box(230, 246, 150, 76, 'Projections', f'P{sub}q</tspan> q, P{sub}k</tspan> k', stroke=TEAL))
    out.append(box(400, 246, 170, 76, 'Structured geometry', f'g{sub}φ</tspan>  (L{sub}p</tspan>, Mahalanobis, …)', stroke=TEAL, fill=TEAL_TINT))
    out.append(box(590, 246, 150, 76, 'Centre over', 'valid keys', stroke=TEAL, math_sub=False))
    out.append(f'<circle cx="790" cy="178" r="22" fill="#fff" stroke="{INK}" stroke-width="1.5"/>')
    out.append(f'<text class="gf-t gf-h" x="790" y="186" font-size="24" text-anchor="middle">+</text>')
    out.append(box(840, 140, 130, 76, 'Mask, softmax', f'A{sub}ij</tspan>'))
    out.append(arrow(164, 170, 226, 86, uid=f'{p}-m'))
    out.append(arrow(164, 196, 226, 280, TEAL, f'{p}-t'))
    out.append(arrow(384, 284, 396, 284, TEAL, f'{p}-t'))
    out.append(arrow(574, 284, 586, 284, TEAL, f'{p}-t'))
    out.append(f'<path d="M 494 78 L 790 78 L 790 150" fill="none" stroke="{MUTED}" stroke-width="1.5" marker-end="url(#{p}-m)"/>')
    out.append(f'<path d="M 744 284 L 790 284 L 790 206" fill="none" stroke="{TEAL}" stroke-width="1.5" marker-end="url(#{p}-t)"/>')
    out.append(f'<rect x="752" y="226" width="76" height="30" rx="15" fill="#fff" stroke="{TEAL}"/>')
    out.append(f'<text class="gf-x" x="790" y="247" font-size="16" text-anchor="middle">× α{sub}h</tspan></text>')
    out.append(arrow(816, 178, 836, 178, uid=f'{p}-m'))
    out.append(f'<text class="gf-t" x="590" y="350" font-size="14" fill="{TEAL_INK}">α{sub}h</tspan> = 0 at initialization  ⇒  exactly the pretrained attention</text>')
    out.append(f'<text class="gf-t gf-m" x="500" y="30" font-size="13" text-anchor="middle">kept as is</text>')
    write('fig3-mechanism-wide.svg', svg(W, H, '\n'.join(out), label, 'fig3w'))

    W, H = 380, 640
    p = 'f3m'
    out = [markers(p)]
    out.append(box(105, 10, 170, 66, 'Query, key', f'q{sub}i</tspan>, k{sub}j</tspan>', size=15))
    out.append(box(10, 120, 160, 70, 'Pretrained score', f's{sub}base</tspan>(q, k)', size=14.5))
    out.append(box(210, 120, 160, 70, 'Projections', f'P{sub}q</tspan> q, P{sub}k</tspan> k', stroke=TEAL, size=14.5))
    out.append(box(210, 222, 160, 70, 'Geometry', f'g{sub}φ</tspan> (L{sub}p</tspan>, Mahal., …)', stroke=TEAL, fill=TEAL_TINT, size=14.5))
    out.append(box(210, 324, 160, 70, 'Centre over', 'valid keys', stroke=TEAL, math_sub=False, size=14.5))
    out.append(f'<rect x="252" y="414" width="76" height="30" rx="15" fill="#fff" stroke="{TEAL}"/>')
    out.append(f'<text class="gf-x" x="290" y="435" font-size="16" text-anchor="middle">× α{sub}h</tspan></text>')
    out.append(f'<circle cx="190" cy="488" r="20" fill="#fff" stroke="{INK}" stroke-width="1.5"/>')
    out.append(f'<text class="gf-t gf-h" x="190" y="496" font-size="22" text-anchor="middle">+</text>')
    out.append(box(105, 534, 170, 66, 'Mask, softmax', f'A{sub}ij</tspan>', size=15))
    out.append(arrow(160, 80, 100, 116, uid=f'{p}-m'))
    out.append(arrow(220, 80, 280, 116, TEAL, f'{p}-t'))
    out.append(arrow(290, 194, 290, 218, TEAL, f'{p}-t'))
    out.append(arrow(290, 296, 290, 320, TEAL, f'{p}-t'))
    out.append(arrow(290, 398, 290, 410, TEAL, f'{p}-t'))
    out.append(f'<path d="M 290 448 L 290 488 L 214 488" fill="none" stroke="{TEAL}" stroke-width="1.5" marker-end="url(#{p}-t)"/>')
    out.append(f'<path d="M 90 194 L 90 488 L 166 488" fill="none" stroke="{MUTED}" stroke-width="1.5" marker-end="url(#{p}-m)"/>')
    out.append(arrow(190, 510, 190, 530, uid=f'{p}-m'))
    out.append(f'<text class="gf-t" x="190" y="626" font-size="13" text-anchor="middle" fill="{TEAL_INK}">α{sub}h</tspan> = 0 at init ⇒ exactly the pretrained attention</text>')
    write('fig3-mechanism-narrow.svg', svg(W, H, '\n'.join(out), label, 'fig3n'))


def fig_recovery():
    ev = EVIDENCE['controlled_targets']
    lp, mh = ev['lp']['geoaft_R_percent'], ev['mahalanobis']['geoaft_R_percent']
    lo_g, hi_g = min(lp, mh), max(lp, mh)
    qk = (lo_g - ev['qk_lora_margin_points'][1], hi_g - ev['qk_lora_margin_points'][0])
    pm = (lo_g - ev['pair_mlp_margin_points'][1], hi_g - ev['pair_mlp_margin_points'][0])
    rows = [('GeoAFT', 'structured geometry residual', TEAL, (lo_g, hi_g),
             (f'{lp:g}% (L<tspan baseline-shift="sub" font-size="9">p</tspan>) · {mh:g}% (Mahalanobis)', f'{lp:g}% · {mh:g}%')),
            ('Generic pair-MLP scorer', 'tested learned scores', NEUTRAL, pm,
             (f'≈{pm[0]:.0f}–{pm[1]:.0f}% · {ev["pair_mlp_margin_points"][0]:g}–{ev["pair_mlp_margin_points"][1]:g} points behind GeoAFT', f'{ev["pair_mlp_margin_points"][0]:g}–{ev["pair_mlp_margin_points"][1]:g} pts behind')),
            ('Q/K-LoRA', 'adapts the projections', OCHRE, qk,
             (f'≈{qk[0]:.0f}–{qk[1]:.0f}% · {ev["qk_lora_margin_points"][0]:g}–{ev["qk_lora_margin_points"][1]:g} points behind GeoAFT', f'{ev["qk_lora_margin_points"][0]:g}–{ev["qk_lora_margin_points"][1]:g} pts behind'))]
    label = (f'Chart: oracle-gap recovery on the controlled L_p and Mahalanobis targets. GeoAFT recovers {lp}% and {mh}% of the gap. '
             f'The tested generic pair-MLP scorers are {ev["pair_mlp_margin_points"][0]}–{ev["pair_mlp_margin_points"][1]} points lower, and '
             f'Q/K-LoRA is {ev["qk_lora_margin_points"][0]}–{ev["qk_lora_margin_points"][1]} points lower; ranges span the two targets.')

    def build(W, left, label_above):
        x0, x1 = left, W - 24
        lo, hi = 50.0, 100.0
        sx = lambda v: x0 + (v - lo) / (hi - lo) * (x1 - x0)
        row_h = 88 if label_above else 74
        top = 34
        H = top + len(rows) * row_h + 56
        out = []
        for t in range(50, 101, 10):
            X = sx(t)
            out.append(f'<line x1="{X:.1f}" y1="{top - 8}" x2="{X:.1f}" y2="{top + len(rows) * row_h}" stroke="{GRID if t != 100 else RULE}" stroke-width="1"/>')
            out.append(f'<text class="gf-t gf-m" x="{X:.1f}" y="{top + len(rows) * row_h + 20}" font-size="13" text-anchor="middle">{t}%</text>')
        axis = 'Oracle-gap recovery R' if label_above else 'Oracle-gap recovery R  (100% = matches the target-generating oracle)'
        out.append(f'<text class="gf-t gf-m" x="{(x0 + x1) / 2:.1f}" y="{top + len(rows) * row_h + 44}" font-size="13.5" text-anchor="middle">{axis}</text>')
        out.append(f'<text class="gf-t gf-m" x="{x1:.1f}" y="{top - 14}" font-size="12.5" text-anchor="end">oracle</text>')
        for i, (name, sub, color, (a, b), notes) in enumerate(rows):
            note = notes[1] if label_above else notes[0]
            cy = top + i * row_h + (row_h / 2 + (10 if label_above else 0))
            if label_above:
                out.append(f'<text class="gf-t gf-h" x="{x0}" y="{cy - 22}" font-size="15.5">{escape(name)}</text>')
            else:
                out.append(f'<text class="gf-t gf-h" x="{x0 - 16}" y="{cy - 2}" font-size="15.5" text-anchor="end">{escape(name)}</text>')
                out.append(f'<text class="gf-t gf-m" x="{x0 - 16}" y="{cy + 16}" font-size="12.5" text-anchor="end">{escape(sub)}</text>')
            A, B = sx(a), sx(b)
            if b - a < 0.5:
                out.append(f'<circle cx="{B:.1f}" cy="{cy:.1f}" r="7" fill="{color}" stroke="#fff" stroke-width="2"/>')
            else:
                out.append(f'<rect x="{A:.1f}" y="{cy - 7:.1f}" width="{B - A:.1f}" height="14" rx="4" fill="{color}" fill-opacity=".9"/>')
                out.append(f'<line x1="{sx(lo):.1f}" y1="{cy:.1f}" x2="{A - 4:.1f}" y2="{cy:.1f}" stroke="{color}" stroke-opacity=".25" stroke-width="2" stroke-dasharray="2 4"/>')
            text_x, anchor = (B, 'end') if a > 75 else (A, 'start')
            text_y = cy + 25
            fill = TEAL_INK if color == TEAL else OCHRE_INK if color == OCHRE else BODY
            out.append(f'<text class="gf-t gf-strong" x="{text_x:.1f}" y="{text_y:.1f}" font-size="13" text-anchor="{anchor}" fill="{fill}">{note}</text>')
        return W, H, '\n'.join(out)

    W, H, body = build(900, 250, False)
    write('fig4a-recovery-wide.svg', svg(W, H, body, label, 'fig4aw'))
    W, H, body = build(340, 14, True)
    write('fig4a-recovery-narrow.svg', svg(W, H, body, label, 'fig4an'))


def fig_params():
    ev = EVIDENCE['nonlinear_target']
    g, m = ev['geoaft'], ev['pair_mlp']
    ratio = m['trainable_parameters'] / g['trainable_parameters']
    rows = [('GeoAFT', 'structured nonlinear geometry', TEAL, g), ('PairMLP', 'generic learned scorer', NEUTRAL, m)]
    label = (f'Chart: on the controlled nonlinear target, GeoAFT used {g["trainable_parameters"]} trainable parameters and reached '
             f'R = {g["R"]}; the PairMLP used {m["trainable_parameters"]:,} and reached R = {m["R"]}. About {ratio:.0f} times fewer trainable '
             'parameters, with near-equal recovery.')

    def build(W, left, narrow):
        x0 = left
        x1 = W - (24 if narrow else 230)
        lmax = 4.0
        sx = lambda v: x0 + math.log10(v) / lmax * (x1 - x0)
        top, row_h = 30, (78 if narrow else 66)
        H = top + 2 * row_h + 58
        out = []
        for e in range(0, 5):
            X = sx(10 ** e)
            out.append(f'<line x1="{X:.1f}" y1="{top - 6}" x2="{X:.1f}" y2="{top + 2 * row_h}" stroke="{GRID}"/>')
            lab = ['1', '10', '100', '1,000', '10,000'][e]
            out.append(f'<text class="gf-t gf-m" x="{X:.1f}" y="{top + 2 * row_h + 20}" font-size="13" text-anchor="middle">{lab}</text>')
        out.append(f'<text class="gf-t gf-m" x="{(x0 + x1) / 2:.1f}" y="{top + 2 * row_h + 44}" font-size="13.5" text-anchor="middle">Trainable parameters (log scale)</text>')
        if not narrow:
            out.append(f'<text class="gf-t gf-m" x="{W - 170}" y="{top - 10}" font-size="12.5">oracle-gap recovery</text>')
        for i, (name, sub, color, d) in enumerate(rows):
            cy = top + i * row_h + row_h / 2 + (10 if narrow else 0)
            if narrow:
                out.append(f'<text class="gf-t gf-h" x="{x0}" y="{cy - 20}" font-size="15.5">{name}</text>')
            else:
                out.append(f'<text class="gf-t gf-h" x="{x0 - 16}" y="{cy - 2}" font-size="15.5" text-anchor="end">{name}</text>')
                out.append(f'<text class="gf-t gf-m" x="{x0 - 16}" y="{cy + 16}" font-size="12.5" text-anchor="end">{sub}</text>')
            B = sx(d['trainable_parameters'])
            out.append(f'<rect x="{x0:.1f}" y="{cy - 8:.1f}" width="{B - x0:.1f}" height="16" rx="4" fill="{color}"/>')
            n = f'{d["trainable_parameters"]:,}'
            if B - x0 > 0.7 * (x1 - x0):
                out.append(f'<text class="gf-t gf-strong" x="{B - 8:.1f}" y="{cy + 5:.1f}" font-size="13.5" text-anchor="end" fill="#fff">{n}</text>')
            else:
                out.append(f'<text class="gf-t gf-strong" x="{B + 8:.1f}" y="{cy + 5:.1f}" font-size="13.5" fill="{TEAL_INK if color == TEAL else BODY}">{n}</text>')
            rtxt = f'R = {100 * d["R"]:.3f}%'
            if narrow:
                out.append(f'<text class="gf-t" x="{x1:.1f}" y="{cy - 20}" font-size="14" text-anchor="end">{rtxt}</text>')
            else:
                out.append(f'<text class="gf-t" x="{W - 170}" y="{cy + 5:.1f}" font-size="15">{rtxt}</text>')
        return W, H, '\n'.join(out)

    W, H, body = build(900, 250, False)
    write('fig4b-params-wide.svg', svg(W, H, body, label, 'fig4bw'))
    W, H, body = build(340, 14, True)
    write('fig4b-params-narrow.svg', svg(W, H, body, label, 'fig4bn'))


def mini_heat(x, y, n, values, color, cell=13):
    out = []
    for i in range(n):
        for j in range(n):
            v = values[i][j]
            out.append(f'<rect x="{x + j * (cell + 2)}" y="{y + i * (cell + 2)}" width="{cell}" height="{cell}" rx="2" fill="{color}" fill-opacity="{0.08 + 0.85 * v:.2f}"/>')
    return '\n'.join(out)


def softmax_rows(m):
    out = []
    for row in m:
        top = max(row)
        e = [math.exp(v - top) for v in row]
        z = sum(e)
        out.append([v / z for v in e])
    mx = max(max(r) for r in out)
    return [[v / mx for v in r] for r in out]


def fig_regimes():
    """Three schematic glyphs (one per regime) used by the HTML regime cards and the video."""
    pts = [(-1.0, 0.2), (-0.4, -0.6), (0.1, 0.5), (0.7, -0.2), (1.2, 0.6)]
    Mx = ((1.6, 0.5), (0.5, 0.4))
    a = softmax_rows([[-((q[0] - k[0]) * (Mx[0][0] * (q[0] - k[0]) + Mx[0][1] * (q[1] - k[1])) + (q[1] - k[1]) * (Mx[1][0] * (q[0] - k[0]) + Mx[1][1] * (q[1] - k[1]))) * 2.2 for k in pts] for q in pts])
    l1 = softmax_rows([[-(abs(q[0] - k[0]) + abs(q[1] - k[1])) * 3.2 for k in pts] for q in pts])
    lowrank = softmax_rows([[2.0 * (q[0] * k[0]) for k in pts] for q in pts])
    common = f'<text class="gf-t gf-m" font-size="11" x="0" y="0"></text>'
    # 1. exact reparameterization: two formulas -> one identical map
    o = [common]
    o.append(f'<rect x="0" y="8" width="140" height="40" rx="8" fill="{TEAL_TINT}" stroke="{TEAL}"/>')
    o.append(f'<text class="gf-x" x="70" y="33" font-size="13.5" text-anchor="middle">−(q−k)ᵀM(q−k)</text>')
    o.append(f'<rect x="0" y="70" width="140" height="40" rx="8" fill="{OCHRE_TINT}" stroke="{OCHRE}"/>')
    o.append(f'<text class="gf-x" x="70" y="95" font-size="13.5" text-anchor="middle">2qᵀMk − kᵀMk</text>')
    o.append(f'<path d="M142,28 C160,28 160,56 170,56" fill="none" stroke="{MUTED}" stroke-width="1.3"/>')
    o.append(f'<path d="M142,90 C160,90 160,62 170,62" fill="none" stroke="{MUTED}" stroke-width="1.3"/>')
    o.append(mini_heat(176, 22, 5, a, NAVY))
    o.append(f'<text class="gf-t gf-m" x="213" y="118" font-size="11.5" text-anchor="middle">same attention</text>')
    write('fig5-regime-1.svg', svg(260, 124, '\n'.join(o), 'Schematic: two different score formulas produce identical attention after softmax.', 'r1'))
    # 2. economical: tiny vs big parameter boxes -> same map
    o = [common]
    o.append(f'<rect x="40" y="18" width="22" height="22" rx="3" fill="{TEAL}"/>')
    o.append(f'<text class="gf-t" x="72" y="34" font-size="13" fill="{TEAL_INK}">46</text>')
    o.append(f'<rect x="8" y="58" width="86" height="52" rx="3" fill="{NEUTRAL}" fill-opacity=".55"/>')
    o.append(f'<text class="gf-t" x="100" y="90" font-size="13">8,705</text>')
    o.append(f'<path d="M140,30 C158,30 158,56 168,56" fill="none" stroke="{MUTED}" stroke-width="1.3"/>')
    o.append(f'<path d="M140,86 C158,86 158,62 168,62" fill="none" stroke="{MUTED}" stroke-width="1.3"/>')
    o.append(mini_heat(176, 22, 5, l1, NAVY))
    o.append(f'<text class="gf-t gf-m" x="213" y="118" font-size="11.5" text-anchor="middle">near-identical fit</text>')
    write('fig5-regime-2.svg', svg(260, 124, '\n'.join(o), 'Schematic: a 46-parameter structured geometry and an 8,705-parameter generic scorer fit the same target almost equally well.', 'r2'))
    # 3. distinct capacity: geometry reaches a map the restricted family cannot
    o = [common]
    o.append(mini_heat(0, 22, 5, l1, TEAL, cell=12))
    o.append(f'<text class="gf-t gf-m" x="35" y="118" font-size="11.5" text-anchor="middle">geometry</text>')
    o.append(f'<text class="gf-t gf-h" x="130" y="64" font-size="24" text-anchor="middle">≠</text>')
    o.append(mini_heat(190, 22, 5, lowrank, OCHRE, cell=12))
    o.append(f'<text class="gf-t gf-m" x="225" y="118" font-size="11.5" text-anchor="middle">rank-r Q/K</text>')
    o.append(f'<text class="gf-t gf-m" x="130" y="90" font-size="11" text-anchor="middle">out of reach?</text>')
    write('fig5-regime-3.svg', svg(260, 124, '\n'.join(o), 'Schematic: a compatibility pattern produced by a structured geometry that a restricted low-rank Q/K family may not reach.', 'r3'))


def write_toy_json():
    """Machine-readable copy of the toy so geoaft.js and tests can check they agree."""
    data = dict(TOY)
    data['attention'] = {kind: attention(kind, TOY['query'], TOY['p']) for kind, *_ in GEOMETRIES}
    write('toy.json', json.dumps(data, indent=1) + '\n')


if __name__ == '__main__':
    fig_hero()
    fig_geometry()
    fig_paths()
    fig_mechanism()
    fig_recovery()
    fig_params()
    fig_regimes()
    write_toy_json()

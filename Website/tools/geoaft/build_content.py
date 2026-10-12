"""Render GeoAFT page sources into generator templates.

content/*.src.html  ->  Website/tools/templates/projects/geoaft/*.html

* \\( ... \\) and \\[ ... \\] LaTeX become static MathML (no runtime math library);
* {{ev:key}} values are filled from evidence.json, so the prose and figures share numbers;
* {{team}}, {{accepted}}, {{related}}, {{status}}, {{root}} and {{svg:...}} are left for
  generate_research.py, which fills them from the site data on every regeneration.

Requires `pip install latex2mathml` (authoring-time only; the site build does not need it).
Run: python Website/tools/geoaft/build_content.py   (add --check to detect stale templates)
"""
import json
import re
import sys
from pathlib import Path

from latex2mathml.converter import convert

HERE = Path(__file__).resolve().parent
TARGET = HERE.parent / 'templates' / 'projects' / 'geoaft'
EV = json.loads((HERE / 'evidence.json').read_text(encoding='utf-8'))


def evidence_values():
    c, n = EV['controlled_targets'], EV['nonlinear_target']
    g, m = n['geoaft'], n['pair_mlp']
    rng = lambda r: f'{r[0]:g}–{r[1]:g}'
    return {
        'lp': f"{c['lp']['geoaft_R_percent']:g}",
        'mahalanobis': f"{c['mahalanobis']['geoaft_R_percent']:g}",
        'qk_margin': rng(c['qk_lora_margin_points']),
        'pair_margin': rng(c['pair_mlp_margin_points']),
        'g_params': f"{g['trainable_parameters']:,}",
        'm_params': f"{m['trainable_parameters']:,}",
        'g_R': f"{100 * g['R']:.3f}",
        'm_R': f"{100 * m['R']:.3f}",
        'g_R_raw': f"{g['R']}",
        'm_R_raw': f"{m['R']}",
        'ratio': f"{m['trainable_parameters'] / g['trainable_parameters']:.0f}",
        'wins': n['paired_wins'],
        'diff': f"{100 * (g['R'] - m['R']):.2f}",
    }


def mathml(latex, display):
    out = convert(latex.strip(), display='block' if display else 'inline')
    return re.sub(r'\s*\n\s*', '', out)


def render(source):
    values = evidence_values()
    source = re.sub(r'\{\{ev:(\w+)\}\}', lambda m: values[m[1]], source)
    source = re.sub(r'\\\[(.+?)\\\]', lambda m: mathml(m[1], True), source, flags=re.S)
    source = re.sub(r'\\\((.+?)\\\)', lambda m: mathml(m[1], False), source, flags=re.S)
    header = '<!-- Built by Website/tools/geoaft/build_content.py from content/*.src.html; edit the source, not this file. -->\n'
    return header + source


def main(check=False):
    stale = []
    for src in sorted((HERE / 'content').glob('*.src.html')):
        out = TARGET / src.name.replace('.src.html', '.html')
        value = render(src.read_text(encoding='utf-8'))
        if not out.exists() or out.read_text(encoding='utf-8') != value:
            stale.append(out)
            if not check:
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_text(value, encoding='utf-8', newline='\n')
    if check and stale:
        raise SystemExit('Stale GeoAFT templates: ' + ', '.join(p.name for p in stale))
    print(f'GeoAFT content {"checked" if check else "built"}: {len(stale)} changed.')


if __name__ == '__main__':
    main('--check' in sys.argv)

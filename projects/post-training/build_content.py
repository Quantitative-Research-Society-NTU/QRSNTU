"""Render the post-training explainer's page sources into generator templates.

content/*.src.html  ->  build/*.html (read by tools/generate_research.py)

* \\( ... \\) and \\[ ... \\] LaTeX become static MathML (no runtime maths library);
* {{cite:key1,key2}} becomes a parenthetical citation and {{citet:key}} a textual one, both linking to
  the References section; {{references}} renders that section from references.json;
* {{root}}, {{assets}} and {{svg:name}} are left for generate_research.py.

The build fails if a citation has no entry in references.json, or if an entry is never cited.
Requires `pip install latex2mathml` (authoring-time only; the site build does not need it).
Run: python projects/post-training/build_content.py   (add --check to detect stale templates)
"""
import json
import re
import sys
from html import escape
from pathlib import Path

from latex2mathml.converter import convert

HERE = Path(__file__).resolve().parent
TARGET = HERE / 'build'
REFS = {r['id']: r for r in json.loads((HERE / 'references.json').read_text(encoding='utf-8'))['references']}


def surname(name):
    return name.split()[-1]


def short(ref):
    if 'cite' in ref:
        return ref['cite'].rsplit(', ', 1)
    names = ref['authors']
    if len(names) == 1:
        who = surname(names[0]) if ' ' in names[0] else names[0]
    elif len(names) == 2 and names[1] != 'et al.':
        who = f'{surname(names[0])} and {surname(names[1])}'
    else:
        who = f'{surname(names[0])} et al.'
    return who, str(ref['year'])


def link(ref):
    if ref.get('arxiv'):
        return 'https://arxiv.org/abs/' + ref['arxiv']
    return ref.get('url')


def cite(keys, textual, used):
    parts = []
    for key in keys.split(','):
        key = key.strip()
        if key not in REFS:
            raise SystemExit(f'Unknown citation key: {key}')
        used.add(key)
        who, year = short(REFS[key])
        label = f'{who} ({year})' if textual else f'{who}, {year}'
        parts.append(f'<a href="#ref-{key}">{escape(label)}</a>')
    if textual:
        return '; '.join(parts)
    return '<span class="pt-cite">(' + '; '.join(parts) + ')</span>'


def references(used):
    def order(key):
        ref = REFS[key]
        return (surname(ref['authors'][0]).lower(), ref['year'], ref['title'])
    items = []
    for key in sorted(used, key=order):
        ref = REFS[key]
        names = ref['authors']
        authors = ', '.join(n for n in names if n != 'et al.') + (', et al.' if names[-1] == 'et al.' else '')
        title = escape(ref['title'])
        href = link(ref)
        title = f'<a href="{escape(href, quote=True)}" class="pt-ref-title" target="_blank" rel="noopener noreferrer">{title}</a>' if href else f'<span class="pt-ref-title">{title}</span>'
        items.append(f'<li id="ref-{key}">{escape(authors)} ({ref["year"]}). {title}. <span class="pt-ref-venue">{escape(ref["venue"])}.</span></li>')
    return '<ol class="pt-refs">' + ''.join(items) + '</ol>'


def mathml(latex, display):
    out = convert(latex.strip(), display='block' if display else 'inline')
    return re.sub(r'\s*\n\s*', '', out)


def render(source, used):
    source = re.sub(r'\{\{(cite|citet):([\w,\s]+)\}\}', lambda m: cite(m[2], m[1] == 'citet', used), source)
    source = re.sub(r'\\\[(.+?)\\\]', lambda m: mathml(m[1], True), source, flags=re.S)
    source = re.sub(r'\\\((.+?)\\\)', lambda m: mathml(m[1], False), source, flags=re.S)
    return source


def main(check=False):
    used, outputs = set(), {}
    for src in sorted((HERE / 'content').glob('*.src.html')):
        outputs[src] = render(src.read_text(encoding='utf-8'), used)
    unused = sorted(set(REFS) - used)
    if unused:
        raise SystemExit('References never cited: ' + ', '.join(unused))
    stale = []
    header = '<!-- Built by projects/post-training/build_content.py from content/*.src.html; edit the source, not this file. -->\n'
    for src, value in outputs.items():
        value = header + value.replace('{{references}}', references(used))
        out = TARGET / src.name.replace('.src.html', '.html')
        if not out.exists() or out.read_text(encoding='utf-8') != value:
            stale.append(out)
            if not check:
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_text(value, encoding='utf-8', newline='\n')
    if check and stale:
        raise SystemExit('Stale post-training templates: ' + ', '.join(p.name for p in stale))
    print(f'Post-training content {"checked" if check else "built"}: {len(outputs)} pages, {len(used)} references, {len(stale)} changed.')


if __name__ == '__main__':
    main('--check' in sys.argv)

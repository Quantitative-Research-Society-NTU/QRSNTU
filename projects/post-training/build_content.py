"""Render the post-training explainer's page sources into generator templates.

content/*.src.html  ->  build/*.html (read by tools/generate_research.py)

* \\( ... \\) and \\[ ... \\] LaTeX become static MathML (no runtime maths library);
* {{cite:key1,key2}} becomes a parenthetical citation and {{citet:key}} a textual one, both linking to
  the References section; {{references}} renders that section from references.json; {{toy:...}} fills numbers
  and tables from toy.json (written by build_figures.mjs); {{minutes:N}} is the reading time of part N;
* {{root}}, {{assets}} and {{svg:name}} are left for generate_research.py.

The build fails if a citation has no entry in references.json, or if an entry is never cited.
Requires `pip install latex2mathml` (authoring-time only; the site build does not need it).
Run: python projects/post-training/build_content.py   (add --check to detect stale templates)
"""
import json
import math
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


def num(value, digits=2, sign=False):
    text = f'{value:+.{digits}f}' if sign else f'{value:.{digits}f}'
    return text.replace('-', '−')


def pct(value):
    return f'{100 * value:.0f}%' if value >= 0.01 else f'{100 * value:.1f}%'


TOY_HEAD = {
    'en': {'reply': 'Reply', 'text': 'Text', 'base': 'Base model', 'sft': 'After SFT (π<sub>ref</sub>)', 'r': 'Reward model <i>r</i>',
           'ok': 'Verifier', 'rlhf': 'After RLHF (β = {beta})', 'adv': 'Advantage <i>A</i> = <i>r</i> − <i>V</i>(<i>x</i>)',
           'yes': '1 (names Paris)', 'no': '0', 'label': 'The running example', 'ppo': 'Advantages of the six replies'},
    'zh': {'reply': '回复', 'text': '内容', 'base': '基座模型', 'sft': 'SFT 之后（π<sub>ref</sub>）', 'r': '奖励模型 <i>r</i>',
           'ok': '验证器', 'rlhf': 'RLHF 之后（β = {beta}）', 'adv': 'Advantage <i>A</i> = <i>r</i> − <i>V</i>(<i>x</i>)',
           'yes': '1（答出 Paris）', 'no': '0', 'label': '贯穿全文的例子', 'ppo': '六个回复的 advantage'},
}


def toy(key, lang):
    """Numbers and tables from toy.json, the running example defined in public/pt.js."""
    t = json.loads((HERE / 'toy.json').read_text(encoding='utf-8'))
    h = TOY_HEAD[lang]
    name, _, arg = key.partition(':')
    if name == 'table':
        head = ''.join(f'<th scope="col">{h[k].format(beta=t["beta"])}</th>' for k in ('reply', 'text', 'base', 'sft', 'r', 'ok', 'rlhf'))
        rows = ''.join(
            f'<tr><th scope="row">y<sub>{i + 1}</sub></th><td>“{escape(rep["text"])}”</td><td class="num">{pct(t["base"][i])}</td>'
            f'<td class="num">{pct(t["sft"][i])}</td><td class="num">{num(t["reward"][i], 1)}</td><td>{h["yes"] if rep["ok"] else h["no"]}</td>'
            f'<td class="num">{pct(t["rlhf"][i])}</td></tr>' for i, rep in enumerate(t['replies']))
        return (f'<div class="pt-table-wrap" role="region" aria-label="{h["label"]}" tabindex="0"><table class="pt-table pt-toy">'
                f'<thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table></div>')
    if name == 'ppo':
        rows = ''.join(f'<tr><th scope="row">y<sub>{i + 1}</sub> {escape(rep["short"])}</th><td class="num">{num(t["reward"][i], 1)}</td>'
                       f'<td class="num">{num(t["adv"][i], 2, sign=True)}</td></tr>' for i, rep in enumerate(t['replies']))
        return (f'<div class="pt-table-wrap pt-table-narrow" role="region" aria-label="{h["ppo"]}" tabindex="0"><table class="pt-table">'
                f'<thead><tr><th scope="col">{h["reply"]}</th><th scope="col">{h["r"]}</th><th scope="col">{h["adv"]}</th></tr></thead>'
                f'<tbody>{rows}</tbody></table></div>')
    if name in ('base', 'sft', 'rlhf'):
        return pct(t[name][int(arg) - 1])
    if name == 'r':
        return num(t['reward'][int(arg) - 1], 1)
    if name == 'adv':
        return num(t['adv'][int(arg) - 1], 2, sign=True)
    if name == 'correct':
        return pct(t['correct'][arg])
    return {'V': num(t['V'], 2), 'gap': num(t['gap'], 1), 'bt': pct(t['bt']), 'dpoloss': num(t['dpoLoss'], 3),
            'log2': num(math.log(2), 3), 'beta': f'{t["beta"]:g}', 'prompt': escape(t['prompt'])}[name]


def reading_minutes(chunk, lang):
    """Rough reading time: prose at 200 words a minute (350 Chinese characters), plus 15 s per display equation."""
    equations = len(re.findall(r'\\\[', chunk))
    text = re.sub(r'\\\[.+?\\\]|\\\(.+?\\\)', ' ', chunk, flags=re.S)
    text = re.sub(r'<[^>]+>|\{\{[^}]+\}\}', ' ', text)
    cjk = len(re.findall(r'[一-鿿]', text))
    words = len(re.sub(r'[一-鿿　-〿＀-￯]', ' ', text).split())
    return max(1, math.ceil(words / 200 + cjk / 350 + equations / 4))


def render(source, used, lang):
    source = re.sub(r'\{\{(cite|citet):([\w,\s]+)\}\}', lambda m: cite(m[2], m[1] == 'citet', used), source)
    source = re.sub(r'\{\{toy:([\w:]+)\}\}', lambda m: toy(m[1], lang), source)
    # Reading time per part: {{minutes:N}} anywhere on the page refers to the N-th <p class="pt-part"> block.
    parts = source.split('<p class="pt-part"')[1:]
    minutes = {str(i + 1): reading_minutes(chunk, lang) for i, chunk in enumerate(parts)}
    label = '约 {} 分钟' if lang == 'zh' else 'about {} min'
    source = re.sub(r'\{\{minutes:(\d+)\}\}', lambda m: label.format(minutes[m[1]]), source)
    source = re.sub(r'\\\[(.+?)\\\]', lambda m: mathml(m[1], True), source, flags=re.S)
    source = re.sub(r'\\\((.+?)\\\)', lambda m: mathml(m[1], False), source, flags=re.S)
    return source


def main(check=False):
    used, outputs = set(), {}
    for src in sorted((HERE / 'content').glob('*.src.html')):
        mine = set()
        lang = 'zh' if src.name.startswith('zh') else 'en'
        outputs[src] = (render(src.read_text(encoding='utf-8'), mine, lang), mine)
        used |= mine
    unused = sorted(set(REFS) - used)
    if unused:
        raise SystemExit('References never cited: ' + ', '.join(unused))
    stale = []
    header = '<!-- Built by projects/post-training/build_content.py from content/*.src.html; edit the source, not this file. -->\n'
    for src, (value, mine) in outputs.items():
        value = header + value.replace('{{references}}', references(mine))
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

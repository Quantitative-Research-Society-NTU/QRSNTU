"""Write the sponsor blocks from site/data/sponsors.json into the About page and the homepage.

Each sponsor has id, name, url, logo (for light backgrounds), logo_on_dark, logo_width,
logo_height and description. The About page lists every sponsor with its description; the
homepage shows a "Supported by" row of logos. --check reports stale output without writing.
"""
import argparse
import json
from html import escape
from pathlib import Path

SITE = Path(__file__).resolve().parents[1] / 'site'
REQUIRED = ('id', 'name', 'url', 'logo', 'logo_on_dark', 'logo_width', 'logo_height', 'description')


def load():
    sponsors = json.loads((SITE / 'data/sponsors.json').read_text(encoding='utf-8'))
    for s in sponsors:
        missing = [k for k in REQUIRED if not s.get(k)]
        assert not missing, f'sponsors.json {s.get("id", "?")}: missing {missing}'
        for key in ('logo', 'logo_on_dark'):
            assert (SITE / s[key]).exists(), f'sponsors.json {s["id"]}: {s[key]} not found'
        assert s['url'].startswith('https://'), f'sponsors.json {s["id"]}: url must be https'
    return sponsors


def logo(s, root, height):
    width = round(s['logo_width'] * height / s['logo_height'])
    return (f'<a href="{escape(s["url"])}" target="_blank" rel="noopener noreferrer" class="sponsor-logo">'
            f'<img src="{root}{escape(s["logo"])}" alt="{escape(s["name"])}" width="{width}" height="{height}" loading="lazy"></a>')


def about_block(sponsors):
    cards = ''.join(f'''
                        <article id="sponsor-{escape(s["id"])}" class="sponsor-card">
                            {logo(s, "../", 40)}
                            <p class="text-gray-600">{escape(s["description"])}</p>
                            <a href="{escape(s["url"])}" target="_blank" rel="noopener noreferrer" class="text-accent-blue hover:underline">{escape(s["url"].split("://", 1)[1].removeprefix("www."))}</a>
                        </article>''' for s in sponsors)
    return cards + '\n                    '


def home_block(sponsors):
    return ''.join('\n                        ' + logo(s, '', 36) for s in sponsors) + '\n                    '


def between(source, start, end, body, name):
    a, b = source.find(start), source.find(end)
    assert a >= 0 and b > a, f'{name}: missing {start} markers'
    return source[:a + len(start)] + body + source[b:]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--check', action='store_true')
    check = ap.parse_args().check
    sponsors = load()
    targets = [(SITE / 'about/index.html', '<!-- SPONSORS: generated -->', '<!-- /SPONSORS -->', about_block(sponsors)),
               (SITE / 'index.html', '<!-- HOME SPONSORS: generated -->', '<!-- /HOME SPONSORS -->', home_block(sponsors))]
    stale = []
    for path, start, end, body in targets:
        source = path.read_text(encoding='utf-8')
        value = between(source, start, end, body, path.name)
        if value != source:
            stale.append(str(path.relative_to(SITE)))
            if not check:
                path.write_text(value, encoding='utf-8', newline='\n')
    if check and stale:
        raise SystemExit('Stale sponsor blocks: ' + ', '.join(stale))
    print(f'Sponsors {"checked" if check else "generated"}: {len(sponsors)}; {len(stale)} changed.')


if __name__ == '__main__':
    main()

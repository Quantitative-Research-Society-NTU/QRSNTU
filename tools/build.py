"""Build the public site in site/, in the right order. One command for local work, CI and any host.

    python tools/build.py                      # regenerate everything (what CI runs)
    python tools/build.py --skip-css           # skip the Tailwind compile (needs no network)
    python tools/build.py --target cloudflare  # also write _redirects and _headers for Cloudflare Pages

Project authoring steps (figures, page text, video) are separate and documented in
projects/<id>/README.md; their outputs are committed, so this build never needs them.
Needs Python 3.10+ and Node 20+; the Tailwind step downloads tailwindcss@3.4.17 through npx.
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SITE = REPO / 'site'
NPX = 'npx.cmd' if sys.platform == 'win32' else 'npx'

STEPS = [
    ('project and profile pages', [sys.executable, 'tools/generate_research.py']),
    ('projects index', ['node', 'tools/generate_project_index.mjs']),
    ('news', ['node', 'tools/generate_news.mjs']),
    ('sponsors', [sys.executable, 'tools/generate_sponsors.py']),
    ('search metadata and sitemaps', [sys.executable, 'tools/generate_seo.py']),
    ('campus previews', [sys.executable, 'tools/branches/build_drafts.py']),
]
CSS = ('Tailwind CSS', [NPX, '--yes', '--package', 'tailwindcss@3.4.17', 'tailwindcss', '--config', 'tools/tailwind.config.cjs',
                         '--input', 'tools/tailwind-input.css', '--output', 'site/assets/tailwind.css', '--minify'])


def cloudflare_files():
    """Cloudflare Pages reads _redirects and _headers from the output folder; GitHub Pages ignores them."""
    redirects = []
    for page in sorted(SITE.rglob('*.html')):
        text = page.read_text(encoding='utf-8', errors='ignore')
        match = re.search(r'http-equiv=["\']refresh["\'][^>]*url=([^"\'>\s]+)', text, re.I)
        if not match:
            continue
        rel = page.relative_to(SITE).as_posix()
        source = '/' + (rel[:-len('index.html')] if page.name == 'index.html' else rel)
        target = match[1]
        if not target.startswith(('http://', 'https://', '/')):
            # Campus previews set <base href>, so their relative links resolve against it.
            base = re.search(r'<base href="([^"]+)"', text)
            folder = (page.parent / base[1]).resolve() if base else page.parent.resolve()
            target = '/' + (folder / target).resolve().relative_to(SITE.resolve()).as_posix() + '/'
        redirects.append(f'{source} {target} 301')
    # GeoAFT assets moved from /assets/geoaft/ (social card, video) to the project folder.
    redirects.append('/assets/geoaft/* /projects/geoaft/assets/:splat 301')
    (SITE / '_redirects').write_text('\n'.join(redirects) + '\n', encoding='utf-8', newline='\n')
    (SITE / '_headers').write_text(
        '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n'
        '/assets/*\n  Cache-Control: public, max-age=86400\n'
        '/projects/*/assets/*\n  Cache-Control: public, max-age=86400\n', encoding='utf-8', newline='\n')
    print(f'Cloudflare: {len(redirects)} redirects, headers written.')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--skip-css', action='store_true')
    ap.add_argument('--target', choices=['github', 'cloudflare'], default='github')
    args = ap.parse_args()
    for label, command in STEPS + ([] if args.skip_css else [CSS]):
        print(f'== {label}', flush=True)
        subprocess.run(command, cwd=REPO, check=True)
    if args.target == 'cloudflare':
        cloudflare_files()


if __name__ == '__main__':
    main()

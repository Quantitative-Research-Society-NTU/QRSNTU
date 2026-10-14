"""Validate the built site in site/. Run after tools/build.py; CI runs both before deploying.

    python tools/check.py
"""
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

CHECKS = [
    ('generated pages are current', [sys.executable, 'tools/generate_research.py', '--check']),
    ('news output is current', ['node', 'tools/generate_news.mjs', '--check']),
    ('data, routes and internal links', [sys.executable, 'tools/check_research.py']),
    ('search metadata and sitemaps', [sys.executable, 'tools/check_seo.py']),
    ('profile loading', ['node', 'tools/test_profile_loading.mjs']),
]


def main():
    failed = []
    for label, command in CHECKS:
        print(f'== {label}', flush=True)
        if subprocess.run(command, cwd=REPO).returncode:
            failed.append(label)
    if failed:
        sys.exit('Failed: ' + ', '.join(failed))
    print('All checks passed.')


if __name__ == '__main__':
    main()

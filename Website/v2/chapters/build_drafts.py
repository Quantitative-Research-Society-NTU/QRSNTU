"""Generate branch previews from the unchanged V2 pages."""
from pathlib import Path
import os
import re

ROOT = Path(__file__).resolve().parents[1]
CHAPTERS = [("nus", "NUS"), ("sjtu", "上交"), ("hkust", "HKUST"), ("cuhk", "香港中文大学"), ("fdu", "复旦")]
SOURCES = [p for p in ROOT.rglob("index.html")
           if p.relative_to(ROOT).parts[0] not in {"chapters", "math_notes", "fonts"}]

def generate(source, target, slug, campus, variant):
    page = source.read_text(encoding="utf-8")
    base = os.path.relpath(source.parent, target.parent).replace("\\", "/") + "/"
    page = page.replace("<head>", '<head>\n    <base href="' + base + '">\n    <meta name="robots" content="noindex,nofollow">')
    page = page.replace("<body ", f'<body data-chapter="{campus}" data-slug="{slug}" data-variant="{variant}" ')
    page = page.replace("QRS@NTU", f"QRS@{campus}").replace("Society @NTU", f"Society @{campus}")
    chinese = slug in {"sjtu", "cuhk", "fdu"}
    brand = f"量化研究协会@{campus}" if chinese else f"QRS@{campus}"
    page = page.replace(f'data-chapter="{campus}"', f'data-chapter="{campus}" data-brand="{brand}"')
    if chinese:
        page = page.replace(f"QRS@{campus}", brand).replace(f"Quantitative Research Society @{campus}", brand)
    if source.parent.name == "about":
        page = page.replace("society at NTU", f"society at {campus}").replace("across NTU", f"across {campus}")
        page = re.sub(r'Publish notes, problem sets, and past-year papers for NTU modules on <a .*?</a>\.', "Share technical notes, research methods, and reproducible learning resources.", page)
        if chinese:
            content = (ROOT / "chapters/about-zh.html").read_text(encoding="utf-8").replace("{{campus}}", campus)
            page = re.sub(r'<main\b.*?</main>', lambda _: content, page, flags=re.S)
            page = page.replace('<html lang="en">', '<html lang="zh-Hans">').replace(f"About | {brand}", f"关于我们 | {brand}")
    for component in ("header", "footer"):
        path = os.path.relpath(ROOT / "chapters" / f"{component}.js", source.parent).replace("\\", "/")
        page = re.sub(r'src="[^"]*assets/' + component + r'\.js(?:\?[^"]*)?"', f'src="{path}"', page)
    routing = os.path.relpath(ROOT / "chapters/routing.js", source.parent).replace("\\", "/")
    page = page.replace("</body>", f'<script type="module" src="{routing}"></script>\n</body>')
    if variant == "landing" and source == ROOT / "index.html":
        # Preserve the exact original hero; full research feeds belong to the full version.
        start = page.index('            <section id="current-work"')
        end = page.index("        </main>", start)
        page = page[:start] + page[end:]
        page = page.replace('    <script type="module" src="script.js?v=2"></script>', "")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(page, encoding="utf-8")

for slug, campus in CHAPTERS:
    branch = ROOT / "chapters" / slug
    for source in SOURCES:
        generate(source, branch / source.relative_to(ROOT), slug, campus, "full")
    for source in (ROOT / "index.html", ROOT / "about/index.html"):
        generate(source, branch / "landing" / source.relative_to(ROOT), slug, campus, "landing")

print(f"Generated {len(CHAPTERS)} branches with {len(SOURCES)} full-content pages and 2 landing pages each.")
